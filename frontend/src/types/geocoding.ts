// Geocoding types
export interface AddressSuggestion {
  label: string;
  lat: number;
  lon: number;
  city: string;
  postcode: string;
  citycode: string;
  context: string;
}

export interface ParcelInfo {
  parcelId: string;
  section: string;
  numero: string;
  commune: string;
  codeInsee: string;
}

export interface PluZone {
  zoneCode: string;
  zoneLabel?: string;
  typezone?: string;
}

// Parcel search result type
export interface ParcelSearchResult {
  address: string;
  city: string;
  postalCode: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  parcel: {
    id: string;
    section: string;
    number: string;
    commune: string;
    codeInsee: string;
  };
}
