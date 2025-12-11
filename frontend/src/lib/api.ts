import {
  User,
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  LoginDto,
  RegisterDto,
  AuthResponse,
  QuestionGroup,
  QuestionnaireResponse,
  SaveQuestionnaireDto,
  AnalysisResult,
  RequiredDocument,
  AddressSuggestion,
  ParcelInfo,
  PluZone,
  PluZoneInfo,
  FullLocationInfo,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge any existing headers from options
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Une erreur est survenue',
        statusCode: response.status,
      }));
      throw new Error(error.message || 'Une erreur est survenue');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Projects endpoints
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectDto): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Questionnaire endpoints
  async getQuestions(projectType: string): Promise<QuestionGroup[]> {
    return this.request<QuestionGroup[]>(
      `/questionnaire/questions/${projectType}`
    );
  }

  async saveQuestionnaire(
    projectId: string,
    data: SaveQuestionnaireDto
  ): Promise<QuestionnaireResponse> {
    return this.request<QuestionnaireResponse>(
      `/projects/${projectId}/questionnaire`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getQuestionnaire(projectId: string): Promise<QuestionnaireResponse> {
    return this.request<QuestionnaireResponse>(
      `/projects/${projectId}/questionnaire`
    );
  }

  // Geocoding endpoints
  async searchAddress(
    query: string,
    limit: number = 5
  ): Promise<AddressSuggestion[]> {
    // Backend returns array of GeocodingResult directly
    const results = await this.request<Array<{
      label: string;
      city: string;
      postcode: string;
      citycode: string;
      lat: number;
      lon: number;
    }>>('/geocoding/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });

    return results.map((r) => ({
      label: r.label,
      lat: r.lat,
      lon: r.lon,
      city: r.city,
      postcode: r.postcode,
      citycode: r.citycode,
      context: `${r.postcode} ${r.city}`,
    }));
  }

  async getParcel(lat: number, lon: number): Promise<ParcelInfo | null> {
    try {
      return await this.request<ParcelInfo>(
        `/geocoding/parcel?lat=${lat}&lon=${lon}`
      );
    } catch {
      return null;
    }
  }

  async updateProjectAddress(
    projectId: string,
    address: {
      rawInput: string;
      lat: number;
      lon: number;
      inseeCode?: string;
      cityName?: string;
      postCode?: string;
    }
  ): Promise<void> {
    return this.request<void>(`/geocoding/projects/${projectId}/address`, {
      method: 'POST',
      body: JSON.stringify(address),
    });
  }

  // Urbanisme endpoints
  async getPluZone(
    parcelId?: string,
    lat?: number,
    lon?: number
  ): Promise<PluZone | null> {
    const params = new URLSearchParams();
    if (parcelId) params.append('parcelId', parcelId);
    if (lat !== undefined) params.append('lat', lat.toString());
    if (lon !== undefined) params.append('lon', lon.toString());

    try {
      return await this.request<PluZone>(`/urbanisme/zone?${params.toString()}`);
    } catch {
      return null;
    }
  }

  async updateProjectPluZone(projectId: string): Promise<void> {
    return this.request<void>(`/urbanisme/projects/${projectId}/plu-zone`, {
      method: 'POST',
    });
  }

  async getAllPluZones(lat: number, lon: number): Promise<PluZoneInfo[]> {
    try {
      return await this.request<PluZoneInfo[]>(
        `/urbanisme/zones?lat=${lat}&lon=${lon}`
      );
    } catch {
      return [];
    }
  }

  async getFullLocationInfo(lat: number, lon: number): Promise<FullLocationInfo | null> {
    try {
      return await this.request<FullLocationInfo>(
        `/urbanisme/full-info?lat=${lat}&lon=${lon}`
      );
    } catch {
      return null;
    }
  }

  async updateProjectFullLocationInfo(projectId: string): Promise<FullLocationInfo | null> {
    try {
      return await this.request<FullLocationInfo>(
        `/urbanisme/projects/${projectId}/full-info`,
        { method: 'POST' }
      );
    } catch {
      return null;
    }
  }

  // Analysis endpoints
  async analyzeProject(projectId: string): Promise<AnalysisResult> {
    return this.request<AnalysisResult>(`/projects/${projectId}/analyze`, {
      method: 'POST',
    });
  }

  async getAnalysis(projectId: string): Promise<AnalysisResult | null> {
    try {
      return await this.request<AnalysisResult>(
        `/projects/${projectId}/analysis`
      );
    } catch {
      return null;
    }
  }

  // Documents endpoints
  async getDocuments(projectId: string): Promise<RequiredDocument[]> {
    // Backend returns object { documents: [...], cerfa: {...}, ... }
    // We need to transform it to RequiredDocument[] format
    const response = await this.request<{
      documents: Array<{
        code: string;
        name: string;
        description: string;
        required: boolean;
        cerfa?: string;
        helpUrl?: string;
      }>;
      cerfa?: {
        code: string;
        name: string;
        description: string;
        downloadUrl: string;
      };
      authorizationType?: string;
      message?: string;
    }>(`/projects/${projectId}/documents`);

    // If no documents (analysis not done yet), return empty array
    if (!response.documents || response.documents.length === 0) {
      // If there's a CERFA, add it as first document
      if (response.cerfa) {
        return [{
          id: response.cerfa.code,
          name: response.cerfa.name,
          description: response.cerfa.description,
          category: 'formulaires',
          cerfaNumber: response.cerfa.code,
          cerfaUrl: response.cerfa.downloadUrl,
          mandatory: true,
        }];
      }
      return [];
    }

    const docs: RequiredDocument[] = [];

    // Add CERFA form as first document if present
    if (response.cerfa) {
      docs.push({
        id: response.cerfa.code,
        name: response.cerfa.name,
        description: response.cerfa.description,
        category: 'formulaires',
        cerfaNumber: response.cerfa.code,
        cerfaUrl: response.cerfa.downloadUrl,
        mandatory: true,
      });
    }

    // Transform backend documents to frontend format
    response.documents.forEach((doc) => {
      // Determine category based on code prefix
      let category = 'autres';
      if (doc.code.includes('CERFA') || doc.code === 'DP1' || doc.code === 'PCMI1' || doc.code === 'PA1') {
        category = 'plans';
      } else if (doc.code.includes('2') || doc.code.includes('3') || doc.code.includes('4') || doc.code.includes('5')) {
        category = 'plans';
      } else if (doc.code.includes('6') || doc.code.includes('7') || doc.code.includes('8')) {
        category = 'photos';
      } else if (doc.code.includes('notice') || doc.code === 'PCMI4' || doc.code === 'PA2') {
        category = 'notices';
      }

      docs.push({
        id: doc.code,
        name: doc.name,
        description: doc.description,
        category,
        cerfaNumber: doc.cerfa,
        cerfaUrl: doc.helpUrl,
        mandatory: doc.required,
      });
    });

    return docs;
  }
}

export const api = new ApiClient();
