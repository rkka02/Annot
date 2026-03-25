import { NextRequest, NextResponse } from 'next/server';

import { saveUploadedPdf } from '@/lib/workspace-tree';

// GET - List all papers
export async function GET() {
  return NextResponse.json([]);
}

// POST - Upload a new paper
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderPath = (formData.get('folderPath') as string | null)?.trim() || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const uploadedPdf = await saveUploadedPdf(folderPath, file);
    return NextResponse.json(uploadedPdf, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
