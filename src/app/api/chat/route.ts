import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, pdfContext } = await req.json();

    // Build system prompt with PDF context
    const systemPrompt = `You are a research assistant helping a user understand an academic paper.
${pdfContext ? `\nThe user is currently reading a paper. Here is the relevant context:\n${pdfContext}` : ''}
Provide clear, accurate, and well-structured responses. Use markdown formatting when helpful.
When referencing specific parts of the paper, be precise about locations.`;

    if (model === 'claude') {
      // Claude API call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error: `Claude API error: ${error}` }, { status: 500 });
      }

      const data = await response.json();
      return NextResponse.json({
        content: data.content[0].text,
        model: 'claude',
      });
    } else {
      // OpenAI API call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
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
        model: 'gpt',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
