import { getToken, setToken } from './http';
import { authApi } from './auth';
import { projectsApi } from './projects';
import { questionnaireApi } from './questionnaire';
import { geocodingApi } from './geocoding';
import { urbanismeApi } from './urbanisme';
import { analysisApi } from './analysis';
import { documentsApi } from './documents';
import { billingApi } from './billing';

// Single `api` object combining all domain modules, so call sites keep
// using `api.xxx()` regardless of which module implements the endpoint.
export const api = {
  getToken,
  setToken,
  ...authApi,
  ...projectsApi,
  ...questionnaireApi,
  ...geocodingApi,
  ...urbanismeApi,
  ...analysisApi,
  ...documentsApi,
  ...billingApi,
};

export {
  authApi,
  projectsApi,
  questionnaireApi,
  geocodingApi,
  urbanismeApi,
  analysisApi,
  documentsApi,
  billingApi,
};
