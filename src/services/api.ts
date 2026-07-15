import { CategoryModel, StyleModel, StyleCreateInput, StyleField, TagModel, TagCreateInput, AdminStats, AuthResponse, AdminUserSearchResult, CreditPack, CreditPackInput } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

let onAuthFailureCallback: (() => void) | null = null;

export function setupAuthInterceptor(onLogout: () => void) {
  onAuthFailureCallback = onLogout;
}

interface ApiCallOptions extends RequestInit {
  // Set for calls that can legitimately 401 without meaning "your session
  // expired" (currently just the login call itself) - skips the global
  // logout interceptor so a failed login doesn't misreport itself as a
  // session-expiry event.
  skipAuthRedirect?: boolean;
}

// Fetch helper wrapper
async function apiCall<T>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const token = localStorage.getItem('styli_access_token');
  const headers = new Headers(fetchOptions.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Determine if we should set Content-Type JSON
  // If body is FormData (for file uploads), do not set Content-Type (browser will set it automatically with boundary)
  if (!(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    if (!skipAuthRedirect && onAuthFailureCallback) {
      onAuthFailureCallback();
    }
    throw new Error(errorData.message || 'Unauthorized.');
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
      skipAuthRedirect: true,
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

  // `fields` (dynamic prompt-template inputs) isn't in the generated OpenAPI
  // request type yet, so it's accepted as an optional extra here.
  async addStyle(style: StyleCreateInput & { fields?: StyleField[] }): Promise<StyleModel> {
    return apiCall<StyleModel>('/api/styles', {
      method: 'POST',
      body: JSON.stringify(style),
    });
  },

  async updateStyle(id: string, updates: Partial<StyleModel> & { fields?: StyleField[] }): Promise<StyleModel> {
    return apiCall<StyleModel>(`/api/styles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Admin-only live prompt preview: renders the final prompt with sample
  // values via the backend's real engine (exact match to generation).
  async previewPrompt(input: { prompt: string; fields: StyleField[]; values: Record<string, unknown> }): Promise<{ prompt: string }> {
    return apiCall<{ prompt: string }>('/api/styles/prompt-preview', {
      method: 'POST',
      body: JSON.stringify(input),
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

  // Tags (internal ranking metadata for RecommendationService - never shown to end users)
  async getTags(): Promise<TagModel[]> {
    return apiCall<TagModel[]>('/api/tags');
  },

  async addTag(tag: TagCreateInput): Promise<TagModel> {
    return apiCall<TagModel>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(tag),
    });
  },

  async updateTag(id: string, updates: Partial<TagModel>): Promise<TagModel> {
    return apiCall<TagModel>(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteTag(id: string): Promise<void> {
    return apiCall<void>(`/api/tags/${id}`, {
      method: 'DELETE',
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

  async deleteImage(url: string): Promise<void> {
    return apiCall<void>('/api/upload', {
      method: 'DELETE',
      body: JSON.stringify({ url }),
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

  // Manual credit adjustment
  async searchUserByEmail(email: string): Promise<AdminUserSearchResult> {
    return apiCall<AdminUserSearchResult>(`/api/admin/users/search?email=${encodeURIComponent(email)}`);
  },

  async adjustUserBalance(userId: string, amount: number, description: string): Promise<{ balance: number }> {
    return apiCall<{ balance: number }>(`/api/admin/users/${userId}/adjust-balance`, {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    });
  },

  // Credit pack catalog
  async getCreditPacks(): Promise<CreditPack[]> {
    return apiCall<CreditPack[]>('/api/credit-packs?all=true');
  },

  async addCreditPack(pack: CreditPackInput): Promise<CreditPack> {
    return apiCall<CreditPack>('/api/credit-packs', {
      method: 'POST',
      body: JSON.stringify(pack),
    });
  },

  async updateCreditPack(id: string, updates: Partial<CreditPackInput>): Promise<CreditPack> {
    return apiCall<CreditPack>(`/api/credit-packs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteCreditPack(id: string): Promise<void> {
    return apiCall<void>(`/api/credit-packs/${id}`, {
      method: 'DELETE',
    });
  },
};
