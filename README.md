# Prombt — Admin Dashboard & Analytics Console

This directory contains the dynamic styling console and user analytics console for the **Prombt** mobile application, built with **React** and **TypeScript** (Vite).

## 🚀 How to Run Right Now (Zero Setup)

If you don't have Node.js/NPM installed on this machine, you can launch the dashboard immediately without any setup:
1. Double-click the **`index.html`** file located directly in `admin_dashboard/index.html`.
2. This is a fully functional standalone build using React from CDN, meaning it runs directly in your browser with zero installations.
3. You can manage presets, see user analytics graphs, and generate JSON configurations right away.

---

## 🛠️ Production Vite Project Setup (React + TypeScript)

To run this as a standard Node project or deploy it to a hosting service (like Vercel, Netlify, or your own server):

### 1. Install Node.js
If you don't have Node installed, download it from [nodejs.org](https://nodejs.org/).

### 2. Install Dependencies
Open your terminal in this directory (`admin_dashboard`) and run:
```bash
npm install
```

### 3. Run Development Server
Start the local server with hot-reloading:
```bash
npm run dev
```
Open the provided local URL (typically `http://localhost:5173`) in your browser.

### 4. Build for Production
To bundle the project for deployment:
```bash
npm run build
```
This generates a highly optimized production bundle inside the `dist/` directory, which can be uploaded to any static web host.

---

## 📊 Console Features

1. **Analytics Dashboard Tab**:
   - **Total Installs**: Count of users who installed the app.
   - **Active Users Today**: Real-time active users.
   - **Images Generated**: Visual bar chart tracking image generations.
   - **Subscription Revenue**: Details of premium paid subscriptions (Plan, Date, Amount).
2. **Styles Manager Tab**:
   - **Categories CRUD**: Create, select, or delete visual layout categories.
   - **Presets CRUD**: Add new style presets, input system prompts, upload preview images, and delete or mark items as "Trending".
   - **App Config Generator**: Copy the dynamically updated JSON configuration from the box at the bottom of the page and paste it straight into your app's configuration.
