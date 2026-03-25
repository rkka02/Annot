'use client';

import { useState, useEffect } from 'react';
import { LogIn, LogOut, Server, Palette, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';

interface AuthStatus {
  authenticated: boolean;
  hasRefreshToken?: boolean;
  isExpired?: boolean;
  expiresAt?: number;
}

export default function SettingsPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ authenticated: false });
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();

      // Open OAuth URL in new tab
      window.open(data.authUrl, '_blank');

      // Poll for auth status
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch('/api/auth/status');
        const status = await statusRes.json();
        if (status.authenticated) {
          clearInterval(pollInterval);
          setAuthStatus(status);
          setIsConnecting(false);
        }
      }, 2000);

      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsConnecting(false);
      }, 120_000);
    } catch {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth/status', { method: 'DELETE' });
    setAuthStatus({ authenticated: false });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Settings</h1>
        <p className="font-editorial text-on-surface-variant italic text-lg mb-10">
          Configure your research environment.
        </p>

        {/* OpenAI Connection */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <LogIn size={16} strokeWidth={2} className="text-on-surface-variant" />
            <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">OpenAI Connection</h2>
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
                    <span className="text-sm font-semibold text-on-surface">Connected to OpenAI</span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-error hover:bg-error-container/20 transition-colors"
                  >
                    <LogOut size={12} strokeWidth={2} />
                    Disconnect
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Authenticated via OAuth. Your ChatGPT subscription is used for API calls.
                  {authStatus.expiresAt && (
                    <> Token expires {new Date(authStatus.expiresAt).toLocaleDateString()}.
                    {authStatus.hasRefreshToken && ' Auto-refresh enabled.'}</>
                  )}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-on-surface-variant mb-4">
                  Connect your OpenAI account to use GPT-4o as your research assistant.
                  Signs in via browser — no API key needed.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="btn-gradient text-on-primary px-5 py-2.5 rounded-sm text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Waiting for login...
                    </>
                  ) : (
                    <>
                      <ExternalLink size={15} strokeWidth={2} />
                      Sign in with OpenAI
                    </>
                  )}
                </button>
                {isConnecting && (
                  <p className="text-xs text-on-surface-variant mt-3">
                    A browser window should have opened. Complete the login there, then this page will update automatically.
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
          <div className="bg-surface-container-lowest rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Theme</p>
                <p className="text-xs text-on-surface-variant mt-0.5">The Editorial Scholar — Academic Minimalist</p>
              </div>
              <span className="px-3 py-1 rounded text-xs font-medium bg-surface-container text-on-surface-variant">
                Default
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
