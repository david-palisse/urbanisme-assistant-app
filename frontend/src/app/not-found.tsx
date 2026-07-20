import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Erreur 404
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Cette page n&apos;existe pas
        </h1>
        <p className="max-w-md text-muted-foreground">
          La page que vous recherchez est introuvable. Elle a peut-être été
          déplacée ou supprimée.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/">
            <Button size="lg">
              <Home className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Button>
          </Link>
          <Link href="/terrain">
            <Button size="lg" variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Rechercher un terrain
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
