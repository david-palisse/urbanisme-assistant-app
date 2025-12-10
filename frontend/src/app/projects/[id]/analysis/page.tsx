'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, AnalysisResult as AnalysisResultType } from '@/types';
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
import { AnalysisResult } from '@/components/results/AnalysisResult';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResultType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && projectId) {
      loadProjectAndAnalysis();
    }
  }, [user, projectId]);

  const loadProjectAndAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const projectData = await api.getProject(projectId);
      setProject(projectData);

      // Try to load existing analysis
      try {
        const analysisData = await api.getAnalysis(projectId);
        setAnalysis(analysisData);
      } catch {
        // No analysis yet, that's ok
        setAnalysis(null);
      }
    } catch (err) {
      setError('Erreur lors du chargement du projet');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const analysisData = await api.analyzeProject(projectId);
      setAnalysis(analysisData);

      // Reload project to get updated status
      const projectData = await api.getProject(projectId);
      setProject(projectData);
    } catch (err) {
      setError("Erreur lors de l'analyse. Veuillez réessayer.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
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
        <h1 className="text-3xl font-bold tracking-tight">Analyse du projet</h1>
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

      {/* No Analysis Yet */}
      {!analysis && !isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle>Lancer l&apos;analyse</CardTitle>
            <CardDescription>
              Notre système va analyser votre projet en fonction des règles
              d&apos;urbanisme applicables à votre parcelle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">L&apos;analyse va déterminer :</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Le type d&apos;autorisation requis (DP, PC, ou aucune)</li>
                <li>• Les contraintes applicables à votre projet</li>
                <li>• La liste des documents à fournir</li>
                <li>• Les points d&apos;attention particuliers</li>
              </ul>
            </div>
            <Button onClick={runAnalysis} size="lg" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Lancer l&apos;analyse
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analyzing */}
      {isAnalyzing && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">Analyse en cours...</h3>
                <p className="text-muted-foreground mt-1">
                  Nous analysons votre projet en fonction des règles d&apos;urbanisme
                  applicables. Cela peut prendre quelques secondes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && !isAnalyzing && (
        <>
          <AnalysisResult analysis={analysis} />

          {/* Re-analyze Button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={runAnalysis}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Relancer l&apos;analyse
            </Button>
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}/questionnaire`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Questionnaire
        </Button>
        {analysis && (
          <Button
            onClick={() => router.push(`/projects/${projectId}/documents`)}
          >
            Voir les documents requis
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
