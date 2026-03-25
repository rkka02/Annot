'use client';

import { useState } from 'react';
import { mockTree } from '@/lib/mock-data';
import { TreeNode } from '@/types';
import { TreeItem } from './TreeItem';
import { useWorkspace } from '@/lib/workspace-store';
import { FolderPlus, FilePlus } from 'lucide-react';

export function TreeExplorer() {
  const { selectedNode } = useWorkspace();

  return (
    <aside className="w-[240px] bg-surface-container flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <FolderPlus size={13} strokeWidth={2} />
          </button>
          <button className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <FilePlus size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto px-1 pb-4">
        {mockTree.children?.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            selectedPath={selectedNode?.path ?? null}
          />
        ))}
      </nav>

      {/* Footer stats */}
      <div className="px-3 py-2 shrink-0">
        <div className="text-[10px] text-outline">
          {countItems(mockTree).folders} folders &middot; {countItems(mockTree).pdfs} PDFs
        </div>
      </div>
    </aside>
  );
}

function countItems(node: TreeNode): { folders: number; pdfs: number } {
  let folders = 0;
  let pdfs = 0;
  for (const child of node.children ?? []) {
    if (child.type === 'folder') {
      folders++;
      const sub = countItems(child);
      folders += sub.folders;
      pdfs += sub.pdfs;
    } else {
      pdfs++;
    }
  }
  return { folders, pdfs };
}
