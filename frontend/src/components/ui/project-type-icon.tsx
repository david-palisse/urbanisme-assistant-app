import {
  Building2,
  Construction,
  Fence,
  Home,
  LucideIcon,
  Warehouse,
  Waves,
} from 'lucide-react';
import { ProjectType } from '@/types';
import { cn } from '@/lib/utils';

// SVG replacement for the old emoji project-type icons: emojis depend on the
// visitor's system fonts and render as tofu boxes on some platforms.
const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
  [ProjectType.POOL]: Waves,
  [ProjectType.EXTENSION]: Home,
  [ProjectType.SHED]: Warehouse,
  [ProjectType.FENCE]: Fence,
  [ProjectType.NEW_CONSTRUCTION]: Building2,
  [ProjectType.OTHER]: Construction,
};

interface ProjectTypeIconProps {
  type: ProjectType;
  className?: string;
}

export function ProjectTypeIcon({ type, className }: ProjectTypeIconProps) {
  const Icon = PROJECT_TYPE_ICONS[type] || Construction;
  return <Icon className={cn('h-5 w-5', className)} aria-hidden="true" />;
}
