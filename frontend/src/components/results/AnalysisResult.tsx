'use client';

import {
  AnalysisResult as AnalysisResultType,
  AuthorizationType,
  authorizationTypeLabels,
  authorizationTypeColors,
} from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Info,
} from 'lucide-react';

interface AnalysisResultProps {
  analysis: AnalysisResultType;
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  const getAuthorizationIcon = () => {
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
      {/* Authorization Type Card */}
      <Card
        className={`border-2 ${authorizationTypeColors[analysis.authorizationType]}`}
      >
        <CardHeader>
          <div className="flex items-center gap-4">
            {getAuthorizationIcon()}
            <div>
              <CardTitle className="text-xl">
                {authorizationTypeLabels[analysis.authorizationType]}
              </CardTitle>
              <CardDescription>Type d&apos;autorisation requis</CardDescription>
            </div>
          </div>
        </CardHeader>
        {analysis.summary && (
          <CardContent>
            <p className="text-sm">{analysis.summary}</p>
          </CardContent>
        )}
      </Card>

      {/* Feasibility Status */}
      {analysis.feasibilityStatus && (
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

      {/* Constraints */}
      {analysis.constraints && analysis.constraints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contraintes identifiées</CardTitle>
            <CardDescription>
              Points d&apos;attention pour votre projet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.constraints.map((constraint, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    constraint.severity === 'high'
                      ? 'border-red-200 bg-red-50'
                      : constraint.severity === 'medium'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={`h-4 w-4 mt-0.5 ${
                        constraint.severity === 'high'
                          ? 'text-red-500'
                          : constraint.severity === 'medium'
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
              ))}
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
