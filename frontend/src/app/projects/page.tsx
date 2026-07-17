'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Project, ProjectSort, ProjectStatus, statusLabels } from '@/types';
import { ProjectList } from '@/components/projects/ProjectList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 12;
const ALL_STATUSES = 'ALL';

function ProjectsPageContent() {
  const { isLoading: authLoading } = useRequireAuth();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<string>(
    searchParams.get('status') || ALL_STATUSES
  );
  const [sort, setSort] = useState<ProjectSort>('recent');

  // Debounce the search input so we don't hit the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getProjects({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status !== ALL_STATUSES ? (status as ProjectStatus) : undefined,
        sort,
      });
      setProjects(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, status, sort]);

  useEffect(() => {
    if (!authLoading) {
      fetchProjects();
    }
  }, [authLoading, fetchProjects]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes projets</h1>
          <p className="text-muted-foreground mt-1">
            {total} projet{total > 1 ? 's' : ''} — gérez tous vos projets
            d&apos;urbanisme
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou commune..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>Tous les statuts</SelectItem>
            {Object.values(ProjectStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value as ProjectSort);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Tri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Plus récents</SelectItem>
            <SelectItem value="oldest">Plus anciens</SelectItem>
            <SelectItem value="name">Nom (A→Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ProjectList
        projects={projects}
        isLoading={isLoading}
        onChanged={fetchProjects}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    // Suspense required because the content reads the ?status= search param
    <Suspense>
      <ProjectsPageContent />
    </Suspense>
  );
}
