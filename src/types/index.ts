import type { components, paths } from './api-generated';

// Re-exported from the generated OpenAPI types (../../backend/openapi.yaml is
// the source of truth - see `npm run generate:api-types`) so these can't
// silently drift from what the backend actually returns.
export type UserModel = components['schemas']['AdminUser'];
export type CategoryModel = components['schemas']['Category'];
export type StyleModel = components['schemas']['Style'];
export type AdminStats = components['schemas']['AdminStats'];
export type AuthResponse = components['schemas']['AdminAuthResponse'];

// The POST /api/styles request body is intentionally its own shape (e.g.
// sortOrder is optional there, unlike on the StyleModel the API returns) -
// reusing StyleModel for the request would relax fields the backend actually
// requires on read.
export type StyleCreateInput =
  paths['/api/styles']['post']['requestBody']['content']['application/json'];
