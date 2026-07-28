// SEC-15.4: the client-side tier comparison.
//
// This is presentational only - the server re-authorizes every request - but it
// still has to fail closed, or a stale session renders panels that fire a
// screenful of 403s.

import { describe, it, expect } from 'vitest';
import { roleSatisfies, adminRoleOf } from '../adminRoles';

describe('roleSatisfies', () => {
  it('lets each role satisfy its own tier', () => {
    expect(roleSatisfies('viewer', 'viewer')).toBe(true);
    expect(roleSatisfies('editor', 'editor')).toBe(true);
    expect(roleSatisfies('superadmin', 'superadmin')).toBe(true);
  });

  it('lets higher tiers satisfy lower ones', () => {
    expect(roleSatisfies('superadmin', 'editor')).toBe(true);
    expect(roleSatisfies('superadmin', 'viewer')).toBe(true);
    expect(roleSatisfies('editor', 'viewer')).toBe(true);
  });

  it('does not let lower tiers satisfy higher ones', () => {
    expect(roleSatisfies('viewer', 'editor')).toBe(false);
    expect(roleSatisfies('viewer', 'superadmin')).toBe(false);
    expect(roleSatisfies('editor', 'superadmin')).toBe(false);
  });

  it('compares by level, not by string ordering', () => {
    // The accident an ordering-based implementation would make.
    expect('viewer' > 'superadmin').toBe(true);
    expect(roleSatisfies('viewer', 'superadmin')).toBe(false);
  });

  it.each([
    ['undefined (session predates SEC-15.4)', undefined],
    ['null', null],
    ['empty string', ''],
    ['a misspelling', 'supperadmin'],
    ['wrong casing', 'SuperAdmin'],
    ['a number', 3],
    ['an object', {}],
    ['an array', ['superadmin']],
    ['a prototype key', 'constructor'],
    ['toString', 'toString'],
  ])('fails closed on %s', (_label, actual) => {
    expect(roleSatisfies(actual, 'viewer')).toBe(false);
  });
});

describe('adminRoleOf', () => {
  it('reads a valid role off the user', () => {
    expect(adminRoleOf({ adminRole: 'editor' } as never)).toBe('editor');
  });

  it.each([
    ['null user', null],
    ['no adminRole', {}],
    ['an invalid role', { adminRole: 'root' }],
    ['a non-string role', { adminRole: 7 }],
  ])('returns undefined for %s', (_label, user) => {
    expect(adminRoleOf(user as never)).toBeUndefined();
  });
});
