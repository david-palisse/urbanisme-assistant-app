'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { AddressSuggestion, FullLocationInfo, ParcelInfo } from '@/types';
import { buildAddressFromLocationInfo } from '@/lib/terrain';
import { downloadTerrainRecapPdf } from '@/lib/terrain-pdf';
import { AddressInfo } from '@/components/projects/AddressInfo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileDown, Loader2 } from 'lucide-react';

interface TerrainRecapProps {
  suggestion: AddressSuggestion;
  showTitle?: boolean;
  // Snapshot already persisted with the project: rendered as-is, the
  // external APIs are not called at all.
  storedInfo?: {
    fullInfo: FullLocationInfo | null;
    parcel: ParcelInfo | null;
  };
  // Called once the info has been fetched, so the caller can persist it
  // (e.g. attach it to a project being created).
  onInfoLoaded?: (fullInfo: FullLocationInfo | null, parcel: ParcelInfo | null) => void;
}

// Shared terrain recap: fetches the regulatory info live from the public
// endpoints and renders the full address summary. Used by both the public
// terrain search page and the project address-info page so the two always
// show the same data with the same layout.
export function TerrainRecap({
  suggestion,
  showTitle = true,
  storedInfo,
  onInfoLoaded,
}: TerrainRecapProps) {
  const [fullInfo, setFullInfo] = useState<FullLocationInfo | null>(
    storedInfo?.fullInfo ?? null
  );
  const [parcel, setParcel] = useState<ParcelInfo | null>(storedInfo?.parcel ?? null);
  const [isLoading, setIsLoading] = useState(!storedInfo);

  const onInfoLoadedRef = useRef(onInfoLoaded);
  onInfoLoadedRef.current = onInfoLoaded;

  const hasStoredInfo = !!storedInfo;

  useEffect(() => {
    if (hasStoredInfo) return;

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
        onInfoLoadedRef.current?.(info, parcelInfo);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // The regulatory info only depends on the coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion.lat, suggestion.lon, hasStoredInfo]);

  if (isLoading) {
    return (
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
    );
  }

  const address = buildAddressFromLocationInfo(suggestion, fullInfo, parcel);

  return (
    <AddressInfo
      address={address}
      variant="full"
      showTitle={showTitle}
      pluZones={fullInfo?.pluZones || []}
      noiseExposure={fullInfo?.noiseExposure}
      otherGeorisques={fullInfo?.otherGeorisques || []}
      headerAction={
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTerrainRecapPdf({ address, fullInfo, parcel })}
        >
          <FileDown className="mr-2 h-4 w-4 text-red-600" />
          Télécharger ma fiche récap&apos;
        </Button>
      }
    />
  );
}
