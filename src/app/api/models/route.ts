import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getProviderRuntime } from '@/lib/ai-providers';
import { DEFAULT_AI_PROVIDER, parseAIProvider } from '@/lib/ai-providers/config';

// GET /api/models — Fetch available models from the active runtime provider
export async function GET(req: NextRequest) {
  try {
    const provider = parseAIProvider(req.nextUrl.searchParams.get('provider')) ?? DEFAULT_AI_PROVIDER;
    const runtime = getProviderRuntime(provider);
    const models = await runtime.listModels();
    return NextResponse.json({ provider, models });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch models';
    const status = message.includes('Not authenticated') ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
