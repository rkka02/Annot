import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/oauth';

export async function POST(req: NextRequest) {
  try {
    const { messages, pdfContext, model } = await req.json();

    // Get OAuth token
    const accessToken = await getValidToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect OpenAI in Settings.' },
        { status: 401 }
      );
    }

    const systemPrompt = `You are a research assistant helping a user understand an academic paper.
${pdfContext ? `\nThe user is currently reading a paper. Here is the relevant context:\n${pdfContext}` : ''}
Provide clear, accurate, and well-structured responses. Use markdown formatting when helpful.
When referencing specific parts of the paper, be precise about locations.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `OpenAI API error: ${error}` }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({
      content: data.choices[0].message.content,
      model: model || 'gpt-4o-mini',
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
