'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, User } from 'lucide-react';

const tabs = [
  { label: 'Drafts', href: '/' },
  { label: 'Archive', href: '/sessions' },
  { label: 'Shared', href: '#' },
];

export function Topbar() {
  const pathname = usePathname();

  if (pathname.startsWith('/workspace')) return null;

  return (
    <header className="h-14 px-6 flex items-center justify-between shrink-0 bg-surface">
      {/* Left: Brand + Tabs */}
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold text-on-surface tracking-tight">
          Annot
        </span>
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`
                  px-3 py-1.5 rounded text-sm font-medium transition-colors
                  ${isActive
                    ? 'text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface'
                  }
                `}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant">
          <Search size={14} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search library..."
            className="bg-transparent text-sm outline-none w-40 placeholder:text-outline"
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
