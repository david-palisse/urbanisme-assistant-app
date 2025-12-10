'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ProjectType,
  projectTypeLabels,
  projectTypeIcons,
  projectTypeDescriptions,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

type Step = 'type' | 'name';

export function CreateProjectForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('type');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectType: '' as ProjectType | '',
    name: '',
  });

  const projectTypes = Object.values(ProjectType);

  const handleTypeSelect = (type: ProjectType) => {
    setFormData({ ...formData, projectType: type });
    setStep('name');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectType || !formData.name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const project = await api.createProject({
        name: formData.name.trim(),
        projectType: formData.projectType as ProjectType,
      });

      toast({
        title: 'Projet créé',
        description: 'Votre projet a été créé avec succès.',
      });

      router.push(`/projects/${project.id}`);
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error
            ? error.message
            : 'Une erreur est survenue lors de la création du projet.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              step === 'type' || formData.projectType
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            1
          </div>
          <div className="h-1 w-16 rounded bg-muted">
            <div
              className={cn(
                'h-full rounded bg-primary transition-all',
                step === 'name' ? 'w-full' : 'w-0'
              )}
            />
          </div>
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
              step === 'name'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            2
          </div>
        </div>
      </div>

      {step === 'type' && (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Quel type de projet ?</h2>
            <p className="text-muted-foreground mt-2">
              Sélectionnez le type de construction que vous souhaitez réaliser
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {projectTypes.map((type) => (
              <Card
                key={type}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-lg',
                  formData.projectType === type &&
                    'ring-2 ring-primary ring-offset-2'
                )}
                onClick={() => handleTypeSelect(type)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{projectTypeIcons[type]}</span>
                    <CardTitle className="text-lg">
                      {projectTypeLabels[type]}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {projectTypeDescriptions[type]}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === 'name' && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Nommez votre projet</h2>
            <p className="text-muted-foreground mt-2">
              Donnez un nom à votre projet pour le retrouver facilement
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {formData.projectType &&
                    projectTypeIcons[formData.projectType]}
                </span>
                <div>
                  <CardTitle>
                    {formData.projectType &&
                      projectTypeLabels[formData.projectType]}
                  </CardTitle>
                  <CardDescription>
                    {formData.projectType &&
                      projectTypeDescriptions[formData.projectType]}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du projet *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Piscine maison principale"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('type')}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  Créer le projet
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
