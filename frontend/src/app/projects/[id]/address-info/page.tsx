'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject } from '@/lib/project-context';
import {
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
import { AddressInfo } from '@/components/projects/AddressInfo';
import {
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

/**
 * Check if urbanisme/georisques data has been loaded for an address
 * This data is fetched asynchronously after address save
 *
 * When floodZone is undefined, data hasn't been fetched yet
 * When floodZone is null or a string, the georisques data has been retrieved
 */
function isUrbanismeDataLoaded(address: { floodZone?: string | null } | undefined): boolean {
  if (!address) return false;
  // Check if floodZone has been explicitly set (either null or a value)
  return address.floodZone !== undefined;
}

export default function AddressInfoPage() {
  const params = useParams();
  const router = useRouter();
  const { project, pluZones, noiseExposure, refreshProject, isLoading } = useProject();
  const [isWaitingForData, setIsWaitingForData] = useState(false);

  const projectId = params.id as string;

  // Check if urbanisme data is loaded
  const urbanismeDataReady = project?.address ? isUrbanismeDataLoaded(project.address) : false;

  // Redirect to questionnaire if no address
  useEffect(() => {
    if (project && !project.address) {
      router.push(`/projects/${projectId}/questionnaire`);
    }
  }, [project, projectId, router]);

  // Poll for data if not loaded yet
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const MAX_POLLS = 10; // Max 10 attempts (20 seconds)

    if (project?.address && !urbanismeDataReady && !isLoading) {
      setIsWaitingForData(true);
      pollInterval = setInterval(async () => {
        pollCount++;
        await refreshProject();

        if (pollCount >= MAX_POLLS) {
          // Stop polling after max attempts
          setIsWaitingForData(false);
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 2000); // Poll every 2 seconds
    } else if (urbanismeDataReady) {
      setIsWaitingForData(false);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [project?.address, urbanismeDataReady, isLoading, refreshProject]);

  const handleContinueToQuestionnaire = () => {
    router.push(`/projects/${projectId}/questionnaire`);
  };

  const handleGoBack = () => {
    router.push(`/projects/${projectId}`);
  };

  // Loading and error states are handled by the layout
  if (!project) {
    return null;
  }

  if (!project.address) {
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

      {/* Success message */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Adresse enregistrée avec succès</p>
              <p className="text-sm text-green-700">
                Voici les informations réglementaires liées à votre terrain
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading indicator while waiting for urbanisme data */}
      {isWaitingForData && !urbanismeDataReady && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-800">Récupération des données réglementaires en cours...</p>
                <p className="text-sm text-blue-700">
                  Nous consultons les bases de données officielles (Géorisques, PLU, etc.)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Information using the existing component */}
      <AddressInfo
        address={project.address}
        variant="full"
        showTitle
        pluZones={pluZones}
        noiseExposure={noiseExposure}
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
