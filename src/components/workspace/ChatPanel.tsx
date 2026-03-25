'use client';

import { useState } from 'react';
import { Send, BookOpen, Link2, Sparkles } from 'lucide-react';
import { mockChatMessages } from '@/lib/mock-data';

type ModelType = 'claude' | 'gpt';

export function ChatPanel() {
  const [messages, setMessages] = useState(mockChatMessages);
  const [input, setInput] = useState('');
  const [activeModel, setActiveModel] = useState<ModelType>('claude');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessage = {
      id: `c${Date.now()}`,
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newMessage]);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-on-surface">Research Assistant</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveModel('claude')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              activeModel === 'claude'
                ? 'bg-orange-100 text-orange-700'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Claude 3.5
          </button>
          <button
            onClick={() => setActiveModel('gpt')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              activeModel === 'gpt'
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            GPT-4o
          </button>
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
                    <span className="text-xs font-semibold text-on-surface uppercase">Claude</span>
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

        {/* Quick actions after AI response */}
        {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
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
              className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Send size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
