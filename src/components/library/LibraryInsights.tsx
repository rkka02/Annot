import { FileText, StickyNote } from 'lucide-react';

export function LibraryInsights() {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-5">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-4">
        Library Insights
      </h3>
      <div className="flex gap-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
            <FileText size={16} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface">124</div>
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Papers Stored</div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
            <StickyNote size={16} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-2xl font-bold text-on-surface">12.4k</div>
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Notes Taken</div>
          </div>
        </div>
      </div>
    </div>
  );
}
