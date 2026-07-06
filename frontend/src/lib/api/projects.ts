import { Project, CreateProjectDto, UpdateProjectDto } from '@/types';
import { request } from './http';

export const projectsApi = {
  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/projects');
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
