import { promises as fs } from 'fs';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { resolveFolderPath } from '@/lib/annot-sessions';

export async function GET(req: NextRequest) {
  try {
    const relativePath = req.nextUrl.searchParams.get('path');

    if (!relativePath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const absolutePath = resolveFolderPath(relativePath);
    const stat = await fs.stat(absolutePath);

    if (!stat.isFile()) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(absolutePath);
    const fileName = path.basename(absolutePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(stat.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read file';
    const status = /ENOENT/.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
