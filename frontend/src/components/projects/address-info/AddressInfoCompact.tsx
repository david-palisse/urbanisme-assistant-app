'use client';

import { Address, NoiseExposureInfo, PluZoneInfo } from '@/types';
import { Badge } from '@/components/ui/badge';
import { MapPin, Map, Droplets, Landmark, Plane } from 'lucide-react';
import { AddressConstraints } from './constraints';

interface AddressInfoCompactProps {
  address: Address;
  pluZones: PluZoneInfo[];
  noiseExposure?: NoiseExposureInfo;
  constraints: AddressConstraints;
}

// Compact one-line summary used in cards and lists
export function AddressInfoCompact({
  address,
  pluZones,
  noiseExposure,
  constraints,
}: AddressInfoCompactProps) {
  const { isHighRiskFloodZone, hasAbfProtection, hasNoiseExposure, isHighRiskNoiseZone } =
    constraints;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          {address.rawInput || `${address.cityName || ''} ${address.postCode ? `(${address.postCode})` : ''}`}
        </span>
      </div>
      {address.pluZone && (
        <div className="flex flex-col gap-1">
          {/* Show document name in compact mode if available */}
          {pluZones && pluZones.length > 0 && pluZones[0].documentName && (
            <div className="text-xs text-primary font-medium truncate pl-6">
              {pluZones[0].documentName}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              Zone PLU: {address.pluZone}
            </Badge>
          </div>
        </div>
      )}
      {/* Compact warnings for major constraints */}
      {isHighRiskFloodZone && (
        <div className="flex items-start gap-2">
          <Droplets className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
          <Badge variant="destructive" className="text-xs max-w-full whitespace-normal break-words rounded-md">
            Zone inondable {address.floodZone}
          </Badge>
        </div>
      )}
      {hasAbfProtection && (
        <div className="flex items-start gap-2">
          <Landmark className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-600" />
          <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-300 max-w-full whitespace-normal break-words rounded-md">
            ABF - {address.abfType || 'Monument Historique'}
          </Badge>
        </div>
      )}
      {hasNoiseExposure && (
        <div className="flex items-start gap-2">
          <Plane className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
          <Badge className={`text-xs max-w-full whitespace-normal break-words rounded-md ${isHighRiskNoiseZone ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
            PEB Zone {noiseExposure?.zone} - {noiseExposure?.airportName}
          </Badge>
        </div>
      )}
    </div>
  );
}
