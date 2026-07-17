'use client';

import { Project } from '@/types';
import { ProjectCard } from './ProjectCard';
import { Loader2 } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  isLoading?: boolean;
  /** Called after a project is renamed or deleted so the list can refresh */
  onChanged?: () => void;
}

export function ProjectList({
  projects,
  isLoading = false,
  onChanged,
}: ProjectListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun projet trouvé.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onChanged={onChanged} />
      ))}
    </div>
  );
}
