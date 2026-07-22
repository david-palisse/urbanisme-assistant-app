'use client';

import Link from 'next/link';
import { AnalysisResult as AnalysisResultType } from '@/types';
import { PACKS, getActivePromo, formatPromoEndDate } from '@/lib/packs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileText,
  Lightbulb,
  Lock,
  MessageCircle,
  XCircle,
} from 'lucide-react';

interface LockedAnalysisProps {
  analysis: AnalysisResultType;
  projectId: string;
}

// Filler paragraph rendered blurred below the free preview. Never real
// analysis content: the backend only sends the first words of the summary.
const BLURRED_PLACEHOLDER =
  "Le projet devra respecter les dispositions applicables à la zone concernée, notamment les règles d'implantation par rapport aux limites séparatives, la hauteur maximale autorisée ainsi que le traitement des abords. Les prescriptions relatives à l'aspect extérieur des constructions et aux matériaux devront également être prises en compte dans la constitution du dossier. Une attention particulière devra être portée aux pièces justificatives demandées par le service instructeur, ainsi qu'aux délais réglementaires applicables à ce type de demande d'autorisation d'urbanisme.";

function getFeasibility(analysis: AnalysisResultType) {
  switch (analysis.feasibilityStatus) {
    case 'compatible':
      return {
        label: 'Projet réalisable',
        description:
          'Votre projet apparaît compatible avec les règles d’urbanisme applicables à votre parcelle.',
        icon: <CheckCircle className="h-8 w-8 text-green-600" />,
        cardClass: 'border-green-300 bg-green-50',
        badgeClass: 'text-green-700 bg-green-100',
      };
    case 'compatible_a_risque':
      return {
        label: 'Réalisable sous réserve',
        description:
          'Votre projet semble réalisable mais certains points nécessitent une attention particulière.',
        icon: <AlertTriangle className="h-8 w-8 text-orange-500" />,
        cardClass: 'border-orange-300 bg-orange-50',
        badgeClass: 'text-orange-700 bg-orange-100',
      };
    case 'probablement_incompatible':
      return {
        label: 'Probablement incompatible',
        description:
          'Des contraintes réglementaires majeures semblent s’opposer à votre projet tel que décrit.',
        icon: <XCircle className="h-8 w-8 text-red-600" />,
        cardClass: 'border-red-300 bg-red-50',
        badgeClass: 'text-red-700 bg-red-100',
      };
    default:
      return {
        label: 'Non déterminé',
        description:
          'L’étude de faisabilité n’a pas pu être déterminée automatiquement.',
        icon: <AlertTriangle className="h-8 w-8 text-gray-500" />,
        cardClass: 'border-gray-300',
        badgeClass: 'text-gray-700 bg-gray-100',
      };
  }
}

/**
 * Free-tier view of an analysis: the feasibility verdict first, then the
 * first words of the analysis with a blurred continuation, and teasers of
 * the locked features with a CTA to the packs page. The full content never
 * reaches the browser: the backend strips it server-side.
 */
export function LockedAnalysis({ analysis, projectId }: LockedAnalysisProps) {
  const feasibility = getFeasibility(analysis);
  const counts = analysis.lockedCounts;

  const etudePack = PACKS.find((pack) => pack.id === 'ETUDE');
  const etudePromo = etudePack ? getActivePromo(etudePack) : null;

  const lockedFeatures = [
    {
      icon: FileText,
      label:
        counts && counts.requiredDocuments > 0
          ? `${counts.requiredDocuments} document${counts.requiredDocuments > 1 ? 's' : ''} à fournir + CERFA`
          : 'Liste des documents et CERFA',
    },
    {
      icon: AlertTriangle,
      label:
        counts && counts.constraints > 0
          ? `${counts.constraints} point${counts.constraints > 1 ? 's' : ''} d'attention identifié${counts.constraints > 1 ? 's' : ''}`
          : "Points d'attention détaillés",
    },
    {
      icon: Lightbulb,
      label:
        counts && counts.suggestions > 0
          ? `${counts.suggestions} suggestion${counts.suggestions > 1 ? 's' : ''} d'optimisation`
          : "Suggestions d'optimisation",
    },
    {
      icon: MessageCircle,
      label: "Questions illimitées à l'assistant pendant 30 jours",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Feasibility verdict - always first and free */}
      <Card className={`border-2 ${feasibility.cardClass}`}>
        <CardHeader>
          <div className="flex items-center gap-4">
            {feasibility.icon}
            <div>
              <CardTitle className="text-xl">Étude de faisabilité</CardTitle>
              <CardDescription>{feasibility.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge className={feasibility.badgeClass}>{feasibility.label}</Badge>
        </CardContent>
      </Card>

      {/* 2. Beginning of the analysis with blurred continuation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Résultat de l&apos;analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {analysis.summary && (
              <p className="text-sm whitespace-pre-wrap">
                {analysis.summary}
                {analysis.summaryTruncated ? '…' : ''}
              </p>
            )}

            {/* Blurred filler + gradient: the real content stays server-side */}
            <div className="relative mt-2 overflow-hidden" aria-hidden="true">
              <p className="text-sm blur-sm select-none text-muted-foreground">
                {BLURRED_PLACEHOLDER}
              </p>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
            </div>

            {/* Unlock CTA */}
            <div className="mt-4 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="font-semibold">
                Débloquez votre analyse complète
              </p>
              <p className="text-sm text-muted-foreground">
                Analyse détaillée, documents à fournir, suggestions
                d&apos;optimisation et assistant Q&amp;A, à partir de{' '}
                {etudePromo ? (
                  <>
                    {etudePromo.price} € au lieu de {etudePack?.price} €
                    (-50&nbsp;% jusqu&apos;au{' '}
                    {formatPromoEndDate(etudePromo.endsAt)}).
                  </>
                ) : (
                  `${etudePack?.price ?? 39} €.`
                )}
              </p>
              <Link href={`/projects/${projectId}/pricing`}>
                <Button size="lg" className="mt-1">
                  Voir les packs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Locked features teaser */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Inclus dans l&apos;analyse complète
          </CardTitle>
          <CardDescription>
            Ce que vous obtenez en débloquant votre projet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {lockedFeatures.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40"
              >
                <feature.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1">{feature.label}</span>
                <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legal disclaimer */}
      <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-800">
            <p className="font-semibold mb-1">Avertissement</p>
            <p>
              Ces informations sont fournies à titre indicatif et ne constituent
              pas un conseil juridique. Seule la décision du service instructeur
              de votre mairie fait foi. Consultez votre mairie pour confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
