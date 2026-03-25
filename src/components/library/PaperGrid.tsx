'use client';

import Link from 'next/link';
import { mockPapers } from '@/lib/mock-data';
import { MoreVertical, Calendar, Plus, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';

export function PaperGrid() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-on-surface">Papers</h2>
          <span className="text-xs text-on-surface-variant">Filter: Recent</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              viewMode === 'grid' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            <LayoutGrid size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
              viewMode === 'list' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            <List size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-5">
        {mockPapers.map((paper) => (
          <Link
            key={paper.id}
            href="/workspace"
            className="group bg-surface-container-lowest rounded-lg overflow-hidden hover:shadow-ambient transition-all"
          >
            {/* Thumbnail */}
            <div className="h-44 bg-surface-container-high relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-surface-container via-surface-container-high to-outline-variant opacity-60" />
              {paper.status && (
                <span className={`
                  absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm
                  ${paper.status === 'peer-reviewed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                  }
                `}>
                  {paper.status}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-on-surface mb-1 leading-snug group-hover:text-primary transition-colors">
                {paper.title}
              </h3>
              <p className="font-editorial text-xs text-on-surface-variant italic mb-3">
                {paper.authors}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <Calendar size={12} strokeWidth={2} />
                  <span className="text-[11px]">{paper.uploadedAt}</span>
                </div>
                <button
                  onClick={(e) => e.preventDefault()}
                  className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  <MoreVertical size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          </Link>
        ))}

        {/* Add new paper card */}
        <div className="bg-surface-container-low rounded-lg border border-dashed border-outline-variant flex flex-col items-center justify-center py-16 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-3">
            <Plus size={20} strokeWidth={2} />
          </div>
          <span className="text-sm font-medium">Add new paper</span>
          <span className="text-xs text-outline mt-0.5">Drop PDF here</span>
        </div>
      </div>
    </div>
  );
}
