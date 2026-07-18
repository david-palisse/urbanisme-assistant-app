import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </div>
  );
}
