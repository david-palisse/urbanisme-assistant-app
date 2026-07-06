'use client';

import { Address, NoiseExposureInfo, PluZoneInfo } from '@/types';
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
  AlertTriangle,
  Droplets,
  Landmark,
  Shield,
  Plane,
} from 'lucide-react';
import { AddressConstraints } from './constraints';

interface AddressInfoCardProps {
  address: Address;
  showTitle?: boolean;
  pluZones: PluZoneInfo[];
  noiseExposure?: NoiseExposureInfo;
  constraints: AddressConstraints;
}

// Detailed card with location, PLU zones and regulatory constraint summary
export function AddressInfoCard({
  address,
  showTitle = false,
  pluZones,
  noiseExposure,
  constraints,
}: AddressInfoCardProps) {
  const {
    hasFloodZone,
    isHighRiskFloodZone,
    hasAbfProtection,
    hasNoiseExposure,
    isHighRiskNoiseZone,
    hasMajorConstraints,
  } = constraints;

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localisation du terrain
            {hasMajorConstraints && (
              <Badge variant="destructive" className="ml-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Contraintes majeures
              </Badge>
            )}
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
            {/* Display document name if available */}
            {pluZones && pluZones.length > 0 && pluZones[0].documentName && (
              <div className="text-sm text-primary font-medium mb-1">
                {pluZones[0].documentName}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              {address.pluZone ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {address.pluZone}
                  </Badge>
                  {address.pluZoneLabel && (
                    <span className="text-sm text-muted-foreground">
                      - {address.pluZoneLabel}
                    </span>
                  )}
                </div>
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

          {/* All PLU zones and prescriptions */}
          {pluZones && pluZones.length > 1 && (
            <div className="space-y-2 sm:col-span-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Autres zones et prescriptions ({pluZones.length - 1})
              </div>
              <div className="flex flex-wrap gap-2">
                {pluZones.slice(1).map((zone, index) => (
                  <Badge
                    key={`${zone.zoneCode}-${index}`}
                    variant="outline"
                    className={`text-xs ${
                      zone.typezone?.startsWith('PSC-')
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-blue-50 text-blue-800 border-blue-300'
                    }`}
                    title={zone.zoneLabel}
                  >
                    {zone.zoneCode}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Des prescriptions supplémentaires peuvent s&apos;appliquer à votre terrain.
              </p>
            </div>
          )}

          {/* Regulatory constraints - 3-column compact layout */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Zone Inondable - Summary */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Zone inondable
              </div>
              <div className="flex items-center gap-2">
                <Droplets className={`h-4 w-4 flex-shrink-0 ${hasFloodZone ? (isHighRiskFloodZone ? 'text-red-600' : 'text-yellow-600') : 'text-green-600'}`} />
                {hasFloodZone ? (
                  <Badge
                    variant={isHighRiskFloodZone ? "destructive" : "secondary"}
                    className={`text-xs ${isHighRiskFloodZone ? '' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}`}
                  >
                    {address.floodZone}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Non
                  </Badge>
                )}
              </div>
            </div>

            {/* Protection ABF - Summary */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Protection ABF
              </div>
              <div className="flex items-center gap-2">
                <Landmark className={`h-4 w-4 flex-shrink-0 ${hasAbfProtection ? 'text-orange-600' : 'text-green-600'}`} />
                {hasAbfProtection ? (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">
                    {address.abfType || 'MH'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Non
                  </Badge>
                )}
              </div>
            </div>

            {/* Plan d'Exposition au Bruit (PEB) - Summary */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Bruit aérien
              </div>
              <div className="flex items-center gap-2">
                <Plane className={`h-4 w-4 flex-shrink-0 ${hasNoiseExposure ? (isHighRiskNoiseZone ? 'text-purple-700' : 'text-purple-500') : 'text-green-600'}`} />
                {hasNoiseExposure ? (
                  <Badge className={`text-xs ${isHighRiskNoiseZone ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
                    Zone {noiseExposure?.zone}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Non
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Autres risques naturels */}
          {(address.seismicZone || address.clayRisk) && (
            <div className="space-y-1 sm:col-span-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Autres risques naturels
              </div>
              <div className="flex flex-wrap gap-2">
                {address.seismicZone && (
                  <Badge variant="outline" className="text-xs">
                    Sismicité: Zone {address.seismicZone}
                  </Badge>
                )}
                {address.clayRisk && (
                  <Badge variant="outline" className="text-xs">
                    Retrait-gonflement argile: {address.clayRisk}
                  </Badge>
                )}
              </div>
            </div>
          )}

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
