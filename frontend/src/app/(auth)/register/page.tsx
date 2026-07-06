import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        {/* Suspense required because RegisterForm reads the ?redirect= search param */}
        <Suspense>
          <RegisterForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
