import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_META = path.join(DATA_DIR, 'sessions.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(SESSIONS_META);
  } catch {
    await fs.writeFile(SESSIONS_META, '[]');
  }
}

// GET - List all sessions
export async function GET() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(SESSIONS_META, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json([]);
  }
}

// POST - Create a new session
export async function POST(req: NextRequest) {
  try {
    await ensureDataDir();

    const body = await req.json();
    const { paperId, paperTitle, fileName } = body;

    const id = crypto.randomUUID();
    const newSession = {
      id,
      paperId,
      paperTitle,
      fileName,
      summary: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const data = await fs.readFile(SESSIONS_META, 'utf-8');
    const sessions = JSON.parse(data);
    sessions.push(newSession);
    await fs.writeFile(SESSIONS_META, JSON.stringify(sessions, null, 2));

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// PUT - Update a session (add messages, update summary)
export async function PUT(req: NextRequest) {
  try {
    await ensureDataDir();

    const body = await req.json();
    const { id, messages, summary, tags } = body;

    const data = await fs.readFile(SESSIONS_META, 'utf-8');
    const sessions = JSON.parse(data);
    const index = sessions.findIndex((s: { id: string }) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (messages) sessions[index].messages = messages;
    if (summary) sessions[index].summary = summary;
    if (tags) sessions[index].tags = tags;
    sessions[index].updatedAt = new Date().toISOString();

    await fs.writeFile(SESSIONS_META, JSON.stringify(sessions, null, 2));

    return NextResponse.json(sessions[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
