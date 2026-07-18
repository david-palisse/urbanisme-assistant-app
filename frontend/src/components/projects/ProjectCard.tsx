'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import {
  MapPin,
  Calendar,
  ArrowRight,
  Map,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  /** When provided, shows the rename/delete quick actions menu */
  onChanged?: () => void;
}

export function ProjectCard({ project, onChanged }: ProjectCardProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [busy, setBusy] = useState(false);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await api.updateProject(project.id, { name: newName.trim() });
      toast({ title: 'Projet renommé' });
      setRenameOpen(false);
      onChanged?.();
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await api.deleteProject(project.id);
      toast({ title: 'Projet supprimé' });
      setDeleteOpen(false);
      onChanged?.();
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

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
          <div className="flex items-center gap-1">
            <Badge className={statusColors[project.status]}>
              {statusLabels[project.status]}
            </Badge>
            {onChanged && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      setNewName(project.name);
                      setRenameOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Renommer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {project.address?.cityName || 'Adresse non définie'}
              {project.address?.postCode && ` (${project.address.postCode})`}
            </span>
          </div>
          {project.address?.pluZone && (
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 flex-shrink-0" />
              <Badge variant="outline" className="text-xs">
                Zone PLU: {project.address.pluZone}
              </Badge>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
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

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Renommer le projet</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor={`rename-${project.id}`}>Nom du projet</Label>
              <Input
                id={`rename-${project.id}`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={busy}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
                disabled={busy}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={busy || !newName.trim()}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Renommer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer « {project.name} » ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive : le questionnaire, l&apos;analyse et
              les documents associés à ce projet seront supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Supprimer définitivement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
