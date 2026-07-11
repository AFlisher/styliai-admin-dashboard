export interface UserModel {
  id: string;
  email: string;
  role: 'admin';
  name?: string;
}

export interface CategoryModel {
  id: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StyleModel {
  id: string;
  name: string;
  categoryId: string;
  prompt: string;
  negativePrompt?: string | null;
  creditCost: number;
  coverImage: string; // Storage URL
  isTrending: boolean;
  isPremium: boolean; // Corresponds to Pro
  isEnabled: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeToday: number; // approximation: users with wallet activity today, not literal sessions
  imagesGenerated: number;
  creditsUsed: number;
  storageUsedMB: number;
  chartData: Array<{ label: string; value: number }>;
  recentActivity: Array<{
    id: string;
    userEmail: string;
    type: string; // 'reward' | 'generation' | 'purchase' | 'refund' | 'admin'
    amount: number;
    date: string;
  }>;
}

export interface AuthResponse {
  accessToken: string;
  user: UserModel;
}
