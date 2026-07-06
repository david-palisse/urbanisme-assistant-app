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
