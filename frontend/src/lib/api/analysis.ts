import {
  AnalysisProgress,
  AnalysisResult,
  ChatMessage,
  ChatExchange,
} from '@/types';
import { request } from './http';

export const analysisApi = {
  async analyzeProject(projectId: string): Promise<AnalysisResult> {
    return request<AnalysisResult>(`/projects/${projectId}/analyze`, {
      method: 'POST',
    });
  },

  async getAnalysisProgress(
    projectId: string
  ): Promise<AnalysisProgress | null> {
    try {
      const { progress } = await request<{
        progress: AnalysisProgress | null;
      }>(`/projects/${projectId}/analysis/progress`);
      return progress;
    } catch {
      return null;
    }
  },

  async getAnalysis(projectId: string): Promise<AnalysisResult | null> {
    try {
      return await request<AnalysisResult>(`/projects/${projectId}/analysis`);
    } catch {
      return null;
    }
  },

  async getProjectChat(projectId: string): Promise<ChatMessage[]> {
    try {
      return await request<ChatMessage[]>(`/projects/${projectId}/chat`);
    } catch {
      return [];
    }
  },

  async sendProjectChatMessage(
    projectId: string,
    message: string
  ): Promise<ChatExchange> {
    return request<ChatExchange>(`/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};
