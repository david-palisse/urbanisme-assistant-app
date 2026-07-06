import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSearch } from '@/components/home/HeroSearch';
import { ProjectTypesSection } from '@/components/home/ProjectTypesSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { AuthorizationTypesSection } from '@/components/home/AuthorizationTypesSection';
import { CtaSection } from '@/components/home/CtaSection';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <HeroSearch />
        <ProjectTypesSection />
        <FeaturesSection />
        <AuthorizationTypesSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}
