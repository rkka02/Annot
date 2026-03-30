import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import { DEFAULT_AI_PROVIDER } from '@/lib/ai-providers/config';
import { AIProvider, ChatMessage, Session, SessionKind } from '@/types';

const WORKSPACE_ROOT = process.env.ANNOT_ROOT || path.join(os.homedir(), 'Annot');

export type StoredSession = Session;

interface StoredSessionRecord extends Omit<StoredSession, 'provider'> {
  provider?: AIProvider;
  providerSessionId?: string;
  codexSessionId?: string;
}

interface SessionListOptions {
  sessionKind?: SessionKind;
  pdfPath?: string | null;
  provider?: AIProvider;
}

interface CreateSessionOptions {
  model?: string;
  sessionKind?: SessionKind;
  pdfPath?: string | null;
  provider?: AIProvider;
}

interface SessionPathRewrite {
  from: string;
  to: string;
}

interface ReconciledSessionResult {
  changed: boolean;
  session: StoredSession | null;
}

function sanitizeRelativePath(folderPath: string): string {
  const normalized = path.normalize(folderPath || '.');
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error(`Invalid folder path: ${folderPath}`);
  }
  return normalized === '.' ? '' : normalized;
}

function normalizePdfPath(pdfPath: string): string {
  return sanitizeRelativePath(pdfPath);
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function pathExists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(resolveFolderPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readSessionsFile(folderPath: string): Promise<StoredSession[]> {
  const sessionsFile = await ensureSessionsFile(folderPath);
  const raw = await fs.readFile(sessionsFile, 'utf8');
  const records = JSON.parse(raw) as StoredSessionRecord[];
  return records.map((session) => normalizeSession(folderPath, session));
}

export function getWorkspaceRoot(): string {
  return WORKSPACE_ROOT;
}

export function resolveFolderPath(folderPath: string): string {
  const relativePath = sanitizeRelativePath(folderPath);
  return path.join(WORKSPACE_ROOT, relativePath);
}

function getAnnotDir(folderPath: string): string {
  return path.join(resolveFolderPath(folderPath), '.annot');
}

function getSessionsFile(folderPath: string): string {
  return path.join(getAnnotDir(folderPath), 'sessions.json');
}

async function ensureSessionsFile(folderPath: string): Promise<string> {
  await ensureDir(getAnnotDir(folderPath));
  const sessionsFile = getSessionsFile(folderPath);

  try {
    await fs.access(sessionsFile);
  } catch {
    await fs.writeFile(sessionsFile, '[]');
  }

  return sessionsFile;
}

export async function ensureFolderExists(folderPath: string): Promise<void> {
  await ensureDir(resolveFolderPath(folderPath));
  await ensureSessionsFile(folderPath);
}

async function collectPdfPaths(folderPath: string): Promise<string[]> {
  const basePath = resolveFolderPath(folderPath);
  const entries = await fs.readdir(basePath, { withFileTypes: true });
  const pdfPaths: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const relativePath = folderPath ? `${folderPath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      pdfPaths.push(...await collectPdfPaths(relativePath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      pdfPaths.push(relativePath);
    }
  }

  return pdfPaths;
}

async function inferPdfPathFromSession(folderPath: string, session: StoredSession): Promise<string | null> {
  const titleStem = session.title.replace(/\s+session$/i, '').trim().toLowerCase();
  const pdfNameStem = session.pdfPath
    ? path.basename(session.pdfPath).replace(/\.pdf$/i, '').trim().toLowerCase()
    : '';

  const pdfPaths = await collectPdfPaths(folderPath);
  const matches = pdfPaths.filter((candidatePath) => {
    const candidateStem = path.basename(candidatePath).replace(/\.pdf$/i, '').trim().toLowerCase();
    return candidateStem === titleStem || (pdfNameStem.length > 0 && candidateStem === pdfNameStem);
  });

  return matches.length === 1 ? matches[0] : null;
}

function normalizeSession(folderPath: string, session: StoredSessionRecord): StoredSession {
  const normalizedFolderPath = sanitizeRelativePath(folderPath);
  const sessionKind = session.sessionKind === 'pdf' || typeof session.pdfPath === 'string' ? 'pdf' : 'folder';
  const normalizedPdfPath = typeof session.pdfPath === 'string' && session.pdfPath.length > 0
    ? normalizePdfPath(session.pdfPath)
    : undefined;
  const provider = session.provider ?? DEFAULT_AI_PROVIDER;
  const providerSessionId = session.providerSessionId ?? session.codexSessionId;

  return {
    id: session.id,
    folderPath: normalizedFolderPath,
    sessionKind,
    pdfPath: normalizedPdfPath,
    provider,
    providerSessionId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: Array.isArray(session.messages) ? session.messages : [],
    model: session.model,
  };
}

async function reconcileSession(folderPath: string, session: StoredSession): Promise<ReconciledSessionResult> {
  const normalizedSession = normalizeSession(folderPath, session);
  let nextSession = normalizedSession;
  let changed = (
    normalizedSession.folderPath !== session.folderPath ||
    normalizedSession.sessionKind !== session.sessionKind ||
    normalizedSession.pdfPath !== session.pdfPath
  );

  if (nextSession.sessionKind === 'folder' && !nextSession.pdfPath) {
    const inferredPdfPath = await inferPdfPathFromSession(folderPath, nextSession);
    if (inferredPdfPath) {
      nextSession = {
        ...nextSession,
        sessionKind: 'pdf',
        pdfPath: inferredPdfPath,
      };
      changed = true;
    }
  }

  if (nextSession.sessionKind !== 'pdf') {
    return { session: nextSession, changed };
  }

  if (!nextSession.pdfPath) {
    return { session: null, changed: true };
  }

  if (await pathExists(nextSession.pdfPath)) {
    return { session: nextSession, changed };
  }

  const inferredPdfPath = await inferPdfPathFromSession(folderPath, nextSession);
  if (!inferredPdfPath) {
    return { session: null, changed: true };
  }

  return {
    session: {
      ...nextSession,
      pdfPath: inferredPdfPath,
    },
    changed: true,
  };
}

function matchesSession(session: StoredSession, options: SessionListOptions): boolean {
  if (options.provider && session.provider !== options.provider) {
    return false;
  }

  if (options.sessionKind && session.sessionKind !== options.sessionKind) {
    return false;
  }

  if (options.sessionKind === 'pdf') {
    if (!options.pdfPath) {
      return false;
    }
    return session.pdfPath === normalizePdfPath(options.pdfPath);
  }

  if (typeof options.pdfPath === 'string' && options.pdfPath.length > 0) {
    return session.pdfPath === normalizePdfPath(options.pdfPath);
  }

  return true;
}

export async function listSessions(folderPath: string, options: SessionListOptions = {}): Promise<StoredSession[]> {
  const sessionsFile = await ensureSessionsFile(folderPath);
  const raw = await fs.readFile(sessionsFile, 'utf8');
  const rawSessions = JSON.parse(raw) as StoredSession[];
  const reconciledResults = await Promise.all(rawSessions.map((session) => reconcileSession(folderPath, session)));
  const sessions = reconciledResults
    .flatMap((result) => result.session ? [result.session] : []);

  if (reconciledResults.some((result) => result.changed)) {
    await writeSessions(folderPath, sessions);
  }

  return sessions
    .filter((session) => matchesSession(session, options))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

async function writeSessions(folderPath: string, sessions: StoredSession[]): Promise<void> {
  const sessionsFile = await ensureSessionsFile(folderPath);
  const cleanedSessions = sessions.map((session) => ({
    id: session.id,
    folderPath: session.folderPath,
    sessionKind: session.sessionKind,
    pdfPath: session.pdfPath,
    provider: session.provider,
    providerSessionId: session.providerSessionId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: session.messages,
    model: session.model,
  }));
  await fs.writeFile(sessionsFile, JSON.stringify(cleanedSessions, null, 2));
}

function rewriteRelativePathPrefix(targetPath: string | undefined, rewrite: SessionPathRewrite): string | undefined {
  if (!targetPath) return targetPath;
  if (targetPath === rewrite.from) return rewrite.to;
  if (!targetPath.startsWith(`${rewrite.from}/`)) return targetPath;
  return `${rewrite.to}${targetPath.slice(rewrite.from.length)}`;
}

function rewriteSessionPaths(session: StoredSession, rewrite: SessionPathRewrite): StoredSession {
  return {
    ...session,
    folderPath: rewriteRelativePathPrefix(session.folderPath, rewrite) ?? session.folderPath,
    pdfPath: rewriteRelativePathPrefix(session.pdfPath, rewrite),
  };
}

async function collectAnnotSessionFolders(rootFolderPath: string): Promise<string[]> {
  const absoluteRoot = resolveFolderPath(rootFolderPath);
  const folders: string[] = [];

  async function walk(currentRelativePath: string): Promise<void> {
    const absoluteCurrentPath = currentRelativePath ? resolveFolderPath(currentRelativePath) : absoluteRoot;
    const annotDir = path.join(absoluteCurrentPath, '.annot');

    try {
      const stat = await fs.stat(path.join(annotDir, 'sessions.json'));
      if (stat.isFile()) {
        folders.push(currentRelativePath);
      }
    } catch {
      // Ignore missing .annot directories.
    }

    const entries = await fs.readdir(absoluteCurrentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const childRelativePath = currentRelativePath ? `${currentRelativePath}/${entry.name}` : entry.name;
      await walk(childRelativePath);
    }
  }

  await walk(rootFolderPath);
  return folders;
}

export async function getSession(folderPath: string, sessionId: string): Promise<StoredSession | null> {
  const sessions = await listSessions(folderPath);
  return sessions.find((session) => session.id === sessionId) || null;
}

export async function createSession(
  folderPath: string,
  title: string,
  options: CreateSessionOptions = {},
): Promise<StoredSession> {
  await ensureFolderExists(folderPath);

  const sessionKind = options.sessionKind === 'pdf' ? 'pdf' : 'folder';
  const provider = options.provider ?? DEFAULT_AI_PROVIDER;
  const pdfPath = sessionKind === 'pdf' && options.pdfPath
    ? normalizePdfPath(options.pdfPath)
    : undefined;

  const now = new Date().toISOString();
  const session: StoredSession = {
    id: crypto.randomUUID(),
    folderPath: sanitizeRelativePath(folderPath),
    sessionKind,
    pdfPath,
    provider,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
    model: options.model,
  };

  const sessions = await listSessions(folderPath);
  sessions.push(session);
  await writeSessions(folderPath, sessions);
  return session;
}

export async function updateSession(
  folderPath: string,
  sessionId: string,
  updates: Partial<Pick<StoredSession, 'messages' | 'title' | 'provider' | 'providerSessionId' | 'model'>>
): Promise<StoredSession> {
  const sessions = await listSessions(folderPath);
  const index = sessions.findIndex((session) => session.id === sessionId);
  if (index === -1) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const nextSession: StoredSession = {
    ...sessions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  sessions[index] = nextSession;
  await writeSessions(folderPath, sessions);
  return nextSession;
}

export function buildDefaultSessionTitle(folderPath: string): string {
  const folderName = folderPath.split('/').filter(Boolean).at(-1) || 'Workspace';
  return `${folderName} session`;
}

export function buildSessionTitle(
  folderPath: string,
  sessionKind: SessionKind,
  pdfPath?: string | null,
): string {
  if (sessionKind === 'pdf' && pdfPath) {
    return `${path.basename(pdfPath).replace(/\.pdf$/i, '')} session`;
  }

  const folderName = folderPath.split('/').filter(Boolean).at(-1) || 'Workspace';
  return `${folderName} session`;
}

export function appendMessage(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return [...messages, message];
}

export async function removePdfSessions(folderPath: string, pdfPath: string): Promise<void> {
  const normalizedFolderPath = sanitizeRelativePath(folderPath);
  const normalizedPdfPath = normalizePdfPath(pdfPath);
  const sessions = await readSessionsFile(normalizedFolderPath);
  const nextSessions = sessions.filter((session) => (
    !(session.sessionKind === 'pdf' && session.pdfPath === normalizedPdfPath)
  ));

  if (nextSessions.length !== sessions.length) {
    await writeSessions(normalizedFolderPath, nextSessions);
  }
}

export async function movePdfSessions(
  fromFolderPath: string,
  toFolderPath: string,
  oldPdfPath: string,
  newPdfPath: string,
): Promise<void> {
  const normalizedFromFolderPath = sanitizeRelativePath(fromFolderPath);
  const normalizedToFolderPath = sanitizeRelativePath(toFolderPath);
  const normalizedOldPdfPath = normalizePdfPath(oldPdfPath);
  const normalizedNewPdfPath = normalizePdfPath(newPdfPath);

  const sourceSessions = await readSessionsFile(normalizedFromFolderPath);
  const movedSessions = sourceSessions
    .filter((session) => session.sessionKind === 'pdf' && session.pdfPath === normalizedOldPdfPath)
    .map((session) => ({
      ...session,
      folderPath: normalizedToFolderPath,
      pdfPath: normalizedNewPdfPath,
      title: buildSessionTitle(normalizedToFolderPath, 'pdf', normalizedNewPdfPath),
      updatedAt: new Date().toISOString(),
    }));

  if (movedSessions.length === 0) {
    return;
  }

  const remainingSourceSessions = sourceSessions.filter((session) => (
    !(session.sessionKind === 'pdf' && session.pdfPath === normalizedOldPdfPath)
  ));
  await writeSessions(normalizedFromFolderPath, remainingSourceSessions);

  const destinationSessions = await readSessionsFile(normalizedToFolderPath);
  await writeSessions(normalizedToFolderPath, [...destinationSessions, ...movedSessions]);
}

export async function rewriteSessionsForFolderMove(
  oldFolderPath: string,
  newFolderPath: string,
): Promise<void> {
  const normalizedOldFolderPath = sanitizeRelativePath(oldFolderPath);
  const normalizedNewFolderPath = sanitizeRelativePath(newFolderPath);
  const sessionFolders = await collectAnnotSessionFolders(normalizedNewFolderPath);

  await Promise.all(sessionFolders.map(async (sessionFolderPath) => {
    const rawSessions = await readSessionsFile(sessionFolderPath);
    const nextSessions = rawSessions.map((session) => rewriteSessionPaths(session, {
      from: normalizedOldFolderPath,
      to: normalizedNewFolderPath,
    }));
    await writeSessions(sessionFolderPath, nextSessions);
  }));
}
