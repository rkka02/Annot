'use client';

import { TreeItem } from './TreeItem';
import { useWorkspace } from '@/lib/workspace-store';
import { FolderPlus, FilePlus, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { countItems, findNode, getParentFolderPath } from '@/lib/tree-utils';
import { useRef, useState } from 'react';

export function TreeExplorer() {
  const {
    treeRoot,
    treeLoading,
    selectedNode,
    selectNode,
    refreshTree,
    explorerOpen,
    toggleExplorer,
  } = useWorkspace();
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetFolderPath = getParentFolderPath(selectedNode);
  const stats = treeRoot ? countItems(treeRoot) : { folders: 0, pdfs: 0 };

  const handleCreateFolder = async () => {
    const name = window.prompt('New folder name');
    if (!name?.trim()) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/workspace/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPath: targetFolderPath,
          name: name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to create folder');
      }

      const nextTree = await refreshTree();
      if (nextTree) {
        const nextNode = findNode(nextTree, data.path);
        if (nextNode) {
          selectNode(nextNode);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder';
      window.alert(message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('folderPath', targetFolderPath);

      const res = await fetch('/api/papers', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Upload failed');
      }

      const nextTree = await refreshTree();
      if (nextTree) {
        const nextNode = findNode(nextTree, data.path);
        if (nextNode) {
          selectNode(nextNode);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      window.alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!explorerOpen) {
    return (
      <aside className="w-12 bg-surface-container flex flex-col shrink-0 overflow-hidden border-r border-outline-variant/10">
        <div className="h-10 flex items-center justify-center shrink-0">
          <button
            onClick={toggleExplorer}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="Expand explorer"
          >
            <PanelLeftOpen size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-[10px] text-outline [writing-mode:vertical-rl] rotate-180">
            Explorer
          </div>
        </div>

        <div className="px-1 py-3 shrink-0 text-center text-[10px] text-outline leading-tight">
          <div>{stats.folders}F</div>
          <div>{stats.pdfs}P</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => void handleUploadChange(event)}
        />
      </aside>
    );
  }

  return (
    <aside className="w-[240px] bg-surface-container flex flex-col shrink-0 overflow-hidden border-r border-outline-variant/10">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={toggleExplorer}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="Collapse explorer"
          >
            <PanelLeftClose size={13} strokeWidth={2} />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Explorer
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => void handleCreateFolder()}
            disabled={isCreatingFolder || treeLoading}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
            title="Create folder"
          >
            <FolderPlus size={13} strokeWidth={2} />
          </button>
          <button
            onClick={handleUploadClick}
            disabled={isUploading || treeLoading}
            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
            title="Upload PDF"
          >
            <FilePlus size={13} strokeWidth={2} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => void handleUploadChange(event)}
          />
        </div>
      </div>

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto px-1 pb-4">
        {treeLoading ? (
          <div className="px-3 py-2 text-xs text-on-surface-variant">Loading workspace...</div>
        ) : treeRoot?.children?.length ? (
          treeRoot.children.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedPath={selectedNode?.path ?? null}
            />
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-on-surface-variant">
            No folders or PDFs yet.
          </div>
        )}
      </nav>

      {/* Footer stats */}
      <div className="px-3 py-2 shrink-0">
        <div className="text-[10px] text-outline">
          {stats.folders} folders &middot; {stats.pdfs} PDFs
        </div>
      </div>
    </aside>
  );
}
