'use client';

import { mockProjects } from '@/lib/mock-data';
import { ArrowRight, FolderPlus, Sparkles, BookOpen } from 'lucide-react';

const projectIcons = [Sparkles, BookOpen];

export function ActiveProjects() {
  return (
    <div>
      <h2 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold mb-4">
        Active Projects
      </h2>

      <div className="grid grid-cols-3 gap-4">
        {mockProjects.map((project, i) => {
          const Icon = projectIcons[i % projectIcons.length];
          return (
            <div
              key={project.id}
              className="bg-surface-container-low rounded-lg p-5 hover:bg-surface-container transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-base font-semibold text-on-surface">{project.name}</h3>
                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant opacity-50">
                  <Icon size={16} strokeWidth={1.8} />
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mb-4">
                {project.sessionCount} Sessions &middot; {project.documentCount} Documents
              </p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">
                Enter Project Workspace
                <ArrowRight size={14} strokeWidth={2} />
              </div>
            </div>
          );
        })}

        {/* New project card */}
        <div className="bg-surface-container-low rounded-lg p-5 border border-dashed border-outline-variant flex flex-col items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center mb-3">
            <FolderPlus size={18} strokeWidth={1.8} />
          </div>
          <span className="text-sm font-medium">New Research Folder</span>
          <span className="text-xs text-outline mt-0.5">Group your research by topic</span>
        </div>
      </div>
    </div>
  );
}
