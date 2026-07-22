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
