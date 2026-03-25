'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Link2, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { mockChatMessages } from '@/lib/mock-data';

interface AvailableModel {
  id: string;
  owned_by: string;
  created: number;
}

export function ChatPanel() {
  const [messages, setMessages] = useState(mockChatMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch available models on mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Close picker on outside click
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
      if (data.models && data.models.length > 0) {
        setModels(data.models);
        setSelectedModel(data.models[0].id);
      }
    } catch {
      // Will show fallback
    } finally {
      setModelsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: `c${Date.now()}`,
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
        }),
      });

      const data = await res.json();

      const assistantMessage = {
        id: `c${Date.now()}`,
        role: 'assistant' as const,
        content: data.error ? `**Error:** ${data.error}` : data.content,
        timestamp: new Date().toISOString(),
        model: 'gpt' as const,
      };
      setMessages([...updatedMessages, assistantMessage]);
    } catch {
      setMessages([...updatedMessages, {
        id: `c${Date.now()}`,
        role: 'assistant' as const,
        content: '**Error:** Failed to connect. Check your OpenAI connection in Settings.',
        timestamp: new Date().toISOString(),
        model: 'gpt' as const,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Display-friendly model name
  const displayName = (id: string) => {
    return id
      .replace('chatgpt-4o-latest', 'ChatGPT-4o Latest')
      .replace(/-\d{4}-\d{2}-\d{2}$/, ''); // strip date suffix for display
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-on-surface">Research Assistant</h2>

        {/* Model Selector */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
          >
            {modelsLoading ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <>
                {selectedModel ? displayName(selectedModel) : 'No model'}
                <ChevronDown size={11} strokeWidth={2.5} />
              </>
            )}
          </button>

          {showModelPicker && models.length > 0 && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-surface-container-lowest rounded-lg shadow-ambient z-50 py-1 max-h-72 overflow-y-auto">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                    model.id === selectedModel
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <span className="truncate">{model.id}</span>
                  <span className="text-[10px] text-on-surface-variant shrink-0 ml-2">
                    {model.owned_by}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary text-on-primary px-4 py-3 rounded-2xl rounded-tr-sm">
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-[10px] opacity-70 mt-1 block text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={13} strokeWidth={2} className="text-on-surface-variant" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-on-surface uppercase">
                      {selectedModel ? displayName(selectedModel) : 'GPT'}
                    </span>
                  </div>
                  <div className="font-editorial text-sm text-on-surface leading-relaxed space-y-2">
                    {msg.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} dangerouslySetInnerHTML={{
                        __html: paragraph
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
              <Loader2 size={13} strokeWidth={2} className="text-on-surface-variant animate-spin" />
            </div>
            <div className="flex-1">
              <span className="text-xs text-on-surface-variant">Thinking...</span>
            </div>
          </div>
        )}

        {/* Quick actions after AI response */}
        {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !isLoading && (
          <div className="flex gap-2 ml-10 pb-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <BookOpen size={12} strokeWidth={2} />
              Cite this section
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <Link2 size={12} strokeWidth={2} />
              Related concepts
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 py-4 shrink-0">
        <div className="flex items-end gap-2 bg-surface-container-low rounded-2xl px-4 py-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything about this document..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-on-surface outline-none resize-none placeholder:text-outline font-editorial leading-relaxed"
          />
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <BookOpen size={14} strokeWidth={2} />
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading || !selectedModel}
              className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
