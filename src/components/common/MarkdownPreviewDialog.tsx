'use client';

import { useEffect } from 'react';
import { Loader2, X } from 'lucide-react';

interface MarkdownPreviewDialogProps {
  open: boolean;
  title: string;
  description?: string;
  fileName: string;
  markdown: string;
  loading?: boolean;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function MarkdownPreviewDialog({
  open,
  title,
  description,
  fileName,
  markdown,
  loading = false,
  confirmLabel = 'Download',
  onCancel,
  onConfirm,
}: MarkdownPreviewDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="flex h-full max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/15 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-on-surface">{title}</div>
            {description && (
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">{description}</p>
            )}
            <div className="mt-2 text-[11px] text-outline">{fileName}</div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="shrink-0 rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden px-5 py-4">
          <div className="h-full overflow-auto rounded-xl bg-surface-container px-4 py-3">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-on-surface-variant">
                <Loader2 size={16} className="animate-spin" />
                Preparing preview...
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-[12px] leading-6 text-on-surface font-functional">
                {markdown}
              </pre>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-variant/15 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading || !markdown.trim()}
            className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
