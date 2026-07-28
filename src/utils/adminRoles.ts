import type { UserModel } from '../types';

/**
 * SEC-15.4: client-side view of the admin role tiers.
 *
 * PRESENTATIONAL ONLY. This decides which tabs to render; it decides nothing
 * about what is permitted. Every request is re-authorized server-side from the
 * JWT's `adminRole` claim (backend src/config/adminRoutePolicy.js), so editing
 * this file in a browser grants nothing - it only makes the panel show buttons
 * that will come back 403.
 *
 * The tiers are mirrored rather than fetched because they are a fixed part of
 * the API contract (openapi.yaml pins the same three values), and a hidden tab
 * is a worse failure than a stale one only if the two ever disagree - which the
 * shared enum prevents.
 */
export type AdminRole = 'viewer' | 'editor' | 'superadmin';

/**
 * Explicit levels, matching ROLE_LEVEL on the backend. Not string comparison:
 * 'viewer' > 'superadmin' is true lexicographically.
 */
const ROLE_LEVEL: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  superadmin: 3,
};

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLE_LEVEL, value);
}

/**
 * True when `actual` is at least as privileged as `required`.
 *
 * Fails closed on anything unrecognised - including the `undefined` carried by
 * a session restored from localStorage that predates SEC-15.4. Such a user sees
 * only the tabs available to nobody, which is the correct signal: their token
 * would be refused by every guarded route anyway, and re-logging in fixes it.
 */
export function roleSatisfies(actual: unknown, required: AdminRole): boolean {
  if (!isAdminRole(actual)) return false;
  return ROLE_LEVEL[actual] >= ROLE_LEVEL[required];
}

export function adminRoleOf(user: UserModel | null): AdminRole | undefined {
  const value = (user as { adminRole?: unknown } | null)?.adminRole;
  return isAdminRole(value) ? value : undefined;
}
