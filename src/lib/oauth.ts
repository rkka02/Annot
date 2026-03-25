import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// ── OpenAI OAuth config (from easyclaw) ──────────────────────────
const OPENAI_OAUTH = {
  authUrl: 'https://auth.openai.com/oauth/authorize',
  tokenUrl: 'https://auth.openai.com/oauth/token',
  clientId: 'app_EMoamEEZ73f0CkXaXp7hrann',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  extraAuthParams: {
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    originator: 'pi',
  },
};

const AUTH_CLAIM_PATH = 'https://api.openai.com/auth';
const DATA_DIR = path.join(process.cwd(), 'data');
const TOKEN_FILE = path.join(DATA_DIR, 'openai-auth.json');

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
}

// ── PKCE helpers ─────────────────────────────────────────────────

export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

// ── Build authorization URL ──────────────────────────────────────

export function buildAuthUrl(redirectUri: string, state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OPENAI_OAUTH.clientId,
    redirect_uri: redirectUri,
    scope: OPENAI_OAUTH.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...OPENAI_OAUTH.extraAuthParams,
  });

  return `${OPENAI_OAUTH.authUrl}?${params.toString()}`;
}

// ── Exchange code for tokens ─────────────────────────────────────

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: OPENAI_OAUTH.clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(OPENAI_OAUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();

  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };

  // Extract account ID from JWT
  const accountId = extractAccountId(data.access_token);
  if (accountId) tokens.accountId = accountId;

  return tokens;
}

// ── Refresh access token ─────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: OPENAI_OAUTH.clientId,
  });

  const response = await fetch(OPENAI_OAUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();

  const tokens: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };

  const accountId = extractAccountId(data.access_token);
  if (accountId) tokens.accountId = accountId;

  return tokens;
}

// ── Token storage ────────────────────────────────────────────────

export async function saveTokens(tokens: StoredTokens) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const data = await fs.readFile(TOKEN_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function clearTokens() {
  try {
    await fs.unlink(TOKEN_FILE);
  } catch {
    // ignore if doesn't exist
  }
}

/**
 * Get a valid access token. Auto-refreshes if expired.
 */
export async function getValidToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  // Check if expired (with 60s buffer)
  if (tokens.expiresAt && Date.now() > tokens.expiresAt - 60_000) {
    if (!tokens.refreshToken) return null;

    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      await saveTokens(refreshed);
      return refreshed.accessToken;
    } catch {
      return null;
    }
  }

  return tokens.accessToken;
}

// ── JWT helpers ──────────────────────────────────────────────────

function extractAccountId(accessToken: string): string | undefined {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3 || !parts[1]) return undefined;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    ) as Record<string, unknown>;

    const authClaim = payload[AUTH_CLAIM_PATH] as Record<string, unknown> | undefined;
    const accountId = authClaim?.chatgpt_account_id;
    if (typeof accountId !== 'string' || accountId.trim().length === 0) return undefined;
    return accountId;
  } catch {
    return undefined;
  }
}
