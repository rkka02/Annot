import { promises as fs } from 'fs';
import path from 'path';

import {
  getWorkspaceRoot,
  movePdfSessions,
  removePdfSessions,
  resolveFolderPath,
  rewriteSessionsForFolderMove,
} from '@/lib/annot-sessions';
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

async function ensureDirectory(relativePath: string): Promise<void> {
  const absolutePath = relativePath ? resolveFolderPath(relativePath) : getWorkspaceRoot();
  const stats = await fs.stat(absolutePath);
  if (!stats.isDirectory()) {
    throw new Error('Target folder does not exist');
  }
}

async function ensurePathDoesNotExist(absolutePath: string, errorMessage: string): Promise<void> {
  try {
    await fs.access(absolutePath);
    throw new Error(errorMessage);
  } catch (error) {
    if (error instanceof Error && error.message === errorMessage) {
      throw error;
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

  await fs.mkdir(absoluteParent, { recursive: true });

  const parentStats = await fs.stat(absoluteParent);
  if (!parentStats.isDirectory()) {
    throw new Error('Target folder does not exist');
  }

  await ensurePathDoesNotExist(absolutePath, 'A folder with that name already exists');
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

export async function renameWorkspaceFolder(folderPath: string, nextName: string): Promise<TreeNode> {
  await ensureWorkspaceRoot();

  const normalizedFolderPath = folderPath.trim();
  if (!normalizedFolderPath) {
    throw new Error('Root folder cannot be renamed');
  }

  const safeName = sanitizeSegment(nextName, 'folder');
  const parentPath = path.posix.dirname(normalizedFolderPath) === '.'
    ? ''
    : path.posix.dirname(normalizedFolderPath);
  const nextRelativePath = parentPath ? `${parentPath}/${safeName}` : safeName;
  const sourceAbsolutePath = resolveFolderPath(normalizedFolderPath);
  const targetAbsolutePath = resolveFolderPath(nextRelativePath);

  await ensurePathDoesNotExist(targetAbsolutePath, 'A folder with that name already exists');
  await fs.rename(sourceAbsolutePath, targetAbsolutePath);
  await rewriteSessionsForFolderMove(normalizedFolderPath, nextRelativePath);

  return {
    id: `folder:${nextRelativePath}`,
    name: safeName,
    type: 'folder',
    path: nextRelativePath,
    children: [],
  };
}

export async function deleteWorkspaceFolder(folderPath: string): Promise<void> {
  await ensureWorkspaceRoot();

  const normalizedFolderPath = folderPath.trim();
  if (!normalizedFolderPath) {
    throw new Error('Root folder cannot be deleted');
  }

  await fs.rm(resolveFolderPath(normalizedFolderPath), { recursive: true, force: false });
}

export async function renameWorkspacePdf(pdfPath: string, nextName: string): Promise<TreeNode> {
  await ensureWorkspaceRoot();

  const normalizedPdfPath = pdfPath.trim();
  const safeName = sanitizeSegment(nextName, 'file');
  const fileName = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
  const parentPath = path.posix.dirname(normalizedPdfPath) === '.'
    ? ''
    : path.posix.dirname(normalizedPdfPath);
  const nextRelativePath = parentPath ? `${parentPath}/${fileName}` : fileName;
  const sourceAbsolutePath = resolveFolderPath(normalizedPdfPath);
  const targetAbsolutePath = resolveFolderPath(nextRelativePath);

  await ensurePathDoesNotExist(targetAbsolutePath, 'A PDF with that name already exists');
  await fs.rename(sourceAbsolutePath, targetAbsolutePath);

  if (parentPath) {
    await movePdfSessions(parentPath, parentPath, normalizedPdfPath, nextRelativePath);
  } else {
    await movePdfSessions('', '', normalizedPdfPath, nextRelativePath);
  }

  return {
    id: `pdf:${nextRelativePath}`,
    name: fileName,
    type: 'pdf',
    path: nextRelativePath,
  };
}

export async function deleteWorkspacePdf(pdfPath: string): Promise<void> {
  await ensureWorkspaceRoot();

  const normalizedPdfPath = pdfPath.trim();
  const parentPath = path.posix.dirname(normalizedPdfPath) === '.'
    ? ''
    : path.posix.dirname(normalizedPdfPath);

  await fs.rm(resolveFolderPath(normalizedPdfPath), { force: false });
  await removePdfSessions(parentPath, normalizedPdfPath);
}

export async function moveWorkspacePdf(pdfPath: string, targetFolderPath: string): Promise<TreeNode> {
  await ensureWorkspaceRoot();

  const normalizedPdfPath = pdfPath.trim();
  const normalizedTargetFolderPath = targetFolderPath.trim();
  await ensureDirectory(normalizedTargetFolderPath);

  const fileName = path.posix.basename(normalizedPdfPath);
  const nextRelativePath = normalizedTargetFolderPath
    ? `${normalizedTargetFolderPath}/${fileName}`
    : fileName;
  const sourceAbsolutePath = resolveFolderPath(normalizedPdfPath);
  const targetAbsolutePath = resolveFolderPath(nextRelativePath);

  if (normalizedPdfPath === nextRelativePath) {
    return {
      id: `pdf:${nextRelativePath}`,
      name: fileName,
      type: 'pdf',
      path: nextRelativePath,
    };
  }

  await ensurePathDoesNotExist(targetAbsolutePath, 'A PDF with that name already exists in the target folder');
  await fs.rename(sourceAbsolutePath, targetAbsolutePath);

  const sourceFolderPath = path.posix.dirname(normalizedPdfPath) === '.'
    ? ''
    : path.posix.dirname(normalizedPdfPath);
  await movePdfSessions(sourceFolderPath, normalizedTargetFolderPath, normalizedPdfPath, nextRelativePath);

  return {
    id: `pdf:${nextRelativePath}`,
    name: fileName,
    type: 'pdf',
    path: nextRelativePath,
  };
}
