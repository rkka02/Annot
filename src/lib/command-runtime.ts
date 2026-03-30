import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';

export interface ResolvedCommand {
  command: string;
  argsPrefix: string[];
  source: string;
}

function getExecutableAccessMode(): number {
  return process.platform === 'win32' ? fsConstants.F_OK : fsConstants.X_OK;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, getExecutableAccessMode());
    return true;
  } catch {
    return false;
  }
}

function isWindowsExecutablePath(filePath: string): boolean {
  return /\.(exe|cmd|bat)$/i.test(filePath);
}

function expandExecutablePath(filePath: string): string[] {
  if (process.platform !== 'win32') {
    return [filePath];
  }

  if (isWindowsExecutablePath(filePath)) {
    return [filePath];
  }

  return [
    `${filePath}.exe`,
    `${filePath}.cmd`,
    `${filePath}.bat`,
    filePath,
  ];
}

export function getPathDirectories(): string[] {
  const rawPath = process.env.PATH || '';
  return rawPath
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function buildExecutableCandidates(
  envCandidates: Array<string | undefined>,
  pathCommandName: string,
  commonCandidateBases: string[],
): string[] {
  const pathCandidates = getPathDirectories()
    .flatMap((dirPath) => expandExecutablePath(path.join(dirPath, pathCommandName)));
  const envResolved = envCandidates
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .flatMap((value) => expandExecutablePath(value.trim()));
  const commonCandidates = commonCandidateBases
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => expandExecutablePath(value));

  return [...new Set([...envResolved, ...pathCandidates, ...commonCandidates])];
}

export async function resolveExecutable(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function resolveWindowsCmdShim(filePath: string): Promise<ResolvedCommand | null> {
  if (process.platform !== 'win32' || !/\.cmd$/i.test(filePath)) {
    return null;
  }

  let rawShim: string;
  try {
    rawShim = await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }

  const scriptMatch = rawShim.match(/"%dp0%\\([^"]+?\.js)"/i);
  if (!scriptMatch) {
    return null;
  }

  const scriptPath = path.resolve(
    path.dirname(filePath),
    scriptMatch[1].replace(/\\/g, path.sep),
  );

  if (!await fileExists(scriptPath)) {
    return null;
  }

  const bundledNode = path.join(path.dirname(filePath), 'node.exe');
  const nodeCommand = await fileExists(bundledNode) ? bundledNode : process.execPath;

  return {
    command: nodeCommand,
    argsPrefix: [scriptPath],
    source: filePath,
  };
}

export async function finalizeResolvedCommand(filePath: string): Promise<ResolvedCommand> {
  const shimCommand = await resolveWindowsCmdShim(filePath);
  if (shimCommand) {
    return shimCommand;
  }

  return {
    command: filePath,
    argsPrefix: [],
    source: filePath,
  };
}
