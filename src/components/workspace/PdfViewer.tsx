'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '@/lib/workspace-store';
import { Highlight } from '@/types';
import {
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pen,
  Highlighter,
  Eraser,
  Download,
  X,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const HIGHLIGHTS_STORAGE_KEY = 'annot-pdf-highlights';

type HighlightMode = Highlight['type'] | null;
type PdfViewMode = 'paged' | 'scroll';
type NormalizedHighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function loadHighlights(): Record<string, Highlight[]> {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, Highlight[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveHighlights(nextHighlights: Record<string, Highlight[]>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(nextHighlights));
}

function getStoredHighlights(pdfPath: string): Highlight[] {
  const highlightStore = loadHighlights();
  return highlightStore[pdfPath] ?? [];
}

function setStoredHighlights(pdfPath: string, nextHighlights: Highlight[]): void {
  const highlightStore = loadHighlights();
  if (nextHighlights.length === 0) {
    delete highlightStore[pdfPath];
  } else {
    highlightStore[pdfPath] = nextHighlights;
  }
  saveHighlights(highlightStore);
}

function getHighlightRects(highlight: Highlight): NormalizedHighlightRect[] {
  return highlight.rects?.length ? highlight.rects : [highlight.position];
}

function buildHighlightSignature(highlight: Highlight): string {
  const rects = getHighlightRects(highlight)
    .map((rect) => (
      `${rect.x.toFixed(4)}:${rect.y.toFixed(4)}:${rect.width.toFixed(4)}:${rect.height.toFixed(4)}`
    ))
    .join('|');

  return [
    highlight.page,
    highlight.type,
    highlight.text.trim().toLowerCase(),
    rects,
  ].join('::');
}

function mergeHighlights(highlights: Highlight[]): Highlight[] {
  const seen = new Set<string>();
  const merged: Highlight[] = [];

  for (const highlight of highlights) {
    const signature = buildHighlightSignature(highlight);
    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    merged.push(highlight);
  }

  return merged;
}

export function PdfViewer() {
  const { activePdf, closePdf, activeSessionFolder, chatOpen, toggleChat } = useWorkspace();
  const activePdfPath = activePdf?.path ?? '';
  const [zoom, setZoom] = useState(125);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<PdfViewMode>('scroll');
  const [containerWidth, setContainerWidth] = useState(720);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>(null);
  const [eraseMode, setEraseMode] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [annotationSyncing, setAnnotationSyncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageShellRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const fileUrl = useMemo(
    () => `/api/workspace/file?path=${encodeURIComponent(activePdfPath)}`,
    [activePdfPath],
  );
  const pageWidth = Math.max(320, Math.floor((containerWidth * zoom) / 100));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resize = () => {
      setContainerWidth(Math.max(320, element.clientWidth - 48));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectionNotice) return;

    const timeout = window.setTimeout(() => {
      setSelectionNotice(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [selectionNotice]);

  useEffect(() => {
    if (!activePdfPath) {
      setHighlights([]);
      return;
    }

    let cancelled = false;

    const loadPdfHighlights = async () => {
      setAnnotationSyncing(true);

      const legacyHighlights = getStoredHighlights(activePdfPath);

      try {
        const res = await fetch(`/api/workspace/annotations?path=${encodeURIComponent(activePdfPath)}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (!res.ok || data?.error) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load PDF annotations.');
        }

        let nextHighlights = Array.isArray(data.highlights) ? data.highlights as Highlight[] : [];

        if (legacyHighlights.length > 0) {
          try {
            const migrateRes = await fetch('/api/workspace/annotations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pdfPath: activePdfPath,
                highlights: legacyHighlights,
              }),
            });
            const migrateData = await migrateRes.json();

            if (!migrateRes.ok || migrateData?.error) {
              throw new Error(typeof migrateData?.error === 'string' ? migrateData.error : 'Failed to migrate local highlights.');
            }

            nextHighlights = Array.isArray(migrateData.highlights)
              ? migrateData.highlights as Highlight[]
              : nextHighlights;
            setStoredHighlights(activePdfPath, []);

            if (!cancelled && typeof migrateData.migrated === 'number' && migrateData.migrated > 0) {
              setSelectionNotice(`Migrated ${migrateData.migrated} local highlight${migrateData.migrated === 1 ? '' : 's'} into the PDF.`);
            }
          } catch (error) {
            nextHighlights = mergeHighlights([...nextHighlights, ...legacyHighlights]);

            if (!cancelled) {
              const message = error instanceof Error
                ? error.message
                : 'Could not migrate existing local highlights yet.';
              setSelectionNotice(message);
            }
          }
        }

        if (!cancelled) {
          setHighlights(nextHighlights);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Failed to load PDF annotations.';
          const fallbackHighlights = legacyHighlights.length > 0 ? legacyHighlights : [];
          setHighlights(fallbackHighlights);
          setSelectionNotice(message);
        }
      } finally {
        if (!cancelled) {
          setAnnotationSyncing(false);
        }
      }
    };

    void loadPdfHighlights();

    return () => {
      cancelled = true;
    };
  }, [activePdfPath]);

  useEffect(() => {
    if (viewMode !== 'scroll' || !numPages) return;

    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const mostVisibleEntry = visibleEntries[0];
        if (!mostVisibleEntry) return;

        const nextPage = Number((mostVisibleEntry.target as HTMLDivElement).dataset.pageNumber);
        if (!Number.isNaN(nextPage)) {
          setPageNumber(nextPage);
        }
      },
      {
        root,
        threshold: [0.25, 0.5, 0.75],
      },
    );

    Object.values(pageShellRefs.current).forEach((pageShell) => {
      if (pageShell) {
        observer.observe(pageShell);
      }
    });

    return () => observer.disconnect();
  }, [viewMode, numPages, pageWidth, activePdfPath]);

  const handleDocumentLoadSuccess = ({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
    setPageNumber((current) => Math.min(current, nextNumPages));
  };

  const canGoPrev = pageNumber > 1;
  const canGoNext = numPages !== null && pageNumber < numPages;
  const highlightsByPage = useMemo(() => {
    return highlights.reduce<Record<number, Highlight[]>>((accumulator, highlight) => {
      accumulator[highlight.page] ??= [];
      accumulator[highlight.page].push(highlight);
      return accumulator;
    }, {});
  }, [highlights]);
  const handlePageChange = (nextPage: number) => {
    setSelectionNotice(null);

    if (viewMode === 'scroll') {
      const pageShell = pageShellRefs.current[nextPage];
      if (pageShell) {
        pageShell.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
      }
    }

    setPageNumber(nextPage);
  };

  const getSelectionRects = (pageShell: HTMLDivElement | null): NormalizedHighlightRect[] => {
    const selection = window.getSelection();

    if (!selection || !pageShell || selection.rangeCount === 0) {
      return [];
    }

    const pageRect = pageShell.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    return Array.from(range.getClientRects())
      .map((rect) => {
        const x = Math.max(0, rect.left - pageRect.left);
        const y = Math.max(0, rect.top - pageRect.top);
        const width = Math.min(pageRect.width - x, rect.width);
        const height = Math.min(pageRect.height - y, rect.height);

        if (width <= 1 || height <= 1) {
          return null;
        }

        return {
          x: x / pageRect.width,
          y: y / pageRect.height,
          width: width / pageRect.width,
          height: height / pageRect.height,
        };
      })
      .filter((rect): rect is NormalizedHighlightRect => rect !== null);
  };

  const handleHighlightSelection = async (targetPage: number, pageShell: HTMLDivElement | null) => {
    if (!highlightMode || eraseMode || !activePdfPath || annotationSyncing) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? '';
    const rects = getSelectionRects(pageShell);

    if (!selection || !selectedText || rects.length === 0) {
      setSelectionNotice('This PDF page has no selectable text in the current selection.');
      return;
    }

    if (rects.length === 0) {
      setSelectionNotice('This selection could not be converted into a highlight.');
      return;
    }

    const nextHighlight: Highlight = {
      id: crypto.randomUUID(),
      pdfPath: activePdfPath,
      page: targetPage,
      type: highlightMode,
      text: selectedText,
      rects,
      position: rects[0],
    };
    selection.removeAllRanges();

    try {
      setAnnotationSyncing(true);

      const res = await fetch('/api/workspace/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfPath: activePdfPath,
          highlights: [nextHighlight],
        }),
      });
      const data = await res.json();

      if (!res.ok || data?.error) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to save highlight.');
      }

      const legacyHighlights = getStoredHighlights(activePdfPath);
      setHighlights(mergeHighlights([...(data.highlights as Highlight[]), ...legacyHighlights]));
      setSelectionNotice(`${highlightMode === 'important' ? 'Important' : 'Unknown'} highlight saved to the PDF.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save highlight.';
      setSelectionNotice(message);
    } finally {
      setAnnotationSyncing(false);
    }
  };

  const selectionContainsHighlightRect = (
    selectionRect: NormalizedHighlightRect,
    highlightRect: NormalizedHighlightRect,
  ): boolean => {
    const centerX = highlightRect.x + highlightRect.width / 2;
    const centerY = highlightRect.y + highlightRect.height / 2;

    return (
      centerX >= selectionRect.x &&
      centerX <= selectionRect.x + selectionRect.width &&
      centerY >= selectionRect.y &&
      centerY <= selectionRect.y + selectionRect.height
    );
  };

  const handleEraseSelection = async (targetPage: number, pageShell: HTMLDivElement | null) => {
    if (!eraseMode || annotationSyncing || !activePdfPath) return;

    const selection = window.getSelection();
    const rects = getSelectionRects(pageShell);
    const pageHighlights = highlightsByPage[targetPage] ?? [];

    if (!selection || rects.length === 0) {
      setSelectionNotice('지울 하이라이트가 걸치도록 텍스트를 선택해 주세요.');
      return;
    }

    const removableIds = new Set(
      pageHighlights
        .filter((highlight) => {
          const highlightRects = getHighlightRects(highlight);
          return highlightRects.some((highlightRect) => (
            rects.some((selectionRect) => selectionContainsHighlightRect(selectionRect, highlightRect))
          ));
        })
        .map((highlight) => highlight.id),
    );

    if (removableIds.size === 0) {
      selection.removeAllRanges();
      setSelectionNotice('선택 영역 안에 삭제할 하이라이트가 없습니다.');
      return;
    }

    selection.removeAllRanges();

    const removableHighlights = highlights.filter((highlight) => removableIds.has(highlight.id));
    const nativeAnnotationIds = removableHighlights
      .map((highlight) => highlight.annotationId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    const remainingLegacyHighlights = highlights.filter((highlight) => (
      !highlight.annotationId && !removableIds.has(highlight.id)
    ));

    try {
      setAnnotationSyncing(true);

      if (nativeAnnotationIds.length > 0) {
        const res = await fetch('/api/workspace/annotations', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfPath: activePdfPath,
            annotationIds: nativeAnnotationIds,
          }),
        });
        const data = await res.json();

        if (!res.ok || data?.error) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to erase highlight.');
        }

        const nativeHighlights = Array.isArray(data.highlights) ? data.highlights as Highlight[] : [];
        setStoredHighlights(activePdfPath, remainingLegacyHighlights);
        setHighlights(mergeHighlights([...nativeHighlights, ...remainingLegacyHighlights]));
      } else {
        setStoredHighlights(activePdfPath, remainingLegacyHighlights);
        setHighlights((current) => current.filter((highlight) => !removableIds.has(highlight.id)));
      }

      setSelectionNotice(`Removed ${removableIds.size} highlight${removableIds.size === 1 ? '' : 's'}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to erase highlight.';
      setSelectionNotice(message);
    } finally {
      setAnnotationSyncing(false);
    }
  };

  const renderPageShell = (targetPage: number) => {
    const pageHighlights = highlightsByPage[targetPage] ?? [];

    return (
      <div
        key={targetPage}
        ref={(node) => {
          pageShellRefs.current[targetPage] = node;
        }}
        data-page-number={targetPage}
        className="pdf-page-shell overflow-hidden rounded-xl shadow-ambient"
        onMouseUp={() => {
          const pageShell = pageShellRefs.current[targetPage];

          if (eraseMode) {
            void handleEraseSelection(targetPage, pageShell);
            return;
          }

          void handleHighlightSelection(targetPage, pageShell);
        }}
      >
        <Page
          pageNumber={targetPage}
          width={pageWidth}
          renderAnnotationLayer={false}
          renderTextLayer
          loading={
            <div className="bg-surface-container-lowest rounded-xl shadow-ambient min-h-[560px] w-full max-w-[900px] flex items-center justify-center gap-2 text-sm text-on-surface-variant">
              <Loader2 size={16} className="animate-spin" />
              Rendering page...
            </div>
          }
          error={
            <div className="bg-surface-container-lowest rounded-xl shadow-ambient min-h-[560px] w-full max-w-[900px] flex items-center justify-center px-6 text-sm text-error text-center">
              This page could not be rendered.
            </div>
          }
        />
        <div className="pdf-highlight-layer">
          {pageHighlights.map((highlight) => {
            const rects = highlight.rects?.length ? highlight.rects : [highlight.position];

            return rects.map((rect, index) => (
              <div
                key={`${highlight.id}-${index}`}
                className={`pdf-highlight-box pdf-highlight-box--${highlight.type}`}
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.width * 100}%`,
                  height: `${rect.height * 100}%`,
                }}
                title={highlight.text}
              />
            ));
          })}
        </div>
      </div>
    );
  };

  if (!activePdf) return null;

  return (
    <div className="h-full flex flex-col">
      {/* PDF Toolbar */}
      <div className="h-10 px-4 flex items-center justify-between bg-surface shrink-0">
        {/* Left: file name */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={closePdf}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0"
          >
            <X size={13} strokeWidth={2} />
          </button>
          <span className="text-xs font-medium text-on-surface truncate">
            {activePdf.name}
          </span>
        </div>

        {/* Center: controls */}
        <div className="flex items-center gap-1 glass rounded-lg px-2 py-0.5">
          <button
            onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
            disabled={!canGoPrev}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => handlePageChange(numPages ? Math.min(numPages, pageNumber + 1) : pageNumber)}
            disabled={!canGoNext}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>

          <span className="ml-1 text-[11px] text-on-surface-variant font-medium tabular-nums min-w-14 text-center">
            {numPages ? `${pageNumber}/${numPages}` : '1/-'}
          </span>

          <div className="w-px h-4 bg-outline-variant/30 mx-0.5" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('paged')}
              className={`h-6 rounded px-2 text-[11px] font-medium transition-colors ${
                viewMode === 'paged'
                  ? 'bg-on-surface text-surface-container-lowest'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
              title="Single-page mode"
            >
              Page
            </button>
            <button
              onClick={() => {
                setViewMode('scroll');
                window.requestAnimationFrame(() => {
                  const pageShell = pageShellRefs.current[pageNumber];
                  pageShell?.scrollIntoView({
                    block: 'start',
                    behavior: 'smooth',
                  });
                });
              }}
              className={`h-6 rounded px-2 text-[11px] font-medium transition-colors ${
                viewMode === 'scroll'
                  ? 'bg-on-surface text-surface-container-lowest'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
              title="Vertical scroll mode"
            >
              Scroll
            </button>
          </div>

          <div className="w-px h-4 bg-outline-variant/30 mx-0.5" />

          <span className="text-[11px] text-on-surface-variant font-medium tabular-nums w-9 text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Minus size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
          </button>

          <div className="w-px h-4 bg-outline-variant/30 mx-0.5" />

          <button
            onClick={() => {
              setEraseMode(false);
              setHighlightMode((current) => current === 'unknown' ? null : 'unknown');
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              highlightMode === 'unknown'
                ? 'bg-error text-on-error'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
            title="Toggle unknown highlight mode"
          >
            <Pen size={12} strokeWidth={2} />
          </button>
          <button
            onClick={() => {
              setEraseMode(false);
              setHighlightMode((current) => current === 'important' ? null : 'important');
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              highlightMode === 'important'
                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                : 'text-tertiary-fixed hover:bg-surface-container-high'
            }`}
            title="Toggle important highlight mode"
          >
            <Highlighter size={12} strokeWidth={2} />
          </button>
          <button
            onClick={() => {
              setHighlightMode(null);
              setEraseMode((current) => !current);
            }}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              eraseMode
                ? 'bg-on-surface text-surface-container-lowest'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
            title="Toggle highlight eraser"
          >
            <Eraser size={12} strokeWidth={2} />
          </button>
          <a
            href={fileUrl}
            download={activePdf.name}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="Download PDF"
          >
            <Download size={12} strokeWidth={2} />
          </a>
        </div>

        {/* Right: chat toggle */}
        <div>
          {activeSessionFolder && (
            <button
              onClick={toggleChat}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                chatOpen
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <MessageSquare size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto bg-surface-dim">
        <div className="max-w-5xl mx-auto py-8 px-6">
          <div className="mb-4 px-2">
            <div className="text-[11px] uppercase tracking-widest text-on-surface-variant font-medium mb-1">
              {activePdf.path}
            </div>
            <h1 className="text-lg font-semibold text-on-surface truncate">
              {activePdf.name}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-on-surface-variant">
              {eraseMode ? (
                <span>Erase mode is on. Select text over highlighted content to remove those PDF highlights.</span>
              ) : highlightMode ? (
                <span>
                  {highlightMode === 'important' ? 'Important' : 'Unknown'} highlight mode is on. Select text on the page to save a PDF highlight.
                </span>
              ) : (
                <span>Selectable text can be dragged directly on PDFs that include a text layer.</span>
              )}
              {annotationSyncing && (
                <span className="text-outline">Syncing annotations...</span>
              )}
              {selectionNotice && (
                <span className="text-outline">{selectionNotice}</span>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <Document
              file={fileUrl}
              loading={
                <div className="bg-surface-container-lowest rounded-xl shadow-ambient min-h-[560px] w-full max-w-[900px] flex items-center justify-center gap-2 text-sm text-on-surface-variant">
                  <Loader2 size={16} className="animate-spin" />
                  Loading PDF...
                </div>
              }
              error={
                <div className="bg-surface-container-lowest rounded-xl shadow-ambient min-h-[560px] w-full max-w-[900px] flex items-center justify-center px-6 text-sm text-error text-center">
                  Failed to load this PDF.
                </div>
              }
              onLoadSuccess={handleDocumentLoadSuccess}
            >
              {viewMode === 'scroll' ? (
                <div className="flex flex-col items-center gap-6">
                  {Array.from({ length: numPages ?? 0 }, (_, index) => renderPageShell(index + 1))}
                </div>
              ) : (
                renderPageShell(pageNumber)
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
