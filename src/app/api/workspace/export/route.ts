import { NextRequest, NextResponse } from 'next/server';

import {
  buildPdfHighlightsMarkdown,
  getPdfHighlightsMarkdownFileName,
  listPdfAnnotations,
} from '@/lib/pdf-annotations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const pdfPath = req.nextUrl.searchParams.get('path')?.trim();
    const format = req.nextUrl.searchParams.get('format')?.trim() || 'markdown';

    if (!pdfPath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (format !== 'markdown') {
      return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
    }

    const result = await listPdfAnnotations(pdfPath);
    const markdown = buildPdfHighlightsMarkdown(pdfPath, result.highlights);
    const fileName = getPdfHighlightsMarkdownFileName(pdfPath);

    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export markdown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
