'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth-context';
import {
  Project,
  PluZoneInfo,
  NoiseExposureInfo,
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
import { toast } from '@/components/ui/use-toast';
import { AddressInfo } from '@/components/projects/AddressInfo';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';

export default function AddressInfoPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [pluZones, setPluZones] = useState<PluZoneInfo[]>([]);
  const [noiseExposure, setNoiseExposure] = useState<NoiseExposureInfo | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const projectId = params.id as string;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await api.getProject(projectId);
        setProject(data);

        // Check if address exists, if not redirect to questionnaire for address search
        if (!data.address) {
          router.push(`/projects/${projectId}/questionnaire`);
          return;
        }

        // Fetch all location info (PLU zones + noise exposure) if address exists
        if (data.address?.lat && data.address?.lon) {
          try {
            const locationInfo = await api.getFullLocationInfo(data.address.lat, data.address.lon);
            if (locationInfo) {
              setPluZones(locationInfo.pluZones || []);
              setNoiseExposure(locationInfo.noiseExposure);
            }
          } catch (locError) {
            console.error('Failed to fetch location info:', locError);
            // Fallback to just PLU zones
            try {
              const zones = await api.getAllPluZones(data.address.lat, data.address.lon);
              setPluZones(zones);
            } catch {
              // Ignore fallback error
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger le projet.',
          variant: 'destructive',
        });
        router.push('/projects');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading && projectId) {
      fetchProject();
    }
  }, [authLoading, projectId, router]);

  const handleContinueToQuestionnaire = () => {
    router.push(`/projects/${projectId}/questionnaire`);
  };

  const handleGoBack = () => {
    router.push(`/projects/${projectId}`);
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

  if (!project.address) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Adresse non définie.</p>
      </div>
    );
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
