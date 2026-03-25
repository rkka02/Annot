export interface Paper {
  id: string;
  title: string;
  authors: string;
  fileName: string;
  uploadedAt: string;
  thumbnail?: string;
  tags?: string[];
  status?: 'peer-reviewed' | 'pre-print' | 'draft';
}

export interface Session {
  id: string;
  paperId: string;
  paperTitle: string;
  fileName: string;
  summary: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: 'gpt';
}

export interface Highlight {
  id: string;
  paperId: string;
  page: number;
  type: 'important' | 'unknown';
  text: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  sessionCount: number;
  documentCount: number;
  icon?: string;
}
