import type { components, paths } from './api-generated';

// Re-exported from the generated OpenAPI types (../../backend/openapi.yaml is
// the source of truth - see `npm run generate:api-types`) so these can't
// silently drift from what the backend actually returns.
export type UserModel = components['schemas']['AdminUser'];
export type CategoryModel = components['schemas']['Category'];
export type StyleModel = components['schemas']['Style'];
export type TagModel = components['schemas']['Tag'];
export type AdminStats = components['schemas']['AdminStats'];
export type CountryStat = components['schemas']['CountryStat'];
export type UsersByCountryStats = components['schemas']['UsersByCountryStats'];
export type CountryStatsRange = UsersByCountryStats['range'];
export type AuthResponse = components['schemas']['AdminAuthResponse'];
export type AdminUserSearchResult = components['schemas']['AdminUserSearchResult'];
export type CreditPack = components['schemas']['CreditPack'];
export type GenerationOverviewStats = components['schemas']['GenerationOverviewStats'];
export type GenerationAnalyticsSummary = components['schemas']['GenerationAnalyticsSummary'];
export type GenerationAnalyticsRange = GenerationAnalyticsSummary['range'];
export type StyleUsageStat = components['schemas']['StyleUsageStat'];
export type CategoryUsageStat = components['schemas']['CategoryUsageStat'];
export type StyleRatingStat = components['schemas']['StyleRatingStat'];
export type RecentFeedbackEntry = components['schemas']['RecentFeedbackEntry'];
export type FeedbackSummaryStats = components['schemas']['FeedbackSummaryStats'];
export type GenerationTimeStats = components['schemas']['GenerationTimeStats'];

// The POST /api/styles request body is intentionally its own shape (e.g.
// sortOrder is optional there, unlike on the StyleModel the API returns) -
// reusing StyleModel for the request would relax fields the backend actually
// requires on read.
export type StyleCreateInput =
  paths['/api/styles']['post']['requestBody']['content']['application/json'];

// Dynamic input field for a style's prompt template. Hand-written (the
// backend accepts this shape on POST/PUT /api/styles and returns it on the
// Style object); mirrors backend/src/utils/promptTemplate.js.
export type StyleFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'dropdown'
  | 'checkbox'
  | 'color'
  | 'date';

export interface StyleFieldOption {
  value: string;
  label: string;
}

export interface StyleField {
  key: string;
  label: string;
  type: StyleFieldType;
  required: boolean;
  placeholder?: string | null;
  options?: StyleFieldOption[] | null;
  config?: Record<string, unknown>;
  sortOrder?: number;
}

export type CreditPackInput =
  paths['/api/credit-packs']['post']['requestBody']['content']['application/json'];

export type TagCreateInput =
  paths['/api/tags']['post']['requestBody']['content']['application/json'];

// User Management & Moderation module. These endpoints (GET /api/admin/users,
// GET /api/admin/users/:id, POST /api/admin/users/:id/delete, and the abuse
// review surface) shipped without openapi.yaml entries - the same state
// suspend/reinstate and every /api/admin/abuse/* route were already in - so
// these are hand-written to mirror adminController.js / abuseController.js
// rather than generated.
export type AccountStatus = 'active' | 'suspended' | 'banned' | 'deleted';

export interface UserListItem {
  id: string;
  email: string;
  fullName: string | null;
  status: AccountStatus;
  createdAt: string;
  countryCode: string | null;
  balance: number;
  riskScore: number | null;
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'reward' | 'purchase' | 'generation' | 'refund' | 'admin';
  description: string | null;
  createdAt: string;
}

export interface UserDetail {
  id: string;
  email: string;
  fullName: string | null;
  status: AccountStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  countryCode: string | null;
  balance: number;
  emailVerified: boolean;
  riskScore: number | null;
  riskFactors: Record<string, unknown> | null;
  riskComputedAt: string | null;
}

export interface UserDetailResponse {
  user: UserDetail;
  credits: {
    balance: number;
    recentTransactions: CreditTransaction[];
  };
}

export interface StatusChangeResult {
  id: string;
  email: string;
  status: AccountStatus;
  tokenVersion: number;
}

export type AbuseSeverity = 'low' | 'medium' | 'high';
export type AbuseReviewOutcome = 'confirmed' | 'false_positive' | 'ignored';

export interface AbuseFinding {
  id: string;
  userId: string | null;
  detector: string;
  severity: AbuseSeverity;
  evidence: Record<string, unknown>;
  originHash: string | null;
  action: 'flagged' | 'suspended';
  reviewedAt: string | null;
  reviewOutcome: AbuseReviewOutcome | null;
  windowStart: string;
  windowEnd: string;
  createdAt: string;
}

export interface AbuseFindingsResponse {
  findings: AbuseFinding[];
  autoSuspendEnabled: boolean;
}

export interface RiskUser {
  userId: string;
  score: number;
  factors: Record<string, unknown>;
  computedAt: string;
  email: string;
  status: AccountStatus;
  accountCreatedAt: string;
  countryCode: string | null;
}

export interface RiskUsersResponse {
  users: RiskUser[];
  note: string;
}

export interface UserSession {
  familyId: string;
  issuedAt: string;
  usedAt: string | null;
  originHash: string;
  deviceLabel: string | null;
}
