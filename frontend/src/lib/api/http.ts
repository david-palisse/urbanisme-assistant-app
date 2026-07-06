const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
  if (typeof window !== 'undefined') {
    if (value) {
      localStorage.setItem('auth_token', value);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
}

export function getToken(): string | null {
  if (token) return token;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('auth_token');
  }
  return token;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const authToken = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge any existing headers from options
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
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
