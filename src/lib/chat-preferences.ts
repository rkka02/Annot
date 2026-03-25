export const CHAT_FONT_SIZE_STORAGE_KEY = 'annot-chat-font-size';
export const CHAT_FONT_SIZE_EVENT = 'annot-chat-font-size-change';
export const DEFAULT_CHAT_FONT_SIZE = 13;
export const MIN_CHAT_FONT_SIZE = 11;
export const MAX_CHAT_FONT_SIZE = 20;

export function clampChatFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CHAT_FONT_SIZE;
  }

  return Math.min(MAX_CHAT_FONT_SIZE, Math.max(MIN_CHAT_FONT_SIZE, Math.round(value)));
}

export function readStoredChatFontSize(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_CHAT_FONT_SIZE;
  }

  const raw = window.localStorage.getItem(CHAT_FONT_SIZE_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_CHAT_FONT_SIZE;
  }

  return clampChatFontSize(Number(raw));
}

export function writeStoredChatFontSize(value: number): number {
  const nextValue = clampChatFontSize(value);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CHAT_FONT_SIZE_STORAGE_KEY, String(nextValue));
    window.dispatchEvent(new CustomEvent(CHAT_FONT_SIZE_EVENT, { detail: nextValue }));
  }

  return nextValue;
}
