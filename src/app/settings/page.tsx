'use client';

import { useState } from 'react';
import { Key, Server, Palette } from 'lucide-react';

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8">
        <h1 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Settings</h1>
        <p className="font-editorial text-on-surface-variant italic text-lg mb-10">
          Configure your research environment.
        </p>

        {/* API Keys */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Key size={16} strokeWidth={2} className="text-on-surface-variant" />
            <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wider">API Keys</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Anthropic API Key (Claude)
              </label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-3 py-2.5 bg-surface-container-lowest rounded-md text-sm text-on-surface outline-none border-b-2 border-transparent focus:border-primary transition-colors placeholder:text-outline"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                OpenAI API Key (GPT)
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2.5 bg-surface-container-lowest rounded-md text-sm text-on-surface outline-none border-b-2 border-transparent focus:border-primary transition-colors placeholder:text-outline"
              />
            </div>
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
