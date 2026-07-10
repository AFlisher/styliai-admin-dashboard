export interface UserModel {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface CategoryModel {
  id: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface StyleModel {
  id: string;
  name: string;
  categoryId: string;
  prompt: string;
  negativePrompt?: string;
  creditsCost: number;
  coverImage: string; // Storage URL
  isTrending: boolean;
  isPremium: boolean; // Corresponds to Pro
  isEnabled: boolean;
  sortOrder?: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsersToday: number;
  imagesGenerated: number;
  creditsUsed: number;
  storageUsed: string; // e.g. "124.5 GB"
  chartData: Array<{ label: string; value: number }>;
  recentPayments?: Array<{
    id: string;
    user: string;
    plan: string;
    amount: string;
    date: string;
    status: string;
  }>;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserModel;
}
