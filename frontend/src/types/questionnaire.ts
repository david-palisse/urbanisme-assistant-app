// Questionnaire types
export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface QuestionDependency {
  questionId: string;
  value: string | boolean | number;
}

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'multiselect';
  options?: QuestionOption[];
  required: boolean;
  helpText?: string;
  unit?: string;
  validation?: QuestionValidation;
  dependsOn?: QuestionDependency;
}

export interface QuestionGroup {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface QuestionnaireResponse {
  id: string;
  projectId: string;
  responses: Record<string, string | number | boolean | string[]>;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveQuestionnaireDto {
  responses: Record<string, string | number | boolean | string[]>;
  completed?: boolean;
}
