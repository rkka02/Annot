'use client';

import { createContext, useContext } from 'react';
import { Session, SessionKind, TreeNode } from '@/types';

export interface WorkspaceState {
  // Current workspace tree rooted at ~/Annot
  treeRoot: TreeNode | null;
  // Whether the tree is being loaded from disk
  treeLoading: boolean;
  // Currently selected node in the tree
  selectedNode: TreeNode | null;
  // Currently viewed PDF (subset of selection — clicking a pdf sets this)
  activePdf: TreeNode | null;
  // Currently active session folder path (where chat lives)
  activeSessionFolder: string | null;
  // Whether the active session is folder-wide or PDF-specific
  activeSessionKind: SessionKind | null;
  // PDF path for PDF-specific sessions
  activeSessionPdfPath: string | null;
  // Currently active Annot session id
  activeSessionId: string | null;
  // Whether the explorer sidebar is expanded
  explorerOpen: boolean;
  // Whether the chat panel is visible
  chatOpen: boolean;
}

export interface WorkspaceActions {
  selectNode: (node: TreeNode) => void;
  clearSelection: () => void;
  openPdf: (pdf: TreeNode) => void;
  openSession: (session: Pick<Session, 'id' | 'folderPath' | 'sessionKind' | 'pdfPath'>) => void;
  closePdf: () => void;
  toggleExplorer: () => void;
  toggleChat: () => void;
  refreshTree: () => Promise<TreeNode | null>;
}

export type WorkspaceContextType = WorkspaceState & WorkspaceActions;

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspace(): WorkspaceContextType {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
