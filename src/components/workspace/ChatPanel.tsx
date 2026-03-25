'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Link2, Sparkles, Loader2, ChevronDown, X } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace-store';
import { mockChatMessages, mockTree, collectPdfs, findNode } from '@/lib/mock-data';

interface AvailableModel {
  id: string;
  owned_by: string;
  created: number;
  display_name?: string;
}

export function ChatPanel() {
  const { activeSessionFolder, toggleChat } = useWorkspace();
  const [messages, setMessages] = useState(mockChatMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Compute PDFs in scope
  const folderNode = activeSessionFolder ? findNode(mockTree, activeSessionFolder) : null;
  const pdfsInScope = folderNode ? collectPdfs(folderNode) : [];

  useEffect(() => { fetchModels(); }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchModels = async () => {
    setModelsLoading(true);
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models?.length > 0) {
        setModels(data.models);
        setSelectedModel(data.models[0].id);
      }
    } catch { /* fallback */ }
    finally { setModelsLoading(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = {
      id: `c${Date.now()}`,
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
        }),
      });
      const data = await res.json();
      setMessages([...updated, {
        id: `c${Date.now()}`,
        role: 'assistant' as const,
        content: data.error ? `**Error:** ${data.error}` : data.content,
        timestamp: new Date().toISOString(),
        model: data.model || selectedModel,
      }]);
    } catch {
      setMessages([...updated, {
        id: `c${Date.now()}`,
        role: 'assistant' as const,
        content: '**Error:** Failed to connect. Check your Codex login in Settings.',
        timestamp: new Date().toISOString(),
      }]);
    } finally { setIsLoading(false); }
  };

  const displayName = (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (model?.display_name) return model.display_name;
    return modelId.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Session</h2>
          <span className="text-[10px] text-outline truncate">
            {pdfsInScope.length} PDF{pdfsInScope.length !== 1 ? 's' : ''} in scope
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Model selector */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
            >
              {modelsLoading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <>
                  {selectedModel ? displayName(selectedModel) : 'Model'}
                  <ChevronDown size={10} strokeWidth={2.5} />
                </>
              )}
            </button>
            {showModelPicker && models.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface-container-lowest rounded-lg shadow-ambient z-50 py-1 max-h-60 overflow-y-auto">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model.id); setShowModelPicker(false); }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                      model.id === selectedModel
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    {model.display_name || model.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleChat}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[90%] bg-primary text-on-primary px-3.5 py-2.5 rounded-2xl rounded-tr-sm">
                  <p className="text-[13px] leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={11} strokeWidth={2} className="text-on-surface-variant" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-editorial text-[13px] text-on-surface leading-relaxed space-y-2">
                    {msg.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} dangerouslySetInnerHTML={{
                        __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <Loader2 size={11} strokeWidth={2} className="text-on-surface-variant animate-spin" />
            </div>
            <span className="text-xs text-on-surface-variant mt-1">Thinking...</span>
          </div>
        )}

        {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isLoading && (
          <div className="flex gap-1.5 ml-8 pb-1">
            <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container text-[10px] font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <BookOpen size={10} strokeWidth={2} />
              Cite
            </button>
            <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-container text-[10px] font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <Link2 size={10} strokeWidth={2} />
              Related
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 bg-surface-container-low rounded-xl px-3 py-2.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask about your research..."
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-on-surface outline-none resize-none placeholder:text-outline font-editorial leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !selectedModel}
            className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
