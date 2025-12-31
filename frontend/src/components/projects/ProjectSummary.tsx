'use client';

import { useEffect, useState } from 'react';
import {
  ProjectType,
  QuestionnaireResponse,
  QuestionGroup,
  projectTypeLabels,
  projectTypeIcons,
} from '@/types';
import { api } from '@/lib/api';
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
  ClipboardList,
  Loader2,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSummaryProps {
  projectType: ProjectType;
  questionnaireResponse?: QuestionnaireResponse;
  showTitle?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
}

// Helper to format values for display
function formatValue(
  value: string | number | boolean | string[],
  unit?: string
): string {
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'number' && unit) {
    return `${value} ${unit}`;
  }
  return String(value);
}

export function ProjectSummary({
  projectType,
  questionnaireResponse,
  showTitle = true,
  defaultExpanded = false,
  compact = true,
}: ProjectSummaryProps) {
  const [questions, setQuestions] = useState<QuestionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Fetch questions to get labels
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const questionGroups = await api.getQuestions(projectType);
        setQuestions(questionGroups);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Impossible de charger les questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [projectType]);

  // No questionnaire response
  if (!questionnaireResponse || !questionnaireResponse.responses) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Récapitulatif du projet
          </CardTitle>
          <CardDescription>
            Aucune réponse au questionnaire enregistrée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Veuillez compléter le questionnaire pour voir le récapitulatif.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Chargement du récapitulatif...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="text-center text-muted-foreground text-sm">{error}</div>
        </CardContent>
      </Card>
    );
  }

  const responses = questionnaireResponse.responses;
  const answeredCount = Object.keys(responses).length;

  // Build a map of question ID to question details
  const questionMap = new Map<
    string,
    {
      text: string;
      unit?: string;
      options?: { value: string; label: string }[];
      groupTitle: string;
      groupId: string;
    }
  >();

  questions.forEach((group) => {
    group.questions.forEach((q) => {
      questionMap.set(q.id, {
        text: q.text,
        unit: q.unit,
        options: q.options,
        groupTitle: group.title,
        groupId: group.id,
      });
    });
  });

  // Build responses with labels
  const responsesWithLabels: { questionId: string; label: string; value: string }[] = [];

  Object.entries(responses).forEach(([questionId, value]) => {
    const questionInfo = questionMap.get(questionId);
    if (!questionInfo) return;

    // Get display value (resolve option labels)
    let displayValue: string;
    if (questionInfo.options && typeof value === 'string') {
      const option = questionInfo.options.find((o) => o.value === value);
      displayValue = option ? option.label : value;
    } else if (questionInfo.options && Array.isArray(value)) {
      displayValue = value
        .map((v) => {
          const option = questionInfo.options?.find((o) => o.value === v);
          return option ? option.label : v;
        })
        .join(', ');
    } else {
      displayValue = formatValue(value, questionInfo.unit);
    }

    responsesWithLabels.push({
      questionId,
      label: questionInfo.text,
      value: displayValue,
    });
  });

  // Compact view: show inline summary
  if (compact && !isExpanded) {
    return (
      <Card>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">
                Récapitulatif du projet
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                {projectTypeIcons[projectType]} {projectTypeLabels[projectType]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                • {answeredCount} réponse{answeredCount > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-7 px-2"
            >
              <span className="text-xs mr-1">Détails</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {responsesWithLabels.slice(0, 6).map((item, index) => (
              <div
                key={item.questionId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/70"
              >
                <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="text-muted-foreground truncate max-w-[100px]">
                  {item.label.split(' ').slice(0, 3).join(' ')}...
                </span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
            {responsesWithLabels.length > 6 && (
              <div className="inline-flex items-center px-2 py-1 text-muted-foreground">
                +{responsesWithLabels.length - 6} autres
              </div>
            )}
          </div>
          {questionnaireResponse.completedAt && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Complété le{' '}
              {new Date(questionnaireResponse.completedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Expanded view
  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">
                Récapitulatif de votre projet
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                {projectTypeIcons[projectType]} {projectTypeLabels[projectType]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                • {answeredCount} réponse{answeredCount > 1 ? 's' : ''}
              </span>
            </div>
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-7 px-2"
              >
                <span className="text-xs mr-1">Réduire</span>
                <ChevronUp className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(showTitle ? 'pt-2' : 'pt-4', 'pb-3')}>
        <div
          className={cn(
            'space-y-2',
            compact && 'max-h-[200px] overflow-y-auto pr-1'
          )}
        >
          {/* Compact grid layout */}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {responsesWithLabels.map((item) => (
              <div
                key={item.questionId}
                className="p-2 rounded bg-muted/50 hover:bg-muted/70 transition-colors text-xs"
              >
                <span className="text-muted-foreground line-clamp-1">
                  {item.label}
                </span>
                <span className="font-medium flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {responsesWithLabels.length === 0 && Object.keys(responses).length > 0 && (
            <div className="text-muted-foreground text-xs">
              <p className="font-medium mb-1">Réponses enregistrées :</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {Object.entries(responses).map(([key, value]) => (
                  <div key={key} className="p-1.5 rounded bg-muted/50">
                    <span className="text-muted-foreground">{key}:</span>{' '}
                    <span className="font-medium">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {questionnaireResponse.completedAt && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Questionnaire complété le{' '}
            {new Date(questionnaireResponse.completedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
