import { User, LoginDto, RegisterDto, AuthResponse } from '@/types';
import { request, setToken } from './http';

export const authApi = {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(response.access_token);
    return response;
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(response.access_token);
    return response;
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  logout() {
    setToken(null);
  },
};
