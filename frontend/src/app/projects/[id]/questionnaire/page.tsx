'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth-context';
import {
  Project,
  ProjectType,
  QuestionGroup,
  AddressSuggestion,
  ProjectStatus,
} from '@/types';
import { AddressSearch } from '@/components/questionnaire/AddressSearch';
import { QuestionForm } from '@/components/questionnaire/QuestionForm';
import { ProgressBar } from '@/components/questionnaire/ProgressBar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';

type Step = 'address' | 'questions';

export default function QuestionnairePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<QuestionGroup[]>([]);
  const [responses, setResponses] = useState<
    Record<string, string | number | boolean | string[]>
  >({});
  const [step, setStep] = useState<Step>('address');
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const projectId = params.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectData = await api.getProject(projectId);
        setProject(projectData);

        // If address already exists, skip to questions
        if (projectData.address) {
          setStep('questions');
        }

        // Fetch questions for project type
        const questionsData = await api.getQuestions(projectData.projectType);
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
        console.error('Failed to fetch data:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les données du projet.',
          variant: 'destructive',
        });
        router.push('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && projectId) {
      fetchData();
    }
  }, [authLoading, projectId, router]);

  const handleAddressSelect = async (address: AddressSuggestion) => {
    setSelectedAddress(address);
  };

  const handleAddressSubmit = async () => {
    if (!selectedAddress) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une adresse.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await api.updateProjectAddress(projectId, {
        rawInput: selectedAddress.label,
        lat: selectedAddress.lat,
        lon: selectedAddress.lon,
        inseeCode: selectedAddress.citycode,
        cityName: selectedAddress.city,
        postCode: selectedAddress.postcode,
      });

      // Update PLU zone
      await api.updateProjectPluZone(projectId);

      // Refresh project
      const updatedProject = await api.getProject(projectId);
      setProject(updatedProject);

      toast({
        title: 'Adresse enregistrée',
        description: 'L\'adresse a été enregistrée avec succès.',
      });

      // Redirect to address-info page to show regulatory information
      router.push(`/projects/${projectId}/address-info`);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer l\'adresse.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResponseChange = (
    questionId: string,
    value: string | number | boolean | string[]
  ) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

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

  const getTotalQuestions = () => {
    return questions.reduce((acc, group) => acc + group.questions.length, 0);
  };

  const getAnsweredQuestions = () => {
    return Object.keys(responses).filter(
      (key) => responses[key] !== '' && responses[key] !== undefined
    ).length;
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
        <h1 className="text-3xl font-bold tracking-tight">Questionnaire</h1>
        <p className="text-muted-foreground mt-1">
          {project.name} - Décrivez votre projet pour obtenir une analyse
          personnalisée
        </p>
      </div>

      {/* Progress */}
      <ProgressBar
        current={step === 'address' ? 1 : 2}
        total={2}
      />

      {/* Address Step */}
      {step === 'address' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localisation du terrain
              </CardTitle>
              <CardDescription>
                Recherchez et sélectionnez l&apos;adresse de votre terrain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddressSearch
                onSelect={handleAddressSelect}
                initialValue={project.address?.rawInput || ''}
              />

              {selectedAddress && (
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">{selectedAddress.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAddress.context}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleAddressSubmit}
              disabled={!selectedAddress || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Questions Step */}
      {step === 'questions' && (
        <div className="space-y-6">
          {project.address && (
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
                    onClick={() => setStep('address')}
                  >
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-sm text-muted-foreground">
            {getAnsweredQuestions()} / {getTotalQuestions()} questions répondues
          </div>

          <QuestionForm
            groups={questions}
            responses={responses}
            onChange={handleResponseChange}
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('address')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
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
      )}
    </div>
  );
}
