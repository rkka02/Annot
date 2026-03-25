import { TreeNode } from '@/types';

export function collectPdfs(node: TreeNode): TreeNode[] {
  if (node.type === 'pdf') return [node];

  const pdfs: TreeNode[] = [];
  for (const child of node.children ?? []) {
    pdfs.push(...collectPdfs(child));
  }
  return pdfs;
}

export function findNode(root: TreeNode, targetPath: string): TreeNode | null {
  if (root.path === targetPath) return root;

  for (const child of root.children ?? []) {
    const found = findNode(child, targetPath);
    if (found) return found;
  }

  return null;
}

export function countItems(node: TreeNode): { folders: number; pdfs: number } {
  let folders = 0;
  let pdfs = 0;

  for (const child of node.children ?? []) {
    if (child.type === 'folder') {
      folders += 1;
      const sub = countItems(child);
      folders += sub.folders;
      pdfs += sub.pdfs;
    } else {
      pdfs += 1;
    }
  }

  return { folders, pdfs };
}

export function getParentFolderPath(node: TreeNode | null): string {
  if (!node) return '';
  if (node.type === 'folder') return node.path;

  const parts = node.path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}
