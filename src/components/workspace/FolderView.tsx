'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/workspace-store';
import { collectPdfs } from '@/lib/tree-utils';
import { FileText, MessageSquare, Clock, Loader2 } from 'lucide-react';
import { Session } from '@/types';

export function FolderView() {
  const { selectedNode, openPdf, openSession } = useWorkspace();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const isFolderSelected = selectedNode?.type === 'folder';
  const folderPath = isFolderSelected ? selectedNode.path : null;
  const pdfs = isFolderSelected ? collectPdfs(selectedNode) : [];

  useEffect(() => {
    if (!folderPath) {
      setSessions([]);
      return;
    }

    let cancelled = false;

    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        const params = new URLSearchParams({
          folderPath,
          sessionKind: 'folder',
        });
        const res = await fetch(`/api/sessions?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          setSessions(
            Array.isArray(data)
              ? data.filter((session): session is Session => (
                typeof session === 'object' &&
                session !== null &&
                session.sessionKind === 'folder' &&
                !session.pdfPath
              ))
              : [],
          );
        }
      } catch {
        if (!cancelled) {
          setSessions([]);
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false);
        }
      }
    };

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [folderPath]);

  if (!isFolderSelected) return null;

  const handleCreateSession = async () => {
    if (!folderPath) return;

    setCreatingSession(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath,
          title: `${selectedNode.name} session`,
          sessionKind: 'folder',
        }),
      });
      const data = await res.json();
      if (data?.id) {
        setSessions((current) => [data, ...current]);
        openSession(data);
      }
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-10 py-10">
        {/* Folder header */}
        <div className="mb-10">
          <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-1">
            Research Folder
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            {selectedNode.name}
          </h1>
          <p className="font-editorial text-on-surface-variant italic mt-1">
            {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} in scope &middot;{' '}
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Start session */}
        <div className="mb-10">
          <button
            onClick={() => void handleCreateSession()}
            disabled={creatingSession}
            className="btn-gradient text-on-primary px-5 py-3 rounded-sm text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {creatingSession ? (
              <Loader2 size={16} strokeWidth={2} className="animate-spin" />
            ) : (
              <MessageSquare size={16} strokeWidth={2} />
            )}
            {creatingSession ? 'Starting Session...' : 'Open Research Session'}
          </button>
          <p className="text-xs text-on-surface-variant mt-2">
            AI starts from this folder context, but can inspect other workspace files if needed.
          </p>
        </div>

        {/* PDFs in scope */}
        <section className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
            PDFs in Scope
          </h2>
          {pdfs.length === 0 ? (
            <div className="bg-surface-dim rounded-lg p-8 text-center">
              <p className="text-sm text-on-surface-variant">No PDFs in this folder yet.</p>
              <p className="text-xs text-outline mt-1">Drop PDF files here or add them via the file system.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pdfs.map((pdf) => {
                // Show relative path from current folder
                const relativePath = pdf.path.startsWith(selectedNode.path + '/')
                  ? pdf.path.slice(selectedNode.path.length + 1)
                  : pdf.name;
                const parts = relativePath.split('/');
                const subfolder = parts.length > 1 ? parts.slice(0, -1).join('/') : null;

                return (
                  <button
                    key={pdf.id}
                    onClick={() => openPdf(pdf)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-lowest text-left transition-colors group"
                  >
                    <FileText size={16} strokeWidth={1.8} className="text-outline shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-on-surface group-hover:text-primary transition-colors truncate block">
                        {pdf.name}
                      </span>
                      {subfolder && (
                        <span className="text-[10px] text-outline">{subfolder}/</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent sessions */}
        {(sessionsLoading || sessions.length > 0) && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
              Previous Sessions
            </h2>
            {sessionsLoading ? (
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <Loader2 size={12} className="animate-spin" />
                Loading sessions...
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => openSession(session)}
                    className="w-full bg-surface-container-lowest rounded-lg p-4 text-left hover:shadow-ambient transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                        {session.title}
                      </h3>
                      <div className="flex items-center gap-1 text-outline">
                        <Clock size={11} strokeWidth={2} />
                        <span className="text-[10px]">
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {session.messages.length} messages
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
