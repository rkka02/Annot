'use client';

import { Search, Settings, MessageSquare } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-store';
import Link from 'next/link';

export function Topbar() {
  const { activeSessionFolder, chatOpen, toggleChat } = useWorkspace();

  return (
    <header className="h-12 px-4 flex items-center justify-between shrink-0 bg-surface">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-on-surface text-surface-container-lowest flex items-center justify-center font-bold text-[11px]">
          A.
        </div>
        <span className="text-sm font-bold text-on-surface tracking-tight">Annot</span>
      </div>

      {/* Center: Breadcrumb (if session active) */}
      {activeSessionFolder && (
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          {activeSessionFolder.split('/').map((segment, i, arr) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-outline">/</span>}
              <span className={i === arr.length - 1 ? 'text-on-surface font-medium' : ''}>
                {segment}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <Search size={15} strokeWidth={2} />
        </button>
        {activeSessionFolder && (
          <button
            onClick={toggleChat}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              chatOpen
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <MessageSquare size={15} strokeWidth={2} />
          </button>
        )}
        <Link
          href="/settings"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <Settings size={15} strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
