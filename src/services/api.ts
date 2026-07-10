import { CategoryModel, StyleModel, AdminStats, AuthResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

let onAuthFailureCallback: (() => void) | null = null;

export function setupAuthInterceptor(onLogout: () => void) {
  onAuthFailureCallback = onLogout;
}

// Fetch helper wrapper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('styli_access_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Determine if we should set Content-Type JSON
  // If body is FormData (for file uploads), do not set Content-Type (browser will set it automatically with boundary)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    if (onAuthFailureCallback) {
      onAuthFailureCallback();
    }
    throw new Error('Unauthorized. Logging out...');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  // For delete requests or empty responses, return empty object/json
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const apiService = {
  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiCall<AuthResponse>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Stats
  async getStats(): Promise<AdminStats> {
    return apiCall<AdminStats>('/api/admin/stats');
  },

  // Categories
  async getCategories(): Promise<CategoryModel[]> {
    return apiCall<CategoryModel[]>('/api/categories');
  },

  async addCategory(name: string, isEnabled: boolean): Promise<CategoryModel> {
    return apiCall<CategoryModel>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, isEnabled }),
    });
  },

  async updateCategory(id: string, updates: Partial<CategoryModel>): Promise<CategoryModel> {
    return apiCall<CategoryModel>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async reorderCategories(
  categories: { id: string; sortOrder: number }[]
): Promise<void> {
  return apiCall<void>("/api/categories/reorder", {
    method: "PUT",
    body: JSON.stringify({ categories }),
  });
},

  async deleteCategory(id: string): Promise<void> {
    return apiCall<void>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },

  // Styles
  async getStyles(): Promise<StyleModel[]> {
    return apiCall<StyleModel[]>('/api/styles?all=true');
  },

  async addStyle(style: Omit<StyleModel, 'id'>): Promise<StyleModel> {
    return apiCall<StyleModel>('/api/styles', {
      method: 'POST',
      body: JSON.stringify(style),
    });
  },

  async updateStyle(id: string, updates: Partial<StyleModel>): Promise<StyleModel> {
    return apiCall<StyleModel>(`/api/styles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteStyle(id: string): Promise<void> {
    return apiCall<void>(`/api/styles/${id}`, {
      method: 'DELETE',
    });
  },

  async reorderStyles(styles: Array<{ id: string; sortOrder: number }>): Promise<void> {
    return apiCall<void>('/api/styles/reorder', {
      method: 'PUT',
      body: JSON.stringify({ styles }),
    });
  },

  // Cover Image upload
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiCall<{ url: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Style generation preview
  async previewStyle(prompt: string, sampleImage: File): Promise<{ generatedImageUrl: string }> {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('file', sampleImage);
    return apiCall<{ generatedImageUrl: string }>('/api/styles/preview', {
      method: 'POST',
      body: formData,
    });
  },
};
