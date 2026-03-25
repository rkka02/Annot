import { SessionList } from '@/components/sessions/SessionList';
import { ActiveProjects } from '@/components/sessions/ActiveProjects';
import { Filter, Plus } from 'lucide-react';

export default function SessionsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-1">
            Research Repository
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Archive &amp; Sessions
            </h1>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors">
                <Filter size={14} strokeWidth={2} />
                Filter
              </button>
              <button className="btn-gradient text-on-primary px-4 py-2 rounded-sm text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
                <Plus size={14} strokeWidth={2} />
                New Research
              </button>
            </div>
          </div>
        </div>

        {/* Session List */}
        <SessionList />

        {/* Active Projects */}
        <ActiveProjects />
      </div>
    </div>
  );
}
