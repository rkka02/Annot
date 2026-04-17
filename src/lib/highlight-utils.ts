import { Highlight } from '@/types';

export type HighlightRect = NonNullable<Highlight['rects']>[number];

const MIN_RECT_SIDE = 0.0005;

function sanitizeRect(rect: HighlightRect): HighlightRect | null {
  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);

  if (![x, y, width, height].every(Number.isFinite)) {
    return null;
  }

  if (width <= MIN_RECT_SIDE || height <= MIN_RECT_SIDE) {
    return null;
  }

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: Math.min(1, width),
    height: Math.min(1, height),
  };
}

function getVerticalOverlap(a: HighlightRect, b: HighlightRect): number {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, bottom - top);
}

function isContained(inner: HighlightRect, outer: HighlightRect): boolean {
  const tolerance = 0.0015;
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    inner.x + inner.width <= outer.x + outer.width + tolerance &&
    inner.y + inner.height <= outer.y + outer.height + tolerance
  );
}

function shouldMergeRects(a: HighlightRect, b: HighlightRect): boolean {
  const overlap = getVerticalOverlap(a, b);
  const minHeight = Math.min(a.height, b.height);
  const sameLine = overlap >= minHeight * 0.55;
  const horizontalGap = b.x - (a.x + a.width);
  const maxGap = Math.max(0.003, Math.min(a.height, b.height) * 0.65);

  return sameLine && horizontalGap <= maxGap;
}

function mergeRectPair(a: HighlightRect, b: HighlightRect): HighlightRect {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x + a.width, b.x + b.width);
  const y1 = Math.max(a.y + a.height, b.y + b.height);

  return {
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0,
  };
}

function rectKey(rect: HighlightRect): string {
  return [
    rect.x.toFixed(4),
    rect.y.toFixed(4),
    rect.width.toFixed(4),
    rect.height.toFixed(4),
  ].join(':');
}

export function normalizeHighlightRects(rects: HighlightRect[]): HighlightRect[] {
  const sorted = rects
    .map(sanitizeRect)
    .filter((rect): rect is HighlightRect => rect !== null)
    .sort((a, b) => {
      if (Math.abs(a.y - b.y) > 0.0025) {
        return a.y - b.y;
      }

      if (Math.abs(a.x - b.x) > 0.0025) {
        return a.x - b.x;
      }

      return b.width - a.width;
    });

  const merged: HighlightRect[] = [];

  for (const rect of sorted) {
    const last = merged.at(-1);
    if (last && shouldMergeRects(last, rect)) {
      merged[merged.length - 1] = mergeRectPair(last, rect);
      continue;
    }

    if (merged.some((existing) => isContained(rect, existing))) {
      continue;
    }

    merged.push(rect);
  }

  const deduped: HighlightRect[] = [];
  const seen = new Set<string>();

  for (const rect of merged) {
    const key = rectKey(rect);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(rect);
  }

  return deduped;
}

export function getHighlightRects(highlight: Pick<Highlight, 'rects' | 'position'>): HighlightRect[] {
  return normalizeHighlightRects(highlight.rects?.length ? highlight.rects : [highlight.position]);
}

export function normalizeHighlight<T extends Highlight>(highlight: T): T {
  const rects = getHighlightRects(highlight);
  return {
    ...highlight,
    rects,
    position: rects[0] ?? highlight.position,
  };
}

export function buildHighlightSignature(highlight: Highlight): string {
  if (highlight.annotationId) {
    return `annotation:${highlight.annotationId}`;
  }

  const rects = getHighlightRects(highlight)
    .map(rectKey)
    .join('|');

  return [
    highlight.page,
    highlight.type,
    highlight.text.trim().toLowerCase(),
    rects,
  ].join('::');
}

export function mergeHighlights<T extends Highlight>(highlights: T[]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const rawHighlight of highlights) {
    const highlight = normalizeHighlight(rawHighlight);
    const signature = buildHighlightSignature(highlight);
    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    merged.push(highlight);
  }

  return merged;
}
