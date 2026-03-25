import { NextResponse } from 'next/server';
import { getCodexAuthStatus } from '@/lib/codex-auth';

// GET /api/auth/status — Check if authenticated
export async function GET() {
  const status = await getCodexAuthStatus();
  return NextResponse.json(status);
}

// DELETE /api/auth/status — Managed by Codex, so Annot does not clear it.
export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Annot uses the existing Codex login on this machine. Sign out from Codex if you want to disconnect it here.',
    },
    { status: 400 }
  );
}
