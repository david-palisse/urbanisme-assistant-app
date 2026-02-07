'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, TrendingDown } from 'lucide-react';
import { AdjustmentSuggestion } from '@/types';

interface SuggestionsListProps {
  suggestions: AdjustmentSuggestion[];
}

const impactConfig = {
  faible: {
    label: 'Impact faible',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  moyen: {
    label: 'Impact moyen',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  important: {
    label: 'Impact important',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
  },
};

const authLabels: Record<string, string> = {
  NONE: 'Sans autorisation',
  DP: 'Déclaration Préalable',
  PC: 'Permis de Construire',
  PA: "Permis d'Aménager",
};

function SuggestionCard({ suggestion }: { suggestion: AdjustmentSuggestion }) {
  const impact = impactConfig[suggestion.impactSurProjet];
  const delta = suggestion.suggestedValue - suggestion.currentValue;
  const isIncrease = delta > 0;
  const unit = suggestion.targetField.includes('distance') || suggestion.targetField.includes('hauteur') ? 'm' : 'm²';

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <Lightbulb className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-gray-700">{suggestion.description}</p>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={impact.className}>{impact.label}</Badge>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {suggestion.currentValue} {unit}
                </span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium text-green-600">
                  {suggestion.suggestedValue} {unit}
                </span>
                <span className="text-gray-400">
                  ({isIncrease ? '+' : ''}{delta.toFixed(1)} {unit})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-orange-100 text-orange-700">
                {authLabels[suggestion.currentAuthorizationType] ||
                  suggestion.currentAuthorizationType}
              </span>
              <ArrowRight className="h-3 w-3 text-gray-400" />
              <span className="px-2 py-1 rounded bg-green-100 text-green-700">
                {authLabels[suggestion.resultingAuthorizationType] ||
                  suggestion.resultingAuthorizationType}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SuggestionsList({ suggestions }: SuggestionsListProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <TrendingDown className="h-5 w-5" />
          Suggestions d&apos;optimisation
        </CardTitle>
        <p className="text-sm text-gray-500">
          De petits ajustements pourraient simplifier vos démarches
          administratives
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionCard key={index} suggestion={suggestion} />
        ))}
      </CardContent>
    </Card>
  );
}
