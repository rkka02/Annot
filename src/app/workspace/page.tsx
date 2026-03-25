'use client';

import { WorkspaceTopbar } from '@/components/workspace/WorkspaceTopbar';
import { PdfViewer } from '@/components/workspace/PdfViewer';
import { ChatPanel } from '@/components/workspace/ChatPanel';

export default function WorkspacePage() {
  return (
    <div className="h-full flex flex-col bg-surface">
      <WorkspaceTopbar />
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer — 65% */}
        <div className="flex-[65] min-w-0 overflow-hidden">
          <PdfViewer />
        </div>
        {/* Chat Panel — 35% */}
        <div className="flex-[35] min-w-0 bg-surface-container-lowest">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
