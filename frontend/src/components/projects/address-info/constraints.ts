import { Address, NoiseExposureInfo } from '@/types';

export interface AddressConstraints {
  hasFloodZone: boolean;
  isHighRiskFloodZone: boolean;
  hasAbfProtection: boolean;
  hasNoiseExposure: boolean;
  isHighRiskNoiseZone: boolean;
  hasMajorConstraints: boolean;
}

// Derive regulatory constraint flags shared by the compact and full variants
export function deriveAddressConstraints(
  address: Address,
  noiseExposure?: NoiseExposureInfo
): AddressConstraints {
  const hasFloodZone = Boolean(address.floodZone && address.floodZone !== 'null');
  const isHighRiskFloodZone = Boolean(
    hasFloodZone &&
      (address.floodZone?.toLowerCase().includes('rouge') ||
        address.floodZoneLevel?.toLowerCase() === 'fort')
  );
  const hasAbfProtection = address.isAbfProtected === true;
  const hasNoiseExposure = noiseExposure?.isInNoiseZone === true;
  const isHighRiskNoiseZone =
    hasNoiseExposure && (noiseExposure?.zone === 'A' || noiseExposure?.zone === 'B');

  return {
    hasFloodZone,
    isHighRiskFloodZone,
    hasAbfProtection,
    hasNoiseExposure,
    isHighRiskNoiseZone,
    hasMajorConstraints:
      isHighRiskFloodZone || hasAbfProtection || isHighRiskNoiseZone,
  };
}
