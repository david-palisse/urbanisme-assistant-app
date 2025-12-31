'use client';

import { ProjectProvider, useProject } from '@/lib/project-context';
import { ProjectStepsNav } from '@/components/projects/ProjectStepsNav';
import { Loader2 } from 'lucide-react';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

function ProjectLayoutContent({ children }: ProjectLayoutProps) {
  const { project, isLoading, error } = useProject();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state
  if (error || !project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || 'Projet non trouvé.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persistent Navigation Bar */}
      <ProjectStepsNav project={project} />

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  return (
    <ProjectProvider>
      <ProjectLayoutContent>{children}</ProjectLayoutContent>
    </ProjectProvider>
  );
}
