'use client';

import { Address, NoiseExposureInfo } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Droplets, Landmark, Plane, Volume2 } from 'lucide-react';
import { AddressConstraints } from './constraints';

interface ConstraintAlertsProps {
  address: Address;
  noiseExposure?: NoiseExposureInfo;
  constraints: AddressConstraints;
}

// Prominent alert banners for major regulatory constraints (full variant only)
export function ConstraintAlerts({ address, noiseExposure, constraints }: ConstraintAlertsProps) {
  const {
    hasFloodZone,
    isHighRiskFloodZone,
    hasAbfProtection,
    hasNoiseExposure,
    isHighRiskNoiseZone,
  } = constraints;

  return (
    <>
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
    </>
  );
}
