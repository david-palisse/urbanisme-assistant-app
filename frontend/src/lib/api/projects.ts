import {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ListProjectsParams,
  ProjectListResponse,
  ProjectStats,
} from '@/types';
import { request } from './http';

export const projectsApi = {
  async getProjects(
    params: ListProjectsParams = {}
  ): Promise<ProjectListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    return request<ProjectListResponse>(`/projects${qs ? `?${qs}` : ''}`);
  },

  async getProjectStats(): Promise<ProjectStats> {
    return request<ProjectStats>('/projects/stats');
  },

  async getProject(id: string): Promise<Project> {
    return request<Project>(`/projects/${id}`);
  },

  async createProject(data: CreateProjectDto): Promise<Project> {
    return request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
    return request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<void> {
    return request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  },
};
