// ── Tree Structure ──────────────────────────────────────────────

export type TreeNodeType = 'folder' | 'pdf';

export interface TreeNode {
  id: string;
  name: string;
  type: TreeNodeType;
  path: string;            // filesystem path relative to root
  children?: TreeNode[];   // only for folders
}

// ── Sessions ────────────────────────────────────────────────────

export type SessionKind = 'folder' | 'pdf';
export type AIProvider = 'codex' | 'claude';

export interface Session {
  id: string;
  folderPath: string;      // which folder this session belongs to
  sessionKind: SessionKind;
  pdfPath?: string;
  provider: AIProvider;
  providerSessionId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  model?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

// ── Highlights ──────────────────────────────────────────────────

export interface Highlight {
  id: string;
  annotationId?: string;
  pdfPath: string;
  page: number;
  type: 'important' | 'unknown';
  text: string;
  rects?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
