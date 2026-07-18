'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
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
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from '@/components/ui/use-toast';
import {
  isPasswordStrongEnough,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_MESSAGE,
} from '@/lib/password';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { isLoading: authLoading } = useRequireAuth();
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();

  // Profil
  const [profile, setProfile] = useState({ firstName: '', lastName: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Mot de passe
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Suppression
  const [deleteConfirm, setDeleteConfirm] = useState({
    text: '',
    password: '',
  });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      });
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({
        firstName: profile.firstName || undefined,
        lastName: profile.lastName || undefined,
      });
      await refreshUser();
      toast({ title: 'Profil mis à jour' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toast({
        title: 'Erreur',
        description: 'Les nouveaux mots de passe ne correspondent pas.',
        variant: 'destructive',
      });
      return;
    }
    if (!isPasswordStrongEnough(passwords.next)) {
      toast({
        title: 'Erreur',
        description: PASSWORD_RULE_MESSAGE,
        variant: 'destructive',
      });
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      toast({ title: 'Mot de passe mis à jour' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirm.text !== 'SUPPRIMER') {
      toast({
        title: 'Confirmation requise',
        description: 'Tapez SUPPRIMER en majuscules pour confirmer.',
        variant: 'destructive',
      });
      return;
    }
    setDeleting(true);
    try {
      await api.deleteAccount(deleteConfirm.password);
      toast({
        title: 'Compte supprimé',
        description: 'Votre compte et vos données ont été supprimés.',
      });
      logout();
      router.push('/');
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-1">
          Gérez votre profil, votre mot de passe et votre compte
        </p>
      </div>

      {/* Profil */}
      <Card>
        <form onSubmit={handleSaveProfile}>
          <CardHeader>
            <CardTitle className="text-lg">Profil</CardTitle>
            <CardDescription>
              Adresse e-mail du compte : {user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) =>
                    setProfile({ ...profile, firstName: e.target.value })
                  }
                  disabled={savingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) =>
                    setProfile({ ...profile, lastName: e.target.value })
                  }
                  disabled={savingProfile}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Mot de passe */}
      <Card>
        <form onSubmit={handleChangePassword}>
          <CardHeader>
            <CardTitle className="text-lg">Mot de passe</CardTitle>
            <CardDescription>
              Choisissez un nouveau mot de passe (minimum {PASSWORD_MIN_LENGTH}{' '}
              caractères, évitez les mots de passe trop courants)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <PasswordInput
                id="currentPassword"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                required
                disabled={savingPassword}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <PasswordInput
                  id="newPassword"
                  value={passwords.next}
                  onChange={(e) =>
                    setPasswords({ ...passwords, next: e.target.value })
                  }
                  required
                  disabled={savingPassword}
                  showStrength
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirmer</Label>
                <PasswordInput
                  id="confirmNewPassword"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  required
                  disabled={savingPassword}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                'Changer le mot de passe'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Suppression du compte */}
      <Card className="border-red-200">
        <form onSubmit={handleDeleteAccount}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Supprimer mon compte
            </CardTitle>
            <CardDescription>
              Cette action est définitive : vos projets, analyses et données
              personnelles seront supprimés. Les justificatifs de paiement
              restent conservés par notre prestataire de paiement conformément
              aux obligations comptables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deleteText">
                Tapez <span className="font-semibold">SUPPRIMER</span> pour
                confirmer
              </Label>
              <Input
                id="deleteText"
                value={deleteConfirm.text}
                onChange={(e) =>
                  setDeleteConfirm({ ...deleteConfirm, text: e.target.value })
                }
                placeholder="SUPPRIMER"
                disabled={deleting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Mot de passe</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deleteConfirm.password}
                onChange={(e) =>
                  setDeleteConfirm({
                    ...deleteConfirm,
                    password: e.target.value,
                  })
                }
                required
                disabled={deleting}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              variant="destructive"
              disabled={deleting || deleteConfirm.text !== 'SUPPRIMER'}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer définitivement mon compte'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
