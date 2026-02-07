'use client';

import Link from 'next/link';
import {
  AnalysisResult as AnalysisResultType,
  AuthorizationType,
  authorizationTypeLabels,
  AdjustmentSuggestion,
} from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Info,
  Ban,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { SuggestionsList } from './SuggestionsList';

interface AnalysisResultProps {
  analysis: AnalysisResultType;
  projectId?: string;
}

export function AnalysisResult({ analysis, projectId }: AnalysisResultProps) {
  // Check if project is probably impossible
  const isIncompatible = analysis.feasibilityStatus === 'probablement_incompatible';
  const isRisky = analysis.feasibilityStatus === 'compatible_a_risque';

  // Extract suggestions from analysis - can come from suggestions field or parsed llmResponse
  let suggestions: AdjustmentSuggestion[] = [];
  if (analysis.suggestions && analysis.suggestions.length > 0) {
    suggestions = analysis.suggestions;
  } else if (analysis.llmResponse) {
    try {
      const parsedResponse = JSON.parse(analysis.llmResponse);
      suggestions = parsedResponse?.suggestions || [];
    } catch {
      // If parsing fails, leave suggestions empty
    }
  }

  const getAuthorizationIcon = () => {
    // If project is incompatible, always show red stop icon
    if (isIncompatible) {
      return <Ban className="h-8 w-8 text-red-600" />;
    }
    // If risky, show warning
    if (isRisky) {
      return <AlertOctagon className="h-8 w-8 text-orange-500" />;
    }
    // Otherwise, use normal authorization-based icons
    switch (analysis.authorizationType) {
      case AuthorizationType.NONE:
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case AuthorizationType.DP:
        return <AlertTriangle className="h-8 w-8 text-orange-500" />;
      case AuthorizationType.PC:
      case AuthorizationType.PA:
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Info className="h-8 w-8 text-blue-500" />;
    }
  };

  const getCardBorderColor = () => {
    if (isIncompatible) {
      return 'border-red-500 bg-red-50';
    }
    if (isRisky) {
      return 'border-orange-400 bg-orange-50';
    }
    switch (analysis.authorizationType) {
      case AuthorizationType.NONE:
        return 'border-green-300 bg-green-50';
      case AuthorizationType.DP:
        return 'border-orange-300 bg-orange-50';
      case AuthorizationType.PC:
      case AuthorizationType.PA:
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-300';
    }
  };

  const getMainTitle = () => {
    if (isIncompatible) {
      return '⛔ Projet probablement IMPOSSIBLE';
    }
    if (isRisky) {
      return '⚠️ ' + authorizationTypeLabels[analysis.authorizationType];
    }
    return authorizationTypeLabels[analysis.authorizationType];
  };

  const getSubtitle = () => {
    if (isIncompatible) {
      return 'Des contraintes réglementaires majeures empêchent ce projet';
    }
    if (isRisky) {
      return 'Ce projet nécessite une attention particulière';
    }
    return "Type d'autorisation requis";
  };

  const getFeasibilityColor = () => {
    switch (analysis.feasibilityStatus) {
      case 'compatible':
        return 'text-green-700 bg-green-50';
      case 'compatible_a_risque':
        return 'text-orange-700 bg-orange-50';
      case 'probablement_incompatible':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const getFeasibilityLabel = () => {
    switch (analysis.feasibilityStatus) {
      case 'compatible':
        return 'Compatible';
      case 'compatible_a_risque':
        return 'Compatible avec réserves';
      case 'probablement_incompatible':
        return 'Probablement incompatible';
      default:
        return 'Non déterminé';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Result Card - Consolidated view */}
      <Card className={`border-2 ${getCardBorderColor()}`}>
        <CardHeader>
          <div className="flex items-center gap-4">
            {getAuthorizationIcon()}
            <div>
              <CardTitle className={`text-xl ${isIncompatible ? 'text-red-700' : ''}`}>
                {getMainTitle()}
              </CardTitle>
              <CardDescription className={isIncompatible ? 'text-red-600' : ''}>
                {getSubtitle()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          {analysis.summary && (
            <p className={`text-sm ${isIncompatible ? 'text-red-700' : ''}`}>
              {analysis.summary}
            </p>
          )}

          {/* Documents button - shows when there are required documents */}
          {!isIncompatible && analysis.requiredDocuments && analysis.requiredDocuments.length > 0 && projectId && (
            <div className="pt-2">
              <Link href={`/projects/${projectId}/documents`}>
                <Button variant="default" className="w-full sm:w-auto">
                  <FileText className="h-4 w-4 mr-2" />
                  Voir les documents à fournir ({analysis.requiredDocuments.length})
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}

          {/* Constraints inline for incompatible projects */}
          {isIncompatible && analysis.constraints && analysis.constraints.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-red-200">
              <p className="text-sm font-medium text-red-700">Contraintes identifiées :</p>
              <ul className="space-y-1">
                {analysis.constraints.map((constraint, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-600">
                    <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span><strong>{constraint.type}</strong> : {constraint.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation for incompatible */}
          {isIncompatible && (
            <div className="pt-2 border-t border-red-200">
              <p className="text-sm font-semibold text-red-800">
                👉 Consultez le service urbanisme de votre mairie avant toute démarche.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Section - show also for incompatible projects when we have concrete adjustments */}
      {suggestions.length > 0 && (
        <SuggestionsList suggestions={suggestions} />
      )}

      {/* Feasibility Status - Only for non-incompatible */}
      {analysis.feasibilityStatus && !isIncompatible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Analyse de faisabilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getFeasibilityColor()}>
              {getFeasibilityLabel()}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Constraints - Only for compatible projects */}
      {!isIncompatible && analysis.constraints && analysis.constraints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isRisky ? '⚠️ Points d\'attention' : 'Contraintes identifiées'}
            </CardTitle>
            <CardDescription>
              Points d&apos;attention pour votre projet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.constraints.map((constraint, index) => {
                const severity = constraint.severity?.toLowerCase();
                const isHighSeverity = severity === 'high' || severity === 'elevee' || severity === 'élevée';
                const isMediumSeverity = severity === 'medium' || severity === 'moyenne';

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      isHighSeverity
                        ? 'border-red-300 bg-red-50'
                        : isMediumSeverity
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 mt-0.5 ${
                          isHighSeverity
                            ? 'text-red-500'
                            : isMediumSeverity
                            ? 'text-orange-500'
                            : 'text-yellow-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-sm">{constraint.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {constraint.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Disclaimer */}
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
