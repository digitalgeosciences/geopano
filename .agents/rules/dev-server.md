# Development Server & Port Guidelines

- **Dev Server Port**: `8443` (Vite is configured with `server: { port: 8443 }`).
- **Base Path**: `/geopano/` (Vite base is `/geopano/`).
- **Dev URL**: `http://localhost:8443/geopano/`.
- **Map View URL**: `http://localhost:8443/geopano/#/map`.
- **Stop View URL**: `http://localhost:8443/geopano/#/stop/{pathId}/{stopId}`.
- **Never guess or cycle ports 5173, 5174, 3000**: Always use `http://localhost:8443/geopano/`.
