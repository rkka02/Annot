'use client';

import Link from 'next/link';
import {
  Library,
  Clock,
  Settings,
  Search,
  Bell,
  User,
  ChevronLeft,
} from 'lucide-react';

export function WorkspaceTopbar() {
  return (
    <header className="h-14 px-4 flex items-center justify-between shrink-0 bg-surface">
      <div className="flex items-center gap-4">
        {/* Back + Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-on-surface text-surface-container-lowest flex items-center justify-center font-bold text-xs">
            A.
          </div>
        </Link>

        {/* Navigation icons */}
        <nav className="flex items-center gap-1 ml-2">
          <Link href="/" className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Library size={16} strokeWidth={1.8} />
          </Link>
          <Link href="/sessions" className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Clock size={16} strokeWidth={1.8} />
          </Link>
          <Link href="/settings" className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Settings size={16} strokeWidth={1.8} />
          </Link>
        </nav>

        {/* Tabs */}
        <div className="flex items-center gap-1 ml-4">
          <span className="px-3 py-1.5 text-sm font-medium text-on-surface-variant">Drafts</span>
          <span className="px-3 py-1.5 text-sm font-medium text-on-surface border-b-2 border-on-surface">Archive</span>
          <span className="px-3 py-1.5 text-sm font-medium text-on-surface-variant">Shared</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant">
          <Search size={14} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search research..."
            className="bg-transparent text-sm outline-none w-36 placeholder:text-outline"
          />
        </div>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
          <Bell size={16} strokeWidth={2} />
        </button>
        <button className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center">
          <User size={14} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
