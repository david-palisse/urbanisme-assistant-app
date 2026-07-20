'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { refreshUser, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Ce lien de confirmation est incomplet.');
      return;
    }

    api
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
        refreshUser();
      })
      .catch((error) => {
        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'Lien de confirmation invalide ou expiré.'
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        {status === 'loading' && (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        )}
        {status === 'success' && (
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        )}
        {status === 'error' && (
          <XCircle className="mx-auto h-8 w-8 text-destructive" />
        )}
        <CardTitle className="text-2xl">
          {status === 'loading' && 'Vérification en cours...'}
          {status === 'success' && 'E-mail confirmé'}
          {status === 'error' && 'Lien invalide'}
        </CardTitle>
        {message && <CardDescription>{message}</CardDescription>}
      </CardHeader>
      {status !== 'loading' && (
        <CardFooter className="justify-center">
          <Link href={isAuthenticated ? '/dashboard' : '/login'}>
            <Button>
              {isAuthenticated ? 'Retour au tableau de bord' : 'Se connecter'}
            </Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
