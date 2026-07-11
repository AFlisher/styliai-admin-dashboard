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

## Features

### Analytics Tab
Displays platform stats (total users, active users today, images generated, credits used, storage used), a daily-generation chart, and a recent-transactions table.

> **Note:** this tab currently calls a backend endpoint that isn't wired up yet, so it will show an error until that work lands.

### Style Manager Tab
- **Categories** — create, edit, delete, and drag-and-drop reorder.
- **Style presets** — create, edit, delete, and drag-and-drop reorder within a category; configure name, AI prompt, negative prompt, credit cost, cover image, and Trending / Premium / Enabled flags.
- **Search, filter, and sort** the catalog by name/prompt text, category, status (enabled / disabled / trending / premium), and credit cost.
- **Prompt Preview** — intended to test a style's prompt against a sample photo before saving.

  > **Note:** this feature also calls a backend endpoint that isn't wired up yet.
