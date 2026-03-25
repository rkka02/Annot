import { NextResponse } from 'next/server';
import { getValidToken } from '@/lib/oauth';

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

// GET /api/models — Fetch available models from OpenAI
export async function GET() {
  const accessToken = await getValidToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated. Please connect OpenAI in Settings.' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch models: ${text}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const models: OpenAIModel[] = data.data;

    // Filter to chat-capable models (gpt-*) and sort by creation date (newest first)
    const chatModels = models
      .filter((m) => m.id.startsWith('gpt-') || m.id.startsWith('o') || m.id.startsWith('chatgpt-'))
      .filter((m) => !m.id.includes('instruct') && !m.id.includes('realtime') && !m.id.includes('audio') && !m.id.includes('tts') && !m.id.includes('whisper') && !m.id.includes('dall-e') && !m.id.includes('embedding'))
      .sort((a, b) => b.created - a.created)
      .map((m) => ({
        id: m.id,
        owned_by: m.owned_by,
        created: m.created,
      }));

    return NextResponse.json({ models: chatModels });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
