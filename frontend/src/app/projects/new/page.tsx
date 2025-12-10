import { CreateProjectForm } from '@/components/projects/CreateProjectForm';

export default function NewProjectPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Nouveau projet</h1>
        <p className="text-muted-foreground mt-2">
          Créez un nouveau projet d&apos;urbanisme en quelques étapes
        </p>
      </div>

      <CreateProjectForm />
    </div>
  );
}
