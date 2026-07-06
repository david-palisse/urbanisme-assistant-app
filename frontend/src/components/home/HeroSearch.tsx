'use client';

import { useRouter } from 'next/navigation';
import { AddressSuggestion } from '@/types';
import { AddressSearch } from '@/components/questionnaire/AddressSearch';
import { Card, CardContent } from '@/components/ui/card';
import { terrainUrl } from '@/lib/terrain';

// Hero section with the public address search: no account needed,
// selecting an address goes straight to the terrain info page.
export function HeroSearch() {
  const router = useRouter();

  const handleSelect = (suggestion: AddressSuggestion) => {
    router.push(terrainUrl(suggestion));
  };

  return (
    <section
      id="recherche"
      className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-12 lg:py-16"
    >
      <div className="container relative z-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Simplifiez vos démarches{' '}
            <span className="text-primary">d&apos;urbanisme</span>
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Recherchez l&apos;adresse de votre terrain et obtenez immédiatement
            les informations de la parcelle : zone PLU, risques, protections.
            Gratuit et sans compte.
          </p>
        </div>

        <Card className="mx-auto mt-8 max-w-2xl text-left shadow-lg">
          <CardContent className="pt-6">
            <AddressSearch onSelect={handleSelect} />
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-gray-500">
          Puis créez un projet pour analyser sa faisabilité et connaître les
          autorisations nécessaires.
        </p>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[50%] top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-100 to-transparent opacity-50 blur-3xl" />
      </div>
    </section>
  );
}
