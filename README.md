# StyliAI — Admin Dashboard

Internal admin console for managing the StyliAI mobile app's style catalog and viewing platform analytics. Built with **React 18 + TypeScript**, bundled with **Vite**.

## Setup

### 1. Install Node.js
If you don't have Node installed, download it from [nodejs.org](https://nodejs.org/).

### 2. Install Dependencies
Open your terminal in this directory (`admin_dashboard`) and run:
```bash
npm install
```

### 3. Configure the environment
Create a `.env` file in this directory with:
```
VITE_API_BASE_URL=<your backend's base URL>
```

### 4. Run the Development Server
```bash
npm run dev
```
Open the provided local URL (typically `http://localhost:5173`) in your browser.

### 5. Build for Production
```bash
npm run build
```
Generates a production bundle in `dist/`, deployable to any static host.

---

### 6. Run the tests

```bash
npx vitest run --dir src   # 9 files / 69 tests
```

> Use `--dir src`. Bare `npm test` is not scoped to `src`, so on a checkout with linked worktrees under `.claude/worktrees/` it also collects duplicated copies of these same tests and reports a larger, machine-dependent number. Everything passes either way; only the count is affected.

---

## Features

*Pages live in `src/pages/`. This list was resynchronized against the code on 2026-08-04.*

### Analytics
Platform stats (total users, active users today, images generated, credits used, storage used), a daily-generation chart, and a recent-transactions table, from `GET /api/admin/stats`.

> **Status:** working. This endpoint was missing for a long stretch and earlier revisions of this README said so; it has since been implemented — `imagesGenerated` and `creditsUsed` are now derived from `wallet_transactions WHERE type = 'generation'`, as `DASHBOARD_FUNCTIONAL_PLAN.md` recommended.

### Generation Analytics
Per-generation event and feedback reporting, separate from the headline platform stats.

### Users by Country
User distribution by country over a selectable range, from `GET /api/admin/stats/countries`.

### User Credits
Look a user up by email, then apply a manual credit adjustment with a required reason and a confirmation step.

### Credit Packs
Manage the purchasable credit-pack catalog.

### Style Manager
- **Categories** — create, edit, delete, and drag-and-drop reorder.
- **Style presets** — create, edit, delete, and drag-and-drop reorder within a category; configure name, AI prompt, negative prompt, credit cost, cover image, and Trending / Premium / Enabled flags.
- **Search, filter, and sort** the catalog by name/prompt text, category, status (enabled / disabled / trending / premium), and credit cost.
- **Prompt Preview** — renders a style's final prompt with sample field values, via `POST /api/styles/prompt-preview`. Working.
- **Generation preview** — two providers. The **Stability** path (`POST /api/admin/ai/generate-preview`, prompt only) works. The **current-provider** path, which uploads a sample photo, still calls `POST /api/styles/preview` — an endpoint that **does not exist**, so that branch returns 404. Deliberately deferred; tracked as [`../IMPLEMENTATION_ROADMAP.md`](../IMPLEMENTATION_ROADMAP.md) Phase 5 item 5.10.

---

## Security notes

- **Every write endpoint is admin-gated server-side.** The dashboard attaches `Authorization: Bearer <token>` to every request; the backend verifies it against `ADMIN_JWT_SECRET` and enforces per-route roles (RBAC — SEC-15.4). The dashboard is **not** a trust boundary.
- **Admin MFA** (opt-in TOTP with recovery codes) and an **admin audit log** are live — SEC-15.2 and SEC-15.1.
- **The admin token is held in `localStorage`.** An XSS in this SPA would expose it. Tracked as SEC-15.3 and [`../IMPLEMENTATION_ROADMAP.md`](../IMPLEMENTATION_ROADMAP.md) Phase 2 item 2.4.
- `VITE_*` variables are **compiled into the bundle**. Never put a secret in `.env` here — `VITE_API_BASE_URL` is a URL, not a credential.

---

## Related documentation

| Document | Covers |
|---|---|
| [`../SYSTEM_ARCHITECTURE.md`](../SYSTEM_ARCHITECTURE.md) | System-wide architecture, data model, API inventory |
| [`../backend/README.md`](../backend/README.md) | The API this dashboard talks to |
| [`../DASHBOARD_AUDIT.md`](../DASHBOARD_AUDIT.md) | Full dashboard audit (2026-07-11 — partly superseded; see its banner) |
| [`../IMPLEMENTATION_ROADMAP.md`](../IMPLEMENTATION_ROADMAP.md) | Product roadmap; the phase/item numbers referenced above |
| [`../SECURITY_REPORT.md`](../SECURITY_REPORT.md) | Security audit — §15 is the admin/dashboard section |
| [`../SECURITY_FIXES.md`](../SECURITY_FIXES.md) | Current status of every security finding, with commits |
| [`../backend/docs/qa/QA_TEST_PLAN.md`](../backend/docs/qa/QA_TEST_PLAN.md) | Test strategy across all three repositories |
