import { NextRequest, NextResponse } from 'next/server';

import { getProviderRuntime } from '@/lib/ai-providers';
import { DEFAULT_AI_PROVIDER, parseAIProvider } from '@/lib/ai-providers/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const provider = parseAIProvider(typeof body?.provider === 'string' ? body.provider : null) ?? DEFAULT_AI_PROVIDER;

  try {
    const result = await getProviderRuntime(provider).validateConnection();

    return NextResponse.json(result, {
      status: result.ok ? 200 : 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider validation failed';
    return NextResponse.json(
      {
        provider,
        ok: false,
        message,
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
