'use client';

import { PackId } from '@/types';
import { PACKS, PRO_CONTACT_EMAIL } from '@/lib/packs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Clock, Loader2, Mail, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingPacksProps {
  /** Called when the user picks an available pack (Pack Étude) */
  onSelectPack?: (pack: PackId) => void;
  /** Label of the CTA on available packs */
  ctaLabel?: string;
  /** Pack currently being sent to checkout (shows a spinner) */
  loadingPack?: PackId | null;
  /** Disables the CTA of available packs (e.g. CGV not accepted yet) */
  ctaDisabled?: boolean;
}

/**
 * The three packs (Étude disponible, Dossier et Premium "bientôt
 * disponibles") plus the professional contact banner. Used on the pricing
 * screen of a project and, without callback, on the homepage.
 */
export function PricingPacks({
  onSelectPack,
  ctaLabel = 'Choisir ce pack',
  loadingPack = null,
  ctaDisabled = false,
}: PricingPacksProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {PACKS.map((pack) => (
          <Card
            key={pack.id}
            className={cn(
              'relative flex flex-col',
              pack.highlighted && pack.available
                ? 'border-2 border-primary shadow-lg'
                : '',
              !pack.available ? 'opacity-60 bg-muted/30' : ''
            )}
          >
            {pack.highlighted && pack.available && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground shadow">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Disponible
                </Badge>
              </div>
            )}
            {!pack.available && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge
                  variant="secondary"
                  className="bg-gray-200 text-gray-600 shadow"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Bientôt disponible
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pt-8">
              <CardTitle className="text-xl">{pack.name}</CardTitle>
              <CardDescription>{pack.tagline}</CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold">{pack.price} €</span>
                <span className="text-sm text-muted-foreground ml-1">TTC</span>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col flex-1 space-y-4">
              <ul className="space-y-2 flex-1">
                {pack.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className={cn(
                        'h-4 w-4 mt-0.5 flex-shrink-0',
                        pack.available ? 'text-green-600' : 'text-gray-400'
                      )}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {onSelectPack && (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!pack.available || loadingPack !== null || ctaDisabled}
                  onClick={() => onSelectPack(pack.id)}
                >
                  {loadingPack === pack.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirection vers le paiement...
                    </>
                  ) : pack.available ? (
                    ctaLabel
                  ) : (
                    'Bientôt disponible'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Professional subscription banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Vous êtes un professionnel nécessitant un abonnement personnalisé
            selon l&apos;usage ? <br />➡️​ Contactez-nous à{' '}
            <a
              href={`mailto:${PRO_CONTACT_EMAIL}`}
              className="font-semibold underline hover:text-blue-600"
            >
              {PRO_CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
