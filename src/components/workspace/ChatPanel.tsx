'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, BookOpen, Link2, Sparkles, Loader2, ChevronDown, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { DEFAULT_AI_PROVIDER } from '@/lib/ai-providers/config';
import { useWorkspace } from '@/lib/workspace-store';
import { AI_PROVIDER_EVENT, readStoredAIProvider } from '@/lib/provider-preferences';
import { AIProvider, ChatMessage, Session, SessionKind } from '@/types';
import {
  CHAT_FONT_SIZE_EVENT,
  DEFAULT_CHAT_FONT_SIZE,
  readStoredChatFontSize,
} from '@/lib/chat-preferences';

const MAX_INPUT_HEIGHT = 180;

interface AvailableModel {
  id: string;
  owned_by: string;
  created: number;
  display_name?: string;
}

interface ToolUseEvent {
  type: 'tool_use';
  name?: string;
  input?: string;
}

interface ToolResultEvent {
  type: 'tool_result';
  name?: string;
  input?: string;
  output?: string;
  exitCode?: number | null;
}

interface StatusEvent {
  type: 'status';
  message?: string;
}

interface AssistantDeltaEvent {
  type: 'assistant_delta';
  text?: string;
}

interface FinalEvent {
  type: 'final';
  content?: string;
  model?: string;
  provider?: AIProvider;
  session?: Session;
}

interface ErrorEvent {
  type: 'error';
  message?: string;
}

type ChatStreamEvent =
  | ToolUseEvent
  | ToolResultEvent
  | StatusEvent
  | AssistantDeltaEvent
  | FinalEvent
  | ErrorEvent;

interface SessionUiState {
  isLoading: boolean;
  sessionLoading: boolean;
  thinkingOpen: boolean;
  thinkingDraft: string;
  messages: ChatMessage[];
  provider: AIProvider;
  selectedModel?: string;
}

function normalizeMathMarkdown(content: string): string {
  return content
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, expression: string) => `\n$$\n${expression.trim()}\n$$\n`)
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, expression: string) => `$${expression.trim()}$`);
}

function createDefaultSessionUiState(): SessionUiState {
  return {
    isLoading: false,
    sessionLoading: false,
    thinkingOpen: false,
    thinkingDraft: '',
    messages: [],
    provider: DEFAULT_AI_PROVIDER,
  };
}

export function ChatPanel() {
  const {
    activeSessionFolder,
    activeSessionKind,
    activeSessionPdfPath,
    activeSessionId,
    activePdf,
    openSession,
    toggleChat,
  } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [, setSessionUiMap] = useState<Record<string, SessionUiState>>({});
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(readStoredAIProvider());
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [thinkingDraft, setThinkingDraft] = useState('');
  const [chatFontSize, setChatFontSize] = useState(DEFAULT_CHAT_FONT_SIZE);
  const pickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const skipSessionHydrationRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const sessionUiMapRef = useRef<Record<string, SessionUiState>>({});

  const sessionLabel = activeSessionKind === 'pdf' ? 'PDF Session' : 'Folder Session';
  const buildSessionQuery = (
    folderPath: string,
    sessionKind: SessionKind,
    provider: AIProvider,
    pdfPath?: string | null,
  ) => {
    const params = new URLSearchParams({
      folderPath,
      sessionKind,
      provider,
    });

    if (sessionKind === 'pdf' && pdfPath) {
      params.set('pdfPath', pdfPath);
    }

    return params;
  };

  const pickLatestSession = (sessionList: unknown): Session | null => {
    if (!Array.isArray(sessionList)) return null;

    const sessions = sessionList.filter((item): item is Session => (
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'updatedAt' in item &&
      'folderPath' in item &&
      typeof item.id === 'string' &&
      typeof item.updatedAt === 'string' &&
      typeof item.folderPath === 'string'
    ));

    return sessions.sort((a, b) => (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ))[0] ?? null;
  };

  const applyVisibleSessionState = useCallback((state: SessionUiState) => {
    setMessages(state.messages);
    setIsLoading(state.isLoading);
    setSessionLoading(state.sessionLoading);
    setThinkingOpen(state.thinkingOpen);
    setThinkingDraft(state.thinkingDraft);
    setSelectedProvider(state.provider);
    if (state.selectedModel) {
      setSelectedModel(state.selectedModel);
    }
  }, []);

  const resetVisibleSessionState = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setSessionLoading(false);
    setThinkingOpen(false);
    setThinkingDraft('');
    setSelectedProvider(readStoredAIProvider());
  }, []);

  const commitSessionUiState = useCallback((
    sessionId: string,
    updater: (current: SessionUiState) => SessionUiState,
  ): SessionUiState => {
    const current = sessionUiMapRef.current[sessionId] ?? createDefaultSessionUiState();
    const nextState = updater(current);
    const nextMap = {
      ...sessionUiMapRef.current,
      [sessionId]: nextState,
    };

    sessionUiMapRef.current = nextMap;
    setSessionUiMap(nextMap);

    if (activeSessionIdRef.current === sessionId) {
      applyVisibleSessionState(nextState);
    }

    return nextState;
  }, [applyVisibleSessionState]);

  useEffect(() => {
    void fetchModels(selectedProvider);
  }, [selectedProvider]);
  useEffect(() => {
    const syncChatFontSize = () => {
      setChatFontSize(readStoredChatFontSize());
    };

    syncChatFontSize();

    const handleStorage = (event: StorageEvent) => {
      if (event.key) {
        syncChatFontSize();
      }
    };
    const handleFontSizeEvent = () => {
      syncChatFontSize();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CHAT_FONT_SIZE_EVENT, handleFontSizeEvent);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CHAT_FONT_SIZE_EVENT, handleFontSizeEvent);
    };
  }, []);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);
  useEffect(() => {
    const syncProvider = () => {
      if (!activeSessionIdRef.current) {
        setSelectedProvider(readStoredAIProvider());
      }
    };

    syncProvider();
    window.addEventListener('storage', syncProvider);
    window.addEventListener(AI_PROVIDER_EVENT, syncProvider);

    return () => {
      window.removeEventListener('storage', syncProvider);
      window.removeEventListener(AI_PROVIDER_EVENT, syncProvider);
    };
  }, []);

  useEffect(() => {
    if (!activeSessionFolder || !activeSessionKind || activeSessionId) return;

    let cancelled = false;

    const attachLatestSession = async () => {
      try {
        const params = buildSessionQuery(activeSessionFolder, activeSessionKind, selectedProvider, activeSessionPdfPath);
        const res = await fetch(`/api/sessions?${params.toString()}`);
        const data = await res.json();
        const latestSession = pickLatestSession(data);

        if (!cancelled && latestSession) {
          setSelectedProvider(latestSession.provider || readStoredAIProvider() || DEFAULT_AI_PROVIDER);
          openSession(latestSession);
        }
      } catch {
        // Fall back to starting a new session on first send.
      }
    };

    void attachLatestSession();

    return () => {
      cancelled = true;
    };
  }, [activeSessionFolder, activeSessionId, activeSessionKind, activeSessionPdfPath, openSession, selectedProvider]);

  useEffect(() => {
    if (!activeSessionFolder || !activeSessionId) {
      resetVisibleSessionState();
      return;
    }

    const cachedSessionUi = sessionUiMapRef.current[activeSessionId];
    if (cachedSessionUi) {
      if (skipSessionHydrationRef.current === activeSessionId) {
        skipSessionHydrationRef.current = null;
      }
      applyVisibleSessionState(cachedSessionUi);
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      commitSessionUiState(activeSessionId, (current) => ({
        ...current,
        sessionLoading: true,
      }));
      try {
        const params = new URLSearchParams({
          folderPath: activeSessionFolder,
          sessionId: activeSessionId,
        });
        const res = await fetch(`/api/sessions?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          if (skipSessionHydrationRef.current === activeSessionId) {
            skipSessionHydrationRef.current = null;
            return;
          }
          commitSessionUiState(activeSessionId, (current) => ({
            ...current,
            messages: Array.isArray(data.messages) ? data.messages : [],
            provider: data.provider || current.provider || readStoredAIProvider() || DEFAULT_AI_PROVIDER,
            sessionLoading: false,
            selectedModel: typeof data.model === 'string' && data.model ? data.model : current.selectedModel,
          }));
        }
      } catch {
        if (!cancelled) {
          commitSessionUiState(activeSessionId, (current) => ({
            ...current,
            messages: [],
            sessionLoading: false,
          }));
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [
    activeSessionFolder,
    activeSessionId,
    applyVisibleSessionState,
    commitSessionUiState,
    resetVisibleSessionState,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, MAX_INPUT_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
  }, [chatFontSize, input]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchModels = async (provider: AIProvider) => {
    setModelsLoading(true);
    try {
      const params = new URLSearchParams({ provider });
      const res = await fetch(`/api/models?${params.toString()}`);
      const data = await res.json();
      if (data.models?.length > 0) {
        setModels(data.models);
        setSelectedModel((currentSelectedModel) => {
          if (data.models.some((model: AvailableModel) => model.id === currentSelectedModel)) {
            return currentSelectedModel;
          }
          return data.models[0].id;
        });
      } else {
        setModels([]);
        setSelectedModel('');
      }
    } catch { /* fallback */ }
    finally { setModelsLoading(false); }
  };

  const ensureSessionId = async (): Promise<string> => {
    if (activeSessionId) {
      return activeSessionId;
    }

    if (!activeSessionFolder || !activeSessionKind) {
      throw new Error('No active folder selected');
    }

    const params = buildSessionQuery(activeSessionFolder, activeSessionKind, selectedProvider, activeSessionPdfPath);
    const existingSessionsRes = await fetch(`/api/sessions?${params.toString()}`);
    const existingSessions = await existingSessionsRes.json();
    const latestSession = pickLatestSession(existingSessions);

    if (latestSession) {
      setSelectedProvider(latestSession.provider || readStoredAIProvider() || DEFAULT_AI_PROVIDER);
      skipSessionHydrationRef.current = latestSession.id;
      openSession(latestSession);
      return latestSession.id;
    }

    const pdfSessionName = (activePdf?.name
      || activeSessionPdfPath?.split('/').at(-1)
      || 'PDF').replace(/\.pdf$/i, '');
    const fallbackTitle = activeSessionKind === 'pdf' && activeSessionPdfPath
      ? `${pdfSessionName} session`
      : `${activeSessionFolder.split('/').filter(Boolean).at(-1) || 'Workspace'} session`;

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderPath: activeSessionFolder,
        title: fallbackTitle,
        model: selectedModel || undefined,
        provider: selectedProvider,
        sessionKind: activeSessionKind,
        pdfPath: activeSessionKind === 'pdf' ? activeSessionPdfPath : null,
      }),
    });
    const data = await res.json();

    if (!res.ok || !data?.id) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to start session');
    }

    skipSessionHydrationRef.current = data.id as string;
    setSelectedProvider((data.provider as AIProvider) || selectedProvider);
    openSession(data as Session);
    return data.id as string;
  };

  const normalizeComparableText = (value: string): string => (
    value
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .toLowerCase()
  );

  const stripThinkingOverlap = (finalContent: string, liveDraft: string): string => {
    const finalTrimmed = finalContent.trim();
    const draftTrimmed = liveDraft.trim();

    if (!draftTrimmed || !finalTrimmed) {
      return finalContent;
    }

    const normalizedDraft = normalizeComparableText(draftTrimmed);
    const normalizedFinal = normalizeComparableText(finalTrimmed);

    if (normalizedFinal === normalizedDraft) {
      return finalContent;
    }

    const draftBlocks = draftTrimmed
      .split(/\n\s*\n+/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => normalizeComparableText(block));
    const finalBlocks = finalTrimmed
      .split(/\n\s*\n+/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (draftBlocks.length > 0 && finalBlocks.length > 1) {
      let matchedBlockCount = 0;
      for (const block of finalBlocks) {
        const normalizedBlock = normalizeComparableText(block);
        if (normalizedBlock.length < 40 || !draftBlocks.includes(normalizedBlock)) {
          break;
        }
        matchedBlockCount += 1;
      }

      if (matchedBlockCount > 0 && matchedBlockCount < finalBlocks.length) {
        return finalBlocks.slice(matchedBlockCount).join('\n\n').trim();
      }
    }

    const draftLines = draftTrimmed
      .split('\n')
      .map((line) => normalizeComparableText(line))
      .filter((line) => line.length >= 20);
    const finalLines = finalTrimmed.split('\n');

    if (draftLines.length > 0 && finalLines.length > 1) {
      let matchedLineCount = 0;
      for (const line of finalLines) {
        const normalizedLine = normalizeComparableText(line);
        if (normalizedLine.length < 20 || !draftLines.includes(normalizedLine)) {
          break;
        }
        matchedLineCount += 1;
      }

      if (matchedLineCount > 0 && matchedLineCount < finalLines.length) {
        return finalLines.slice(matchedLineCount).join('\n').trim();
      }
    }

    if (finalTrimmed.startsWith(draftTrimmed) && finalTrimmed.length > draftTrimmed.length) {
      const stripped = finalTrimmed.slice(draftTrimmed.length).trimStart();
      return stripped || finalContent;
    }

    const normalizedFinalWords = finalTrimmed.split(/\s+/);
    const normalizedDraftWords = draftTrimmed.split(/\s+/);

    const draftWordString = normalizedDraftWords.join(' ');
    const finalWordString = normalizedFinalWords.join(' ');

    if (finalWordString.startsWith(draftWordString) && normalizedFinalWords.length > normalizedDraftWords.length) {
      return normalizedFinalWords.slice(normalizedDraftWords.length).join(' ');
    }

    return finalContent;
  };

  const handleStreamEvent = (
    sessionId: string,
    event: ChatStreamEvent,
    updatedMessages: ChatMessage[],
    fallbackModel: string,
  ) => {
    if (event.type === 'status' || event.type === 'tool_use' || event.type === 'tool_result') {
      return;
    }

    if (event.type === 'assistant_delta' && event.text) {
      commitSessionUiState(sessionId, (current) => ({
        ...current,
        isLoading: true,
        thinkingDraft: `${current.thinkingDraft}${event.text}`,
      }));
      return;
    }

    if (event.type === 'final') {
      const currentUiState = sessionUiMapRef.current[sessionId] ?? createDefaultSessionUiState();
      const finalContent = stripThinkingOverlap(event.content || '', currentUiState.thinkingDraft);

      commitSessionUiState(sessionId, (current) => ({
        ...current,
        messages: [
          ...updatedMessages,
          {
            id: `c${Date.now()}`,
            role: 'assistant',
            content: finalContent,
            timestamp: new Date().toISOString(),
            model: event.model || fallbackModel,
          },
        ],
        isLoading: false,
        sessionLoading: false,
        thinkingDraft: '',
        thinkingOpen: false,
        selectedModel: event.model || fallbackModel,
        provider: event.provider || current.provider,
      }));
      return;
    }

    if (event.type === 'error') {
      commitSessionUiState(sessionId, (current) => ({
        ...current,
        messages: [
          ...updatedMessages,
            {
              id: `c${Date.now()}`,
              role: 'assistant',
              content: `**Error:** ${event.message || 'Failed to connect. Check the active provider in Settings.'}`,
              timestamp: new Date().toISOString(),
            },
        ],
        isLoading: false,
        sessionLoading: false,
        thinkingDraft: '',
        thinkingOpen: false,
      }));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeSessionFolder || !activeSessionKind) return;
    const prompt = input.trim();
    setInput('');
    let targetSessionId: string | null = null;

    const userMessage = {
      id: `c${Date.now()}`,
      role: 'user' as const,
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    try {
      const sessionId = await ensureSessionId();
      targetSessionId = sessionId;
      const updated = [...messages, userMessage];
      commitSessionUiState(sessionId, (current) => ({
        ...current,
        messages: updated,
        isLoading: true,
        sessionLoading: false,
        thinkingDraft: '',
        thinkingOpen: false,
        selectedModel: selectedModel || current.selectedModel,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: activeSessionFolder,
          sessionId,
          prompt: userMessage.content,
            model: selectedModel,
            currentPdfPath: activeSessionKind === 'pdf'
              ? (activeSessionPdfPath || activePdf?.path || null)
            : (activePdf?.path || null),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to connect.');
      }

      if (!res.body) {
        throw new Error('Streaming response is not available.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf('\n');

        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            const event = JSON.parse(line) as ChatStreamEvent;
            handleStreamEvent(sessionId, event, updated, selectedModel);
          }

          newlineIndex = buffer.indexOf('\n');
        }
      }

      const trailing = buffer.trim();
      if (trailing) {
        const event = JSON.parse(trailing) as ChatStreamEvent;
        handleStreamEvent(sessionId, event, updated, selectedModel);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to connect. Check the active provider in Settings.';
      if (targetSessionId) {
        commitSessionUiState(targetSessionId, (current) => ({
          ...current,
          messages: [
            ...current.messages,
            {
              id: `c${Date.now()}`,
              role: 'assistant' as const,
              content: `**Error:** ${message}`,
              timestamp: new Date().toISOString(),
            },
          ],
          isLoading: false,
          sessionLoading: false,
          thinkingDraft: '',
          thinkingOpen: false,
        }));
      } else {
        setMessages((current) => [...current, {
          id: `c${Date.now()}`,
          role: 'assistant' as const,
          content: `**Error:** ${message}`,
          timestamp: new Date().toISOString(),
        }]);
        setIsLoading(false);
        setThinkingDraft('');
        setThinkingOpen(false);
      }
    }
  };

  const displayName = (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (model?.display_name) return model.display_name;
    return modelId.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  };

  const handleThinkingToggle = () => {
    if (!activeSessionId) {
      setThinkingOpen((current) => !current);
      return;
    }

    commitSessionUiState(activeSessionId, (current) => ({
      ...current,
      thinkingOpen: !current.thinkingOpen,
    }));
  };

  const assistantFontStyle = { fontSize: `${chatFontSize}px`, lineHeight: 1.7 };
  const userFontStyle = { fontSize: `${chatFontSize}px`, lineHeight: 1.7 };
  const inputFontStyle = { fontSize: `${chatFontSize}px`, lineHeight: 1.7 };
  const codeFontSize = Math.max(11, chatFontSize - 2);
  const codeFontStyle = { fontSize: `${codeFontSize}px` };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{sessionLabel}</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Model selector */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex min-w-28 items-center justify-between gap-2 rounded-md bg-emerald-100 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
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
        {!activeSessionId && !sessionLoading && (
          <div className="rounded-xl bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
            {activeSessionKind === 'pdf'
              ? 'Your first message here will start or reopen a session for this PDF.'
              : 'Your first message here will start or reopen a research session for this folder.'}
          </div>
        )}

        {sessionLoading && messages.length === 0 && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center shrink-0">
              <Loader2 size={11} strokeWidth={2} className="text-on-surface-variant animate-spin" />
            </div>
            <span className="text-xs text-on-surface-variant mt-1">Loading session...</span>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[90%] bg-primary text-on-primary px-3.5 py-2.5 rounded-2xl rounded-tr-sm">
                  <p style={userFontStyle}>{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={11} strokeWidth={2} className="text-on-surface-variant" />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="chat-markdown font-editorial text-on-surface"
                    style={assistantFontStyle}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        code: ({ children, className }) => {
                          const isBlock = Boolean(className);
                          if (isBlock) {
                            return (
                              <code
                                className="block overflow-x-auto rounded-lg bg-surface-container px-3 py-2 font-functional"
                                style={codeFontStyle}
                              >
                                {children}
                              </code>
                            );
                          }

                          return (
                            <code
                              className="rounded bg-surface-container px-1.5 py-0.5 font-functional"
                              style={codeFontStyle}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
                        blockquote: ({ children }) => (
                          <blockquote className="mb-3 border-l-2 border-outline-variant pl-3 text-on-surface-variant last:mb-0">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {normalizeMathMarkdown(msg.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="rounded-xl bg-surface-container px-3 py-2.5">
            <button
              onClick={handleThinkingToggle}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Loader2 size={12} strokeWidth={2} className="text-on-surface-variant animate-spin" />
                <span className="text-xs font-medium text-on-surface-variant">Thinking</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-outline">
                {thinkingDraft ? 'Show details' : 'Waiting for output'}
                <ChevronDown
                  size={12}
                  strokeWidth={2.5}
                  className={`transition-transform ${thinkingOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {thinkingOpen && (
              <div className="mt-3 border-t border-outline-variant/20 pt-3">
                <div className="rounded-lg bg-surface-container-low px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-outline mb-1">
                    Live Output
                  </div>
                  {thinkingDraft ? (
                    <pre className="whitespace-pre-wrap break-words text-[11px] text-on-surface-variant font-functional">
                      {thinkingDraft}
                    </pre>
                  ) : (
                    <div className="text-[11px] text-outline">No live output yet.</div>
                  )}
                </div>
              </div>
            )}
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
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask about your research..."
            rows={1}
            className="flex-1 bg-transparent text-on-surface outline-none resize-none placeholder:text-outline font-editorial"
            style={inputFontStyle}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !selectedModel || !activeSessionFolder || !activeSessionKind}
            className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            <Send size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
