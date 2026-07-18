'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  Project,
  ProjectStats,
  ProjectStatus,
  statusLabels,
  statusColors,
} from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FolderKanban,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    draft: 0,
    inProgress: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsData, recentData] = await Promise.all([
          api.getProjectStats(),
          api.getProjects({ limit: 3 }),
        ]);
        setStats(statsData);
        setRecentProjects(recentData.items);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bonjour, {user?.firstName || 'Utilisateur'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue sur votre tableau de bord. Gérez vos projets d&apos;urbanisme.
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Button>
        </Link>
      </div>

      {/* Stats Cards — each tile links to the filtered projects list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/projects">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total des projets
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects?status=${ProjectStatus.DRAFT}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects?status=${ProjectStatus.QUESTIONNAIRE}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En cours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects?status=${ProjectStatus.COMPLETED}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Terminés</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projets récents</CardTitle>
              <CardDescription>
                Vos derniers projets en cours ou terminés
              </CardDescription>
            </div>
            <Link href="/projects">
              <Button variant="outline" size="sm">
                Voir tous
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {project.address?.cityName || 'Adresse non définie'}
                      </p>
                    </div>
                    <Badge className={statusColors[project.status]}>
                      {statusLabels[project.status]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Vous n&apos;avez pas encore de projet.
              </p>
              <Link href="/projects/new">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer votre premier projet
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Guide rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              1. Créez un nouveau projet et sélectionnez le type de travaux
            </p>
            <p className="text-sm text-muted-foreground">
              2. Entrez l&apos;adresse de votre terrain
            </p>
            <p className="text-sm text-muted-foreground">
              3. Répondez au questionnaire pour décrire votre projet
            </p>
            <p className="text-sm text-muted-foreground">
              4. Obtenez l&apos;analyse et la liste des documents requis
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Besoin d&apos;aide ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Notre assistant vous guide à chaque étape de votre projet
              d&apos;urbanisme. Si vous avez des questions, n&apos;hésitez pas à
              consulter notre FAQ ou à nous contacter.
            </p>
            <Link href="/faq">
              <Button variant="outline" size="sm">
                Consulter la FAQ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
