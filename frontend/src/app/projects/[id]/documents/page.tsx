'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RequiredDocument, ProjectEntitlement, MairieContact } from '@/types';
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
import { DocumentChecklist } from '@/components/results/DocumentChecklist';
import { MairieContactCard } from '@/components/results/MairieContactCard';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  FileText,
  Lock,
} from 'lucide-react';

export default function DocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const { project } = useProject();

  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [mairieContact, setMairieContact] = useState<MairieContact | null>(
    null
  );
  const [entitlement, setEntitlement] = useState<ProjectEntitlement | null>(
    null
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  // The documents checklist is part of the paid packs
  const isLocked = isInitialized && !entitlement?.unlocked;

  // Load entitlement then documents when project is available
  useEffect(() => {
    const loadDocuments = async () => {
      if (!project || isInitialized) return;

      const entitlementData = await api.getEntitlement(projectId);
      setEntitlement(entitlementData);

      if (entitlementData?.unlocked) {
        try {
          const docsData = await api.getDocuments(projectId);
          setDocuments(docsData.documents);
          setMairieContact(docsData.mairieContact);
        } catch {
          // If no documents yet, show a message
          setDocuments([]);
        }
      }

      setIsInitialized(true);
    };

    loadDocuments();
  }, [project, projectId, isInitialized]);

  // Loading and error states are handled by the layout
  if (!project) {
    return null;
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

      {/* Paywall: documents are part of the paid packs */}
      {isLocked && (
        <Card className="border-2 border-dashed border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Documents réservés à l&apos;analyse complète
            </CardTitle>
            <CardDescription>
              La liste personnalisée des documents à fournir et le CERFA adapté
              à votre projet sont inclus dans le Pack Étude.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/projects/${projectId}/pricing`)}>
              Voir les packs
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Documents Yet */}
      {!isLocked && isInitialized && documents.length === 0 && (
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

      {/* Where to submit the dossier: mairie / service urbanisme contact */}
      {!isLocked && mairieContact && (
        <MairieContactCard contact={mairieContact} />
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
