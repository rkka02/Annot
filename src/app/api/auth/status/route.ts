import { NextResponse } from 'next/server';
import { loadTokens, clearTokens } from '@/lib/oauth';

// GET /api/auth/status — Check if authenticated
export async function GET() {
  const tokens = await loadTokens();

  if (!tokens) {
    return NextResponse.json({ authenticated: false });
  }

  const isExpired = tokens.expiresAt ? Date.now() > tokens.expiresAt : false;
  const hasRefresh = !!tokens.refreshToken;

  return NextResponse.json({
    authenticated: true,
    hasRefreshToken: hasRefresh,
    isExpired,
    expiresAt: tokens.expiresAt,
  });
}

// DELETE /api/auth/status — Disconnect (remove stored tokens)
export async function DELETE() {
  await clearTokens();
  return NextResponse.json({ success: true });
}
