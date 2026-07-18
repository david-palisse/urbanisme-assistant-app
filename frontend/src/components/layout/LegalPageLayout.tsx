import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

// Shared shell for the legal pages (mentions légales, confidentialité,
// CGU/CGV): public page, narrow readable column, prose-like styling.
export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 py-8">
        <div className="px-4 md:px-6 lg:px-8">
          <article className="mx-auto w-full max-w-3xl rounded-lg border bg-white p-6 md:p-10">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dernière mise à jour : {updatedAt}
            </p>
            <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:font-semibold [&_h3]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline">
              {children}
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
