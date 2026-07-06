'use client';

import { Address, PluZoneInfo, NoiseExposureInfo } from '@/types';
import { MapPin } from 'lucide-react';
import { deriveAddressConstraints } from './address-info/constraints';
import { ConstraintAlerts } from './address-info/ConstraintAlerts';
import { AddressInfoCompact } from './address-info/AddressInfoCompact';
import { AddressInfoCard } from './address-info/AddressInfoCard';

interface AddressInfoProps {
  address: Address | undefined;
  variant?: 'compact' | 'full';
  showTitle?: boolean;
  pluZones?: PluZoneInfo[]; // All PLU zones at this location
  noiseExposure?: NoiseExposureInfo; // Airport noise exposure (PEB)
}

export function AddressInfo({
  address,
  variant = 'compact',
  showTitle = false,
  pluZones = [],
  noiseExposure,
}: AddressInfoProps) {
  if (!address) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        <span>Adresse non définie</span>
      </div>
    );
  }

  const constraints = deriveAddressConstraints(address, noiseExposure);

  if (variant === 'compact') {
    return (
      <AddressInfoCompact
        address={address}
        pluZones={pluZones}
        noiseExposure={noiseExposure}
        constraints={constraints}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ConstraintAlerts
        address={address}
        noiseExposure={noiseExposure}
        constraints={constraints}
      />
      <AddressInfoCard
        address={address}
        showTitle={showTitle}
        pluZones={pluZones}
        noiseExposure={noiseExposure}
        constraints={constraints}
      />
    </div>
  );
}
