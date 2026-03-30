import { NextRequest, NextResponse } from 'next/server';

import { getProviderRuntime } from '@/lib/ai-providers';
import { DEFAULT_AI_PROVIDER, parseAIProvider } from '@/lib/ai-providers/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const provider = parseAIProvider(req.nextUrl.searchParams.get('provider')) ?? DEFAULT_AI_PROVIDER;
    const status = await getProviderRuntime(provider).getStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load provider status';
    return NextResponse.json(
      {
        provider: parseAIProvider(req.nextUrl.searchParams.get('provider')) ?? DEFAULT_AI_PROVIDER,
        authenticated: false,
        error: message,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
