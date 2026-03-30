'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, LogIn, Palette, RefreshCw, Server } from 'lucide-react';
import Link from 'next/link';
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-providers/config';
import {
  DEFAULT_CHAT_FONT_SIZE,
  MAX_CHAT_FONT_SIZE,
  MIN_CHAT_FONT_SIZE,
  readStoredChatFontSize,
  writeStoredChatFontSize,
} from '@/lib/chat-preferences';
import { readStoredAIProvider, writeStoredAIProvider } from '@/lib/provider-preferences';
import { AIProvider } from '@/types';

interface ProviderStatus {
  provider: AIProvider;
  authenticated: boolean;
  error?: string;
  hasRefreshToken?: boolean;
  expiresAt?: number;
  planType?: string;
  email?: string;
  authMethod?: string;
}

interface ProviderValidationResult {
  provider: AIProvider;
  ok: boolean;
  message: string;
  model?: string;
  response?: string;
}

export default function SettingsPage() {
  const [savedProvider, setSavedProvider] = useState<AIProvider>(DEFAULT_AI_PROVIDER);
  const [candidateProvider, setCandidateProvider] = useState<AIProvider>(DEFAULT_AI_PROVIDER);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [validationResult, setValidationResult] = useState<ProviderValidationResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [chatFontSize, setChatFontSize] = useState(DEFAULT_CHAT_FONT_SIZE);

  useEffect(() => {
    const storedProvider = readStoredAIProvider();
    setSavedProvider(storedProvider);
    setCandidateProvider(storedProvider);
    void checkProvider(storedProvider);
    setChatFontSize(readStoredChatFontSize());
  }, []);

  useEffect(() => {
    if (!candidateProvider) return;
    void checkProvider(candidateProvider);
    setValidationResult(null);
  }, [candidateProvider]);

  const getProviderLabel = (provider: AIProvider) => (
    provider === 'claude' ? 'Claude Code' : 'Codex'
  );

  const checkProvider = async (provider: AIProvider) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/providers/status?provider=${provider}`);
      const data = await res.json();
      setProviderStatus(data);
    } catch {
      setProviderStatus({
        provider,
        authenticated: false,
        error: 'Failed to load provider status.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleValidateAndSave = async () => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await fetch('/api/providers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: candidateProvider }),
      });
      const data = await res.json();
      const result = {
        provider: candidateProvider,
        ok: Boolean(data?.ok),
        message: typeof data?.message === 'string' ? data.message : 'Provider validation failed.',
        model: typeof data?.model === 'string' ? data.model : undefined,
        response: typeof data?.response === 'string' ? data.response : undefined,
      } satisfies ProviderValidationResult;

      setValidationResult(result);

      if (res.ok && result.ok) {
        writeStoredAIProvider(candidateProvider);
        setSavedProvider(candidateProvider);
        await checkProvider(candidateProvider);
      }
    } catch {
      setValidationResult({
        provider: candidateProvider,
        ok: false,
        message: 'Provider validation failed.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleChatFontSizeChange = (value: number) => {
    const nextValue = writeStoredChatFontSize(value);
    setChatFontSize(nextValue);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors mb-6"
        >
          <ArrowLeft size={13} strokeWidth={2} />
          Back to workspace
        </Link>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Settings</h1>
        <p className="font-editorial text-on-surface-variant italic text-lg mb-10">
          Configure your research environment.
        </p>

        {/* AI Provider */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <LogIn size={16} strokeWidth={2} className="text-on-surface-variant" />
            <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">AI Provider</h2>
          </div>

          <div className="bg-surface-container-lowest rounded-lg p-5 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-on-surface">Default provider</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  New chat sessions will use this provider unless an existing session already pins another one.
                </p>
              </div>
              <span className="rounded bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {getProviderLabel(savedProvider)}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Provider
                </label>
                <select
                  value={candidateProvider}
                  onChange={(event) => setCandidateProvider(event.target.value as AIProvider)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none"
                >
                  <option value="codex">Codex</option>
                  <option value="claude">Claude Code</option>
                </select>
              </div>

              <button
                onClick={() => void checkProvider(candidateProvider)}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} strokeWidth={2} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh status
              </button>
            </div>

            <div className="rounded-xl bg-surface-container px-4 py-4">
              {providerStatus === null ? (
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Checking provider status...</span>
                </div>
              ) : providerStatus.authenticated ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="text-sm font-semibold text-on-surface">
                      {getProviderLabel(providerStatus.provider)} is available on this machine
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {providerStatus.email && <>Signed in as {providerStatus.email}. </>}
                    {providerStatus.planType && <>Plan: {providerStatus.planType}. </>}
                    {providerStatus.authMethod && <>Auth: {providerStatus.authMethod}. </>}
                    {providerStatus.expiresAt && (
                      <>Token expires {new Date(providerStatus.expiresAt).toLocaleDateString()}.
                      {providerStatus.hasRefreshToken && ' Auto-refresh enabled.'}</>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-on-surface-variant">
                    {candidateProvider === 'claude'
                      ? 'Annot could not confirm a usable Claude Code login on this machine yet.'
                      : 'Annot could not confirm a usable Codex login on this machine yet.'}
                  </p>
                  {providerStatus.error && (
                    <p className="text-xs text-rose-700">{providerStatus.error}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void handleValidateAndSave()}
                disabled={isValidating || isRefreshing}
                className="btn-gradient text-on-primary px-5 py-2.5 rounded-sm text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Testing {getProviderLabel(candidateProvider)}...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} strokeWidth={2} />
                    Validate and set as default
                  </>
                )}
              </button>

              {candidateProvider !== savedProvider && (
                <span className="text-xs text-on-surface-variant">
                  The saved default stays on {getProviderLabel(savedProvider)} until this test passes.
                </span>
              )}
            </div>

            {validationResult && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                validationResult.ok
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}>
                <p className="font-medium">{validationResult.message}</p>
                {(validationResult.model || validationResult.response) && (
                  <p className="mt-1 text-xs opacity-80">
                    {validationResult.model && <>Model: {validationResult.model}. </>}
                    {validationResult.response && <>Probe response: {validationResult.response}</>}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Server */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Server size={16} strokeWidth={2} className="text-on-surface-variant" />
            <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Server</h2>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Self-hosted Mode</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Running on local Mac mini server</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Palette size={16} strokeWidth={2} className="text-on-surface-variant" />
            <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Appearance</h2>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Theme</p>
                <p className="text-xs text-on-surface-variant mt-0.5">The Editorial Scholar — Academic Minimalist</p>
              </div>
              <span className="px-3 py-1 rounded text-xs font-medium bg-surface-container text-on-surface-variant">
                Default
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <div>
                  <p className="text-sm font-medium text-on-surface">Chat font size</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Adjust the reading size used in the chat panel.
                  </p>
                </div>
                <span className="min-w-11 rounded bg-surface-container px-2 py-1 text-center text-xs font-semibold text-on-surface-variant">
                  {chatFontSize}px
                </span>
              </div>

              <input
                type="range"
                min={MIN_CHAT_FONT_SIZE}
                max={MAX_CHAT_FONT_SIZE}
                step={1}
                value={chatFontSize}
                onChange={(event) => handleChatFontSizeChange(Number(event.target.value))}
                className="w-full accent-primary"
              />

              <div className="mt-3 rounded-xl bg-surface-container px-3 py-3">
                <div className="text-[10px] uppercase tracking-wider text-outline mb-1">Preview</div>
                <p
                  className="font-editorial text-on-surface leading-relaxed"
                  style={{ fontSize: `${chatFontSize}px` }}
                >
                  This is how assistant responses will look in the chat panel.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
