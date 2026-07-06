import { Card, CardContent } from '@/components/ui/card';

const projectTypes = [
  { icon: '🏊', label: 'Piscine', type: 'POOL' },
  { icon: '🔨', label: 'Extension', type: 'EXTENSION' },
  { icon: '🏚️', label: 'Abri de jardin', type: 'SHED' },
  { icon: '🚧', label: 'Clôture', type: 'FENCE' },
  { icon: '🏠', label: 'Nouvelle construction', type: 'NEW_CONSTRUCTION' },
];

export function ProjectTypesSection() {
  return (
    <section className="py-8 lg:py-12 bg-white">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Types de projets supportés
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Notre assistant couvre les projets de construction les plus
            courants
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 max-w-3xl mx-auto">
          {projectTypes.map((project) => (
            <Card
              key={project.type}
              className="text-center hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardContent className="pt-6">
                <div className="text-4xl mb-2">{project.icon}</div>
                <p className="font-medium">{project.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
