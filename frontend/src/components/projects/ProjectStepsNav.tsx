'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Project, ProjectStatus } from '@/types';
import {
  MapPin,
  Info,
  ClipboardList,
  BarChart3,
  FileText,
  Check,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface ProjectStepsNavProps {
  project: Project;
}

/**
 * Check if urbanisme/georisques data has been loaded for an address
 * This data is fetched asynchronously after address save
 *
 * When floodZone is undefined, data hasn't been fetched yet
 * When floodZone is null or a string, the georisques data has been retrieved
 */
function isUrbanismeDataLoaded(address: { floodZone?: string | null } | undefined): boolean {
  if (!address) return false;
  // Check if floodZone has been explicitly set (either null or a value)
  return address.floodZone !== undefined;
}

/**
 * Determine step completion status based on project data
 */
function getStepCompletion(project: Project): {
  addressCompleted: boolean;
  addressInfoCompleted: boolean;
  questionnaireCompleted: boolean;
  analysisCompleted: boolean;
  documentsCompleted: boolean;
} {
  const hasAddress = !!project.address;
  // Address info is complete when we have address AND urbanisme data is loaded
  const urbanismeDataLoaded = isUrbanismeDataLoaded(project.address);
  // Check questionnaire completion based on completedAt field
  const questionnaireCompleted = !!project.questionnaireResponse?.completedAt;
  const hasAnalysisResult = !!project.analysisResult;
  const hasDocuments = !!(
    project.analysisResult &&
    project.analysisResult.requiredDocuments &&
    project.analysisResult.requiredDocuments.length > 0
  );

  return {
    addressCompleted: hasAddress,
    addressInfoCompleted: hasAddress && urbanismeDataLoaded,
    questionnaireCompleted,
    analysisCompleted: hasAnalysisResult,
    documentsCompleted: hasDocuments,
  };
}

/**
 * Determine the current step based on URL path
 */
function getCurrentStep(pathname: string, projectId: string): string {
  if (pathname.endsWith('/address')) return 'address';
  if (pathname.endsWith('/address-info')) return 'address-info';
  if (pathname.endsWith('/questionnaire')) return 'questionnaire';
  if (pathname.endsWith('/analysis')) return 'analysis';
  if (pathname.endsWith('/documents')) return 'documents';
  // Default to overview for the main project page
  return 'overview';
}

export function ProjectStepsNav({ project }: ProjectStepsNavProps) {
  const pathname = usePathname();
  const currentStepId = getCurrentStep(pathname, project.id);
  const completion = getStepCompletion(project);

  const steps: Step[] = [
    {
      id: 'address',
      title: 'Adresse du terrain',
      description: 'Localisez votre terrain',
      icon: MapPin,
      href: `/projects/${project.id}/address`,
      isCompleted: completion.addressCompleted,
      isCurrent: currentStepId === 'address',
    },
    {
      id: 'address-info',
      title: 'Informations terrain',
      description: 'Données réglementaires',
      icon: Info,
      href: `/projects/${project.id}/address-info`,
      isCompleted: completion.addressInfoCompleted,
      isCurrent: currentStepId === 'address-info',
    },
    {
      id: 'questionnaire',
      title: 'Questionnaire',
      description: 'Décrivez votre projet',
      icon: ClipboardList,
      href: `/projects/${project.id}/questionnaire`,
      isCompleted: completion.questionnaireCompleted,
      isCurrent: currentStepId === 'questionnaire',
    },
    {
      id: 'analysis',
      title: 'Analyse',
      description: 'Résultats de l\'analyse',
      icon: BarChart3,
      href: `/projects/${project.id}/analysis`,
      isCompleted: completion.analysisCompleted,
      isCurrent: currentStepId === 'analysis',
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Liste des documents requis',
      icon: FileText,
      href: `/projects/${project.id}/documents`,
      isCompleted: completion.documentsCompleted,
      isCurrent: currentStepId === 'documents',
    },
  ];

  return (
    <nav className="w-full">
      <div className="flex flex-wrap gap-2 md:gap-3 lg:gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                'flex-1 min-w-[140px] max-w-[220px] rounded-lg border p-3 transition-all hover:shadow-md',
                step.isCurrent
                  ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                  : step.isCompleted
                  ? 'border-green-200 bg-green-50 hover:bg-green-100'
                  : 'border-border bg-card hover:bg-muted/50'
              )}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    step.isCompleted
                      ? 'bg-green-100 text-green-700'
                      : step.isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'font-medium text-sm leading-tight truncate',
                      step.isCurrent
                        ? 'text-primary'
                        : step.isCompleted
                        ? 'text-green-800'
                        : 'text-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-0.5 truncate',
                      step.isCompleted
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
