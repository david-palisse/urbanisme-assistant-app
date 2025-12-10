'use client';

import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import {
  Project,
  projectTypeLabels,
  projectTypeIcons,
  statusLabels,
  statusColors,
} from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {projectTypeIcons[project.projectType]}
            </span>
            <div>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <CardDescription>
                {projectTypeLabels[project.projectType]}
              </CardDescription>
            </div>
          </div>
          <Badge className={statusColors[project.status]}>
            {statusLabels[project.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>
              {project.address?.cityName || 'Adresse non définie'}
              {project.address?.postCode && ` (${project.address.postCode})`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Créé le {formatDate(project.createdAt)}</span>
          </div>
        </div>

        <Link href={`/projects/${project.id}`} className="block">
          <Button variant="outline" className="w-full gap-2">
            Voir le projet
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
