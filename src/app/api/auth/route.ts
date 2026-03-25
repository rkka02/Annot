import { NextRequest, NextResponse } from 'next/server';
import { generatePKCE, generateState, buildAuthUrl } from '@/lib/oauth';

// In-memory store for PKCE state (per OAuth flow)
// In production, use a proper session store
const pendingFlows = new Map<string, { codeVerifier: string; createdAt: number }>();

// Clean up expired flows (older than 5 minutes)
function cleanupFlows() {
  const now = Date.now();
  for (const [state, flow] of pendingFlows) {
    if (now - flow.createdAt > 5 * 60 * 1000) {
      pendingFlows.delete(state);
    }
  }
}

export { pendingFlows };

// GET /api/auth — Start OAuth flow, returns redirect URL
export async function GET(req: NextRequest) {
  cleanupFlows();

  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState();

  // Build redirect URI based on current host
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const redirectUri = `${protocol}://${host}/api/auth/callback`;

  pendingFlows.set(state, { codeVerifier, createdAt: Date.now() });

  const authUrl = buildAuthUrl(redirectUri, state, codeChallenge);

  return NextResponse.json({ authUrl, state });
}
