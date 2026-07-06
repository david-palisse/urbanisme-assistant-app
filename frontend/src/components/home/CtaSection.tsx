import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-20 bg-primary">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Prêt à commencer votre projet ?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Recherchez votre terrain gratuitement, puis créez un compte pour
            analyser votre projet de construction.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/#recherche">
              <Button size="lg" variant="secondary" className="gap-2">
                <Search className="h-4 w-4" />
                Rechercher mon terrain
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 bg-transparent text-white border-white hover:bg-white/10 hover:text-white"
              >
                Créer mon compte
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
