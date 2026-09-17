import db from "./db.json";
import type { Path, Stop } from "../types";

const STORAGE_KEY = "geopano_custom_paths";
const SESSION_PANORAMAS_KEY = "geopano_session_panos";

// In-memory cache of object URLs or data URLs for 360 panoramas created this session
const panoramaMemoryMap = new Map<string, string>();

export function registerPanoramaUrl(stopId: string, url: string): void {
  panoramaMemoryMap.set(stopId, url);
  try {
    const raw = sessionStorage.getItem(SESSION_PANORAMAS_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[stopId] = url;
    sessionStorage.setItem(SESSION_PANORAMAS_KEY, JSON.stringify(existing));
  } catch {
    /* storage quota or privacy mode */
  }
}

export function getResolvedPanorama(stop: Stop): string {
  if (panoramaMemoryMap.has(stop.id)) {
    return panoramaMemoryMap.get(stop.id)!;
  }
  try {
    const raw = sessionStorage.getItem(SESSION_PANORAMAS_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      if (map[stop.id]) return map[stop.id];
    }
  } catch {
    /* ignore */
  }
  return stop.panorama || "/uploads/sp00009.jpg";
}

export function getCustomPaths(): Path[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

export function getAllPaths(): Path[] {
  const dbPaths = (db.paths as unknown as Path[]) || [];
  const custom = getCustomPaths();

  // Create combined map, starting with dbPaths
  const map = new Map<string, Path>();
  for (const p of dbPaths) {
    map.set(p.id, { ...p, stops: [...p.stops] });
  }

  // Merge custom paths
  for (const cp of custom) {
    if (map.has(cp.id)) {
      const existing = map.get(cp.id)!;
      // Merge stops without duplicates
      const stopMap = new Map<string, Stop>();
      for (const s of existing.stops) stopMap.set(s.id, s);
      for (const s of cp.stops) stopMap.set(s.id, s);
      map.set(cp.id, {
        ...existing,
        ...cp,
        stops: Array.from(stopMap.values()),
      });
    } else {
      map.set(cp.id, cp);
    }
  }

  return Array.from(map.values());
}

export function saveCustomPath(path: Path): void {
  const custom = getCustomPaths();
  const idx = custom.findIndex((p) => p.id === path.id);
  if (idx >= 0) {
    custom[idx] = path;
  } else {
    custom.push(path);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch (err) {
    console.warn("Could not persist custom paths to localStorage:", err);
  }
  window.dispatchEvent(new CustomEvent("geopano-paths-changed"));
}

export function addStopToPath(pathId: string, stop: Stop): Path {
  const all = getAllPaths();
  const existing = all.find((p) => p.id === pathId);
  if (!existing) {
    return createStandaloneStop(stop);
  }

  const updatedPath: Path = {
    ...existing,
    stops: [...existing.stops.filter((s) => s.id !== stop.id), stop],
  };
  saveCustomPath(updatedPath);
  return updatedPath;
}

export function createStandaloneStop(stop: Stop, locationName?: string): Path {
  const pathId = `${stop.id}-path`;
  const path: Path = {
    id: pathId,
    name: stop.title,
    city: locationName || "Custom Outcrop",
    bg: "linear-gradient(165deg,#14504A,#C9F24D)",
    stops: [stop],
  };
  saveCustomPath(path);
  return path;
}

export function createNewPathWithStop(pathName: string, city: string, stop?: Stop): Path {
  const pathId = `pt_${Date.now()}`;
  const path: Path = {
    id: pathId,
    name: pathName.trim(),
    city: city.trim() || "Saudi Arabia",
    bg: "linear-gradient(165deg,#0B0F0E,#3E4744)",
    stops: stop ? [stop] : [],
  };
  saveCustomPath(path);
  return path;
}
