'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  AnalysisProgress,
  AnalysisResult as AnalysisResultType,
  ProjectEntitlement,
} from '@/types';
import { api } from '@/lib/api';
import { useProject } from '@/lib/project-context';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalysisResult } from '@/components/results/AnalysisResult';
import { AnalysisChat } from '@/components/results/AnalysisChat';
import { LockedAnalysis } from '@/components/results/LockedAnalysis';
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
  const searchParams = useSearchParams();
  const { project, refreshProject } = useProject();
  const { toast } = useToast();

  const [analysis, setAnalysis] = useState<AnalysisResultType | null>(null);
  const [entitlement, setEntitlement] = useState<ProjectEntitlement | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(
    !!searchParams.get('session_id')
  );
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  // Check if questionnaire is completed
  const isQuestionnaireCompleted = !!project?.questionnaireResponse?.completedAt;

  // Returning from Stripe Checkout: confirm the session server-side (works
  // even without webhook configuration), then reload the unlocked analysis
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;

    const confirmPayment = async () => {
      try {
        const updated = await api.confirmCheckout(sessionId);
        setEntitlement(updated);
        if (updated.unlocked) {
          const analysisData = await api.getAnalysis(projectId);
          setAnalysis(analysisData);
          setIsInitialized(true);
          toast({
            title: 'Paiement confirmé',
            description:
              'Merci ! Votre analyse complète est maintenant débloquée.',
          });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Vérification du paiement impossible',
          description:
            'Si vous avez été débité, rechargez la page dans quelques instants.',
        });
      } finally {
        setIsConfirmingPayment(false);
        // Remove session_id from the URL
        router.replace(`/projects/${projectId}/analysis`);
      }
    };

    confirmPayment();
  }, [searchParams, projectId, router, toast]);

  // Load existing analysis and entitlement when project is available
  useEffect(() => {
    const loadAnalysis = async () => {
      if (!project || isInitialized) return;
      // Payment confirmation is in charge of loading in that case
      if (searchParams.get('session_id')) return;

      try {
        const [analysisData, entitlementData] = await Promise.all([
          api.getAnalysis(projectId),
          api.getEntitlement(projectId),
        ]);
        setAnalysis(analysisData);
        setEntitlement(entitlementData);
      } catch {
        // No analysis yet, that's ok
        setAnalysis(null);
      }

      setIsInitialized(true);
    };

    loadAnalysis();
  }, [project, projectId, isInitialized, searchParams]);

  // Poll the backend for the current analysis step while the analyze
  // request is in flight, to show progress instead of a bare spinner
  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(null);
      return;
    }

    const interval = setInterval(async () => {
      const current = await api.getAnalysisProgress(projectId);
      if (current) {
        setProgress(current);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isAnalyzing, projectId]);

  const runAnalysis = async () => {
    // Check if questionnaire is completed
    if (!isQuestionnaireCompleted) {
      toast({
        variant: "destructive",
        title: "Questionnaire incomplet",
        description: "Veuillez d'abord compléter le questionnaire pour lancer l'analyse.",
      });
      return;
    }

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

      {/* Project Summary - Always visible, collapsed by default */}
      <ProjectSummary
        projectType={project.projectType}
        questionnaireResponse={project.questionnaireResponse}
        compact={true}
        defaultExpanded={false}
      />

      {/* Payment confirmation in progress */}
      {isConfirmingPayment && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">
                  Confirmation du paiement...
                </h3>
                <p className="text-muted-foreground mt-1">
                  Nous vérifions votre paiement auprès de Stripe. Cela ne prend
                  que quelques secondes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Analysis Yet */}
      {!analysis && !isAnalyzing && !isConfirmingPayment && (
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
            {!isQuestionnaireCompleted && (
              <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Veuillez d&apos;abord compléter le questionnaire pour lancer l&apos;analyse.
                  </span>
                </div>
              </div>
            )}
            <Button
              onClick={runAnalysis}
              size="lg"
              className="w-full"
              disabled={!isQuestionnaireCompleted}
            >
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
                {progress ? (
                  <p className="text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">
                      Étape {progress.step}/{progress.totalSteps}
                    </span>{' '}
                    — {progress.label}
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-1">
                    Nous analysons votre projet en fonction des règles
                    d&apos;urbanisme applicables. Cela peut prendre quelques
                    minutes.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results - FIRST so user sees results without scrolling */}
      {analysis && !isAnalyzing && !isConfirmingPayment && (
        <>
          {analysis.isLocked ? (
            // Free tier: feasibility verdict + analysis preview + packs CTA
            <LockedAnalysis analysis={analysis} projectId={projectId} />
          ) : (
            <>
              <AnalysisResult analysis={analysis} projectId={projectId} />

              {/* Chat with the assistant about the analyzed project */}
              <AnalysisChat
                projectId={projectId}
                chatAvailable={entitlement?.chatAvailable ?? true}
                chatAccessUntil={entitlement?.chatAccessUntil ?? null}
              />
            </>
          )}

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
        {analysis && !analysis.isLocked && (
          <Button
            onClick={() => router.push(`/projects/${projectId}/documents`)}
          >
            Voir les documents requis
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
        {analysis && analysis.isLocked && (
          <Button onClick={() => router.push(`/projects/${projectId}/pricing`)}>
            Débloquer l&apos;analyse complète
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
