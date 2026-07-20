'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Home, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Erreur inattendue
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Quelque chose s&apos;est mal passé
        </h1>
        <p className="max-w-md text-muted-foreground">
          Une erreur inattendue est survenue. Vous pouvez réessayer ou revenir
          à l&apos;accueil.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => reset()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          <Link href="/">
            <Button size="lg" variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
