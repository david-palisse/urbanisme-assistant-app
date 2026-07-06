import {
  QuestionGroup,
  QuestionnaireResponse,
  SaveQuestionnaireDto,
} from '@/types';
import { request } from './http';

export const questionnaireApi = {
  async getQuestions(projectType: string): Promise<QuestionGroup[]> {
    return request<QuestionGroup[]>(`/questionnaire/questions/${projectType}`);
  },

  async saveQuestionnaire(
    projectId: string,
    data: SaveQuestionnaireDto
  ): Promise<QuestionnaireResponse> {
    return request<QuestionnaireResponse>(
      `/projects/${projectId}/questionnaire`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async getQuestionnaire(projectId: string): Promise<QuestionnaireResponse> {
    return request<QuestionnaireResponse>(
      `/projects/${projectId}/questionnaire`
    );
  },
};
