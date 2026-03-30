import { AIProvider } from '@/types';
import { DEFAULT_AI_PROVIDER, parseAIProvider } from '@/lib/ai-providers/config';

export const AI_PROVIDER_STORAGE_KEY = 'annot-ai-provider';
export const AI_PROVIDER_EVENT = 'annot-ai-provider-change';

export function readStoredAIProvider(): AIProvider {
  if (typeof window === 'undefined') {
    return DEFAULT_AI_PROVIDER;
  }

  const raw = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY);
  return parseAIProvider(raw) ?? DEFAULT_AI_PROVIDER;
}

export function writeStoredAIProvider(provider: AIProvider): AIProvider {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider);
    window.dispatchEvent(new CustomEvent(AI_PROVIDER_EVENT, { detail: provider }));
  }

  return provider;
}
