import { NextRequest, NextResponse } from 'next/server';

import {
  deletePdfAnnotations,
  listPdfAnnotations,
  savePdfAnnotations,
  updatePdfAnnotations,
} from '@/lib/pdf-annotations';
import { Highlight } from '@/types';
import { normalizeHighlightRects } from '@/lib/highlight-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const pdfPath = req.nextUrl.searchParams.get('path')?.trim();
    if (!pdfPath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    const result = await listPdfAnnotations(pdfPath);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load PDF annotations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pdfPath,
      highlights,
    } = body as {
      pdfPath?: string;
      highlights?: Highlight[];
    };

    if (!pdfPath?.trim()) {
      return NextResponse.json({ error: 'pdfPath is required' }, { status: 400 });
    }

    if (!Array.isArray(highlights) || highlights.length === 0) {
      return NextResponse.json({ error: 'highlights are required' }, { status: 400 });
    }

    const result = await savePdfAnnotations(
      pdfPath.trim(),
      highlights.map((highlight) => ({
        page: highlight.page,
        type: highlight.type,
        text: highlight.text,
        note: highlight.note,
        rects: normalizeHighlightRects(highlight.rects?.length ? highlight.rects : [highlight.position]),
      })),
    );

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save PDF annotations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pdfPath,
      updates,
    } = body as {
      pdfPath?: string;
      updates?: Array<{
        annotationId?: string;
        note?: string;
        text?: string;
        type?: Highlight['type'];
      }>;
    };

    if (!pdfPath?.trim()) {
      return NextResponse.json({ error: 'pdfPath is required' }, { status: 400 });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates are required' }, { status: 400 });
    }

    const normalizedUpdates = updates
      .filter((update) => typeof update.annotationId === 'string' && update.annotationId.trim().length > 0)
      .map((update) => ({
        annotationId: update.annotationId!.trim(),
        note: typeof update.note === 'string' ? update.note : undefined,
        text: typeof update.text === 'string' ? update.text : undefined,
        type: update.type,
      }));

    if (normalizedUpdates.length === 0) {
      return NextResponse.json({ error: 'valid annotationId values are required' }, { status: 400 });
    }

    const result = await updatePdfAnnotations(pdfPath.trim(), normalizedUpdates);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update PDF annotations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pdfPath,
      annotationIds,
    } = body as {
      pdfPath?: string;
      annotationIds?: string[];
    };

    if (!pdfPath?.trim()) {
      return NextResponse.json({ error: 'pdfPath is required' }, { status: 400 });
    }

    if (!Array.isArray(annotationIds) || annotationIds.length === 0) {
      return NextResponse.json({ error: 'annotationIds are required' }, { status: 400 });
    }

    const result = await deletePdfAnnotations(pdfPath.trim(), annotationIds);
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete PDF annotations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
