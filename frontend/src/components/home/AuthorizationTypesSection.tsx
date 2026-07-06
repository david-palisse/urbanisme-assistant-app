import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AuthorizationTypesSection() {
  return (
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
  );
}
