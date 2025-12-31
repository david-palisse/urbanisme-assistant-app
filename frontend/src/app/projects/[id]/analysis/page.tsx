'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnalysisResult as AnalysisResultType } from '@/types';
import { api } from '@/lib/api';
import { useProject } from '@/lib/project-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalysisResult } from '@/components/results/AnalysisResult';
import { ProjectSummary } from '@/components/projects/ProjectSummary';
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
  const { project, refreshProject } = useProject();

  const [analysis, setAnalysis] = useState<AnalysisResultType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  // Load existing analysis when project is available
  useEffect(() => {
    const loadAnalysis = async () => {
      if (!project || isInitialized) return;

      try {
        const analysisData = await api.getAnalysis(projectId);
        setAnalysis(analysisData);
      } catch {
        // No analysis yet, that's ok
        setAnalysis(null);
      }

      setIsInitialized(true);
    };

    loadAnalysis();
  }, [project, projectId, isInitialized]);

  const runAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const analysisData = await api.analyzeProject(projectId);
      setAnalysis(analysisData);

      // Refresh project in context to get updated status
      await refreshProject();
    } catch (err) {
      setError("Erreur lors de l'analyse. Veuillez réessayer.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Loading and error states are handled by the layout
  if (!project) {
    return null;
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

      {/* Project Summary - Show before analysis */}
      {!analysis && !isAnalyzing && (
        <ProjectSummary
          projectType={project.projectType}
          questionnaireResponse={project.questionnaireResponse}
        />
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

      {/* Analysis Results - FIRST so user sees results without scrolling */}
      {analysis && !isAnalyzing && (
        <>
          <AnalysisResult analysis={analysis} projectId={projectId} />

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
