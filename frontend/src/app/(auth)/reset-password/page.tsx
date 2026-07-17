import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        {/* Suspense required because ResetPasswordForm reads the ?token= search param */}
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
