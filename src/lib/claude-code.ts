import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

import { getWorkspaceRoot } from '@/lib/annot-sessions';
import {
  buildExecutableCandidates,
  finalizeResolvedCommand,
  ResolvedCommand,
  resolveExecutable,
} from '@/lib/command-runtime';

export interface ClaudeCodeAuthStatus {
  authenticated: boolean;
  email?: string;
  planType?: string;
  authMethod?: string;
}

export interface ClaudeExecResult {
  providerSessionId: string;
  content: string;
}

export interface ClaudeTurnEvent {
  type: 'status' | 'assistant_delta' | 'tool_use' | 'tool_result';
  message?: string;
  text?: string;
  name?: string;
  input?: string;
  output?: string;
  exitCode?: number | null;
}

interface ClaudeRunTurnOptions {
  onEvent?: (event: ClaudeTurnEvent) => void;
}

interface ClaudeRunTurnInput {
  providerSessionId?: string;
  model: string;
  folderPath: string;
  sessionKind: 'folder' | 'pdf';
  prompt: string;
  currentPdfPath?: string | null;
}

interface ClaudeStreamEvent {
  type?: string;
  subtype?: string;
  session_id?: string;
  message?: {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };
  event?: {
    type?: string;
    content_block?: {
      type?: string;
      text?: string;
      name?: string;
      input?: unknown;
    };
    delta?: {
      type?: string;
      text?: string;
    };
  };
  result?: string;
  is_error?: boolean;
}

interface ClaudeAuthStatusPayload {
  loggedIn?: boolean;
  email?: string;
  subscriptionType?: string;
  authMethod?: string;
}

interface ClaudeCommandResult {
  providerSessionId?: string;
  content: string;
}

let resolvedClaudeExecutablePromise: Promise<ResolvedCommand> | null = null;

function buildPrompt({
  folderPath,
  sessionKind,
  prompt,
  currentPdfPath,
}: Omit<ClaudeRunTurnInput, 'providerSessionId' | 'model'>): string {
  const workspaceRoot = getWorkspaceRoot();
  const contextLines = [
    'Annot session context:',
    `- Workspace root: ${workspaceRoot}`,
    `- Current session folder: ${folderPath || '.'}`,
    `- Session type: ${sessionKind === 'pdf' ? 'PDF-focused reading session' : 'Folder-wide research session'}`,
    currentPdfPath ? `- Current PDF open in the viewer: ${currentPdfPath}` : '- No PDF is currently open in the viewer.',
    sessionKind === 'pdf'
      ? '- Treat the current PDF as the primary document for this conversation. Only branch out when it materially helps.'
      : '- Prefer the current folder first, but you may inspect other files in the workspace if needed.',
    '- When writing math, wrap standalone equations in \\[ ... \\] (or $$ ... $$). Do not emit bare equation lines.',
    '- Wrap inline math in \\( ... \\) or $ ... $. Do not leave LaTeX commands bare inside prose.',
    '- Keep inline variables or short expressions inline, for example `x`, `M_t`, or `alpha_t`.',
    '- Use tools and shell commands silently when needed.',
    '- In your final answer to the user, do not include progress updates, tool narration, or chain-of-thought.',
    '- The final answer should contain only the user-facing result.',
    '',
    'User request:',
    prompt,
  ];

  return contextLines.join('\n');
}

function getClaudeExecutableCandidates(): string[] {
  const home = os.homedir();
  const envCandidates = [
    process.env.CLAUDE_CODE_BIN,
    process.env.CLAUDE_BIN,
  ];

  return buildExecutableCandidates(envCandidates, 'claude', [
    path.join(home, '.npm-global', 'bin', 'claude'),
    path.join(home, '.local', 'bin', 'claude'),
    path.join(home, '.claude', 'bin', 'claude'),
    path.join(home, 'AppData', 'Roaming', 'npm', 'claude'),
    path.join('/opt/homebrew/bin', 'claude'),
    path.join('/usr/local/bin', 'claude'),
  ]);
}

async function resolveClaudeExecutable(): Promise<ResolvedCommand> {
  const candidates = getClaudeExecutableCandidates();
  const executable = await resolveExecutable(candidates);

  if (executable) {
    return finalizeResolvedCommand(executable);
  }

  const searchedPaths = candidates.slice(0, 12).join(', ');
  throw new Error(
    `Could not find the Claude Code CLI executable. Searched: ${searchedPaths}. ` +
    'Set CLAUDE_CODE_BIN to the full path to your claude binary if needed.',
  );
}

function createClaudeArgs(input: ClaudeRunTurnInput): string[] {
  const args = [
    '--print',
    '--verbose',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--permission-mode',
    'bypassPermissions',
    '--tools',
    'Read,Glob,Grep,Bash',
    '--add-dir',
    getWorkspaceRoot(),
  ];

  if (input.providerSessionId) {
    args.push('--resume', input.providerSessionId);
  }

  if (input.model) {
    args.push('--model', input.model);
  }

  args.push(buildPrompt(input));
  return args;
}

function collectAssistantTexts(payload: ClaudeStreamEvent): string[] {
  return (payload.message?.content || [])
    .filter((part) => part.type === 'text' && typeof part.text === 'string' && part.text.length > 0)
    .map((part) => part.text as string);
}

function emitClaudeEvent(
  payload: ClaudeStreamEvent,
  emit: ((event: ClaudeTurnEvent) => void) | undefined,
): void {
  if (!emit) return;

  if (payload.type === 'system' && payload.subtype === 'init') {
    emit({ type: 'status', message: 'Connected to Claude session.' });
    return;
  }

  if (payload.type === 'stream_event' && payload.event?.type === 'message_start') {
    emit({ type: 'status', message: 'Thinking...' });
    return;
  }

  if (payload.type === 'stream_event' && payload.event?.type === 'content_block_delta') {
    const delta = payload.event.delta;
    if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text.length > 0) {
      emit({ type: 'assistant_delta', text: delta.text });
    }
    return;
  }

  if (payload.type === 'stream_event' && payload.event?.type === 'content_block_start') {
    const contentBlock = payload.event.content_block;
    if (contentBlock?.type === 'tool_use' && contentBlock.name) {
      emit({
        type: 'tool_use',
        name: contentBlock.name,
        input: JSON.stringify(contentBlock.input ?? {}),
      });
    }
  }
}

async function executeClaudeCommand(
  args: string[],
  options: ClaudeRunTurnOptions = {},
): Promise<ClaudeCommandResult> {
  if (!resolvedClaudeExecutablePromise) {
    resolvedClaudeExecutablePromise = resolveClaudeExecutable();
  }

  const claudeExecutable = await resolvedClaudeExecutablePromise;

  return new Promise<ClaudeCommandResult>((resolve, reject) => {
    const child = spawn(claudeExecutable.command, [...claudeExecutable.argsPrefix, ...args], {
      cwd: getWorkspaceRoot(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let stdoutBuffer = '';

    const handleStdoutLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const payload = JSON.parse(trimmed) as ClaudeStreamEvent;
        emitClaudeEvent(payload, options.onEvent);
      } catch {
        // Ignore non-JSON lines in stdout.
      }
    };

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      stdoutBuffer += text;

      let newlineIndex = stdoutBuffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = stdoutBuffer.slice(0, newlineIndex);
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        handleStdoutLine(line);
        newlineIndex = stdoutBuffer.indexOf('\n');
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (stdoutBuffer.trim()) {
        handleStdoutLine(stdoutBuffer);
      }

      const events = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as ClaudeStreamEvent];
          } catch {
            return [];
          }
        });

      const initEvent = events.find((event) => event.type === 'system' && event.subtype === 'init');
      const providerSessionId = initEvent?.session_id;
      const assistantText = events
        .filter((event) => event.type === 'assistant')
        .flatMap((event) => collectAssistantTexts(event))
        .join('\n\n')
        .trim();
      const resultEvent = events.find((event) => event.type === 'result');
      const resultText = typeof resultEvent?.result === 'string' ? resultEvent.result.trim() : '';
      const content = assistantText || resultText;

      if (code !== 0 || resultEvent?.is_error) {
        const detail = [resultText, stderr.trim()].filter(Boolean).join('\n');
        reject(new Error(detail || `claude --print failed with exit code ${code}`));
        return;
      }

      if (!content) {
        reject(new Error(stderr.trim() || 'Claude Code returned no assistant message'));
        return;
      }

      resolve({
        providerSessionId,
        content,
      });
    });
  });
}

export async function runClaudeTurn(
  input: ClaudeRunTurnInput,
  options: ClaudeRunTurnOptions = {},
): Promise<ClaudeExecResult> {
  const result = await executeClaudeCommand(createClaudeArgs(input), options);
  const providerSessionId = result.providerSessionId || input.providerSessionId;

  if (!providerSessionId) {
    throw new Error('Claude Code did not return a session id');
  }

  return {
    providerSessionId,
    content: result.content,
  };
}

export async function probeClaudeConnection(model = 'sonnet'): Promise<{ model: string; response: string }> {
  const result = await executeClaudeCommand([
    '--print',
    '--verbose',
    '--output-format',
    'stream-json',
    '--include-partial-messages',
    '--no-session-persistence',
    '--tools',
    '',
    '--model',
    model,
    'Reply with exactly OK.',
  ]);

  return {
    model,
    response: result.content.trim(),
  };
}

export async function getClaudeAuthStatus(): Promise<ClaudeCodeAuthStatus> {
  if (!resolvedClaudeExecutablePromise) {
    resolvedClaudeExecutablePromise = resolveClaudeExecutable();
  }

  const claudeExecutable = await resolvedClaudeExecutablePromise;

  return await new Promise<ClaudeCodeAuthStatus>((resolve) => {
    const child = spawn(claudeExecutable.command, [...claudeExecutable.argsPrefix, 'auth', 'status', '--json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.on('error', () => {
      resolve({ authenticated: false });
    });

    child.on('close', () => {
      try {
        const payload = JSON.parse(stdout) as ClaudeAuthStatusPayload;
        resolve({
          authenticated: Boolean(payload.loggedIn),
          email: payload.email,
          planType: payload.subscriptionType,
          authMethod: payload.authMethod,
        });
      } catch {
        resolve({ authenticated: false });
      }
    });
  });
}
