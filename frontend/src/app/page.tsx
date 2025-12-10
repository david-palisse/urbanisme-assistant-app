import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
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
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: ClipboardList,
    title: 'Questionnaire guidé',
    description:
      'Répondez à quelques questions simples sur votre projet de construction.',
  },
  {
    icon: MapPin,
    title: 'Localisation automatique',
    description:
      'Identifiez automatiquement votre parcelle et sa zone PLU grâce à la géolocalisation.',
  },
  {
    icon: CheckCircle,
    title: 'Analyse réglementaire',
    description:
      "Vérifiez la compatibilité de votre projet avec les règles d'urbanisme locales.",
  },
  {
    icon: FileText,
    title: 'Documents requis',
    description:
      "Obtenez la liste personnalisée des documents nécessaires pour votre dossier.",
  },
];

const projectTypes = [
  { icon: '🏊', label: 'Piscine', type: 'POOL' },
  { icon: '🏠', label: 'Extension', type: 'EXTENSION' },
  { icon: '🏚️', label: 'Abri de jardin', type: 'SHED' },
  { icon: '🚧', label: 'Clôture', type: 'FENCE' },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20">
          <div className="container relative z-10">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                Simplifiez vos démarches{' '}
                <span className="text-primary">d&apos;urbanisme</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Déterminez en quelques minutes le type d&apos;autorisation
                nécessaire pour votre projet de construction et obtenez la liste
                complète des documents requis.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/register">
                  <Button size="lg" className="gap-2">
                    Commencer gratuitement
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Se connecter
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-[50%] top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-100 to-transparent opacity-50 blur-3xl" />
          </div>
        </section>

        {/* Project Types Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Types de projets supportés
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Notre assistant couvre les projets de construction les plus
                courants
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-2xl mx-auto">
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

        {/* Features Section */}
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

        {/* Authorization Types Section */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Types d&apos;autorisations
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Selon votre projet, vous pourriez avoir besoin de l&apos;une de
                ces autorisations
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-700">
                    Aucune autorisation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-700">
                    Petits travaux ne nécessitant pas de formalités
                    administratives particulières.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-700">
                    Déclaration Préalable (DP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-orange-700">
                    Travaux de faible importance : petites surfaces, clôtures,
                    modifications de façade.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700">
                    Permis de Construire (PC)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-700">
                    Travaux importants : grandes surfaces, changement de
                    destination, nouvelles constructions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Prêt à commencer votre projet ?
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                Créez un compte gratuit et découvrez quelle autorisation vous
                avez besoin pour votre projet.
              </p>
              <div className="mt-8">
                <Link href="/register">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2"
                  >
                    Créer mon compte
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
