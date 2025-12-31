'use client';

import { Address, PluZoneInfo, NoiseExposureInfo } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Volume2,
} from 'lucide-react';

interface AddressInfoProps {
  address: Address | undefined;
  variant?: 'compact' | 'full';
  showTitle?: boolean;
  pluZones?: PluZoneInfo[]; // All PLU zones at this location
  noiseExposure?: NoiseExposureInfo; // Airport noise exposure (PEB)
}

export function AddressInfo({ address, variant = 'compact', showTitle = false, pluZones = [], noiseExposure }: AddressInfoProps) {
  if (!address) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        <span>Adresse non définie</span>
      </div>
    );
  }

  // Check for major constraints
  const hasFloodZone = address.floodZone && address.floodZone !== 'null';
  const isHighRiskFloodZone = hasFloodZone && (
    address.floodZone?.toLowerCase().includes('rouge') ||
    address.floodZoneLevel?.toLowerCase() === 'fort'
  );
  const hasAbfProtection = address.isAbfProtected === true;
  const hasNoiseExposure = noiseExposure?.isInNoiseZone === true;
  const isHighRiskNoiseZone = hasNoiseExposure && (noiseExposure?.zone === 'A' || noiseExposure?.zone === 'B');
  const hasMajorConstraints = isHighRiskFloodZone || hasAbfProtection || isHighRiskNoiseZone;

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
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 flex-shrink-0 text-red-600" />
            <Badge variant="destructive" className="text-xs">
              Zone inondable {address.floodZone}
            </Badge>
          </div>
        )}
        {hasAbfProtection && (
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 flex-shrink-0 text-orange-600" />
            <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-300">
              ABF - {address.abfType || 'Monument Historique'}
            </Badge>
          </div>
        )}
        {hasNoiseExposure && (
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 flex-shrink-0 text-purple-600" />
            <Badge className={`text-xs ${isHighRiskNoiseZone ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 border-purple-300'}`}>
              PEB Zone {noiseExposure?.zone} - {noiseExposure?.airportName}
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="space-y-4">
      {/* Critical Constraints Alerts */}
      {isHighRiskFloodZone && (
        <Alert variant="destructive" className="border-red-500 bg-red-50">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-red-800 font-semibold">
            Zone inondable à haut risque
          </AlertTitle>
          <AlertDescription className="text-red-700">
            <p className="mb-2">
              Ce terrain est situé en <strong>zone {address.floodZone || 'inondable'}</strong>
              {address.floodZoneLevel && ` (risque ${address.floodZoneLevel})`}.
            </p>
            <p className="text-sm">
              Les constructions nouvelles sont généralement <strong>interdites</strong> ou très strictement réglementées.
              Toute demande de permis sera probablement refusée.
              {address.floodZoneSource && (
                <span className="block mt-1 text-xs">Source: {address.floodZoneSource}</span>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {hasFloodZone && !isHighRiskFloodZone && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Droplets className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-800 font-semibold">
            Zone inondable identifiée
          </AlertTitle>
          <AlertDescription className="text-yellow-700">
            <p className="mb-2">
              Ce terrain est situé en zone {address.floodZone || 'inondable'}
              {address.floodZoneLevel && ` (risque ${address.floodZoneLevel})`}.
            </p>
            <p className="text-sm">
              Des restrictions peuvent s&apos;appliquer. Consultez le PPRI de votre commune.
              {address.floodZoneSource && (
                <span className="block mt-1 text-xs">Source: {address.floodZoneSource}</span>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {hasAbfProtection && (
        <Alert className="border-orange-500 bg-orange-50">
          <Landmark className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-800 font-semibold">
            Zone protégée - Avis ABF obligatoire
          </AlertTitle>
          <AlertDescription className="text-orange-700">
            <p className="mb-2">
              Ce terrain est situé dans le périmètre de protection d&apos;un
              <strong> {address.abfType === 'MH' ? 'Monument Historique' : address.abfType || 'monument protégé'}</strong>
              {address.abfMonumentName && ` (${address.abfMonumentName})`}.
            </p>
            <p className="text-sm">
              Tout projet nécessitera l&apos;avis conforme de l&apos;Architecte des Bâtiments de France (ABF).
              Les délais d&apos;instruction sont allongés et les contraintes architecturales strictes.
              {address.abfPerimeter && (
                <span className="block mt-1 text-xs">{address.abfPerimeter}</span>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isHighRiskNoiseZone && (
        <Alert variant="destructive" className="border-purple-500 bg-purple-50">
          <Plane className="h-5 w-5 text-purple-700" />
          <AlertTitle className="text-purple-800 font-semibold">
            Plan d&apos;Exposition au Bruit (PEB) - Zone {noiseExposure?.zone}
          </AlertTitle>
          <AlertDescription className="text-purple-700">
            <p className="mb-2">
              Ce terrain est situé en <strong>zone {noiseExposure?.zone}</strong> du PEB de l&apos;aéroport de
              <strong> {noiseExposure?.airportName}</strong> ({noiseExposure?.airportCode}).
            </p>
            <p className="text-sm">
              {noiseExposure?.restrictions || 'Constructions interdites ou très réglementées.'}
              {noiseExposure?.approvalDate && (
                <span className="block mt-1 text-xs">Arrêté du {new Date(noiseExposure.approvalDate).toLocaleDateString('fr-FR')}</span>
              )}
              {noiseExposure?.documentRef && (
                <a href={noiseExposure.documentRef} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs underline">
                  Consulter le document officiel
                </a>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {hasNoiseExposure && !isHighRiskNoiseZone && (
        <Alert className="border-purple-400 bg-purple-50">
          <Volume2 className="h-5 w-5 text-purple-600" />
          <AlertTitle className="text-purple-800 font-semibold">
            Plan d&apos;Exposition au Bruit (PEB) - Zone {noiseExposure?.zone}
          </AlertTitle>
          <AlertDescription className="text-purple-700">
            <p className="mb-2">
              Ce terrain est dans le périmètre du PEB de l&apos;aéroport de
              <strong> {noiseExposure?.airportName}</strong>.
            </p>
            <p className="text-sm">
              {noiseExposure?.restrictions || 'Une attestation d\'isolation acoustique peut être requise.'}
            </p>
          </AlertDescription>
        </Alert>
      )}

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
    </div>
  );
}
