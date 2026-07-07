'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  AddressSuggestion,
  FullLocationInfo,
  ParcelInfo,
} from '@/types';
import {
  buildAddressFromLocationInfo,
  savePendingTerrain,
  terrainUrl,
} from '@/lib/terrain';
import { AddressSearch } from '@/components/questionnaire/AddressSearch';
import { AddressInfo } from '@/components/projects/AddressInfo';
import { PluDocumentsCard } from '@/components/projects/address-info/PluDocumentsCard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, MapPin, Search, ArrowRight, ClipboardList, LogIn } from 'lucide-react';

export function TerrainInfoView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [fullInfo, setFullInfo] = useState<FullLocationInfo | null>(null);
  const [parcel, setParcel] = useState<ParcelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Read the selected terrain from the URL (filled by the homepage search)
  const suggestion: AddressSuggestion | null = useMemo(() => {
    const lat = parseFloat(searchParams.get('lat') || '');
    const lon = parseFloat(searchParams.get('lon') || '');
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

    const city = searchParams.get('city') || '';
    const postcode = searchParams.get('postcode') || '';
    return {
      label: searchParams.get('label') || `${city} (${postcode})`,
      lat,
      lon,
      city,
      postcode,
      citycode: searchParams.get('citycode') || '',
      context: `${postcode} ${city}`.trim(),
    };
  }, [searchParams]);

  // Fetch parcel + regulatory info from the public endpoints
  useEffect(() => {
    if (!suggestion) return;

    let cancelled = false;
    setIsLoading(true);
    setFullInfo(null);
    setParcel(null);

    Promise.all([
      api.getFullLocationInfo(suggestion.lat, suggestion.lon),
      api.getParcel(suggestion.lat, suggestion.lon),
    ])
      .then(([info, parcelInfo]) => {
        if (cancelled) return;
        setFullInfo(info);
        setParcel(parcelInfo);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [suggestion]);

  const handleNewSearch = (newSuggestion: AddressSuggestion) => {
    setShowSearch(false);
    router.replace(terrainUrl(newSuggestion));
  };

  const handleCreateProject = () => {
    if (!suggestion) return;
    // Keep the terrain so the project creation flow can attach it,
    // even after a login / signup step.
    savePendingTerrain(suggestion);
    if (isAuthenticated) {
      router.push('/projects/new');
    } else {
      router.push('/login?redirect=/projects/new');
    }
  };

  // No coordinates in the URL: offer the search directly
  if (!suggestion) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Informations d&apos;un terrain
          </h1>
          <p className="text-muted-foreground mt-2">
            Recherchez une adresse ou une parcelle pour consulter ses
            informations réglementaires
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <AddressSearch onSelect={handleNewSearch} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const address = buildAddressFromLocationInfo(suggestion, fullInfo, parcel);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" />
            Informations du terrain
          </h1>
          <p className="text-muted-foreground mt-1">{suggestion.label}</p>
        </div>
        <Button variant="outline" onClick={() => setShowSearch(!showSearch)}>
          <Search className="mr-2 h-4 w-4" />
          Autre adresse
        </Button>
      </div>

      {/* Inline search to change address */}
      {showSearch && (
        <Card>
          <CardContent className="pt-6">
            <AddressSearch onSelect={handleNewSearch} />
          </CardContent>
        </Card>
      )}

      {/* Loading regulatory data */}
      {isLoading && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <div>
                <p className="font-medium text-blue-800">
                  Récupération des données réglementaires en cours...
                </p>
                <p className="text-sm text-blue-700">
                  Nous consultons les bases de données officielles (Géorisques,
                  PLU, cadastre...)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regulatory information */}
      {!isLoading && (
        <AddressInfo
          address={address}
          variant="full"
          showTitle
          pluZones={fullInfo?.pluZones || []}
          noiseExposure={fullInfo?.noiseExposure}
        />
      )}

      {/* Downloadable PLU documents */}
      {!isLoading && (
        <PluDocumentsCard lat={suggestion.lat} lon={suggestion.lon} />
      )}

      {/* CTA: create a project on this terrain */}
      {!isLoading && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Analyser un projet sur ce terrain
            </CardTitle>
            <CardDescription>
              Créez un projet (piscine, extension, abri de jardin...) pour
              savoir quelle autorisation est nécessaire et quels documents
              fournir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? (
                  "L'adresse de ce terrain sera automatiquement associée à votre projet."
                ) : (
                  <span className="flex items-center gap-1">
                    <LogIn className="h-4 w-4" />
                    Un compte (gratuit) est nécessaire pour créer un projet.
                  </span>
                )}
              </p>
              <Button size="lg" onClick={handleCreateProject}>
                Créer un projet pour analyse
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
