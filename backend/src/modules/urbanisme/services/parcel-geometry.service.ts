import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GeoJsonGeometry } from '../urbanisme.types';

/**
 * Resolves the cadastral parcel geometry (polygon) for a location.
 *
 * Regulatory layers (SUP/ABF, PLU zones, flood zonings) must be intersected
 * with the whole parcel, not just the geocoded address point: the point often
 * sits on the road or at the parcel edge, which produces false negatives
 * (e.g. missed ABF perimeter or missed N zone at the back of the parcel).
 */
@Injectable()
export class ParcelGeometryService {
  private readonly logger = new Logger(ParcelGeometryService.name);
  private readonly CADASTRE_API_URL = 'https://apicarto.ign.fr/api/cadastre/parcelle';

  private readonly cache = new Map<string, GeoJsonGeometry>();

  constructor(private httpService: HttpService) {}

  /**
   * Get the parcel polygon for a location.
   * Prefers the stored parcelId (format: insee(5) + section(2) + numero(4)),
   * falls back to the parcel containing the point. Returns null when no
   * parcel can be resolved (callers should fall back to the point).
   */
  async getParcelGeometry(
    lat: number,
    lon: number,
    parcelId?: string | null,
  ): Promise<GeoJsonGeometry | null> {
    if (parcelId) {
      const cached = this.cache.get(parcelId);
      if (cached) {
        return cached;
      }

      const byId = await this.getGeometryByParcelId(parcelId);
      if (byId) {
        this.cacheGeometry(parcelId, byId);
        return byId;
      }
    }

    return this.getGeometryByPoint(lat, lon);
  }

  /**
   * Sample points of a geometry for point-based lookups (WMS GetFeatureInfo).
   * Returns the centroid plus the extreme vertices (N/S/E/W) of the outer
   * ring, deduplicated. For a Point geometry, returns the point itself.
   */
  getSamplePoints(geometry: GeoJsonGeometry): Array<{ lat: number; lon: number }> {
    const rings = this.getOuterRings(geometry);
    if (rings.length === 0) {
      return [];
    }

    const vertices = rings.flat();
    const centroid = {
      lon: vertices.reduce((s, v) => s + v[0], 0) / vertices.length,
      lat: vertices.reduce((s, v) => s + v[1], 0) / vertices.length,
    };
    const north = vertices.reduce((a, b) => (b[1] > a[1] ? b : a));
    const south = vertices.reduce((a, b) => (b[1] < a[1] ? b : a));
    const east = vertices.reduce((a, b) => (b[0] > a[0] ? b : a));
    const west = vertices.reduce((a, b) => (b[0] < a[0] ? b : a));

    const points = [centroid, ...[north, south, east, west].map(([x, y]) => ({ lon: x, lat: y }))];
    const seen = new Set<string>();
    return points.filter((p) => {
      const key = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async getGeometryByParcelId(parcelId: string): Promise<GeoJsonGeometry | null> {
    // parcelId format: code INSEE (5) + section (2) + numero (4), e.g. "44150AZ0207"
    const match = parcelId.match(/^(\d{5})(.{2})(\d{4})$/);
    if (!match) {
      this.logger.warn(`Unrecognized parcelId format: ${parcelId}`);
      return null;
    }

    const [, codeInsee, section, numero] = match;
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.CADASTRE_API_URL, {
          params: { code_insee: codeInsee, section, numero },
          timeout: 10000,
        }),
      );

      const feature = response.data?.features?.[0];
      return feature?.geometry || null;
    } catch (error) {
      this.logger.warn(`Cadastre lookup by parcelId ${parcelId} failed: ${error.message}`);
      return null;
    }
  }

  private async getGeometryByPoint(lat: number, lon: number): Promise<GeoJsonGeometry | null> {
    try {
      const geom = JSON.stringify({ type: 'Point', coordinates: [lon, lat] });
      const response = await firstValueFrom(
        this.httpService.get(this.CADASTRE_API_URL, {
          params: { geom },
          timeout: 10000,
        }),
      );

      const feature = response.data?.features?.[0];
      return feature?.geometry || null;
    } catch (error) {
      this.logger.warn(`Cadastre lookup by point (${lat}, ${lon}) failed: ${error.message}`);
      return null;
    }
  }

  private getOuterRings(geometry: GeoJsonGeometry): number[][][] {
    if (geometry.type === 'Point') {
      const [x, y] = geometry.coordinates as number[];
      return [[[x, y]]];
    }
    if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates as number[][][];
      return rings.length > 0 ? [rings[0]] : [];
    }
    if (geometry.type === 'MultiPolygon') {
      const polygons = geometry.coordinates as number[][][][];
      return polygons.filter((p) => p.length > 0).map((p) => p[0]);
    }
    return [];
  }

  private cacheGeometry(parcelId: string, geometry: GeoJsonGeometry): void {
    // Small FIFO cache to avoid refetching the same parcel during an analysis
    if (this.cache.size >= 200) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(parcelId, geometry);
  }
}
