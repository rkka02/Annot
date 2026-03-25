import { NextResponse } from 'next/server';

// GET /api/auth — Start OAuth flow, returns redirect URL
export async function GET() {
  return NextResponse.json(
    {
      error: 'This app no longer starts a browser OAuth flow. Annot reuses the existing Codex login on this machine.',
    },
    { status: 410 }
  );
}
