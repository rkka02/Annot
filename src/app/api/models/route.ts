import { NextResponse } from 'next/server';
import { fetchCodexModels } from '@/lib/codex-auth';

// GET /api/models — Fetch available models from the Codex backend
export async function GET() {
  const models = await fetchCodexModels();
  if (!models) {
    return NextResponse.json(
      { error: 'Not authenticated. Sign in to Codex on this machine first.' },
      { status: 401 }
    );
  }

  try {
    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch models';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
