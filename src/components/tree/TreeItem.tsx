'use client';

import { useEffect, useRef, useState } from 'react';
import { TreeNode } from '@/types';
import { useWorkspace } from '@/lib/workspace-store';
import { ChevronRight, Ellipsis, FileText, Folder, FolderInput, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { findNode, getParentFolderPath } from '@/lib/tree-utils';

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
}

export function TreeItem({ node, depth, selectedPath }: TreeItemProps) {
  const { refreshTree, selectNode } = useWorkspace();
  const [expanded, setExpanded] = useState(depth < 1); // auto-expand first level
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedPath === node.path;
  const isFolder = node.type === 'folder';
  const hasChildren = isFolder && (node.children?.length ?? 0) > 0;

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    }
    selectNode(node);
  };

  const focusNodeByPath = async (nextPath: string | null) => {
    const nextTree = await refreshTree();
    if (!nextTree) return;

    if (!nextPath) {
      return;
    }

    const nextNode = findNode(nextTree, nextPath);
    if (nextNode) {
      selectNode(nextNode);
    }
  };

  const handleRename = async () => {
    const suggestedName = node.type === 'pdf'
      ? node.name.replace(/\.pdf$/i, '')
      : node.name;
    const nextName = window.prompt('New name', suggestedName);
    if (!nextName?.trim()) return;

    setIsMutating(true);
    try {
      const endpoint = node.type === 'folder' ? '/api/workspace/folders' : '/api/papers';
      const payload = node.type === 'folder'
        ? { path: node.path, name: nextName.trim() }
        : { path: node.path, name: nextName.trim(), action: 'rename' };

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data?.error) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Rename failed');
      }

      setMenuOpen(false);
      await focusNodeByPath(data.path);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rename failed';
      window.alert(message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete ${node.name}?`);
    if (!confirmed) return;

    setIsMutating(true);
    try {
      const endpoint = node.type === 'folder'
        ? `/api/workspace/folders?path=${encodeURIComponent(node.path)}`
        : `/api/papers?path=${encodeURIComponent(node.path)}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || data?.error) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Delete failed');
      }

      setMenuOpen(false);
      await focusNodeByPath(getParentFolderPath(node) || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      window.alert(message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleMovePdf = async () => {
    if (node.type !== 'pdf') return;

    const currentFolderPath = getParentFolderPath(node);
    const targetFolderPath = window.prompt(
      'Move PDF to folder path relative to workspace root. Leave blank for root.',
      currentFolderPath,
    );
    if (targetFolderPath === null) return;

    setIsMutating(true);
    try {
      const res = await fetch('/api/papers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: node.path,
          targetFolderPath: targetFolderPath.trim(),
          action: 'move',
        }),
      });
      const data = await res.json();

      if (!res.ok || data?.error) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Move failed');
      }

      setMenuOpen(false);
      await focusNodeByPath(data.path);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Move failed';
      window.alert(message);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div>
      <div
        className={`
          group relative flex items-center rounded-md transition-colors
          ${isSelected
            ? 'bg-surface-container-lowest text-on-surface'
            : 'text-on-surface-variant hover:bg-surface-container-low'
          }
        `}
      >
        <button
          onClick={handleClick}
          className="flex min-w-0 flex-1 items-center gap-1 py-[5px] text-left"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            {isFolder && hasChildren && (
              <ChevronRight
                size={12}
                strokeWidth={2}
                className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            )}
          </span>

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

          <span className={`text-xs truncate ${isFolder ? 'font-medium' : 'font-normal'}`}>
            {node.name}
          </span>
        </button>

        <div ref={menuRef} className="relative mr-1 shrink-0">
          <button
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((current) => !current);
            }}
            disabled={isMutating}
            className={`
              h-6 w-6 items-center justify-center rounded transition-colors
              ${menuOpen ? 'flex bg-surface-container-high text-on-surface' : 'hidden group-hover:flex text-on-surface-variant hover:bg-surface-container-high'}
              disabled:opacity-50
            `}
            title="More actions"
          >
            <Ellipsis size={13} strokeWidth={2} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 min-w-36 rounded-lg border border-outline-variant/20 bg-surface-container-lowest py-1 shadow-ambient">
              {node.type === 'pdf' && (
                <button
                  onClick={() => void handleMovePdf()}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-high"
                >
                  <FolderInput size={12} strokeWidth={2} />
                  Move
                </button>
              )}
              <button
                onClick={() => void handleRename()}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-on-surface hover:bg-surface-container-high"
              >
                <Pencil size={12} strokeWidth={2} />
                Rename
              </button>
              <button
                onClick={() => void handleDelete()}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-error hover:bg-surface-container-high"
              >
                <Trash2 size={12} strokeWidth={2} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

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
