'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Library,
  Clock,
  Settings,
  Plus,
} from 'lucide-react';

const navItems = [
  { href: '/', icon: Library, label: 'Library' },
  { href: '/sessions', icon: Clock, label: 'Sessions' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Hide sidebar on workspace page
  if (pathname.startsWith('/workspace')) return null;

  return (
    <aside className="w-[60px] bg-surface-container flex flex-col items-center py-6 gap-2 shrink-0">
      {/* Logo */}
      <Link
        href="/"
        className="w-9 h-9 rounded-lg bg-on-surface text-surface-container-lowest flex items-center justify-center font-bold text-sm mb-6"
      >
        A.
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`
                relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                ${isActive
                  ? 'bg-surface-container-lowest text-on-surface'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
                }
              `}
            >
              <Icon size={20} strokeWidth={1.8} />
              {hoveredItem === item.href && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded text-xs font-medium bg-on-surface text-surface-container-lowest whitespace-nowrap z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* FAB */}
      <button className="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface-variant flex items-center justify-center hover:bg-surface-container-high transition-colors shadow-ambient">
        <Plus size={18} strokeWidth={2} />
      </button>
    </aside>
  );
}
