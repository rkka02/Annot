'use client';

import { useState, useCallback } from 'react';
import { TreeNode } from '@/types';
import { WorkspaceContext, WorkspaceState } from '@/lib/workspace-store';
import { TreeExplorer } from '@/components/tree/TreeExplorer';
import { FolderView } from '@/components/workspace/FolderView';
import { PdfViewer } from '@/components/workspace/PdfViewer';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { Topbar } from '@/components/layout/Topbar';

export default function AppPage() {
  const [state, setState] = useState<WorkspaceState>({
    selectedNode: null,
    activePdf: null,
    activeSessionFolder: null,
    chatOpen: false,
  });

  const selectNode = useCallback((node: TreeNode) => {
    if (node.type === 'folder') {
      setState((s) => ({
        ...s,
        selectedNode: node,
        activePdf: null,
        activeSessionFolder: node.path,
        chatOpen: false,
      }));
    } else {
      // PDF clicked — open viewer, session stays on parent folder
      setState((s) => ({
        ...s,
        selectedNode: node,
        activePdf: node,
      }));
    }
  }, []);

  const openPdf = useCallback((pdf: TreeNode) => {
    setState((s) => ({ ...s, activePdf: pdf, selectedNode: pdf }));
  }, []);

  const openSession = useCallback((folderPath: string) => {
    setState((s) => ({
      ...s,
      activeSessionFolder: folderPath,
      chatOpen: true,
    }));
  }, []);

  const closePdf = useCallback(() => {
    setState((s) => ({ ...s, activePdf: null }));
  }, []);

  const toggleChat = useCallback(() => {
    setState((s) => ({ ...s, chatOpen: !s.chatOpen }));
  }, []);

  const ctx = { ...state, selectNode, openPdf, openSession, closePdf, toggleChat };

  return (
    <WorkspaceContext value={ctx}>
      <div className="h-full flex flex-col">
        <Topbar />
        <div className="flex-1 flex overflow-hidden">
          {/* Tree Explorer */}
          <TreeExplorer />

          {/* Main Content Area */}
          <div className="flex-1 flex min-w-0">
            {state.activePdf ? (
              // PDF is open — show viewer
              <div className={`flex-1 min-w-0 ${state.chatOpen ? '' : ''}`}>
                <PdfViewer />
              </div>
            ) : state.selectedNode?.type === 'folder' ? (
              // Folder selected — show folder overview
              <div className="flex-1 min-w-0">
                <FolderView />
              </div>
            ) : (
              // Nothing selected — empty state
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl mb-4 text-outline-variant">A.</div>
                  <h2 className="text-lg font-semibold text-on-surface mb-1">Annot</h2>
                  <p className="font-editorial text-sm text-on-surface-variant italic">
                    Select a folder in the tree to begin.
                  </p>
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {state.chatOpen && state.activeSessionFolder && (
              <div className="w-[380px] shrink-0 bg-surface-container-lowest border-l border-outline-variant/10">
                <ChatPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceContext>
  );
}
