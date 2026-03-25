import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveTokens } from '@/lib/oauth';
import { pendingFlows } from '../route';

// GET /api/auth/callback — OpenAI redirects here after user login
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new NextResponse(buildHtml(false, `OAuth error: ${error}`), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!code || !state) {
    return new NextResponse(buildHtml(false, 'Missing code or state parameter'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const flow = pendingFlows.get(state);
  if (!flow) {
    return new NextResponse(buildHtml(false, 'Invalid or expired state. Please try again.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  pendingFlows.delete(state);

  try {
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/auth/callback`;

    const tokens = await exchangeCodeForTokens(code, flow.codeVerifier, redirectUri);
    await saveTokens(tokens);

    return new NextResponse(buildHtml(true), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token exchange failed';
    return new NextResponse(buildHtml(false, message), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function buildHtml(success: boolean, error?: string): string {
  const title = success ? 'Connected to OpenAI' : 'Connection Failed';
  const color = success ? '#22c55e' : '#ef4444';
  const message = success
    ? 'You can close this tab and return to Annot.'
    : `Error: ${error || 'Unknown error'}. Please try again in Settings.`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} — Annot</title>
  <style>
    body {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #f7fafc; color: #283439;
    }
    .card {
      text-align: center; padding: 3rem;
      background: #ffffff; border-radius: 1rem;
      max-width: 420px;
      box-shadow: 0 20px 40px rgba(40, 52, 57, 0.05);
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.4rem; color: ${color}; margin: 0 0 0.5rem; font-weight: 700; }
    p { color: #6b7a82; font-size: 0.9rem; line-height: 1.6; }
    .brand { margin-top: 1.5rem; font-size: 0.75rem; color: #8a969d; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '&#10003;' : '&#10007;'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="brand">Annot &mdash; PDF Research Assistant</div>
  </div>
  ${success ? '<script>setTimeout(() => window.close(), 2000);</script>' : ''}
</body>
</html>`;
}
