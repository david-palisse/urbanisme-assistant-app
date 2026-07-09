'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject } from '@/lib/project-context';
import {
  AddressSuggestion,
  projectTypeLabels,
  projectTypeIcons,
} from '@/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TerrainRecap } from '@/components/terrain/TerrainRecap';
import { ArrowRight, ArrowLeft, ClipboardList } from 'lucide-react';

export default function AddressInfoPage() {
  const params = useParams();
  const router = useRouter();
  const { project } = useProject();

  const projectId = params.id as string;

  // Redirect to questionnaire if no address
  useEffect(() => {
    if (project && !project.address) {
      router.push(`/projects/${projectId}/questionnaire`);
    }
  }, [project, projectId, router]);

  // The recap reuses the regulatory snapshot persisted with the project
  // when available, and only falls back to the live public endpoints for
  // older projects without a stored snapshot.
  const suggestion: AddressSuggestion | null = useMemo(() => {
    const address = project?.address;
    if (!address) return null;
    return {
      label: address.rawInput,
      lat: address.lat,
      lon: address.lon,
      city: address.cityName || '',
      postcode: address.postCode || '',
      citycode: address.inseeCode || '',
      context: `${address.postCode || ''} ${address.cityName || ''}`.trim(),
    };
  }, [project?.address]);

  const handleContinueToQuestionnaire = () => {
    router.push(`/projects/${projectId}/questionnaire`);
  };

  const handleGoBack = () => {
    router.push(`/projects/${projectId}`);
  };

  // Loading and error states are handled by the layout
  if (!project || !suggestion) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="text-4xl">{projectTypeIcons[project.projectType]}</span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Informations du terrain</h1>
          <p className="text-muted-foreground mt-1">
            {project.name} - {projectTypeLabels[project.projectType]}
          </p>
        </div>
      </div>

      {/* Terrain recap (shared with the public terrain search page) */}
      <TerrainRecap
        suggestion={suggestion}
        showTitle
        storedInfo={
          project.address?.fullLocationInfo
            ? {
                fullInfo: project.address.fullLocationInfo,
                parcel: project.address.parcelInfo ?? null,
              }
            : undefined
        }
      />

      {/* Next step card */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Prochaine étape : le questionnaire
          </CardTitle>
          <CardDescription>
            Décrivez les caractéristiques de votre projet (dimensions, matériaux, etc.)
            pour obtenir une analyse personnalisée des autorisations nécessaires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Le questionnaire vous permettra de :
            </p>
          </div>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
            <li>Définir les dimensions de votre projet</li>
            <li>Préciser les matériaux et finitions</li>
            <li>Indiquer les spécificités techniques</li>
          </ul>
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au projet
        </Button>
        <Button onClick={handleContinueToQuestionnaire} size="lg">
          Continuer vers le questionnaire
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
