'use client';

import { useEffect, useRef, useState } from 'react';

interface TreePromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel: string;
  allowEmpty?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => Promise<void> | void;
}

export function TreePromptDialog({
  open,
  title,
  description,
  initialValue = '',
  placeholder,
  confirmLabel,
  allowEmpty = false,
  busy = false,
  onCancel,
  onConfirm,
}: TreePromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [busy, onCancel, open]);

  if (!open) {
    return null;
  }

  const trimmedValue = value.trim();
  const confirmDisabled = busy || (!allowEmpty && trimmedValue.length === 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (confirmDisabled) {
      return;
    }
    await onConfirm(allowEmpty ? trimmedValue : trimmedValue);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-ambient">
        <div className="mb-1 text-sm font-semibold text-on-surface">{title}</div>
        {description && (
          <p className="mb-3 text-xs leading-5 text-on-surface-variant">{description}</p>
        )}

        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-outline-variant/20 bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary"
            disabled={busy}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-xl px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={confirmDisabled}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Working...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
