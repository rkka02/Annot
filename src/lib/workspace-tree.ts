import { promises as fs } from 'fs';
import path from 'path';

import { getWorkspaceRoot, resolveFolderPath } from '@/lib/annot-sessions';
import { TreeNode } from '@/types';

function isVisibleEntry(name: string): boolean {
  return !name.startsWith('.');
}

function isPdfFile(name: string): boolean {
  return name.toLowerCase().endsWith('.pdf');
}

function sanitizeSegment(name: string, kind: 'folder' | 'file'): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error(`${kind === 'folder' ? 'Folder' : 'File'} name is required`);
  }

  const base = path.basename(trimmed);
  if (base !== trimmed || base === '.' || base === '..') {
    throw new Error(`Invalid ${kind} name`);
  }

  return base;
}

async function ensureWorkspaceRoot(): Promise<void> {
  await fs.mkdir(getWorkspaceRoot(), { recursive: true });
}

async function ensureUniqueFilePath(dirPath: string, fileName: string): Promise<string> {
  const parsed = path.parse(fileName);
  let attempt = 0;

  while (true) {
    const candidateName = attempt === 0
      ? fileName
      : `${parsed.name}-${attempt}${parsed.ext}`;
    const candidatePath = path.join(dirPath, candidateName);

    try {
      await fs.access(candidatePath);
      attempt += 1;
    } catch {
      return candidatePath;
    }
  }
}

async function buildNode(relativePath: string): Promise<TreeNode> {
  const absolutePath = relativePath ? resolveFolderPath(relativePath) : getWorkspaceRoot();
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });

  const folderChildren = entries
    .filter((entry) => entry.isDirectory() && isVisibleEntry(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(async (entry) => {
      const childPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      return buildNode(childPath);
    });

  const pdfChildren = entries
    .filter((entry) => entry.isFile() && isVisibleEntry(entry.name) && isPdfFile(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const childPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      return {
        id: `pdf:${childPath}`,
        name: entry.name,
        type: 'pdf' as const,
        path: childPath,
      };
    });

  return {
    id: relativePath ? `folder:${relativePath}` : 'root',
    name: relativePath ? path.basename(relativePath) : path.basename(getWorkspaceRoot()),
    type: 'folder',
    path: relativePath,
    children: [...await Promise.all(folderChildren), ...pdfChildren],
  };
}

export async function getWorkspaceTree(): Promise<TreeNode> {
  await ensureWorkspaceRoot();
  return buildNode('');
}

export async function createWorkspaceFolder(parentPath: string, folderName: string): Promise<TreeNode> {
  await ensureWorkspaceRoot();
  const safeName = sanitizeSegment(folderName, 'folder');
  const absoluteParent = parentPath ? resolveFolderPath(parentPath) : getWorkspaceRoot();
  const absolutePath = path.join(absoluteParent, safeName);

  await fs.mkdir(absolutePath, { recursive: false });

  const relativePath = parentPath ? `${parentPath}/${safeName}` : safeName;
  return {
    id: `folder:${relativePath}`,
    name: safeName,
    type: 'folder',
    path: relativePath,
    children: [],
  };
}

export async function saveUploadedPdf(folderPath: string, file: File): Promise<TreeNode> {
  await ensureWorkspaceRoot();

  const originalName = sanitizeSegment(file.name, 'file');
  const fileName = originalName.toLowerCase().endsWith('.pdf') ? originalName : `${originalName}.pdf`;
  const absoluteFolder = folderPath ? resolveFolderPath(folderPath) : getWorkspaceRoot();

  await fs.mkdir(absoluteFolder, { recursive: true });

  const absolutePath = await ensureUniqueFilePath(absoluteFolder, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  const storedName = path.basename(absolutePath);
  const relativePath = folderPath ? `${folderPath}/${storedName}` : storedName;
  return {
    id: `pdf:${relativePath}`,
    name: storedName,
    type: 'pdf',
    path: relativePath,
  };
}
