import { AnalysisResult } from '@/types';
import { request } from './http';

export const analysisApi = {
  async analyzeProject(projectId: string): Promise<AnalysisResult> {
    return request<AnalysisResult>(`/projects/${projectId}/analyze`, {
      method: 'POST',
    });
  },

  async getAnalysis(projectId: string): Promise<AnalysisResult | null> {
    try {
      return await request<AnalysisResult>(`/projects/${projectId}/analysis`);
    } catch {
      return null;
    }
  },
};
