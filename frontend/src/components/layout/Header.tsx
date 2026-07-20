'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Menu, Receipt } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center">
            <Image
              src="/monurba-logo.png"
              alt="MonUrba"
              width={200}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>
        </div>

        <nav className="flex items-center gap-4">
          <Link href="/terrain" className="hidden sm:block">
            <Button variant="ghost">Rechercher un terrain</Button>
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Tableau de bord</Button>
              </Link>
              <Link href="/projects">
                <Button variant="ghost">Mes projets</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName || 'Utilisateur'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/purchases" className="cursor-pointer">
                      <Receipt className="mr-2 h-4 w-4" />
                      Mes achats
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Connexion</Button>
              </Link>
              <Link href="/register">
                <Button>S&apos;inscrire</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
      {isAuthenticated && user && !user.emailVerified && (
        <div className="border-t bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Vérifiez votre adresse e-mail : un lien de confirmation a été envoyé
          à {user.email}.
        </div>
      )}
    </header>
  );
}
