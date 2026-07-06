import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  CheckCircle,
  FileText,
  MapPin,
  ClipboardList,
} from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Recherchez votre terrain',
    description:
      "Entrez l'adresse ou la référence cadastrale de votre terrain, sans créer de compte.",
  },
  {
    icon: CheckCircle,
    title: 'Consultez les informations',
    description:
      'Zone PLU, zone inondable, protection ABF, bruit aérien : toutes les contraintes de la parcelle en un coup d\'œil.',
  },
  {
    icon: ClipboardList,
    title: 'Créez votre projet',
    description:
      'Décrivez votre projet de construction via un questionnaire guidé pour lancer l\'analyse.',
  },
  {
    icon: FileText,
    title: 'Obtenez votre analyse',
    description:
      "Type d'autorisation nécessaire (DP, PC...) et liste personnalisée des documents à fournir.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Comment ça marche ?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Un processus simple en 4 étapes pour vous guider
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={feature.title} className="relative">
              <div className="absolute -top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {index + 1}
              </div>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
