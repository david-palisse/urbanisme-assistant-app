import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'mon-urba : simplifier vos démarches de construction',
  description:
    "Application d'aide à la déclaration de travaux en France. Déterminez le type d'autorisation nécessaire et obtenez la liste des documents requis.",
  icons: {
    icon: '/monurba-favicon.png',
  },
  metadataBase: new URL('https://www.mon-urba.fr'),
  // og:image / twitter:image come from app/opengraph-image.tsx and
  // app/twitter-image.tsx (generated 1200×630), injected automatically
  openGraph: {
    title: 'mon-urba : simplifier vos démarches de construction',
    description:
      "Application d'aide à la déclaration de travaux en France. Déterminez le type d'autorisation nécessaire et obtenez la liste des documents requis.",
    url: 'https://www.mon-urba.fr',
    siteName: 'mon-urba',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'mon-urba : simplifier vos démarches de construction',
    description:
      "Application d'aide à la déclaration de travaux en France. Déterminez le type d'autorisation nécessaire et obtenez la liste des documents requis.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
