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
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Ruler,
  MapPin,
  Home,
} from 'lucide-react';

interface ProjectSummaryProps {
  projectType: ProjectType;
  questionnaireResponse?: QuestionnaireResponse;
  showTitle?: boolean;
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

// Get icon for a question group
function getGroupIcon(groupId: string) {
  if (groupId.includes('dimension') || groupId.includes('cover')) {
    return <Ruler className="h-4 w-4" />;
  }
  if (groupId.includes('location')) {
    return <MapPin className="h-4 w-4" />;
  }
  if (groupId.includes('type') || groupId.includes('existing') || groupId.includes('purpose')) {
    return <Home className="h-4 w-4" />;
  }
  return <ClipboardList className="h-4 w-4" />;
}

export function ProjectSummary({
  projectType,
  questionnaireResponse,
  showTitle = true,
}: ProjectSummaryProps) {
  const [questions, setQuestions] = useState<QuestionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">{error}</div>
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

  // Group responses by question group
  const groupedResponses = new Map<string, { title: string; id: string; items: { questionId: string; label: string; value: string }[] }>();

  Object.entries(responses).forEach(([questionId, value]) => {
    const questionInfo = questionMap.get(questionId);
    if (!questionInfo) return;

    const groupKey = questionInfo.groupId;
    if (!groupedResponses.has(groupKey)) {
      groupedResponses.set(groupKey, {
        title: questionInfo.groupTitle,
        id: groupKey,
        items: [],
      });
    }

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

    groupedResponses.get(groupKey)!.items.push({
      questionId,
      label: questionInfo.text,
      value: displayValue,
    });
  });

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Récapitulatif de votre projet
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              {projectTypeIcons[projectType]} {projectTypeLabels[projectType]}
            </Badge>
            <span className="text-xs">
              • {answeredCount} réponse{answeredCount > 1 ? 's' : ''}
            </span>
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-6'}>
        <div className="space-y-6">
          {Array.from(groupedResponses.values()).map((group) => (
            <div key={group.id} className="space-y-3">
              {/* Group header */}
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                {getGroupIcon(group.id)}
                <span>{group.title}</span>
              </div>

              {/* Questions and answers */}
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => (
                  <div
                    key={item.questionId}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="text-xs text-muted-foreground mb-1 line-clamp-2">
                      {item.label}
                    </div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                      <span className="truncate">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groupedResponses.size === 0 && Object.keys(responses).length > 0 && (
            <div className="text-muted-foreground text-sm">
              <p className="font-medium mb-2">Réponses enregistrées :</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(responses).map(([key, value]) => (
                  <div key={key} className="p-2 rounded bg-muted/50 text-xs">
                    <span className="text-muted-foreground">{key}:</span>{' '}
                    <span className="font-medium">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {questionnaireResponse.completedAt && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
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
