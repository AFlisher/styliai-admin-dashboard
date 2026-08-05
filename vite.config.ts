import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],

    // Sprint 3 / H-4: scope test discovery to this checkout's own source.
    //
    // Vitest's default glob walks the whole project root, and linked git
    // worktrees live under `.claude/worktrees/` - each one a complete copy of
    // `src/`, tests included. With three stale worktrees present, `npm test`
    // reported 28 files / 196 tests for a repository that contains 9 files /
    // 69 tests: every duplicate passing, the total meaningless, and the number
    // quietly dependent on how many branches someone happened to leave lying
    // around.
    //
    // That matters more now than it did before. A CI job is only a gate if its
    // result is deterministic, and a suite whose size depends on untracked
    // directories is not. It also means the local number and the CI number
    // finally agree - CI checks out a clean tree and always saw the honest 69.
    //
    // `backend/jest.config.js` carries the same restriction, added after this
    // exact bug bit there; this is the missing half of that fix.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
});
