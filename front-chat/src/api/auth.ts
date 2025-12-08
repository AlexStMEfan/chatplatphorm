// src/api/auth.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://0.0.0.0:3000';

interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  access_expires_at: number;
  refresh_token: string;
}

interface RefreshRequest {
  refresh_token: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

// Сохранение токенов
export const saveTokens = (accessToken: string, refreshToken: string, expiresAt: number) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  localStorage.setItem('access_expires_at', expiresAt.toString());
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('access_expires_at');
};

export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

// Регистрация
export const register = async (data: RegisterRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }
};

// Вход
export const login = async (data: LoginRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const result: LoginResponse = await response.json();
  saveTokens(result.access_token, result.refresh_token, result.access_expires_at);
};

// Обновление токена
export const refreshToken = async (): Promise<void> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || `Ошибка ${response.status}`);
}

  const result: LoginResponse = await response.json();
  saveTokens(result.access_token, result.refresh_token, result.access_expires_at);
};

// Получение профиля
export const fetchProfile = async (): Promise<User> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token');

  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    // Попробуем обновить токен
    await refreshToken();
    return fetchProfile(); // рекурсивный вызов с новым токеном
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch profile');
  }

  return response.json();
};

// Выход
export const logout = () => {
  clearTokens();
};

// Проверка, нужно ли обновлять токен
export const isTokenExpired = (): boolean => {
  const expiresAt = localStorage.getItem('access_expires_at');
  if (!expiresAt) return true;
  return Date.now() >= parseInt(expiresAt) * 1000;
};

// Поиск пользователей
export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
    headers: { 
      'Authorization': `Bearer ${token}`
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Search failed: ${response.status}`);
  }

  return response.json();
};