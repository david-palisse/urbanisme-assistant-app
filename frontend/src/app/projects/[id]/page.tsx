'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth-context';
import {
  Project,
  ProjectStatus,
  projectTypeLabels,
  projectTypeIcons,
  statusLabels,
  statusColors,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { AddressInfo } from '@/components/projects/AddressInfo';
import {
  MapPin,
  ClipboardList,
  BarChart3,
  FileText,
  ArrowRight,
  Loader2,
  Trash2,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const projectId = params.id as string;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await api.getProject(projectId);
        setProject(data);
      } catch (error) {
        console.error('Failed to fetch project:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger le projet.',
          variant: 'destructive',
        });
        router.push('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && projectId) {
      fetchProject();
    }
  }, [authLoading, projectId, router]);

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteProject(projectId);
      toast({
        title: 'Projet supprimé',
        description: 'Le projet a été supprimé avec succès.',
      });
      router.push('/projects');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le projet.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Projet non trouvé.</p>
      </div>
    );
  }

  const steps = [
    {
      title: 'Adresse du terrain',
      description: 'Localisez votre terrain',
      icon: MapPin,
      href: `/projects/${project.id}/questionnaire`,
      completed: !!project.address,
      current: !project.address,
    },
    {
      title: 'Questionnaire',
      description: 'Décrivez votre projet',
      icon: ClipboardList,
      href: `/projects/${project.id}/questionnaire`,
      completed: project.status !== ProjectStatus.DRAFT,
      current:
        project.status === ProjectStatus.DRAFT ||
        project.status === ProjectStatus.QUESTIONNAIRE,
    },
    {
      title: 'Analyse',
      description: 'Résultats de l\'analyse',
      icon: BarChart3,
      href: `/projects/${project.id}/analysis`,
      completed: project.status === ProjectStatus.COMPLETED,
      current: project.status === ProjectStatus.ANALYZING,
    },
    {
      title: 'Documents',
      description: 'Liste des documents requis',
      icon: FileText,
      href: `/projects/${project.id}/documents`,
      completed: false,
      current: project.status === ProjectStatus.COMPLETED,
    },
  ];

  const nextStep = steps.find((s) => s.current && !s.completed);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{projectTypeIcons[project.projectType]}</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">
              {projectTypeLabels[project.projectType]}
            </p>
            {project.address && (
              <p className="text-sm text-muted-foreground mt-1">
                📍 {project.address.cityName} ({project.address.postCode})
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[project.status]}>
            {statusLabels[project.status]}
          </Badge>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Progression du projet</CardTitle>
          <CardDescription>
            Suivez les étapes pour compléter votre demande d&apos;autorisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Link
                key={step.title}
                href={step.href}
                className={`block rounded-lg border p-4 transition-colors ${
                  step.current
                    ? 'border-primary bg-primary/5'
                    : step.completed
                    ? 'border-green-200 bg-green-50'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      step.completed
                        ? 'bg-green-100 text-green-700'
                        : step.current
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Action */}
      {nextStep && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Prochaine étape</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <nextStep.icon className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{nextStep.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {nextStep.description}
                  </p>
                </div>
              </div>
              <Link href={nextStep.href}>
                <Button className="gap-2">
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Information */}
      {project.address && (
        <AddressInfo address={project.address} variant="full" showTitle />
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`/projects/${project.id}/questionnaire`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <ClipboardList className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Questionnaire</CardTitle>
              <CardDescription>
                Décrivez les caractéristiques de votre projet
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/projects/${project.id}/analysis`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Analyse</CardTitle>
              <CardDescription>
                Consultez les résultats de l&apos;analyse réglementaire
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`/projects/${project.id}/documents`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Documents</CardTitle>
              <CardDescription>
                Accédez à la liste des documents requis
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
