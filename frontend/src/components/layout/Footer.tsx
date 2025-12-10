'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8">
        <div className="flex flex-col items-center gap-6">
          {/* Legal Disclaimer */}
          <div className="max-w-3xl rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold mb-1">Avertissement important</p>
                <p>
                  Ces informations sont fournies à titre indicatif et ne
                  constituent pas un conseil juridique. Seule la décision du
                  service instructeur de votre mairie fait foi. Nous vous
                  recommandons de consulter le service urbanisme de votre
                  commune pour confirmer la faisabilité de votre projet.
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Accueil
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Tableau de bord
            </Link>
            <Link
              href="#"
              className="hover:text-foreground transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              href="#"
              className="hover:text-foreground transition-colors"
            >
              Politique de confidentialité
            </Link>
            <Link
              href="#"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Assistant Urbanisme. Tous droits
              réservés.
            </p>
            <p className="mt-1">
              Application d&apos;aide à la déclaration de travaux en France.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
