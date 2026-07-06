import { PluZone, PluZoneInfo, FullLocationInfo } from '@/types';
import { request } from './http';

export const urbanismeApi = {
  async getPluZone(
    parcelId?: string,
    lat?: number,
    lon?: number
  ): Promise<PluZone | null> {
    const params = new URLSearchParams();
    if (parcelId) params.append('parcelId', parcelId);
    if (lat !== undefined) params.append('lat', lat.toString());
    if (lon !== undefined) params.append('lon', lon.toString());

    try {
      return await request<PluZone>(`/urbanisme/zone?${params.toString()}`);
    } catch {
      return null;
    }
  },

  async updateProjectPluZone(projectId: string): Promise<void> {
    return request<void>(`/urbanisme/projects/${projectId}/plu-zone`, {
      method: 'POST',
    });
  },

  async getAllPluZones(lat: number, lon: number): Promise<PluZoneInfo[]> {
    try {
      return await request<PluZoneInfo[]>(`/urbanisme/zones?lat=${lat}&lon=${lon}`);
    } catch {
      return [];
    }
  },

  async getFullLocationInfo(
    lat: number,
    lon: number
  ): Promise<FullLocationInfo | null> {
    try {
      return await request<FullLocationInfo>(
        `/urbanisme/full-info?lat=${lat}&lon=${lon}`
      );
    } catch {
      return null;
    }
  },

  async updateProjectFullLocationInfo(
    projectId: string
  ): Promise<FullLocationInfo | null> {
    try {
      return await request<FullLocationInfo>(
        `/urbanisme/projects/${projectId}/full-info`,
        { method: 'POST' }
      );
    } catch {
      return null;
    }
  },
};
