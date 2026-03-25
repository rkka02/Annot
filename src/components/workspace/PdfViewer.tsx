'use client';

import { useState } from 'react';
import {
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pen,
  Highlighter,
  Download,
  ZoomIn,
} from 'lucide-react';

export function PdfViewer() {
  const [zoom, setZoom] = useState(125);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 12;

  return (
    <div className="h-full flex flex-col">
      {/* PDF Toolbar */}
      <div className="h-11 px-4 flex items-center justify-center gap-2 bg-surface shrink-0">
        <div className="flex items-center gap-1 glass rounded-lg px-2 py-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>

          <div className="w-px h-5 bg-outline-variant/30 mx-1" />

          <span className="text-xs text-on-surface-variant font-medium tabular-nums min-w-[40px] text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Minus size={14} strokeWidth={2} />
          </button>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
          </button>

          <div className="w-px h-5 bg-outline-variant/30 mx-1" />

          <button className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Pen size={13} strokeWidth={2} />
          </button>
          <button className="w-7 h-7 rounded flex items-center justify-center text-tertiary-fixed hover:bg-surface-container-high transition-colors">
            <Highlighter size={13} strokeWidth={2} />
          </button>
          <button className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Download size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 overflow-y-auto bg-surface-dim">
        <div className="max-w-3xl mx-auto py-8 px-12">
          {/* Simulated PDF Page */}
          <div className="bg-surface-container-lowest rounded shadow-ambient p-12 min-h-[800px]">
            {/* Paper metadata */}
            <div className="text-[11px] uppercase tracking-widest text-on-surface-variant font-medium mb-4">
              Technical Report | 81-24-09
            </div>

            <h1 className="text-3xl font-bold text-on-surface leading-tight mb-4 tracking-tight">
              Neural Curatorial Networks for Editorial Synthesis
            </h1>

            <p className="font-editorial text-sm text-on-surface-variant italic mb-8">
              Dr. Elias Thorne &middot; Oxford Institute of Digital Humanities
            </p>

            {/* Body text */}
            <div className="font-editorial text-base text-on-surface leading-relaxed space-y-5">
              <p>
                The proliferation of digital scholarly artifacts necessitates a new paradigm for
                synthesis. While current Large Language Models provide summarization
                capabilities, they often lack the{' '}
                <span className="highlight-important">
                  contextual nuance required for high-level academic curatorial workflows
                </span>
                . In this paper, we propose a framework for Tonal Layering in UI design that
                mirrors the cognitive load management seen in expert-level research environments.
              </p>

              <blockquote className="border-l-2 border-outline-variant pl-5 py-2 italic text-on-surface-variant">
                &ldquo;The design of an interface is not merely a cosmetic layer but a functional
                extension of the researcher&apos;s memory.&rdquo;
              </blockquote>

              <p>
                Our methodology focuses on the{' '}
                <span className="highlight-important">Asymmetrical Margin Principle (AMP)</span>,
                which suggests that focal concentration is improved when the visual canvas is
                distributed in a 70:30 ratio. This ratio minimizes the saccadic eye movement
                required to bridge the gap between primary reading and secondary AI-assisted
                interrogation.
              </p>

              <p>
                Experimental results indicate a 22% increase in recall when participants used
                interfaces that employed{' '}
                <span className="highlight-unknown">Newsreader Serif for long-form content</span>
                {' '}as opposed to standard sans-serif system fonts. The legibility of the serif
                terminal allows for faster scanning of dense technical nomenclature without
                sacrificing comprehension speed.
              </p>

              <p>
                The implications extend beyond mere aesthetics. By implementing the
                surface hierarchy model — where each functional zone occupies a distinct
                tonal layer — we observed a 15% reduction in task-switching latency.
                Participants reported feeling &ldquo;less fragmented&rdquo; when the
                interface provided clear spatial boundaries through color temperature
                rather than explicit borders.
              </p>

              <p>
                Furthermore, our analysis of annotation patterns reveals that researchers
                who utilized the dual-highlight system (important vs. unknown) demonstrated
                more structured note-taking behaviors. The color-coded system served as an
                external cognitive scaffold, enabling more efficient retrieval during
                subsequent review sessions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
