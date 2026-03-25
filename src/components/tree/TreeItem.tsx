'use client';

import { useState } from 'react';
import { TreeNode } from '@/types';
import { useWorkspace } from '@/lib/workspace-store';
import { ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
}

export function TreeItem({ node, depth, selectedPath }: TreeItemProps) {
  const { selectNode } = useWorkspace();
  const [expanded, setExpanded] = useState(depth < 1); // auto-expand first level
  const isSelected = selectedPath === node.path;
  const isFolder = node.type === 'folder';
  const hasChildren = isFolder && (node.children?.length ?? 0) > 0;

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    }
    selectNode(node);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`
          w-full flex items-center gap-1 py-[5px] rounded-md text-left transition-colors group
          ${isSelected
            ? 'bg-surface-container-lowest text-on-surface'
            : 'text-on-surface-variant hover:bg-surface-container-low'
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Chevron for folders */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isFolder && hasChildren && (
            <ChevronRight
              size={12}
              strokeWidth={2}
              className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          )}
        </span>

        {/* Icon */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isFolder ? (
            expanded ? (
              <FolderOpen size={14} strokeWidth={1.8} className="text-tertiary-fixed" />
            ) : (
              <Folder size={14} strokeWidth={1.8} className="text-on-surface-variant" />
            )
          ) : (
            <FileText size={13} strokeWidth={1.8} className="text-outline" />
          )}
        </span>

        {/* Name */}
        <span className={`text-xs truncate ${isFolder ? 'font-medium' : 'font-normal'}`}>
          {node.name}
        </span>
      </button>

      {/* Children */}
      {isFolder && expanded && node.children?.map((child) => (
        <TreeItem
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}
