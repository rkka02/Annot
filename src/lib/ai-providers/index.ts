import { getClaudeAuthStatus, probeClaudeConnection, runClaudeTurn } from '@/lib/claude-code';
import { fetchCodexModels, getCodexAuthStatus, sendCodexChat } from '@/lib/codex-auth';
import { runCodexTurn } from '@/lib/codex-exec';
import { AIProvider } from '@/types';
import { DEFAULT_AI_PROVIDER } from './config';

import {
  ProviderModel,
  ProviderRuntime,
  ProviderTurnInput,
  ProviderTurnResult,
  ProviderTurnEvent,
} from './types';

const codexRuntime: ProviderRuntime = {
  id: 'codex',
  async listModels(): Promise<ProviderModel[]> {
    const models = await fetchCodexModels();
    if (!models) {
      throw new Error('Not authenticated. Sign in to Codex on this machine first.');
    }
    return models;
  },
  async getStatus() {
    return {
      provider: 'codex',
      ...(await getCodexAuthStatus()),
    };
  },
  async validateConnection() {
    const models = await codexRuntime.listModels();
    const model = models[0]?.id || 'gpt-5.4-mini';
    const result = await sendCodexChat(
      [{ role: 'user', content: 'Reply with exactly OK.' }],
      model,
    );

    return {
      provider: 'codex',
      ok: /^ok\b/i.test(result.content.trim()),
      model: result.model || model,
      response: result.content.trim(),
      message: 'Codex responded successfully.',
    };
  },
  async runTurn(
    input: ProviderTurnInput,
    options?: { onEvent?: (event: ProviderTurnEvent) => void },
  ): Promise<ProviderTurnResult> {
    const result = await runCodexTurn(
      {
        codexSessionId: input.providerSessionId,
        model: input.model,
        folderPath: input.folderPath,
        sessionKind: input.sessionKind,
        prompt: input.prompt,
        currentPdfPath: input.currentPdfPath,
      },
      options,
    );

    return {
      providerSessionId: result.codexSessionId,
      content: result.content,
    };
  },
};

const claudeRuntime: ProviderRuntime = {
  id: 'claude',
  async listModels(): Promise<ProviderModel[]> {
    return [
      {
        id: 'sonnet',
        owned_by: 'anthropic',
        created: 0,
        display_name: 'Sonnet',
      },
      {
        id: 'opus',
        owned_by: 'anthropic',
        created: 0,
        display_name: 'Opus',
      },
    ];
  },
  async getStatus() {
    return {
      provider: 'claude',
      ...(await getClaudeAuthStatus()),
    };
  },
  async validateConnection() {
    const result = await probeClaudeConnection('sonnet');

    return {
      provider: 'claude',
      ok: /^ok\b/i.test(result.response.trim()),
      model: result.model,
      response: result.response,
      message: 'Claude Code responded successfully.',
    };
  },
  async runTurn(
    input: ProviderTurnInput,
    options?: { onEvent?: (event: ProviderTurnEvent) => void },
  ): Promise<ProviderTurnResult> {
    return await runClaudeTurn(input, options);
  },
};

const providerRegistry: Record<AIProvider, ProviderRuntime> = {
  codex: codexRuntime,
  claude: claudeRuntime,
};

export function getProviderRuntime(provider: AIProvider = DEFAULT_AI_PROVIDER): ProviderRuntime {
  const runtime = providerRegistry[provider];
  if (!runtime) {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  return runtime;
}
