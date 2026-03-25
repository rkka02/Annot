import { NextResponse } from 'next/server';

import { getWorkspaceTree } from '@/lib/workspace-tree';

export async function GET() {
  try {
    return NextResponse.json(await getWorkspaceTree());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read workspace tree';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
