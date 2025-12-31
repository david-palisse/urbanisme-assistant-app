'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useProject } from '@/lib/project-context';
import { QuestionGroup, Question } from '@/types';
import { QuestionForm } from '@/components/questionnaire/QuestionForm';
import { ProgressBar } from '@/components/questionnaire/ProgressBar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ArrowRight, MapPin, AlertCircle } from 'lucide-react';

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { project, refreshProject } = useProject();
  const [questions, setQuestions] = useState<QuestionGroup[]>([]);
  const [responses, setResponses] = useState<
    Record<string, string | number | boolean | string[]>
  >({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const projectId = params.id as string;

  // Initialize questionnaire data when project is available
  useEffect(() => {
    const initializeData = async () => {
      if (!project || isInitialized) return;

      try {
        // Fetch questions for project type
        const questionsData = await api.getQuestions(project.projectType);
        setQuestions(questionsData);

        // Fetch existing responses if any
        try {
          const existingResponses = await api.getQuestionnaire(projectId);
          if (existingResponses?.responses) {
            setResponses(existingResponses.responses);
          }
        } catch {
          // No existing responses
        }
      } catch (error) {
        console.error('Failed to fetch questionnaire data:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données du questionnaire.',
          variant: 'destructive',
        });
      }

      setIsInitialized(true);
    };

    initializeData();
  }, [project, projectId, isInitialized]);

  const handleResponseChange = (
    questionId: string,
    value: string | number | boolean | string[]
  ) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Helper function to check if a question should be visible based on dependencies
  const shouldShowQuestion = useCallback((question: Question): boolean => {
    if (!question.dependsOn) return true;
    const dependentValue = responses[question.dependsOn.questionId];
    return dependentValue === question.dependsOn.value;
  }, [responses]);

  // Get only visible questions (respecting conditional logic)
  const getVisibleQuestions = useCallback((): Question[] => {
    return questions.flatMap((group) =>
      group.questions.filter(shouldShowQuestion)
    );
  }, [questions, shouldShowQuestion]);

  const getTotalQuestions = useCallback(() => {
    return getVisibleQuestions().length;
  }, [getVisibleQuestions]);

  const getAnsweredQuestions = useCallback(() => {
    const visibleQuestionIds = new Set(getVisibleQuestions().map(q => q.id));
    return Object.keys(responses).filter(
      (key) => visibleQuestionIds.has(key) && responses[key] !== '' && responses[key] !== undefined
    ).length;
  }, [responses, getVisibleQuestions]);

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    try {
      // Save responses and mark as completed
      await api.saveQuestionnaire(projectId, {
        responses,
        completed: true
      });

      toast({
        title: 'Réponses enregistrées',
        description: 'Vos réponses ont été enregistrées.',
      });

      // Refresh project context so analysis page has updated data
      await refreshProject();

      // Navigate to analysis
      router.push(`/projects/${projectId}/analysis`);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'enregistrer les réponses.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading and error states are handled by the layout
  if (!project) {
    return null;
  }

  // If no address is set, prompt user to set one first
  if (!project.address) {
    return (
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Questionnaire</h1>
          <p className="text-muted-foreground mt-1">
            {project.name} - Décrivez votre projet pour obtenir une analyse
            personnalisée
          </p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">Adresse requise</p>
                <p className="text-sm text-amber-700 mt-1">
                  Veuillez d&apos;abord définir l&apos;adresse de votre terrain avant de remplir le questionnaire.
                </p>
                <Button asChild className="mt-4">
                  <Link href={`/projects/${projectId}/address`}>
                    <MapPin className="mr-2 h-4 w-4" />
                    Définir l&apos;adresse
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Questionnaire</h1>
        <p className="text-muted-foreground mt-1">
          {project.name} - Décrivez votre projet pour obtenir une analyse
          personnalisée
        </p>
      </div>

      {/* Progress */}
      <ProgressBar
        current={getAnsweredQuestions()}
        total={getTotalQuestions()}
      />

      {/* Current address display */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {project.address.cityName} ({project.address.postCode})
              </span>
              {project.address.pluZone && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Zone {project.address.pluZone}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <Link href={`/projects/${projectId}/address`}>
                Modifier
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        {getAnsweredQuestions()} / {getTotalQuestions()} questions répondues
      </div>

      <QuestionForm
        groups={questions}
        responses={responses}
        onChange={handleResponseChange}
      />

      <div className="flex justify-end">
        <Button onClick={handleSaveAndContinue} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              Lancer l&apos;analyse
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
