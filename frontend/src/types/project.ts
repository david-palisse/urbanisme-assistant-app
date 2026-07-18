import { ProjectType, ProjectStatus } from './enums';
import { Address } from './address';
import { QuestionnaireResponse } from './questionnaire';
import { AnalysisResult } from './analysis';

// Project types
export interface Project {
  id: string;
  userId: string;
  name: string;
  projectType: ProjectType;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  address?: Address;
  questionnaireResponse?: QuestionnaireResponse;
  analysisResult?: AnalysisResult;
}

export interface CreateProjectDto {
  name: string;
  projectType: ProjectType;
}

export interface UpdateProjectDto {
  name?: string;
  status?: ProjectStatus;
}

export type ProjectSort = 'recent' | 'oldest' | 'name';

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  sort?: ProjectSort;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectStats {
  total: number;
  draft: number;
  inProgress: number;
  completed: number;
}
