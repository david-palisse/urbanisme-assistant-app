'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AddressSuggestion, FullLocationInfo, ParcelInfo } from '@/types';
import { savePendingTerrain, terrainUrl } from '@/lib/terrain';
import { AddressSearch } from '@/components/questionnaire/AddressSearch';
import { TerrainRecap } from '@/components/terrain/TerrainRecap';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MapPin, Search, ArrowRight, ClipboardList, LogIn } from 'lucide-react';

export function TerrainInfoView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [showSearch, setShowSearch] = useState(false);

  // Regulatory info fetched by the recap, kept so project creation can
  // persist it instead of re-calling the APIs
  const loadedInfoRef = useRef<{
    fullInfo: FullLocationInfo | null;
    parcel: ParcelInfo | null;
  }>({ fullInfo: null, parcel: null });

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

  const handleNewSearch = (newSuggestion: AddressSuggestion) => {
    setShowSearch(false);
    router.replace(terrainUrl(newSuggestion));
  };

  const handleCreateProject = () => {
    if (!suggestion) return;
    // Keep the terrain and its regulatory info so the project creation flow
    // can attach and persist them, even after a login / signup step.
    savePendingTerrain({
      suggestion,
      fullInfo: loadedInfoRef.current.fullInfo,
      parcel: loadedInfoRef.current.parcel,
    });
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

      {/* Regulatory information (shared with the project address-info page) */}
      <TerrainRecap
        suggestion={suggestion}
        showTitle
        onInfoLoaded={(fullInfo, parcel) => {
          loadedInfoRef.current = { fullInfo, parcel };
        }}
      />

      {/* CTA: create a project on this terrain */}
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
    </div>
  );
}
