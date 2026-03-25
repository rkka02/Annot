import { NextRequest, NextResponse } from 'next/server';

import {
  createWorkspaceFolder,
  deleteWorkspaceFolder,
  renameWorkspaceFolder,
} from '@/lib/workspace-tree';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { parentPath, name } = body as {
      parentPath?: string;
      name?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const folder = await createWorkspaceFolder(parentPath?.trim() || '', name);
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create folder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, name } = body as {
      path?: string;
      name?: string;
    };

    if (!path?.trim()) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const folder = await renameWorkspaceFolder(path.trim(), name);
    return NextResponse.json(folder);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rename folder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const folderPath = req.nextUrl.searchParams.get('path')?.trim();
    if (!folderPath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    await deleteWorkspaceFolder(folderPath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete folder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
