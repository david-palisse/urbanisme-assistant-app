'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { PackId } from '@/types';
import { api } from '@/lib/api';
import { useProject } from '@/lib/project-context';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { PricingPacks } from '@/components/billing/PricingPacks';
import { ArrowLeft, Info, ShieldCheck } from 'lucide-react';

export default function PricingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { project } = useProject();
  const { toast } = useToast();

  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);

  const projectId = params.id as string;
  const wasCanceled = searchParams.get('canceled') === '1';

  // If the project is already unlocked there is nothing to buy here
  useEffect(() => {
    const checkEntitlement = async () => {
      const entitlement = await api.getEntitlement(projectId);
      if (entitlement?.unlocked) {
        router.replace(`/projects/${projectId}/analysis`);
      }
    };
    checkEntitlement();
  }, [projectId, router]);

  const handleSelectPack = async (pack: PackId) => {
    try {
      setLoadingPack(pack);
      const { url } = await api.createCheckout(projectId, pack);
      // Redirect to the Stripe-hosted payment page
      window.location.href = url;
    } catch (err) {
      setLoadingPack(null);
      toast({
        variant: 'destructive',
        title: 'Paiement indisponible',
        description:
          err instanceof Error
            ? err.message
            : 'Impossible de démarrer le paiement. Veuillez réessayer.',
      });
    }
  };

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Débloquez votre analyse complète
        </h1>
        <p className="text-muted-foreground mt-2">
          {project.name} — choisissez le pack adapté à votre projet
        </p>
      </div>

      {/* Canceled payment notice */}
      {wasCanceled && (
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <Info className="h-5 w-5 flex-shrink-0" />
            <span>
              Le paiement a été annulé. Vous pouvez réessayer quand vous le
              souhaitez : votre analyse reste disponible.
            </span>
          </div>
        </div>
      )}

      <PricingPacks
        onSelectPack={handleSelectPack}
        ctaLabel="Débloquer mon analyse"
        loadingPack={loadingPack}
      />

      {/* Reassurance */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        <span>
          Paiement unique et sécurisé par Stripe — aucun abonnement, aucun
          prélèvement récurrent.
        </span>
      </div>

      {/* Navigation */}
      <div className="flex justify-start pt-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}/analysis`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l&apos;analyse
        </Button>
      </div>
    </div>
  );
}
