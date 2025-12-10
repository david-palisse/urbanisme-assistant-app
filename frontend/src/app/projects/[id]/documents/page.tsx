'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, RequiredDocument } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentChecklist } from '@/components/results/DocumentChecklist';
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export default function DocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && projectId) {
      loadProjectAndDocuments();
    }
  }, [user, projectId]);

  const loadProjectAndDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const projectData = await api.getProject(projectId);
      setProject(projectData);

      // Load documents
      try {
        const docsData = await api.getDocuments(projectId);
        setDocuments(docsData);
      } catch {
        // If no documents yet, show a message
        setDocuments([]);
      }
    } catch (err) {
      setError('Erreur lors du chargement du projet');
      console.error(err);
    } finally {
      setIsLoading(false);
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

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents requis</h1>
        <p className="text-muted-foreground mt-1">{project.name}</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* No Documents Yet */}
      {documents.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aucun document requis
            </CardTitle>
            <CardDescription>
              Les documents requis seront affichés après l&apos;analyse de votre projet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(`/projects/${projectId}/analysis`)}
            >
              Voir l&apos;analyse
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Documents Checklist */}
      {documents.length > 0 && (
        <DocumentChecklist documents={documents} projectName={project.name} />
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}/analysis`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l&apos;analyse
        </Button>
        <Button onClick={() => router.push(`/projects/${projectId}`)}>
          Retour au projet
        </Button>
      </div>

      {/* Legal Disclaimer */}
      <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold mb-1">Information importante</p>
            <p>
              Cette liste de documents est fournie à titre indicatif. La liste
              définitive des pièces à fournir peut varier selon les spécificités
              de votre projet et les exigences de votre commune. Contactez le
              service urbanisme de votre mairie pour confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
