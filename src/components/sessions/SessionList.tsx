'use client';

import Link from 'next/link';
import { mockSessions } from '@/lib/mock-data';
import { FileText, ChevronDown } from 'lucide-react';

function groupByDate(sessions: typeof mockSessions) {
  const groups: Record<string, typeof mockSessions> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  sessions.forEach((session) => {
    const date = new Date(session.createdAt).toDateString();
    let label: string;
    if (date === today) label = 'Today';
    else if (date === yesterday) label = 'Yesterday';
    else label = new Date(session.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(session);
  });

  return groups;
}

export function SessionList() {
  const groups = groupByDate(mockSessions);

  return (
    <div className="space-y-8 mb-12">
      {Object.entries(groups).map(([dateLabel, sessions]) => (
        <div key={dateLabel}>
          <h2 className="text-sm font-semibold text-on-surface mb-4">{dateLabel}</h2>

          {sessions.length > 0 && sessions[0] === mockSessions[0] || sessions[0] === mockSessions[1] ? (
            // Full-width cards for today's sessions
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href="/workspace"
                  className="block bg-surface-container-lowest rounded-lg p-5 hover:shadow-ambient transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                      <FileText size={18} strokeWidth={1.8} className="text-on-surface-variant" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-semibold text-on-surface group-hover:text-primary transition-colors">
                          {session.paperTitle}
                        </h3>
                        <span className="text-[11px] text-outline shrink-0 ml-4">
                          {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mb-2">
                        Associated PDF: {session.fileName}
                      </p>
                      <p className="font-editorial text-sm text-on-surface-variant italic leading-relaxed line-clamp-2">
                        {session.summary}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {session.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-tertiary-fixed/20 text-on-surface-variant"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            // Grid cards for older sessions
            <div className="grid grid-cols-2 gap-4">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href="/workspace"
                  className="bg-surface-container-lowest rounded-lg p-5 hover:shadow-ambient transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                      <FileText size={15} strokeWidth={1.8} className="text-on-surface-variant" />
                    </div>
                    <span className="text-[11px] text-outline ml-auto">
                      {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface mb-2 group-hover:text-primary transition-colors">
                    {session.paperTitle}
                  </h3>
                  <p className="font-editorial text-xs text-on-surface-variant italic leading-relaxed line-clamp-2 mb-3">
                    {session.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {session.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Resume Session
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Load more */}
      <div className="flex justify-center pt-4">
        <button className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
          <ChevronDown size={14} strokeWidth={2} />
          Load Older Sessions
        </button>
      </div>
    </div>
  );
}
