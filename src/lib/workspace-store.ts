'use client';

import { createContext, useContext } from 'react';
import { TreeNode } from '@/types';

export interface WorkspaceState {
  // Currently selected node in the tree
  selectedNode: TreeNode | null;
  // Currently viewed PDF (subset of selection — clicking a pdf sets this)
  activePdf: TreeNode | null;
  // Currently active session folder path (where chat lives)
  activeSessionFolder: string | null;
  // Whether the chat panel is visible
  chatOpen: boolean;
}

export interface WorkspaceActions {
  selectNode: (node: TreeNode) => void;
  openPdf: (pdf: TreeNode) => void;
  openSession: (folderPath: string) => void;
  closePdf: () => void;
  toggleChat: () => void;
}

export type WorkspaceContextType = WorkspaceState & WorkspaceActions;

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspace(): WorkspaceContextType {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
