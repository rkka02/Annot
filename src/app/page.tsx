'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { Session, TreeNode } from '@/types';
import { WorkspaceContext, WorkspaceState } from '@/lib/workspace-store';
import { TreeExplorer } from '@/components/tree/TreeExplorer';
import { FolderView } from '@/components/workspace/FolderView';
import { ChatPanel } from '@/components/workspace/ChatPanel';
import { Topbar } from '@/components/layout/Topbar';
import { findNode, getParentFolderPath } from '@/lib/tree-utils';

const PdfViewer = dynamic(
  () => import('@/components/workspace/PdfViewer').then((mod) => mod.PdfViewer),
  { ssr: false },
);

export default function AppPage() {
  const [state, setState] = useState<WorkspaceState>({
    treeRoot: null,
    treeLoading: true,
    selectedNode: null,
    activePdf: null,
    activeSessionFolder: null,
    activeSessionKind: null,
    activeSessionPdfPath: null,
    activeSessionId: null,
    explorerOpen: true,
    chatOpen: false,
  });

  const openPdfInContext = useCallback((currentState: WorkspaceState, pdf: TreeNode) => {
    const parentFolderPath = getParentFolderPath(pdf);
    const keepCurrentSession = (
      currentState.activeSessionKind === 'pdf' &&
      currentState.activeSessionPdfPath === pdf.path
    );

    return {
      ...currentState,
      selectedNode: pdf,
      activePdf: pdf,
      activeSessionFolder: parentFolderPath,
      activeSessionKind: 'pdf' as const,
      activeSessionPdfPath: pdf.path,
      activeSessionId: keepCurrentSession ? currentState.activeSessionId : null,
      chatOpen: keepCurrentSession ? currentState.chatOpen : false,
    };
  }, []);

  const selectNode = useCallback((node: TreeNode) => {
    if (node.type === 'folder') {
      setState((s) => ({
        ...s,
        selectedNode: node,
        activePdf: null,
        activeSessionFolder: node.path,
        activeSessionKind: 'folder',
        activeSessionPdfPath: null,
        activeSessionId: null,
        chatOpen: false,
      }));
    } else {
      setState((s) => openPdfInContext(s, node));
    }
  }, [openPdfInContext]);

  const openPdf = useCallback((pdf: TreeNode) => {
    setState((s) => openPdfInContext(s, pdf));
  }, [openPdfInContext]);

  const openSession = useCallback((session: Pick<Session, 'id' | 'folderPath' | 'sessionKind' | 'pdfPath'>) => {
    setState((s) => ({
      ...s,
      activeSessionFolder: session.folderPath,
      activeSessionKind: session.sessionKind,
      activeSessionPdfPath: session.pdfPath || null,
      activeSessionId: session.id,
      chatOpen: true,
    }));
  }, []);

  const closePdf = useCallback(() => {
    setState((s) => ({ ...s, activePdf: null }));
  }, []);

  const toggleExplorer = useCallback(() => {
    setState((s) => ({ ...s, explorerOpen: !s.explorerOpen }));
  }, []);

  const toggleChat = useCallback(() => {
    setState((s) => ({ ...s, chatOpen: !s.chatOpen }));
  }, []);

  const refreshTree = useCallback(async () => {
    const res = await fetch('/api/workspace/tree', { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || data?.error) {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load workspace tree');
    }

    const nextTree = data as TreeNode;

    setState((current) => {
      const nextSelectedNode = current.selectedNode
        ? findNode(nextTree, current.selectedNode.path)
        : null;
      const nextActivePdf = current.activePdf
        ? findNode(nextTree, current.activePdf.path)
        : null;
      const nextActiveSessionFolder = current.activeSessionFolder
        ? findNode(nextTree, current.activeSessionFolder)
        : null;
      const isCurrentPdfSessionInvalid = current.activeSessionKind === 'pdf' && (
        !current.activeSessionPdfPath ||
        !findNode(nextTree, current.activeSessionPdfPath)
      );
      const isCurrentFolderSessionInvalid = current.activeSessionKind === 'folder' && !nextActiveSessionFolder;
      const shouldClearSession = isCurrentPdfSessionInvalid || isCurrentFolderSessionInvalid;

      return {
        ...current,
        treeRoot: nextTree,
        treeLoading: false,
        selectedNode: nextSelectedNode,
        activePdf: nextActivePdf?.type === 'pdf' ? nextActivePdf : null,
        activeSessionFolder: nextActiveSessionFolder?.type === 'folder'
          ? nextActiveSessionFolder.path
          : (shouldClearSession ? null : current.activeSessionFolder),
        activeSessionKind: shouldClearSession ? null : current.activeSessionKind,
        activeSessionPdfPath: nextActivePdf?.type === 'pdf'
          ? nextActivePdf.path
          : (shouldClearSession ? null : current.activeSessionPdfPath),
        activeSessionId: shouldClearSession ? null : current.activeSessionId,
        chatOpen: shouldClearSession ? false : current.chatOpen,
      };
    });

    return nextTree;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTree = async () => {
      try {
        const res = await fetch('/api/workspace/tree', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) {
          if (!res.ok || data?.error) {
            throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to load workspace tree');
          }
          setState((current) => ({
            ...current,
            treeRoot: data as TreeNode,
            treeLoading: false,
          }));
        }
      } catch {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            treeRoot: {
              id: 'root',
              name: 'Annot',
              type: 'folder',
              path: '',
              children: [],
            },
            treeLoading: false,
          }));
        }
      }
    };

    void loadTree();

    return () => {
      cancelled = true;
    };
  }, []);

  const ctx = { ...state, selectNode, openPdf, openSession, closePdf, toggleExplorer, toggleChat };
  const contextValue = { ...ctx, refreshTree };

  return (
    <WorkspaceContext value={contextValue}>
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
                <PdfViewer key={state.activePdf.path} />
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
