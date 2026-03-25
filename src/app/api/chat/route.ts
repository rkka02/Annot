import { NextRequest, NextResponse } from 'next/server';
import { sendCodexChat } from '@/lib/codex-auth';

export async function POST(req: NextRequest) {
  try {
    const { messages, pdfContext, model } = await req.json();
    const data = await sendCodexChat(messages, model || 'gpt-5.4-mini', pdfContext);
    return NextResponse.json({
      content: data.content,
      model: data.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Not authenticated') ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
