import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PAPERS_DIR = path.join(DATA_DIR, 'papers');
const PAPERS_META = path.join(DATA_DIR, 'papers.json');

async function ensureDataDirs() {
  await fs.mkdir(PAPERS_DIR, { recursive: true });
  try {
    await fs.access(PAPERS_META);
  } catch {
    await fs.writeFile(PAPERS_META, '[]');
  }
}

// GET - List all papers
export async function GET() {
  try {
    await ensureDataDirs();
    const data = await fs.readFile(PAPERS_META, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json([]);
  }
}

// POST - Upload a new paper
export async function POST(req: NextRequest) {
  try {
    await ensureDataDirs();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const authors = formData.get('authors') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const fileName = `${id}-${file.name}`;
    const filePath = path.join(PAPERS_DIR, fileName);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Update metadata
    const metaData = await fs.readFile(PAPERS_META, 'utf-8');
    const papers = JSON.parse(metaData);
    const newPaper = {
      id,
      title: title || file.name.replace('.pdf', ''),
      authors: authors || 'Unknown',
      fileName,
      uploadedAt: new Date().toISOString(),
      tags: [],
    };
    papers.push(newPaper);
    await fs.writeFile(PAPERS_META, JSON.stringify(papers, null, 2));

    return NextResponse.json(newPaper, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
