'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/auth-context';
import { Project, PluZoneInfo, NoiseExposureInfo } from '@/types';

interface ProjectContextType {
  project: Project | null;
  pluZones: PluZoneInfo[];
  noiseExposure: NoiseExposureInfo | undefined;
  isLoading: boolean;
  isLocationInfoLoading: boolean;
  error: string | null;
  refreshProject: () => Promise<void>;
  loadLocationInfo: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const params = useParams();
  const { isLoading: authLoading } = useRequireAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [pluZones, setPluZones] = useState<PluZoneInfo[]>([]);
  const [noiseExposure, setNoiseExposure] = useState<NoiseExposureInfo | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationInfoLoading, setIsLocationInfoLoading] = useState(false);
  const [locationInfoRequested, setLocationInfoRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setError('Impossible de charger le projet.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const refreshProject = useCallback(async () => {
    await fetchProject();
  }, [fetchProject]);

  // Location info (PLU zones, noise exposure) aggregates several slow external
  // APIs, so it is only fetched when a page actually asks for it.
  const loadLocationInfo = useCallback(() => {
    setLocationInfoRequested(true);
  }, []);

  useEffect(() => {
    if (!authLoading && projectId) {
      fetchProject();
    }
  }, [authLoading, projectId, fetchProject]);

  const lat = project?.address?.lat;
  const lon = project?.address?.lon;
  const storedLocationInfo = project?.address?.fullLocationInfo;

  useEffect(() => {
    if (!locationInfoRequested || !lat || !lon) return;

    // Snapshot persisted with the project: no API call needed
    if (storedLocationInfo) {
      setPluZones(storedLocationInfo.pluZones || []);
      setNoiseExposure(storedLocationInfo.noiseExposure);
      return;
    }

    let cancelled = false;

    const fetchLocationInfo = async () => {
      setIsLocationInfoLoading(true);
      try {
        const locationInfo = await api.getFullLocationInfo(lat, lon);
        if (!cancelled && locationInfo) {
          setPluZones(locationInfo.pluZones || []);
          setNoiseExposure(locationInfo.noiseExposure);
        }
      } catch (locError) {
        console.error('Failed to fetch location info:', locError);
        // Fallback to just PLU zones
        try {
          const zones = await api.getAllPluZones(lat, lon);
          if (!cancelled) setPluZones(zones);
        } catch {
          // Ignore fallback error
        }
      } finally {
        if (!cancelled) setIsLocationInfoLoading(false);
      }
    };

    fetchLocationInfo();

    return () => {
      cancelled = true;
    };
  }, [locationInfoRequested, lat, lon, storedLocationInfo]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        pluZones,
        noiseExposure,
        isLoading: authLoading || isLoading,
        isLocationInfoLoading,
        error,
        refreshProject,
        loadLocationInfo,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
