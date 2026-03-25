import { RecentSessions } from '@/components/library/RecentSessions';
import { PaperGrid } from '@/components/library/PaperGrid';
import { LibraryInsights } from '@/components/library/LibraryInsights';
import { Upload } from 'lucide-react';

export default function LibraryPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Research Library
            </h1>
            <p className="font-editorial text-on-surface-variant italic mt-1 text-lg">
              Curating the frontiers of human knowledge.
            </p>
          </div>
          <button className="btn-gradient text-on-primary px-4 py-2.5 rounded-sm text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Upload size={16} strokeWidth={2} />
            Upload New PDF
          </button>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Left Column */}
          <div className="w-72 shrink-0 flex flex-col gap-6">
            <RecentSessions />
            <LibraryInsights />
          </div>

          {/* Right Column */}
          <div className="flex-1 min-w-0">
            <PaperGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
