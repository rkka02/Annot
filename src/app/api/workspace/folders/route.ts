import { NextRequest, NextResponse } from 'next/server';

import { createWorkspaceFolder } from '@/lib/workspace-tree';

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
