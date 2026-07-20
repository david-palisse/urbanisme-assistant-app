'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';

function fullName(firstName?: string, lastName?: string) {
  return [firstName, lastName].filter(Boolean).join(' ');
}

export function ContactForm() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState(() =>
    fullName(user?.firstName, user?.lastName)
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.sendContactMessage({ name, email, subject, message });
      setSent(true);
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="space-y-1 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
          <CardTitle className="text-2xl">Message envoyé</CardTitle>
          <CardDescription>
            Merci, votre message a bien été transmis. Nous vous répondrons à
            l&apos;adresse {email} dès que possible.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Nous contacter</CardTitle>
        <CardDescription className="text-center">
          Une question, un problème technique, une demande spécifique ?
          Écrivez-nous, nous lisons tous les messages.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Objet de votre message"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Décrivez votre demande..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              'Envoyer le message'
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Vous préférez votre client mail ? Écrivez-nous directement à{' '}
            <a
              href="mailto:contact@mon-urba.fr"
              className="text-primary hover:underline"
            >
              contact@mon-urba.fr
            </a>
            .
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
