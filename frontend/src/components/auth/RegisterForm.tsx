'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from '@/components/ui/use-toast';
import {
  isPasswordStrongEnough,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_MESSAGE,
} from '@/lib/password';
import { Loader2 } from 'lucide-react';

export function RegisterForm() {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive',
      });
      return;
    }

    if (!isPasswordStrongEnough(formData.password)) {
      toast({
        title: 'Erreur',
        description: PASSWORD_RULE_MESSAGE,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await register(
        {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          acceptCgu,
        },
        redirectTo
      );
      toast({
        title: 'Inscription réussie',
        description: 'Bienvenue sur Assistant Urbanisme !',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: "Erreur d'inscription",
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Créer un compte</CardTitle>
        <CardDescription className="text-center">
          Inscrivez-vous pour commencer à utiliser l&apos;assistant
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.fr"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              disabled={isLoading}
              showStrength
            />
            <p className="text-xs text-muted-foreground">
              Minimum {PASSWORD_MIN_LENGTH} caractères, évitez les mots de
              passe trop courants
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="acceptCgu"
              checked={acceptCgu}
              onCheckedChange={(checked) => setAcceptCgu(checked === true)}
              disabled={isLoading}
              className="mt-0.5"
            />
            <Label
              htmlFor="acceptCgu"
              className="text-sm font-normal leading-snug cursor-pointer"
            >
              J&apos;accepte les{' '}
              <Link
                href="/cgu-cgv"
                target="_blank"
                className="text-primary hover:underline"
              >
                conditions générales d&apos;utilisation
              </Link>{' '}
              et la{' '}
              <Link
                href="/confidentialite"
                target="_blank"
                className="text-primary hover:underline"
              >
                politique de confidentialité
              </Link>{' '}
              *
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !acceptCgu}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inscription en cours...
              </>
            ) : (
              "S'inscrire"
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Déjà un compte ?{' '}
            <Link
              href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
              className="text-primary hover:underline font-medium"
            >
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
