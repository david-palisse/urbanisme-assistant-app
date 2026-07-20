'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PurchaseHistoryItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ExternalLink, Loader2, Receipt } from 'lucide-react';

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PurchasesPage() {
  const { isLoading: authLoading } = useRequireAuth();
  const [purchases, setPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const data = await api.listPurchases();
        setPurchases(data);
      } catch (error) {
        console.error('Failed to fetch purchases:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      fetchPurchases();
    }
  }, [authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes achats</h1>
          <p className="text-muted-foreground mt-1">
            Historique de vos packs et reçus de paiement
          </p>
        </div>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Chargement de votre historique d&apos;achats...
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes achats</h1>
        <p className="text-muted-foreground mt-1">
          Historique de vos packs et reçus de paiement
        </p>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Aucun achat pour le moment
            </CardTitle>
            <CardDescription>
              Lorsque vous débloquerez l&apos;analyse complète d&apos;un projet,
              votre achat et son reçu apparaîtront ici.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{purchase.packName}</span>
                    {purchase.status === 'REFUNDED' ? (
                      <Badge variant="destructive">Remboursé</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Payé
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {purchase.project ? (
                      <Link
                        href={`/projects/${purchase.project.id}`}
                        className="hover:underline"
                      >
                        {purchase.project.name}
                      </Link>
                    ) : (
                      'Projet supprimé'
                    )}
                    {' · '}
                    {formatDate(purchase.paidAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">
                    {formatAmount(purchase.amountCents, purchase.currency)}
                  </span>
                  {purchase.receiptUrl && (
                    <a
                      href={purchase.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Reçu
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
