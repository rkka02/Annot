import { NextRequest, NextResponse } from 'next/server';

import {
  deleteWorkspacePdf,
  moveWorkspacePdf,
  renameWorkspacePdf,
  saveUploadedPdf,
} from '@/lib/workspace-tree';

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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      path,
      name,
      targetFolderPath,
      action,
    } = body as {
      path?: string;
      name?: string;
      targetFolderPath?: string;
      action?: 'rename' | 'move';
    };

    if (!path?.trim()) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (action === 'move') {
      if (typeof targetFolderPath !== 'string') {
        return NextResponse.json({ error: 'targetFolderPath is required' }, { status: 400 });
      }

      const movedPdf = await moveWorkspacePdf(path.trim(), targetFolderPath.trim());
      return NextResponse.json(movedPdf);
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const renamedPdf = await renameWorkspacePdf(path.trim(), name);
    return NextResponse.json(renamedPdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const pdfPath = req.nextUrl.searchParams.get('path')?.trim();
    if (!pdfPath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    await deleteWorkspacePdf(pdfPath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete PDF';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
