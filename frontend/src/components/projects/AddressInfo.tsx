'use client';

import { Address } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Map,
  Building,
  FileText,
  Globe,
} from 'lucide-react';

interface AddressInfoProps {
  address: Address | undefined;
  variant?: 'compact' | 'full';
  showTitle?: boolean;
}

export function AddressInfo({ address, variant = 'compact', showTitle = false }: AddressInfoProps) {
  if (!address) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        <span>Adresse non définie</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {address.rawInput || `${address.cityName || ''} ${address.postCode ? `(${address.postCode})` : ''}`}
          </span>
        </div>
        {address.pluZone && (
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              Zone PLU: {address.pluZone}
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localisation du terrain
          </CardTitle>
          <CardDescription>
            Informations géographiques et réglementaires
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-6'}>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Adresse */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Adresse
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-primary" />
              <span className="text-sm">{address.rawInput || 'Non renseignée'}</span>
            </div>
          </div>

          {/* Commune */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Commune
            </div>
            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 mt-0.5 text-primary" />
              <span className="text-sm">
                {address.cityName || 'Non renseignée'}
                {address.postCode && ` (${address.postCode})`}
              </span>
            </div>
          </div>

          {/* Code INSEE */}
          {address.inseeCode && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Code INSEE
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-primary" />
                <span className="text-sm font-mono">{address.inseeCode}</span>
              </div>
            </div>
          )}

          {/* Parcelle cadastrale */}
          {address.parcelId && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Parcelle cadastrale
              </div>
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 mt-0.5 text-primary" />
                <span className="text-sm font-mono">{address.parcelId}</span>
              </div>
            </div>
          )}

          {/* Zone PLU */}
          <div className="space-y-1 sm:col-span-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Zone PLU (Plan Local d&apos;Urbanisme)
            </div>
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              {address.pluZone ? (
                <Badge variant="secondary" className="text-sm">
                  {address.pluZone}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Non identifiée</span>
              )}
            </div>
            {address.pluZone && (
              <p className="text-xs text-muted-foreground mt-1">
                Cette zone détermine les règles de construction applicables à votre terrain.
              </p>
            )}
          </div>

          {/* Coordonnées GPS */}
          {address.lat && address.lon && (
            <div className="space-y-1 sm:col-span-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Coordonnées GPS
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Lat: {address.lat.toFixed(6)}</span>
                <span>Lon: {address.lon.toFixed(6)}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
