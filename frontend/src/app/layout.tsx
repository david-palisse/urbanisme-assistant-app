import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

const TITLE = "mon-urba : assistant urbanisme pour vos démarches de construction";
const DESCRIPTION =
  "Assistant urbanisme en ligne : déterminez les règles d'urbanisme applicables à votre terrain, le type d'autorisation nécessaire (déclaration préalable, permis de construire) et les documents à fournir.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: '/monurba-favicon.png',
  },
  metadataBase: new URL('https://www.mon-urba.fr'),
  // og:image / twitter:image come from app/opengraph-image.tsx and
  // app/twitter-image.tsx (generated 1200×630), injected automatically
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.mon-urba.fr',
    siteName: 'mon-urba',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

// JSON-LD so search engines and LLM/AI-answer crawlers can identify the
// entity directly (name, purpose, area served) rather than inferring it
// from page copy alone.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.mon-urba.fr/#organization',
      name: 'mon-urba',
      url: 'https://www.mon-urba.fr',
      logo: 'https://www.mon-urba.fr/monurba-logo.png',
      email: 'contact@mon-urba.fr',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://www.mon-urba.fr/#website',
      url: 'https://www.mon-urba.fr',
      name: 'mon-urba',
      description: DESCRIPTION,
      inLanguage: 'fr-FR',
      publisher: { '@id': 'https://www.mon-urba.fr/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'mon-urba',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://www.mon-urba.fr',
      description: DESCRIPTION,
      areaServed: {
        '@type': 'Country',
        name: 'France',
      },
      offers: {
        '@type': 'Offer',
        price: '39',
        priceCurrency: 'EUR',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
