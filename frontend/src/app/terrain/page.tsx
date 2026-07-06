import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TerrainInfoView } from '@/components/terrain/TerrainInfoView';
import { Loader2 } from 'lucide-react';

// Public page: shows the regulatory information of a parcel from lat/lon
// query params, no account required.
export default function TerrainPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="container max-w-3xl">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <TerrainInfoView />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
