import { NextRequest, NextResponse } from 'next/server';

import { getProviderRuntime } from '@/lib/ai-providers';
import { getSession, updateSession } from '@/lib/annot-sessions';
import { generateSessionTurnSummaries } from '@/lib/chat-turn-summary';
import { buildSessionSummaryMarkdown } from '@/lib/session-summary-markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      folderPath,
      sessionId,
      model,
    } = body as {
      folderPath?: string;
      sessionId?: string;
      model?: string;
    };

    if (!folderPath?.trim() || !sessionId?.trim()) {
      return NextResponse.json({ error: 'folderPath and sessionId are required' }, { status: 400 });
    }

    const session = await getSession(folderPath.trim(), sessionId.trim());
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const resolvedModel = model || session.model || 'gpt-5.4-mini';
    const runtimeProvider = getProviderRuntime(session.provider);
    const turnSummaries = await generateSessionTurnSummaries({
      runtime: runtimeProvider,
      provider: session.provider,
      model: resolvedModel,
      session,
    });

    const updatedSession = await updateSession(folderPath.trim(), sessionId.trim(), {
      turnSummaries,
    });
    const markdown = buildSessionSummaryMarkdown(updatedSession);

    return NextResponse.json({
      session: updatedSession,
      markdown,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export session summaries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
