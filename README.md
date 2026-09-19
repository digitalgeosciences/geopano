# GeoPano

Geological Panorama & Virtual Field Trip Platform for interactive 360° geological site exploration, spatial annotations, and pathway curation.

---

## 🚀 Development Server & Ports

> **Important**: The dev server runs on **port 8443** with base path **`/geopano/`**.

| Resource | URL |
| :--- | :--- |
| **Local Dev Server** | `http://localhost:8443/geopano/` |
| **Map View** | `http://localhost:8443/geopano/#/map` |
| **Stop Viewer (360°)** | `http://localhost:8443/geopano/#/stop/:pathId/:stopId` |
| **Library** | `http://localhost:8443/geopano/#/library` |

### Configuration (`vite.config.ts`)
- **Port**: `8443` (configurable via `process.env.PORT`)
- **Base path**: `/geopano/` (configurable via `process.env.BASE_PATH`)

---

## 🛠️ Commands

```bash
# Start development server on port 8443
npm run dev

# Run TypeScript typecheck without emitting files
npx tsc --noEmit

# Build production bundle to /dist
npm run build
```

---

## 🏗️ Architecture & Key Conventions

### 1. Hash-Based Routing
- Single Page Application with client hash routes:
  - `#/` — Landing Page
  - `#/map` — Interactive satellite/terrain map with paths and stops
  - `#/map/:pathId/:stopId` — Map focused on a specific path & stop
  - `#/stop/:pathId/:stopId` — 360° Pannellum viewer for stop panoramas
  - `#/library` — Filterable repository of all stops, paths, and annotations
  - `#/about`, `#/terms`, `#/privacy`, `#/signup` — Info & policy views

### 2. Viewport & Layout Mechanics
- **Full-Viewport Views (`map`, `stop`)**:
  - The root container in `App.tsx` adopts `height: 100dvh; display: flex; flex-direction: column; overflow: hidden;`.
  - `Header` is `flex-shrink: 0`.
  - The page content (`MapPage` / `StopViewer`) is `flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;`.
  - `PageFooter` is `flex-shrink: 0` docked at the bottom.
  - **Result**: Zero document scrollbars, guaranteeing the map/viewer and footer fit cleanly in the viewport across desktop and mobile.
- **Document-Flow Views (`landing`, `library`, `about`, `privacy`, `terms`)**:
  - Standard vertical scroll with `height: auto; overflow: visible;`.

### 3. Data Persistence
- Seed data resides in `src/data/pathsData.ts` and `src/data/db.json`.
- User-created paths, stops, and annotations are saved to browser `localStorage` and merged seamlessly at runtime.
- Support for GeoJSON import/export of spatial annotations.
