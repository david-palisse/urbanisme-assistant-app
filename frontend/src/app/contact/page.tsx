import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact | mon-urba',
  description:
    'Une question, un problème technique ou une demande spécifique ? Contactez l\'équipe mon-urba.',
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
}
