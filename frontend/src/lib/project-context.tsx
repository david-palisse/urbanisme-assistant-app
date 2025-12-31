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
  error: string | null;
  refreshProject: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);

  const projectId = params.id as string;

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getProject(projectId);
      setProject(data);

      // Fetch location info if address exists
      if (data.address?.lat && data.address?.lon) {
        try {
          const locationInfo = await api.getFullLocationInfo(
            data.address.lat,
            data.address.lon
          );
          if (locationInfo) {
            setPluZones(locationInfo.pluZones || []);
            setNoiseExposure(locationInfo.noiseExposure);
          }
        } catch (locError) {
          console.error('Failed to fetch location info:', locError);
          // Fallback to just PLU zones
          try {
            const zones = await api.getAllPluZones(
              data.address.lat,
              data.address.lon
            );
            setPluZones(zones);
          } catch {
            // Ignore fallback error
          }
        }
      }
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

  useEffect(() => {
    if (!authLoading && projectId) {
      fetchProject();
    }
  }, [authLoading, projectId, fetchProject]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        pluZones,
        noiseExposure,
        isLoading: authLoading || isLoading,
        error,
        refreshProject,
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
