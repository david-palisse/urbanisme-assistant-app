import { Card, CardContent } from '@/components/ui/card';
import { ProjectTypeIcon } from '@/components/ui/project-type-icon';
import { ProjectType } from '@/types';

const projectTypes: { label: string; type: ProjectType }[] = [
  { label: 'Piscine', type: ProjectType.POOL },
  { label: 'Extension', type: ProjectType.EXTENSION },
  { label: 'Abri de jardin', type: ProjectType.SHED },
  { label: 'Clôture', type: ProjectType.FENCE },
  { label: 'Nouvelle construction', type: ProjectType.NEW_CONSTRUCTION },
  { label: 'Autre projet', type: ProjectType.OTHER },
];

export function ProjectTypesSection() {
  return (
    <section className="py-2 lg:py-4">
      <div className="container">
        <div className="text-center mb-3">
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-gray-900">
            Types de projets supportés
          </h2>
          <p className="mt-1 text-base text-gray-600">
            Notre assistant couvre les projets de construction les plus
            courants
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 max-w-3xl mx-auto">
          {projectTypes.map((project) => (
            <Card
              key={project.type}
              className="text-center hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="mb-2 flex justify-center">
                  <ProjectTypeIcon type={project.type} className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium">{project.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
