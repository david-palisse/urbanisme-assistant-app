import Link from 'next/link';
import { PricingPacks } from '@/components/billing/PricingPacks';
import { Button } from '@/components/ui/button';
import { ArrowRight, Gift } from 'lucide-react';

export function PricingSection() {
  return (
    <section id="tarifs" className="py-16 bg-white">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Des tarifs simples et transparents
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Payez uniquement quand vous avez besoin d&apos;aller plus loin
          </p>
        </div>

        {/* Free tier reminder */}
        <div className="mx-auto max-w-2xl mb-10 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <Gift className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">
              <span className="font-semibold">Gratuit :</span> l&apos;étude de
              faisabilité de votre projet (réalisable, sous réserve ou
              incompatible) et le début du résultat d&apos;analyse, sans payer.
            </p>
          </div>
        </div>

        <PricingPacks />

        <div className="mt-10 text-center">
          <Link href="/register">
            <Button size="lg">
              Tester gratuitement mon projet
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
