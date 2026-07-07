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
        {/* Full-viewport banner (100vh minus the sticky h-16 header): tagline,
            search and project types visible without scrolling */}
        <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center bg-gradient-to-b from-blue-50 to-white">
          <HeroSearch />
          <ProjectTypesSection />
        </div>
        <FeaturesSection />
        <AuthorizationTypesSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}
