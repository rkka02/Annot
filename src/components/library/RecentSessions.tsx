'use client';

import Link from 'next/link';
import { mockRecentSessions } from '@/lib/mock-data';

export function RecentSessions() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-on-surface">Recent Sessions</h2>
        <Link href="/sessions" className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-wider">
          View All
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {mockRecentSessions.map((session) => (
          <Link
            key={session.id}
            href="/workspace"
            className="bg-surface-container-lowest rounded-lg p-4 hover:bg-surface-container-low transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`
                  text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm
                  ${session.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-surface-container-high text-on-surface-variant'
                  }
                `}
              >
                {session.status === 'active' ? 'Active Now' : 'Archive'}
              </span>
              <span className="text-[11px] text-outline">{session.timeAgo}</span>
            </div>
            <h3 className="text-sm font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">
              {session.title}
            </h3>
            <p className="font-editorial text-xs text-on-surface-variant italic leading-relaxed line-clamp-2">
              {session.summary}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
