import { AddressSuggestion, FullLocationInfo, ParcelInfo, ParcelSearchResult } from '@/types';
import { request } from './http';

export const geocodingApi = {
  async searchAddress(
    query: string,
    limit: number = 5
  ): Promise<AddressSuggestion[]> {
    // Backend returns array of GeocodingResult directly
    const results = await request<Array<{
      label: string;
      city: string;
      postcode: string;
      citycode: string;
      lat: number;
      lon: number;
    }>>('/geocoding/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });

    return results.map((r) => ({
      label: r.label,
      lat: r.lat,
      lon: r.lon,
      city: r.city,
      postcode: r.postcode,
      citycode: r.citycode,
      context: `${r.postcode} ${r.city}`,
    }));
  },

  async getParcel(lat: number, lon: number): Promise<ParcelInfo | null> {
    try {
      return await request<ParcelInfo>(`/geocoding/parcel?lat=${lat}&lon=${lon}`);
    } catch {
      return null;
    }
  },

  async searchParcel(
    codeInsee: string,
    section: string,
    numero: string
  ): Promise<ParcelSearchResult> {
    return request<ParcelSearchResult>(
      `/geocoding/search-parcel?codeInsee=${encodeURIComponent(codeInsee)}&section=${encodeURIComponent(section)}&numero=${encodeURIComponent(numero)}`
    );
  },

  async updateProjectAddress(
    projectId: string,
    address: {
      rawInput: string;
      lat: number;
      lon: number;
      inseeCode?: string;
      cityName?: string;
      postCode?: string;
      // Regulatory snapshot already fetched by the client, persisted as-is
      // so the backend does not re-call the external APIs
      fullLocationInfo?: FullLocationInfo;
      parcelInfo?: ParcelInfo;
    }
  ): Promise<void> {
    return request<void>(`/geocoding/projects/${projectId}/address`, {
      method: 'POST',
      body: JSON.stringify(address),
    });
  },
};
