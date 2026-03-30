import { SessionKind, AIProvider } from '@/types';

export interface ProviderModel {
  id: string;
  owned_by: string;
  created: number;
  display_name?: string;
}

export interface ProviderStatus {
  provider: AIProvider;
  authenticated: boolean;
  email?: string;
  planType?: string;
  authMethod?: string;
  expiresAt?: number;
  hasRefreshToken?: boolean;
}

export interface ProviderValidationResult {
  provider: AIProvider;
  ok: boolean;
  model?: string;
  response?: string;
  message: string;
}

export interface ProviderTurnEvent {
  type: 'status' | 'assistant_delta' | 'tool_use' | 'tool_result';
  message?: string;
  text?: string;
  name?: string;
  input?: string;
  output?: string;
  exitCode?: number | null;
}

export interface ProviderTurnInput {
  providerSessionId?: string;
  model: string;
  folderPath: string;
  sessionKind: SessionKind;
  prompt: string;
  currentPdfPath?: string | null;
}

export interface ProviderTurnResult {
  providerSessionId: string;
  content: string;
}

export interface ProviderRuntime {
  id: AIProvider;
  listModels: () => Promise<ProviderModel[]>;
  getStatus: () => Promise<ProviderStatus>;
  validateConnection: () => Promise<ProviderValidationResult>;
  runTurn: (
    input: ProviderTurnInput,
    options?: { onEvent?: (event: ProviderTurnEvent) => void }
  ) => Promise<ProviderTurnResult>;
}
