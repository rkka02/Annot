'use client';

import { useState, useEffect } from 'react';
import { LogIn, Server, Palette, Loader2, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  DEFAULT_CHAT_FONT_SIZE,
  MAX_CHAT_FONT_SIZE,
  MIN_CHAT_FONT_SIZE,
  readStoredChatFontSize,
  writeStoredChatFontSize,
} from '@/lib/chat-preferences';

interface AuthStatus {
  authenticated: boolean;
  hasRefreshToken?: boolean;
  isExpired?: boolean;
  expiresAt?: number;
  planType?: string;
  email?: string;
}

export default function SettingsPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chatFontSize, setChatFontSize] = useState(DEFAULT_CHAT_FONT_SIZE);

  useEffect(() => {
    void checkAuth();
    setChatFontSize(readStoredChatFontSize());
  }, []);

  const checkAuth = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ authenticated: false });
    } finally {
      setIsRefreshing(false);
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

        {/* Codex Connection */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <LogIn size={16} strokeWidth={2} className="text-on-surface-variant" />
            <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Codex Connection</h2>
          </div>

          <div className="bg-surface-container-lowest rounded-lg p-5">
            {authStatus === null ? (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Checking connection...</span>
              </div>
            ) : authStatus.authenticated ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="text-sm font-semibold text-on-surface">Connected via Codex</span>
                  </div>
                  <button
                    onClick={() => void checkAuth()}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} strokeWidth={2} className={isRefreshing ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Annot is using the local Codex login from this machine.
                  {authStatus.planType && <> Plan: {authStatus.planType}.</>}
                  {authStatus.email && <> Signed in as {authStatus.email}.</>}
                  {authStatus.expiresAt && (
                    <> Token expires {new Date(authStatus.expiresAt).toLocaleDateString()}.
                    {authStatus.hasRefreshToken && ' Auto-refresh enabled.'}</>
                  )}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-on-surface-variant mb-4">
                  Browser OAuth is disabled here. Annot now reuses the existing Codex login on this machine.
                  Sign in to Codex first, then refresh this status.
                </p>
                <button
                  onClick={() => void checkAuth()}
                  disabled={isRefreshing}
                  className="btn-gradient text-on-primary px-5 py-2.5 rounded-sm text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Checking Codex login...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={15} strokeWidth={2} />
                      Refresh Codex Status
                    </>
                  )}
                </button>
                <p className="text-xs text-on-surface-variant mt-3">
                  If Codex is already signed in, this page should flip to connected immediately.
                </p>
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
