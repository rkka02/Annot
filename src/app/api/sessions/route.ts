import { NextRequest, NextResponse } from 'next/server';
import { buildSessionTitle, createSession, getSession, listSessions, updateSession } from '@/lib/annot-sessions';
import { SessionKind } from '@/types';

function parseSessionKind(value: string | null): SessionKind | undefined {
  if (value === 'folder' || value === 'pdf') {
    return value;
  }

  return undefined;
}

// GET - List all sessions
export async function GET(req: NextRequest) {
  try {
    const folderPath = req.nextUrl.searchParams.get('folderPath');
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    const sessionKind = parseSessionKind(req.nextUrl.searchParams.get('sessionKind'));
    const pdfPath = req.nextUrl.searchParams.get('pdfPath');

    if (!folderPath) {
      return NextResponse.json({ error: 'folderPath is required' }, { status: 400 });
    }

    if (sessionId) {
      const session = await getSession(folderPath, sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    return NextResponse.json(await listSessions(folderPath, {
      sessionKind,
      pdfPath,
    }));
  } catch {
    return NextResponse.json([]);
  }
}

// POST - Create a new session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folderPath, title, model } = body as {
      folderPath?: string;
      title?: string;
      model?: string;
      sessionKind?: SessionKind;
      pdfPath?: string | null;
    };

    if (!folderPath) {
      return NextResponse.json({ error: 'folderPath is required' }, { status: 400 });
    }

    const sessionKind = body?.sessionKind === 'pdf' ? 'pdf' : 'folder';
    const pdfPath = typeof body?.pdfPath === 'string' ? body.pdfPath : null;

    if (sessionKind === 'pdf' && !pdfPath) {
      return NextResponse.json({ error: 'pdfPath is required for PDF sessions' }, { status: 400 });
    }

    const newSession = await createSession(
      folderPath,
      title?.trim() || buildSessionTitle(folderPath, sessionKind, pdfPath),
      {
        model,
        sessionKind,
        pdfPath,
      },
    );

    return NextResponse.json(newSession, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// PUT - Update a session
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      folderPath,
      id,
      messages,
      title,
      codexSessionId,
      model,
    } = body as {
      folderPath?: string;
      id?: string;
      messages?: unknown;
      title?: string;
      codexSessionId?: string;
      model?: string;
    };

    if (!folderPath || !id) {
      return NextResponse.json({ error: 'folderPath and id are required' }, { status: 400 });
    }

    const session = await updateSession(folderPath, id, {
      messages: Array.isArray(messages) ? messages : undefined,
      title,
      codexSessionId,
      model,
    });

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
