import { useEffect, useRef, useState } from "react";
import { View } from "../types";
import { getAllPaths, getResolvedPanorama } from "../data/pathsData";
import { useIsMobile } from "../hooks/useWindowWidth";
import PageFooter from "../components/PageFooter";

const paths = getAllPaths();
// ── types ────────────────────────────────────────────────────────────────────

interface SpherePoint { yaw: number; pitch: number; }

interface LocalAnnotation {
  id: string;
  kind: "point" | "line" | "polygon";
  subType?: string;
  pts: SpherePoint[];
  points?: SpherePoint[];
  title: string;
  body: string;
  note?: string;
  added?: string;
  refLink?: string;
  refLabel?: string;
  tags?: string[];
  color?: string;
}

interface AnnForm {
  title: string;
  note: string;
  refLink: string;
  refLabel: string;
  tags: string;
  color: string;
  subType: string;
}

interface Props {
  pathId: string;
  stopId: string;
  onNav: (v: View) => void;
  onSelectStop: (pathId: string, stopId: string, yaw?: number, pitch?: number) => void;
  initialYaw?: number;
  initialPitch?: number;
  initialAnnId?: string;
}

// ── SVG geometry path generators ─────────────────────────────────────────────

function generateWavyPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const waves = Math.max(2, Math.round(len / 18));
    const step = len / waves;
    const amp = 5.5;
    for (let w = 0; w < waves; w++) {
      const t0 = w * step;
      const t1 = (w + 1) * step;
      const tMid = t0 + step * 0.5;
      const sign = w % 2 === 0 ? 1 : -1;
      const cX = p1.x + ux * tMid + nx * (amp * sign);
      const cY = p1.y + uy * tMid + ny * (amp * sign);
      const endX = p1.x + ux * t1;
      const endY = p1.y + uy * t1;
      d += ` Q${cX.toFixed(1)},${cY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;
    }
  }
  return d;
}

function generateZigzagPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const zigs = Math.max(3, Math.round(len / 14));
    const amp = 6;
    for (let k = 1; k < zigs; k++) {
      const frac = k / zigs;
      const sign = k % 2 === 1 ? 1 : -1;
      const zX = p1.x + ux * (frac * len) + nx * (amp * sign);
      const zY = p1.y + uy * (frac * len) + ny * (amp * sign);
      d += ` L${zX.toFixed(1)},${zY.toFixed(1)}`;
    }
    d += ` L${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function getArrowhead(pts: { x: number; y: number }[]): { endTriangle?: string } {
  if (pts.length < 2) return {};
  const pEnd = pts[pts.length - 1];
  const pPrev = pts[pts.length - 2];
  const dxEnd = pEnd.x - pPrev.x;
  const dyEnd = pEnd.y - pPrev.y;
  const lenEnd = Math.hypot(dxEnd, dyEnd);
  let endTriangle: string | undefined;
  if (lenEnd > 2) {
    const ux = dxEnd / lenEnd;
    const uy = dyEnd / lenEnd;
    const nx = -uy;
    const ny = ux;
    const tipX = pEnd.x;
    const tipY = pEnd.y;
    const b1X = tipX - ux * 8 + nx * 3.8;
    const b1Y = tipY - uy * 8 + ny * 3.8;
    const b2X = tipX - ux * 8 - nx * 3.8;
    const b2Y = tipY - uy * 8 - ny * 3.8;
    endTriangle = `${tipX.toFixed(1)},${tipY.toFixed(1)} ${b1X.toFixed(1)},${b1Y.toFixed(1)} ${b2X.toFixed(1)},${b2Y.toFixed(1)}`;
  }
  return { endTriangle };
}

// ── GeoJSON export helper ───────────────────────────────────────────────────

function exportAnnotationsGeoJSON(pathId: string, stopId: string, anns: LocalAnnotation[]) {
  const features = anns.map((ann, idx) => {
    const pts = ann.points || ann.pts || [];
    let geometry: Record<string, unknown>;
    if (ann.kind === "point") {
      const p = pts[0] || { yaw: 0, pitch: 0 };
      geometry = { type: "Point", coordinates: [Number(p.yaw.toFixed(3)), Number(p.pitch.toFixed(3))] };
    } else if (ann.kind === "line") {
      geometry = { type: "LineString", coordinates: pts.map((p) => [Number(p.yaw.toFixed(3)), Number(p.pitch.toFixed(3))]) };
    } else {
      const ring = pts.map((p) => [Number(p.yaw.toFixed(3)), Number(p.pitch.toFixed(3))]);
      if (pts.length > 0) {
        ring.push([Number(pts[0].yaw.toFixed(3)), Number(pts[0].pitch.toFixed(3))]);
      }
      geometry = { type: "Polygon", coordinates: [ring] };
    }
    const safeId = ann.id || `ann_${idx + 1}`;
    return {
      type: "Feature",
      id: safeId,
      properties: {
        id: safeId,
        title: ann.title || "",
        kind: ann.kind,
        subType: ann.subType || (ann.kind === "point" ? "filled" : ann.kind === "line" ? "solid" : "outline"),
        color: ann.color || "#C9F24D",
        body: ann.body || ann.note || "",
        note: ann.note || ann.body || "",
        refLink: ann.refLink || "",
        refLabel: ann.refLabel || "",
        tags: ann.tags || [],
        added: ann.added || new Date().toISOString().split("T")[0],
        pathId,
        stopId,
      },
      geometry,
    };
  });

  const collection = {
    type: "FeatureCollection",
    name: `geopano_${pathId}_${stopId}_annotations`,
    features,
  };

  const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pathId}_${stopId}_annotations.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── bearing helper ────────────────────────────────────────────────────────────

function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const toDeg = (r: number) => r * 180 / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
}

// ── 3-D vector helpers ────────────────────────────────────────────────────────

function cross3(a: number[], b: number[]): number[] {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function dot3(a: number[], b: number[]): number { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function norm3(a: number[]): number[] { const l = Math.sqrt(dot3(a,a)); return l < 1e-9 ? a : a.map(v=>v/l); }

// Sphere yaw/pitch → unit direction vector
// Pannellum: yaw 0 = forward (+Z), yaw 90 = right (+X), pitch up = +Y
function sphereToDir(yawDeg: number, pitchDeg: number): number[] {
  const y = yawDeg * Math.PI / 180;
  const p = pitchDeg * Math.PI / 180;
  return [Math.cos(p)*Math.sin(y), Math.sin(p), Math.cos(p)*Math.cos(y)];
}

// Camera basis from view yaw/pitch
function cameraBasis(vy: number, vp: number): { fwd: number[]; right: number[]; up: number[] } {
  const fwd = sphereToDir(vy, vp);
  const worldUp = [0, 1, 0];
  const right = norm3(cross3(worldUp, fwd));
  const up = cross3(fwd, right);
  return { fwd, right, up };
}

// ── projection helpers ────────────────────────────────────────────────────────

function pixelToSphere(px: number, py: number, w: number, h: number, vy: number, vp: number, hfov: number): SpherePoint {
  const f = (w / 2) / Math.tan(hfov * Math.PI / 360);
  const { fwd, right, up } = cameraBasis(vy, vp);
  const dx = (px - w / 2) / f;
  const dy = -(py - h / 2) / f;
  const dir = [fwd[0]+dx*right[0]+dy*up[0], fwd[1]+dx*right[1]+dy*up[1], fwd[2]+dx*right[2]+dy*up[2]];
  const pitch = Math.asin(Math.max(-1, Math.min(1, dir[1] / Math.sqrt(dot3(dir,dir))))) * 180 / Math.PI;
  const yaw = Math.atan2(dir[0], dir[2]) * 180 / Math.PI;
  return { yaw: ((yaw % 360) + 360) % 360, pitch: Math.max(-90, Math.min(90, pitch)) };
}

function sphereToScreen(sy: number, sp: number, w: number, h: number, vy: number, vp: number, hfov: number): { x: number; y: number } | null {
  if (w === 0 || h === 0) return null;
  const f = (w / 2) / Math.tan(hfov * Math.PI / 360);
  const { fwd, right, up } = cameraBasis(vy, vp);
  const ann = sphereToDir(sy, sp);
  const dotF = dot3(ann, fwd);
  if (dotF <= 0.01) return null; // behind or on the horizon
  const x = f * dot3(ann, right) / dotF + w / 2;
  const y = -f * dot3(ann, up) / dotF + h / 2;
  if (x < -w || x > 2*w || y < -h || y > 2*h) return null;
  return { x, y };
}

// ── storage ───────────────────────────────────────────────────────────────────

function storageKey(pathId: string, stopId: string) {
  return `geopano_ann_${pathId}_${stopId}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadAnns(pathId: string, stopId: string, dbAnns: any[]): LocalAnnotation[] {
  try {
    const raw = localStorage.getItem(storageKey(pathId, stopId));
    if (raw) {
      const parsed = JSON.parse(raw);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.map((a: any) => ({
        ...a,
        subType: a.subType || (a.kind === "point" ? "filled" : a.kind === "line" ? "solid" : "outline"),
      }));
    }
  } catch { /* ignore */ }
  // Seed from db.json on first visit
  return dbAnns.map((a, i) => ({
    id: `db_${i}`,
    kind: a.kind as "point" | "line" | "polygon",
    subType: a.subType || (a.kind === "point" ? "filled" : a.kind === "line" ? "solid" : "outline"),
    pts: [{ yaw: a.yaw as number, pitch: a.pitch as number }],
    title: a.title as string,
    body: (a.body as string) || "",
    refLink: a.refLink || "",
    refLabel: a.refLabel || "",
    tags: a.tags || [],
    color: a.color || "#C9F24D",
  }));
}

function persistAnns(pathId: string, stopId: string, anns: LocalAnnotation[]) {
  localStorage.setItem(storageKey(pathId, stopId), JSON.stringify(anns));
}

// ── nav arrow storage ─────────────────────────────────────────────────────────

interface NavArrowConfig {
  nextArrow?: { yaw: number; pitch: number };
  prevArrow?: { yaw: number; pitch: number };
}

function navStorageKey(pathId: string, stopId: string) {
  return `geopano_nav_${pathId}_${stopId}`;
}

function loadNavArrows(pathId: string, stopId: string): NavArrowConfig {
  try {
    const raw = localStorage.getItem(navStorageKey(pathId, stopId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function persistNavArrows(pathId: string, stopId: string, config: NavArrowConfig) {
  localStorage.setItem(navStorageKey(pathId, stopId), JSON.stringify(config));
}

// ── component ─────────────────────────────────────────────────────────────────

export default function StopViewer({ pathId, stopId, onNav, onSelectStop, initialYaw, initialPitch, initialAnnId }: Props) {
  const isMobile = useIsMobile(640);
  const [webglError, setWebglError] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [annShareCopied, setAnnShareCopied] = useState<string | null>(null);
  const [isTitleCollapsed, setIsTitleCollapsed] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<{ destroy: () => void; getYaw: () => number; getPitch: () => number; getHfov: () => number; startAutoRotate: (speed: number) => void; stopAutoRotate: () => void } | null>(null);

  // view state (updated at ~30 fps for SVG projection)
  const [vs, setVs] = useState({ yaw: 0, pitch: 0, hfov: 90, w: 0, h: 0 });

  // loading state
  const [panoLoaded, setPanoLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // panels
  const [annListOpen, setAnnListOpen] = useState(false);
  const [pathPanelOpen, setPathPanelOpen] = useState(false);
  const [openAnnId, setOpenAnnId] = useState<string | null>(null);

  // Compass menu state and North calibration
  const [compassMenuOpen, setCompassMenuOpen] = useState(false);
  const [northHeading, setNorthHeading] = useState<number>(() => {
    const saved = localStorage.getItem(`geopano_north_${stopId}`);
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`geopano_north_${stopId}`);
    setNorthHeading(saved ? parseFloat(saved) : 0);
  }, [stopId]);

  // add-annotation flow
  const [addAnnMode, setAddAnnMode] = useState(false);
  const [addAnnKind, setAddAnnKind] = useState<"point" | "line" | "polygon">("point");
  const [draftPts, setDraftPts] = useState<SpherePoint[]>([]);
  const [cursorSphere, setCursorSphere] = useState<SpherePoint | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [annForm, setAnnForm] = useState<AnnForm>({
    title: "",
    note: "",
    refLink: "",
    refLabel: "",
    tags: "",
    color: "#C9F24D",
    subType: "filled",
  });

  const curPath = paths.find((p) => p.id === pathId) || paths[0];
  const stopIdx = curPath.stops.findIndex((s) => s.id === stopId);
  const curStop = curPath.stops[stopIdx] || curPath.stops[0];
  const panoramaUrl = getResolvedPanorama(curStop);
  // Derive preview URL from panorama URL
  const previewUrl = panoramaUrl.replace('/uploads/', '/uploads/preview/');

  const [localAnns, setLocalAnns] = useState<LocalAnnotation[]>(() =>
    loadAnns(pathId, stopId, curStop.annotations)
  );

  const [arrowConfig, setArrowConfig] = useState<NavArrowConfig>(() =>
    loadNavArrows(pathId, stopId)
  );

  // Reload annotations and nav arrows when stop changes
  useEffect(() => {
    setLocalAnns(loadAnns(pathId, stopId, curStop.annotations));
    setArrowConfig(loadNavArrows(pathId, stopId));
    setOpenAnnId(initialAnnId ?? null);
    resetAddAnn();
  }, [pathId, stopId]);

  // Auto-focus camera on initialAnnId if specified
  useEffect(() => {
    if (!initialAnnId) return;
    setOpenAnnId(initialAnnId);
    const ann = localAnns.find((a) => a.id === initialAnnId);
    if (ann && pannellumRef.current) {
      const pts = ann.points || ann.pts || [];
      if (pts.length > 0) {
        const avgYaw = pts.reduce((sum, p) => sum + p.yaw, 0) / pts.length;
        const avgPitch = pts.reduce((sum, p) => sum + p.pitch, 0) / pts.length;
        lookAt(avgPitch, avgYaw, 72);
      }
    }
  }, [initialAnnId, localAnns]);

  // Compute navigation arrows — use stored config or fall back to bearing
  const navArrows: { stopId: string; title: string; yaw: number; pitch: number; isNext: boolean }[] = [];
  if (curPath.stops.length > 1) {
    if (stopIdx < curPath.stops.length - 1) {
      const next = curPath.stops[stopIdx + 1];
      const cfg = arrowConfig.nextArrow;
      navArrows.push({
        stopId: next.id, title: next.title,
        yaw: cfg?.yaw ?? bearingBetween(curStop.ll[0], curStop.ll[1], next.ll[0], next.ll[1]),
        pitch: cfg?.pitch ?? -10, isNext: true,
      });
    }
    if (stopIdx > 0) {
      const prev = curPath.stops[stopIdx - 1];
      const cfg = arrowConfig.prevArrow;
      navArrows.push({
        stopId: prev.id, title: prev.title,
        yaw: cfg?.yaw ?? bearingBetween(curStop.ll[0], curStop.ll[1], prev.ll[0], prev.ll[1]),
        pitch: cfg?.pitch ?? -10, isNext: false,
      });
    }
  }

  const anyPanelOpen = annListOpen || pathPanelOpen || !!openAnnId || addAnnMode || formVisible;

  // Pannellum init with Progressive Loading (Google Street View approach)
  useEffect(() => {
    if (!viewerRef.current || !window.pannellum) return;
    setPanoLoaded(false);
    setLoadProgress(15);

    const isCarStop = curStop.id.startsWith("sp0000") && parseInt(curStop.id.slice(2)) <= 4;
    const startYaw = initialYaw ?? curStop.defaultYaw ?? (isCarStop ? 85 : 0);
    const startPitch = initialPitch ?? curStop.defaultPitch ?? (isCarStop ? 14 : 0);
    const startHfov = 72; // Natural, focused perspective (not wide fish-eye)

    const hasPreview = Boolean(previewUrl && previewUrl !== panoramaUrl);

    // Multi-scene progressive config: instant low-res preview -> background high-res upgrade
    const pannellumConfig: Record<string, unknown> = hasPreview
      ? {
          default: {
            firstScene: "preview",
            autoLoad: true,
            showControls: false,
            showZoomCtrl: false,
            showFullscreenCtrl: false,
            autoRotate: 0,
            autoRotateInactivityDelay: -1,
            compass: false,
            hfov: startHfov,
            minHfov: 40,
            maxHfov: 85,
            minPitch: isCarStop ? -35 : -85,
            maxPitch: isCarStop ? 75 : 85,
            yaw: startYaw,
            pitch: startPitch,
            hotSpots: [],
            strings: { loadingLabel: "" },
          },
          scenes: {
            preview: {
              type: "equirectangular",
              panorama: previewUrl,
            },
            hires: {
              type: "equirectangular",
              panorama: panoramaUrl,
            },
          },
        }
      : {
          type: "equirectangular",
          panorama: panoramaUrl,
          autoLoad: true,
          showControls: false,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          autoRotate: 0,
          autoRotateInactivityDelay: -1,
          compass: false,
          hfov: startHfov,
          minHfov: 40,
          maxHfov: 85,
          minPitch: isCarStop ? -35 : -85,
          maxPitch: isCarStop ? 75 : 85,
          yaw: startYaw,
          pitch: startPitch,
          hotSpots: [],
          strings: { loadingLabel: "" },
        };

    if (viewerRef.current) {
      const oldCanvases = viewerRef.current.querySelectorAll("canvas");
      oldCanvases.forEach((c) => {
        try {
          const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
          if (gl) {
            const ext = gl.getExtension("WEBGL_lose_context");
            if (ext) ext.loseContext();
          }
        } catch { /* ignore */ }
      });
      viewerRef.current.innerHTML = "";
    }

    let viewer: any = null;
    try {
      viewer = window.pannellum.viewer(viewerRef.current, pannellumConfig);
      pannellumRef.current = viewer;
      setWebglError(false);
    } catch (err) {
      console.error("Failed to initialize Pannellum WebGL viewer:", err);
      setWebglError(true);
      return;
    }

    let destroyed = false;
    let progressTimer: ReturnType<typeof setInterval> | null = null;

    // Progressive background loader for high-resolution texture
    if (hasPreview) {
      setLoadProgress(30);
      progressTimer = setInterval(() => {
        setLoadProgress((p) => (p < 90 ? p + 8 : p));
      }, 250);

      const highResImg = new Image();
      highResImg.src = panoramaUrl;
      highResImg.onload = () => {
        if (destroyed) return;
        if (progressTimer) clearInterval(progressTimer);
        try {
          const v = pannellumRef.current as any;
          if (v && typeof v.loadScene === "function") {
            // Seamlessly upgrade to high-resolution scene without jumping view
            v.loadScene("hires", v.getPitch(), v.getYaw(), v.getHfov());
          }
          setPanoLoaded(true);
          setLoadProgress(100);
        } catch {
          setPanoLoaded(true);
        }
      };
      highResImg.onerror = () => {
        if (progressTimer) clearInterval(progressTimer);
        setPanoLoaded(true);
      };
    } else {
      setPanoLoaded(true);
      setLoadProgress(100);
    }

    const id = window.setInterval(() => {
      try {
        const el = viewerRef.current;
        if (viewer && typeof viewer.getYaw === "function") {
          setVs({
            yaw: viewer.getYaw(),
            pitch: viewer.getPitch(),
            hfov: viewer.getHfov(),
            w: el?.clientWidth ?? 0,
            h: el?.clientHeight ?? 0,
          });
        }
      } catch { /* destroyed */ }
    }, 33);

    return () => {
      destroyed = true;
      clearInterval(id);
      if (progressTimer) clearInterval(progressTimer);
      try { viewer?.destroy(); } catch { /* */ }
      if (viewerRef.current) {
        const oldCanvases = viewerRef.current.querySelectorAll("canvas");
        oldCanvases.forEach((c) => {
          try {
            const gl = (c.getContext("webgl") || c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
            if (gl) {
              const ext = gl.getExtension("WEBGL_lose_context");
              if (ext) ext.loseContext();
            }
          } catch { /* ignore */ }
        });
        viewerRef.current.innerHTML = "";
      }
      pannellumRef.current = null;
    };
  }, [panoramaUrl, previewUrl, pathId, stopId]);

  // Sync view orientation when initialYaw/initialPitch changes
  useEffect(() => {
    const v = pannellumRef.current;
    if (!v) return;
    if (initialYaw !== undefined) {
      try { (v as any).setYaw(initialYaw); } catch { /* */ }
    }
    if (initialPitch !== undefined) {
      try { (v as any).setPitch(initialPitch); } catch { /* */ }
    }
  }, [initialYaw, initialPitch]);

  // Always keep auto-rotation stopped
  useEffect(() => {
    const v = pannellumRef.current;
    if (!v) return;
    try { v.stopAutoRotate(); } catch { /* viewer may be mid-init */ }
  }, [anyPanelOpen, addAnnMode]);

  function lookAt(pitch: number, yaw: number, hfov?: number) {
    const v = pannellumRef.current as any;
    if (!v) return;
    try {
      if (typeof v.lookAt === "function") {
        v.lookAt(pitch, yaw, hfov ?? v.getHfov?.() ?? 90, 800);
      } else {
        if (typeof v.setYaw === "function") v.setYaw(yaw);
        if (typeof v.setPitch === "function") v.setPitch(pitch);
      }
    } catch {
      try {
        if (typeof v.setYaw === "function") v.setYaw(yaw);
        if (typeof v.setPitch === "function") v.setPitch(pitch);
      } catch {}
    }
  }

  // ── annotation placement ──────────────────────────────────────────────────

  function handleCaptureClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!addAnnMode || formVisible) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sp = pixelToSphere(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, vs.yaw, vs.pitch, vs.hfov);
    if (addAnnKind === "point") {
      setDraftPts([sp]);
      setFormVisible(true);
    } else {
      setDraftPts((prev) => [...prev, sp]);
    }
  }

  function handleCaptureMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!addAnnMode || formVisible) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorSphere(pixelToSphere(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, vs.yaw, vs.pitch, vs.hfov));
  }

  function handleFinishDraft() {
    const min = addAnnKind === "polygon" ? 3 : 2;
    if (draftPts.length >= min) setFormVisible(true);
  }

  function startEditAnn(ann: LocalAnnotation) {
    setEditingAnnId(ann.id);
    setAddAnnKind(ann.kind);
    const existingPts = ann.pts || ann.points || [];
    setDraftPts(existingPts);
    setAnnForm({
      title: ann.title || "",
      note: ann.note || ann.body || "",
      refLink: ann.refLink || "",
      refLabel: ann.refLabel || "",
      tags: (ann.tags || []).join(", "),
      color: ann.color || "#C9F24D",
      subType: ann.subType || (ann.kind === "point" ? "filled" : ann.kind === "line" ? "solid" : "outline"),
    });
    setFormVisible(true);
    setAddAnnMode(false);
    setOpenAnnId(null);
    setAnnListOpen(false);
  }

  function handleDeleteAnn(annId: string) {
    if (window.confirm("Are you sure you want to delete this annotation?")) {
      const next = localAnns.filter((a) => a.id !== annId);
      setLocalAnns(next);
      persistAnns(pathId, stopId, next);
      if (openAnnId === annId) {
        setOpenAnnId(null);
      }
      if (editingAnnId === annId) {
        resetAddAnn();
      }
    }
  }

  function handleSave() {
    if (!annForm.title.trim()) return;
    if (editingAnnId) {
      const next = localAnns.map((a) => {
        if (a.id === editingAnnId) {
          return {
            ...a,
            pts: draftPts.length > 0 ? draftPts : a.pts,
            points: draftPts.length > 0 ? draftPts : a.points,
            title: annForm.title.trim(),
            body: annForm.note.trim(),
            note: annForm.note.trim(),
            refLink: annForm.refLink.trim(),
            refLabel: annForm.refLabel.trim(),
            tags: annForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
            color: annForm.color,
            subType: annForm.subType,
          };
        }
        return a;
      });
      setLocalAnns(next);
      persistAnns(pathId, stopId, next);
      setOpenAnnId(editingAnnId);
      resetAddAnn();
    } else {
      if (draftPts.length === 0) return;
      const ann: LocalAnnotation = {
        id: Date.now().toString(),
        kind: addAnnKind,
        subType: annForm.subType,
        pts: draftPts,
        points: draftPts,
        title: annForm.title.trim(),
        body: annForm.note.trim(),
        note: annForm.note.trim(),
        refLink: annForm.refLink.trim(),
        refLabel: annForm.refLabel.trim(),
        tags: annForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        color: annForm.color,
        added: new Date().toISOString().split("T")[0],
      };
      const next = [...localAnns, ann];
      setLocalAnns(next);
      persistAnns(pathId, stopId, next);
      setOpenAnnId(ann.id);
      resetAddAnn();
    }
  }

  function resetAddAnn() {
    setAddAnnMode(false);
    setEditingAnnId(null);
    setDraftPts([]);
    setFormVisible(false);
    setCursorSphere(null);
    setAnnForm({
      title: "",
      note: "",
      refLink: "",
      refLabel: "",
      tags: "",
      color: "#C9F24D",
      subType: "filled",
    });
  }

  // ── navigation ────────────────────────────────────────────────────────────

  function goToStop(sid: string, targetYaw?: number, targetPitch?: number) {
    setOpenAnnId(null);
    onSelectStop(curPath.id, sid, targetYaw, targetPitch);
  }

  function shareView() {
    const url = `${window.location.origin}${window.location.pathname}#/stop/${pathId}/${stopId}?yaw=${vs.yaw.toFixed(1)}&pitch=${vs.pitch.toFixed(1)}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {});
  }

  function shareAnnotation(annId: string) {
    const targetAnn = localAnns.find((a) => a.id === annId);
    let extraYaw: number | undefined;
    let extraPitch: number | undefined;
    if (targetAnn) {
      const pts = targetAnn.points || targetAnn.pts || [];
      if (pts.length > 0) {
        extraYaw = pts.reduce((sum, p) => sum + p.yaw, 0) / pts.length;
        extraPitch = pts.reduce((sum, p) => sum + p.pitch, 0) / pts.length;
      }
    }
    const qs = (extraYaw !== undefined && extraPitch !== undefined)
      ? `?yaw=${extraYaw.toFixed(1)}&pitch=${extraPitch.toFixed(1)}`
      : "";
    const url = `${window.location.origin}${window.location.pathname}#/stop/${pathId}/${stopId}/ann/${annId}${qs}`;
    navigator.clipboard.writeText(url).then(() => {
      setAnnShareCopied(annId);
      setTimeout(() => setAnnShareCopied(null), 2500);
    }).catch(() => {});
  }

  // ── SVG helpers ───────────────────────────────────────────────────────────

  function project(pts: SpherePoint[]) {
    return pts
      .map((p) => sphereToScreen(p.yaw, p.pitch, vs.w, vs.h, vs.yaw, vs.pitch, vs.hfov))
      .filter(Boolean) as { x: number; y: number }[];
  }

  const draftScreen = project(draftPts);
  const cursorScreen = cursorSphere
    ? sphereToScreen(cursorSphere.yaw, cursorSphere.pitch, vs.w, vs.h, vs.yaw, vs.pitch, vs.hfov)
    : null;

  // ── styles ────────────────────────────────────────────────────────────────

  const railBtn = (on: boolean): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer",
    boxShadow: "0 8px 20px -14px rgba(11,15,14,.7)",
    border: on ? "1px solid #0B0F0E" : "1px solid rgba(11,15,14,.2)",
    background: on ? "#C9F24D" : "#FFFDF8",
    color: on ? "#0B0F0E" : "#3E4744",
    transition: "background .2s, border .2s",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(11,15,14,.18)", background: "#F7F6F1",
    fontFamily: "'Instrument Sans',sans-serif", fontSize: 14,
    color: "#0B0F0E", outline: "none", boxSizing: "border-box",
  };

  const openAnn = localAnns.find((a) => a.id === openAnnId);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, height: "100%", background: "#0B0F0E", overflow: "hidden" }}>
      <main
        className="gp-viewer-main"
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflow: "hidden",
          background: "#0B0F0E",
          touchAction: "none",
        }}
      >
        {/* Pannellum */}
        <div ref={viewerRef} style={{ position: "absolute", inset: 0, zIndex: 1, touchAction: "none" }} />

        {/* WebGL Error fallback banner if browser WebGL failed */}
        {webglError && (
          <div style={{ position: "absolute", inset: 0, zIndex: 15, display: "flex", alignItems: "center", justifyContent: "center", background: "#0B0F0E", color: "#FFFDF8", padding: 20 }}>
            <div style={{ maxWidth: 420, width: "100%", background: "#151B19", border: "1.5px solid rgba(255,253,248,.16)", borderRadius: 18, padding: "26px 22px", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,.7)" }}>
              <div style={{ width: 46, height: 46, borderRadius: 999, background: "rgba(239,68,68,.15)", border: "1.5px solid #EF4444", color: "#EF4444", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 22, fontWeight: 700 }}>!</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px", color: "#FFFDF8", fontFamily: "'Bricolage Grotesque',sans-serif" }}>Hardware Acceleration Needed</h2>
              <p style={{ fontSize: 13, color: "#9AA39E", lineHeight: 1.55, margin: "0 0 16px" }}>
                Your browser needs hardware acceleration enabled to render WebGL 360° panoramas smoothly:
              </p>
              <div style={{ textAlign: "left", fontSize: 12, color: "#D1D5DB", background: "rgba(255,255,255,.05)", padding: "12px 14px", borderRadius: 10, marginBottom: 18, lineHeight: 1.8, fontFamily: "'Instrument Sans',sans-serif" }}>
                1. Open browser <b>Settings → System</b><br/>
                2. Turn <b>ON</b> "Use graphics acceleration when available"<br/>
                3. Click <b>Relaunch</b> or refresh this tab
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{ width: "100%", padding: "11px 0", borderRadius: 10, background: "#C9F24D", border: "1px solid #0B0F0E", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#0B0F0E", fontFamily: "'Instrument Sans',sans-serif" }}
              >
                ↻ Reload Page
              </button>
            </div>
          </div>
        )}

      {/* Loading progress bar */}
      {!panoLoaded && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 30, height: 3, background: "rgba(11,15,14,.5)" }}>
          <div style={{
            height: "100%",
            width: `${loadProgress}%`,
            background: "linear-gradient(90deg, #C9F24D, #A0D911)",
            borderRadius: "0 2px 2px 0",
            transition: "width .3s ease-out",
            boxShadow: "0 0 8px rgba(201,242,77,.5)",
          }} />
        </div>
      )}

      {/* SVG annotation overlay */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 8, overflow: "hidden", pointerEvents: "none" }}>
        {/* Saved annotations */}
        {localAnns.map((ann) => {
          const pts = project(ann.points || ann.pts || []);
          if (pts.length === 0) return null;
          const active = ann.id === openAnnId;
          const color = ann.color || "#C9F24D";
          const stroke = "#0B0F0E";
          const subType = ann.subType || (ann.kind === "point" ? "filled" : ann.kind === "line" ? "solid" : "outline");

          if (ann.kind === "point") {
            const { x, y } = pts[0];
            return (
              <g key={ann.id} style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => { setOpenAnnId(ann.id === openAnnId ? null : ann.id); setAnnListOpen(false); }}>
                {/* Invisible hit target for easy clicking */}
                <circle cx={x} cy={y} r={16} fill="transparent" />
                {/* Active halo ring */}
                {active && (
                  <circle cx={x} cy={y} r={11} fill="none" stroke={color} strokeWidth={1.2} strokeDasharray="3 3" />
                )}
                {/* Symbol according to subType */}
                {subType === "outlined" ? (
                  <>
                    <circle cx={x} cy={y} r={6.5} fill="none" stroke={stroke} strokeWidth={2} />
                    <circle cx={x} cy={y} r={6.5} fill="none" stroke={color} strokeWidth={1.2} />
                  </>
                ) : subType === "star" ? (
                  <polygon
                    points={Array.from({ length: 10 }, (_, i) => {
                      const a = -Math.PI / 2 + (i * Math.PI) / 5;
                      const r = i % 2 === 0 ? 8 : 3.8;
                      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
                    }).join(" ")}
                    fill={color} stroke={stroke} strokeWidth={1} strokeLinejoin="round"
                  />
                ) : subType === "diamond" ? (
                  <polygon
                    points={`${x},${y - 7.5} ${x + 6.5},${y} ${x},${y + 7.5} ${x - 6.5},${y}`}
                    fill={color} stroke={stroke} strokeWidth={1} strokeLinejoin="round"
                  />
                ) : subType === "square" ? (
                  <rect
                    x={x - 5.5} y={y - 5.5} width={11} height={11} rx={1.5}
                    fill={color} stroke={stroke} strokeWidth={1}
                  />
                ) : subType === "triangle" ? (
                  <polygon
                    points={`${x},${y - 7.5} ${x + 7},${y + 5} ${x - 7},${y + 5}`}
                    fill={color} stroke={stroke} strokeWidth={1} strokeLinejoin="round"
                  />
                ) : subType === "cross" ? (
                  <>
                    <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
                    <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
                    <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
                    <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
                  </>
                ) : (
                  /* "filled" (default) */
                  <>
                    <circle cx={x} cy={y} r={6.5} fill={color} stroke={stroke} strokeWidth={1} />
                    <circle cx={x} cy={y} r={2.2} fill={stroke} />
                  </>
                )}
              </g>
            );
          }

          if (ann.kind === "line") {
            const rawPath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            let lineD = rawPath;
            if (subType === "wavy") {
              lineD = generateWavyPath(pts);
            } else if (subType === "zigzag") {
              lineD = generateZigzagPath(pts);
            }
            const { endTriangle } = subType === "arrow" ? getArrowhead(pts) : {};

            return (
              <g key={ann.id} style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => { setOpenAnnId(ann.id === openAnnId ? null : ann.id); setAnnListOpen(false); }}>
                {/* Transparent wide path for easier clicking */}
                <path d={lineD} fill="none" stroke="transparent" strokeWidth={14} />
                {/* Active halo */}
                {active && (
                  <path d={lineD} fill="none" stroke="#FFFDF8" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} />
                )}
                {/* Base dark outline for contrast */}
                <path d={lineD} fill="none" stroke={stroke} strokeWidth={active ? 2.4 : 1.8}
                  strokeLinecap="round" strokeLinejoin="round" />
                {/* Colored line */}
                <path d={lineD} fill="none" stroke={color} strokeWidth={active ? 1.8 : 1.3}
                  strokeDasharray={subType === "dashed" ? "6,4" : undefined}
                  strokeLinecap="round" strokeLinejoin="round" />
                {/* Single-sided arrowhead at line end */}
                {subType === "arrow" && endTriangle && (
                  <polygon points={endTriangle} fill={color} stroke={stroke} strokeWidth={0.8} strokeLinejoin="round" />
                )}
              </g>
            );
          }

          if (ann.kind === "polygon" && pts.length >= 3) {
            const polyD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z";
            // Polygons: Outlined only by default, no fill as explicitly instructed
            const fill = subType === "tinted" ? color : "none";
            const fillOpacity = subType === "tinted" ? 0.15 : 0;

            return (
              <g key={ann.id} style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => { setOpenAnnId(ann.id === openAnnId ? null : ann.id); setAnnListOpen(false); }}>
                {active && (
                  <path d={polyD} fill="none" stroke="#FFFDF8" strokeWidth={3.5} strokeLinejoin="round" opacity={0.6} />
                )}
                {/* Base dark outline for contrast */}
                <path d={polyD} fill="none" stroke={stroke} strokeWidth={active ? 2.4 : 1.8} strokeLinejoin="round" />
                {/* Main polygon stroke and optional fill */}
                <path d={polyD}
                  fill={fill}
                  fillOpacity={fillOpacity}
                  stroke={color}
                  strokeWidth={active ? 1.8 : 1.3}
                  strokeDasharray={subType === "dashed" ? "6,4" : undefined}
                  strokeLinejoin="round" />
              </g>
            );
          }
          return null;
        })}

        {/* Draft — placed points */}
        {draftScreen.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill="#C9F24D" stroke="#0B0F0E" strokeWidth={1.5} />
        ))}

        {/* Draft — connecting segments */}
        {draftScreen.length >= 2 && (
          <polyline
            points={draftScreen.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            fill="none" stroke="#C9F24D" strokeWidth={2} strokeDasharray="6 3" strokeLinecap="round" />
        )}

        {/* Draft — rubber-band to cursor */}
        {draftScreen.length >= 1 && cursorScreen && !formVisible && addAnnKind !== "point" && (
          <line
            x1={draftScreen[draftScreen.length - 1].x} y1={draftScreen[draftScreen.length - 1].y}
            x2={cursorScreen.x} y2={cursorScreen.y}
            stroke="rgba(201,242,77,.55)" strokeWidth={1.5} strokeDasharray="4 3" />
        )}

        {/* Draft — polygon close preview */}
        {addAnnKind === "polygon" && draftScreen.length >= 3 && cursorScreen && !formVisible && (
          <line
            x1={cursorScreen.x} y1={cursorScreen.y}
            x2={draftScreen[0].x} y2={draftScreen[0].y}
            stroke="rgba(201,242,77,.3)" strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>

      {/* Click-capture div (annotation mode only) */}
      <div
        style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: addAnnMode && !formVisible ? "auto" : "none", cursor: addAnnMode && !formVisible ? "crosshair" : "default" }}
        onClick={handleCaptureClick}
        onMouseMove={handleCaptureMove}
        onMouseLeave={() => setCursorSphere(null)}
      />

      {/* ── Top-right: info card (expanded) or expand arrow remark tab (collapsed totally to the right) ── */}
      {!openAnn && !formVisible && (
        isTitleCollapsed ? (
          <button
            onClick={() => setIsTitleCollapsed(false)}
            title="Expand stop details"
            aria-label="Expand stop details"
            style={{
              position: "absolute",
              right: 0,
              top: "clamp(12px,2vw,24px)",
              zIndex: 20,
              padding: "10px 8px 10px 10px",
              borderRadius: "12px 0 0 12px",
              background: "rgba(255,253,248,.95)",
              border: "1px solid rgba(11,15,14,.18)",
              borderRight: "none",
              backdropFilter: "blur(8px)",
              boxShadow: "-4px 8px 20px -6px rgba(11,15,14,.25)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0B0F0E",
              transition: "background .15s, transform .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#C9F24D";
              e.currentTarget.style.transform = "translateX(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,253,248,.95)";
              e.currentTarget.style.transform = "none";
            }}
          >
            {/* Remark of an arrow indicating option to expand */}
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="#0B0F0E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <div
            className="gp-top-right-info"
            style={{
              position: "absolute",
              right: "clamp(12px,2vw,24px)",
              top: "clamp(12px,2vw,24px)",
              zIndex: 20,
              width: "min(310px,calc(100% - 70px))",
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 20,
                background: "rgba(255,253,248,.95)",
                border: "1px solid rgba(11,15,14,.16)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 14px 34px -22px rgba(11,15,14,.7)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div
                  style={{
                    fontFamily: "'Instrument Sans',sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    color: "#5A635F",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {curPath.name.toUpperCase()} · STOP {stopIdx + 1} OF {curPath.stops.length}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  {/* Collapse totally to the right button */}
                  <button
                    onClick={() => setIsTitleCollapsed(true)}
                    title="Collapse to the right"
                    aria-label="Collapse to the right"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: "#FFFDF8",
                      border: "1px solid rgba(11,15,14,.22)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      color: "#3E4744",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F2ED")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFDF8")}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4l4 4-4 4" stroke="#0B0F0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {/* Back to map button */}
                  <button
                    onClick={() => {
                      if (pathId && stopId) {
                        window.location.hash = `#/map/${pathId}/${stopId}`;
                      } else if (pathId) {
                        window.location.hash = `#/map/${pathId}`;
                      } else {
                        window.location.hash = "#/map";
                      }
                    }}
                    title="Back to map view of location"
                    aria-label="Back to map view of location"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: "#C9F24D",
                      border: "1px solid #0B0F0E",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      color: "#0B0F0E",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 6 }}>
                <h1
                  style={{
                    fontFamily: "'Bricolage Grotesque',sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(17px,2vw,22px)",
                    letterSpacing: "-.03em",
                    lineHeight: 1.15,
                    margin: "2px 0 5px",
                  }}
                >
                  {curStop.title}
                </h1>
                <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 500, color: "#5A635F" }}>
                  {curStop.lat}, {curStop.lon}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── Top-left: rail ────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", left: "clamp(12px,2vw,24px)", top: "clamp(12px,2vw,24px)", zIndex: 20, width: "min(340px,calc(100% - 24px))", display: "flex", flexDirection: "column", gap: 12, pointerEvents: "none" }}>

        {/* Rail */}
        <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", gap: 8, width: 40 }}>
          <button onClick={() => { setAnnListOpen((o) => !o); setPathPanelOpen(false); }} aria-label="Annotations" title="Annotations" style={railBtn(annListOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3.5" y="5" width="17" height="12.5" rx="4" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="8.6" cy="11.2" r="2" fill="currentColor" />
              <path d="M13 9.4h5M13 13.4h3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          {curPath.stops.length > 1 && (
            <button onClick={() => { setPathPanelOpen((o) => !o); setAnnListOpen(false); }} aria-label="Path stops" title="Path stops" style={railBtn(pathPanelOpen)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 18l6-9 5 6 5-9" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 3" />
                <circle cx="4" cy="18" r="2.4" fill="currentColor" />
                <circle cx="20" cy="6" r="2.4" fill="currentColor" />
              </svg>
            </button>
          )}
          <button
            aria-label="Import annotations from GeoJSON"
            title="Import annotations from GeoJSON"
            style={railBtn(false)}
            onClick={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = ".geojson,application/geo+json,application/json";
              inp.onchange = () => {
                const file = inp.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const geo = JSON.parse(ev.target?.result as string);
                    const features = geo.type === "FeatureCollection" ? geo.features : geo.type === "Feature" ? [geo] : [];
                    const imported: LocalAnnotation[] = features.map((f: Record<string, unknown>, i: number) => {
                      const props = (f.properties as Record<string, unknown>) ?? {};
                      const geom = f.geometry as Record<string, unknown>;
                      let kind: "point" | "line" | "polygon" = "point";
                      let points: SpherePoint[] = [{ yaw: 0, pitch: 0 }];
                      if (geom?.type === "Point") {
                        kind = "point";
                        const c = geom.coordinates as number[];
                        points = [{ yaw: Number(props.yaw ?? c[0] ?? 0), pitch: Number(props.pitch ?? c[1] ?? 0) }];
                      } else if (geom?.type === "LineString") {
                        kind = "line";
                        points = (geom.coordinates as number[][]).map((c) => ({ yaw: c[0], pitch: c[1] }));
                      } else if (geom?.type === "Polygon") {
                        kind = "polygon";
                        points = ((geom.coordinates as number[][][])[0] ?? []).map((c) => ({ yaw: c[0], pitch: c[1] }));
                      }
                      const featureId = String(f.id ?? props.id ?? `import_${Date.now()}_${i}`);
                      const subType = String(props.subType ?? (kind === "point" ? "filled" : kind === "line" ? "solid" : "outline"));
                      const color = String(props.color ?? "#C9F24D");
                      return {
                        id: featureId,
                        kind,
                        subType,
                        color,
                        points,
                        pts: points,
                        title: String(props.title ?? props.name ?? `Imported ${i + 1}`),
                        note: String(props.description ?? props.note ?? props.body ?? ""),
                        body: String(props.description ?? props.note ?? props.body ?? ""),
                        refLink: String(props.refLink ?? props.url ?? ""),
                        refLabel: String(props.refLabel ?? ""),
                        tags: Array.isArray(props.tags) ? (props.tags as string[]) : [],
                        added: String(props.added ?? new Date().toISOString().split("T")[0]),
                      };
                    });
                    const next = [...localAnns, ...imported];
                    setLocalAnns(next);
                    persistAnns(pathId, stopId, next);
                    setAnnListOpen(true);
                  } catch { alert("Could not parse GeoJSON file."); }
                };
                reader.readAsText(file);
              };
              inp.click();
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 14V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => {
              const on = !addAnnMode;
              setAddAnnMode(on);
              if (!on) resetAddAnn();
              setAnnListOpen(false);
              setPathPanelOpen(false);
            }}
            aria-label="Add annotation"
            title="Add annotation"
            style={railBtn(addAnnMode)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Annotations list panel */}
        {annListOpen && (
          <div
            style={{
              pointerEvents: "auto",
              position: isMobile ? "fixed" : "absolute",
              left: isMobile ? 0 : 52,
              right: isMobile ? 0 : undefined,
              bottom: isMobile ? 0 : undefined,
              top: isMobile ? undefined : 0,
              width: isMobile ? "100%" : "min(320px,calc(100vw - 75px))",
              height: isMobile ? "33.33vh" : undefined,
              maxHeight: isMobile ? "33.33vh" : "calc(100vh - 120px)",
              display: "flex",
              flexDirection: "column",
              borderRadius: isMobile ? "16px 16px 0 0" : 20,
              overflow: "hidden",
              background: "rgba(255,253,248,.96)",
              border: "1px solid rgba(11,15,14,.14)",
              backdropFilter: "blur(10px)",
              boxShadow: isMobile ? "0 -8px 32px -8px rgba(11,15,14,.8)" : "0 18px 42px -24px rgba(11,15,14,.8)",
              zIndex: 600,
            }}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px 12px 18px", borderBottom: "1px solid rgba(11,15,14,.1)" }}>
              <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#3E4744" }}>ANNOTATIONS · {localAnns.length}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  onClick={() => exportAnnotationsGeoJSON(pathId, stopId, localAnns)}
                  title="Export GeoJSON"
                  aria-label="Export GeoJSON"
                  style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(11,15,14,.2)", background: "#FFFDF8", cursor: "pointer", display: "grid", placeItems: "center", color: "#0B0F0E", flexShrink: 0 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 4v10m0 0l-3-3m3 3l3-3M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button onClick={() => setAnnListOpen(false)} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>
            <div className="gp-popover-scroll" style={{ flex: "1 1 auto", minHeight: 0, paddingRight: 4 }}>
              {localAnns.length === 0 && (
                <div style={{ padding: "24px 18px", textAlign: "center", color: "#5A635F", fontSize: 13 }}>No annotations yet.</div>
              )}
              {localAnns.map((a) => {
                const firstPt = a.pts?.[0] || a.points?.[0];
                const sym = a.kind === "point"
                  ? (a.subType === "star" ? "★" : a.subType === "diamond" ? "◆" : a.subType === "square" ? "■" : a.subType === "triangle" ? "▲" : a.subType === "cross" ? "+" : a.subType === "outlined" ? "○" : "●")
                  : a.kind === "line"
                    ? (a.subType === "wavy" ? "∿" : a.subType === "zigzag" ? "⦚" : a.subType === "arrow" ? "↔" : "―")
                    : "▢";
                return (
                  <div
                    key={a.id}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "10px 14px 10px 18px",
                      borderBottom: "1px solid rgba(11,15,14,.07)",
                      background: a.id === openAnnId ? "rgba(201,242,77,.28)" : "transparent",
                      transition: "background .15s",
                    }}
                  >
                    <button
                      onClick={() => {
                        setOpenAnnId(a.id === openAnnId ? null : a.id);
                        setAnnListOpen(false);
                        if (firstPt && pannellumRef.current) {
                          try {
                            (pannellumRef.current as any).lookAt(firstPt.pitch, firstPt.yaw, 80, 800);
                          } catch { /* */ }
                        }
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        flex: 1,
                        minWidth: 0,
                        fontFamily: "inherit",
                      }}
                    >
                      <span style={{ width: 26, height: 26, borderRadius: a.kind === "point" ? 999 : a.kind === "polygon" ? 7 : 4, border: "1.5px solid #0B0F0E", background: a.color || "#C9F24D", display: "grid", placeItems: "center", flexShrink: 0, fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, color: "#0B0F0E", fontWeight: 700 }}>
                        {sym}
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</span>
                        <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: ".06em", color: "#5A635F" }}>{(a.subType || a.kind).toUpperCase()}{a.added ? ` · ${a.added}` : ""}</span>
                      </span>
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <button
                        title={annShareCopied === a.id ? "Link copied!" : "Share annotation link"}
                        onClick={(e) => {
                          e.stopPropagation();
                          shareAnnotation(a.id);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid rgba(11,15,14,.16)",
                          background: annShareCopied === a.id ? "#C9F24D" : "#FFFDF8",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          color: "#0B0F0E",
                        }}
                      >
                        {annShareCopied === a.id ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.7" />
                            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.7" />
                            <path d="M8.7 10.7l6.6-4.4M8.7 13.3l6.6 4.4" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        )}
                      </button>
                      <button
                        title="Edit annotation"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditAnn(a);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid rgba(11,15,14,.16)",
                          background: "#FFFDF8",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          color: "#0B0F0E",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button
                        title="Delete annotation"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnn(a.id);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: "1px solid rgba(231,29,54,.3)",
                          background: "#FFFDF8",
                          cursor: "pointer",
                          display: "grid",
                          placeItems: "center",
                          color: "#E71D36",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ flexShrink: 0, padding: "10px 14px", borderTop: "1px solid rgba(11,15,14,.1)" }}>
              <button
                onClick={() => {
                  setAddAnnMode(true);
                  setAnnListOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "9px 0",
                  borderRadius: 10,
                  background: "#C9F24D",
                  border: "1px solid #0B0F0E",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'Instrument Sans',sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>+</span> Add New Annotation
              </button>
            </div>
          </div>
        )}

        {/* Path panel */}
        {pathPanelOpen && (
          <div
            style={{
              pointerEvents: "auto",
              position: isMobile ? "fixed" : "absolute",
              left: isMobile ? 0 : 52,
              right: isMobile ? 0 : undefined,
              bottom: isMobile ? 0 : undefined,
              top: isMobile ? undefined : 48,
              width: isMobile ? "100%" : "min(320px,calc(100vw - 75px))",
              height: isMobile ? "33.33vh" : undefined,
              maxHeight: isMobile ? "33.33vh" : "calc(100vh - 120px)",
              display: "flex",
              flexDirection: "column",
              borderRadius: isMobile ? "16px 16px 0 0" : 20,
              overflow: "hidden",
              background: "rgba(255,253,248,.96)",
              border: "1px solid rgba(11,15,14,.14)",
              backdropFilter: "blur(10px)",
              boxShadow: isMobile ? "0 -8px 32px -8px rgba(11,15,14,.8)" : "0 18px 42px -24px rgba(11,15,14,.8)",
              zIndex: 600,
            }}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px 12px 18px", borderBottom: "1px solid rgba(11,15,14,.1)" }}>
              <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#3E4744" }}>{curPath.name.toUpperCase()} · {curPath.stops.length} STOPS</span>
              <button onClick={() => setPathPanelOpen(false)} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="gp-popover-scroll" style={{ display: "flex", flexDirection: "column", gap: 6, flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "10px 14px" }}>
              {curPath.stops.map((s, i) => {
                const on = i === stopIdx;
                return (
                  <button
                    key={s.id}
                    onClick={() => { goToStop(s.id); setPathPanelOpen(false); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      border: "1px solid",
                      borderColor: on ? "#0B0F0E" : "rgba(11,15,14,.1)",
                      borderRadius: 12,
                      background: on ? "rgba(201,242,77,.28)" : "#FFFDF8",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#0B0F0E",
                      fontFamily: "inherit",
                      transition: "background .15s, border-color .15s",
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: "1.5px solid #0B0F0E",
                        background: on ? "#C9F24D" : "rgba(11,15,14,.06)",
                        color: "#0B0F0E",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "'Instrument Sans',sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: on ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Annotation detail card ─────────────────────────────────────────── */}
      {openAnn && !formVisible && (
        <div
          style={{
            position: isMobile ? "fixed" : "absolute",
            left: isMobile ? 0 : undefined,
            right: isMobile ? 0 : "clamp(12px,2vw,24px)",
            bottom: isMobile ? 0 : undefined,
            top: isMobile ? undefined : "clamp(12px,2vw,24px)",
            zIndex: 600,
            width: isMobile ? "100%" : "min(310px,calc(100vw - 32px))",
            height: isMobile ? "33.33vh" : undefined,
            maxHeight: isMobile ? "33.33vh" : "calc(100% - 116px)",
            display: "flex",
            flexDirection: "column",
            borderRadius: isMobile ? "16px 16px 0 0" : 18,
            overflow: "hidden",
            background: "#FFFDF8",
            border: "1px solid #0B0F0E",
            boxShadow: isMobile ? "0 -8px 32px -8px rgba(11,15,14,.95)" : "0 24px 56px -26px rgba(11,15,14,.95)",
          }}
        >
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "9px 12px 9px 14px" : "11px 12px 11px 14px", background: "#FFFDF8", borderBottom: "1px solid rgba(11,15,14,.12)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: openAnn.color || "#C9F24D", border: "1.2px solid #0B0F0E", flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: "#0B0F0E", letterSpacing: "-.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{openAnn.title}</span>
            <button
              title="Edit annotation"
              onClick={() => startEditAnn(openAnn)}
              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(11,15,14,.18)", background: "#FFFDF8", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, color: "#0B0F0E" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button
              title="Delete annotation"
              onClick={() => handleDeleteAnn(openAnn.id)}
              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(231,29,54,.3)", background: "#FFFDF8", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, color: "#E71D36" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
            <button
              title={annShareCopied === openAnn.id ? "Link copied!" : "Share annotation link"}
              onClick={() => shareAnnotation(openAnn.id)}
              style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(11,15,14,.18)", background: annShareCopied === openAnn.id ? "#C9F24D" : "#FFFDF8", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, color: "#0B0F0E", transition: "background .2s" }}
            >
              {annShareCopied === openAnn.id ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.7" />
                  <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                  <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M8.7 10.7l6.6-4.4M8.7 13.3l6.6 4.4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
            </button>
            <button onClick={() => setOpenAnnId(null)} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div className="gp-popover-scroll" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: isMobile ? "10px 14px" : "16px 18px" }}>
            {(openAnn.note || openAnn.body) && <p style={{ margin: "0 0 14px", color: "#3E4744", fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{openAnn.note || openAnn.body}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, paddingTop: (openAnn.note || openAnn.body) ? 10 : 0, borderTop: (openAnn.note || openAnn.body) ? "1px solid rgba(11,15,14,.1)" : "none" }}>
              {[
                { k: "KIND", v: openAnn.kind.toUpperCase() },
                { k: "STYLE", v: (openAnn.subType || (openAnn.kind === "point" ? "filled" : openAnn.kind === "line" ? "solid" : "outline")).toUpperCase() },
                { k: "ADDED", v: openAnn.added || "—" },
              ].map(({ k, v }) => (
                <div key={k}>
                  <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "#5A635F" }}>{k}</div>
                  <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 12, fontWeight: 600, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            {openAnn.tags && openAnn.tags.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {openAnn.tags.map(t => (
                  <span key={t} style={{ padding: "3px 7px", borderRadius: 4, background: "rgba(11,15,14,.06)", fontSize: 10, fontWeight: 600, fontFamily: "'Instrument Sans',sans-serif", color: "#3E4744" }}>#{t}</span>
                ))}
              </div>
            )}
            {openAnn.refLink && (
              <a href={openAnn.refLink} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 10, fontSize: 12, color: "#14504A" }}>
                {openAnn.refLabel || openAnn.refLink}
              </a>
            )}
          </div>
          <div style={{ flexShrink: 0, padding: isMobile ? "8px 14px" : "12px 18px", borderTop: "1px solid rgba(11,15,14,.08)", display: "flex", gap: 8 }}>
            <button
              onClick={() => startEditAnn(openAnn)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 10, background: "#C9F24D", border: "1px solid #0B0F0E", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Instrument Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Edit
            </button>
            <button
              onClick={() => handleDeleteAnn(openAnn.id)}
              style={{ padding: "9px 14px", borderRadius: 10, background: "#FFFDF8", border: "1px solid rgba(231,29,54,.4)", color: "#E71D36", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Instrument Sans',sans-serif", display: "flex", alignItems: "center", gap: 5 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* ── New annotation form ────────────────────────────────────────────── */}
      {formVisible && (
        <div style={{ position: "absolute", right: "clamp(12px,2vw,24px)", top: "clamp(12px,2vw,24px)", zIndex: 25, width: "min(310px,calc(100vw - 32px))", maxHeight: "calc(100% - 32px)", display: "flex", flexDirection: "column", borderRadius: 18, overflow: "hidden", background: "#FFFDF8", border: "1px solid #0B0F0E", boxShadow: "0 24px 56px -26px rgba(11,15,14,.95)" }}>
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "11px 12px 11px 16px", background: "#C9F24D", borderBottom: "1px solid #0B0F0E" }}>
            <svg width="14" height="5" viewBox="0 0 14 5" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="1.5" cy="2.5" r="1.5" fill="#0B0F0E" /><circle cx="7" cy="2.5" r="1.5" fill="#0B0F0E" /><circle cx="12.5" cy="2.5" r="1.5" fill="#0B0F0E" />
            </svg>
            <span style={{ flex: 1, fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, letterSpacing: ".1em", color: "#0B0F0E", fontWeight: 700 }}>
              {editingAnnId ? "EDIT ANNOTATION" : "NEW ANNOTATION"}
            </span>
            <button onClick={resetAddAnn} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "inset 0 0 0 1.5px rgba(11,15,14,.25)" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "18px 18px 8px" }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Title</label>
            <input value={annForm.title} onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))} placeholder="Bedding plane, 23°" style={inputStyle} />

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>
              {addAnnKind === "point" ? "Point Symbol" : addAnnKind === "line" ? "Line Type" : "Polygon Style"}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {addAnnKind === "point" && [
                { id: "filled", label: "● Filled" },
                { id: "outlined", label: "○ Hollow" },
                { id: "star", label: "★ Star" },
                { id: "diamond", label: "◆ Diamond" },
                { id: "square", label: "■ Square" },
                { id: "triangle", label: "▲ Triangle" },
                { id: "cross", label: "✚ Cross" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setAnnForm((f) => ({ ...f, subType: st.id }))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: annForm.subType === st.id ? "1.5px solid #0B0F0E" : "1px solid rgba(11,15,14,.18)",
                    background: annForm.subType === st.id ? "#C9F24D" : "#FFFDF8",
                    fontWeight: annForm.subType === st.id ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Instrument Sans',sans-serif",
                  }}
                >
                  {st.label}
                </button>
              ))}
              {addAnnKind === "line" && [
                { id: "solid", label: "― Solid" },
                { id: "dashed", label: "╌ Dashed" },
                { id: "arrow", label: "⟶ Arrow" },
                { id: "wavy", label: "∿ Wavy" },
                { id: "zigzag", label: "⦚ Zigzag" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setAnnForm((f) => ({ ...f, subType: st.id }))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: annForm.subType === st.id ? "1.5px solid #0B0F0E" : "1px solid rgba(11,15,14,.18)",
                    background: annForm.subType === st.id ? "#C9F24D" : "#FFFDF8",
                    fontWeight: annForm.subType === st.id ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Instrument Sans',sans-serif",
                  }}
                >
                  {st.label}
                </button>
              ))}
              {addAnnKind === "polygon" && [
                { id: "outline", label: "▢ Outline Only" },
                { id: "dashed", label: "⬚ Dashed" },
                { id: "tinted", label: "▦ Tinted" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setAnnForm((f) => ({ ...f, subType: st.id }))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: annForm.subType === st.id ? "1.5px solid #0B0F0E" : "1px solid rgba(11,15,14,.18)",
                    background: annForm.subType === st.id ? "#C9F24D" : "#FFFDF8",
                    fontWeight: annForm.subType === st.id ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'Instrument Sans',sans-serif",
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Color</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["#C9F24D", "#FF9F1C", "#2EC4B6", "#FFBF69", "#E71D36"].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAnnForm(f => ({ ...f, color: c }))}
                  style={{ width: 26, height: 26, borderRadius: 999, border: annForm.color === c ? "2.5px solid #0B0F0E" : "1px solid rgba(11,15,14,.2)", background: c, cursor: "pointer" }}
                />
              ))}
            </div>

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Note</label>
            <textarea value={annForm.note} onChange={(e) => setAnnForm((f) => ({ ...f, note: e.target.value }))} placeholder={"Write as much as the place deserves —\nhistory, detail, what to look for."} rows={4} style={{ ...inputStyle, resize: "none", lineHeight: 1.55 }} />

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Tags (comma separated)</label>
            <input value={annForm.tags} onChange={(e) => setAnnForm((f) => ({ ...f, tags: e.target.value }))} placeholder="fault, sedimentary, fossil" style={inputStyle} />

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Reference link</label>
            <input value={annForm.refLink} onChange={(e) => setAnnForm((f) => ({ ...f, refLink: e.target.value }))} placeholder="https://example.org/source" style={inputStyle} />

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Reference label</label>
            <input value={annForm.refLabel} onChange={(e) => setAnnForm((f) => ({ ...f, refLabel: e.target.value }))} placeholder="Catalogue reference…" style={inputStyle} />

            <div style={{ display: "flex", gap: 24, margin: "18px 0 4px", alignItems: "flex-end" }}>
              {[
                { k: "YAW", v: `${draftPts[0]?.yaw.toFixed(2) ?? "—"}°` },
                { k: "PITCH", v: `${draftPts[0]?.pitch.toFixed(2) ?? "—"}°` },
              ].map(({ k, v }) => (
                <div key={k}>
                  <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "#5A635F" }}>{k}</div>
                  <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 13, fontWeight: 600, marginTop: 3 }}>{v}</div>
                </div>
              ))}
              {draftPts[0] && (
                <button
                  title="Copy coordinates"
                  onClick={() => { navigator.clipboard.writeText(`YAW: ${draftPts[0].yaw.toFixed(2)}°, PITCH: ${draftPts[0].pitch.toFixed(2)}°`).catch(() => {}); }}
                  style={{ width: 28, height: 28, borderRadius: 8, background: "#F0EFE9", border: "1px solid rgba(11,15,14,.18)", cursor: "pointer", display: "grid", placeItems: "center", color: "#3E4744", flexShrink: 0 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <rect x="8" y="8" width="12" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v11A1.5 1.5 0 005.5 18H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div style={{ flexShrink: 0, padding: "12px 18px 18px" }}>
            {editingAnnId ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSave}
                  style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid #0B0F0E", background: "#C9F24D", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#0B0F0E" }}
                >
                  Update Annotation
                </button>
                <button
                  onClick={() => {
                    if (editingAnnId) handleDeleteAnn(editingAnnId);
                  }}
                  style={{ padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(231,29,54,.4)", background: "#FFFDF8", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#E71D36" }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <button onClick={handleSave}
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "1px solid rgba(11,15,14,.2)", background: "#FFFDF8", fontFamily: "'Instrument Sans',sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#0B0F0E", transition: "background .15s, border-color .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.borderColor = "#0B0F0E"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.borderColor = "rgba(11,15,14,.2)"; }}>
                Save annotation
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom-left: Compass + YAW / PITCH + share (responsive mobile layout) ─ */}
      <div className="gp-bottom-controls">
        {/* Compass / North arrow with click menu */}
        <div style={{ position: "relative" }}>
          {compassMenuOpen && (
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 58,
                width: 220,
                borderRadius: 16,
                background: "rgba(255,253,248,.98)",
                border: "1.5px solid rgba(11,15,14,.16)",
                boxShadow: "0 18px 40px -12px rgba(11,15,14,.6)",
                backdropFilter: "blur(14px)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                zIndex: 40,
                pointerEvents: "auto",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#3E4744" }}>
                  NORTH ORIENTATION
                </span>
                <button
                  onClick={() => setCompassMenuOpen(false)}
                  style={{ width: 22, height: 22, borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", cursor: "pointer", display: "grid", placeItems: "center" }}
                >
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>

              {/* Set Current View as North (Calibrate) */}
              <button
                onClick={() => {
                  const newNorth = vs.yaw;
                  setNorthHeading(newNorth);
                  localStorage.setItem(`geopano_north_${stopId}`, newNorth.toString());
                  setCompassMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#0B0F0E",
                  color: "#FFFDF8",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "'Instrument Sans',sans-serif",
                  transition: "background .15s",
                }}
              >
                <span style={{ color: "#EF4444", fontSize: 14 }}>◎</span> Set Current View as North
              </button>

              {/* Reset View to North */}
              <button
                onClick={() => {
                  lookAt(0, northHeading, 90);
                  setCompassMenuOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#C9F24D",
                  color: "#0B0F0E",
                  border: "1px solid #0B0F0E",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "'Instrument Sans',sans-serif",
                  transition: "background .15s",
                }}
              >
                <span>↺</span> Reset View to North
              </button>

              {northHeading !== 0 && (
                <button
                  onClick={() => {
                    setNorthHeading(0);
                    localStorage.removeItem(`geopano_north_${stopId}`);
                    setCompassMenuOpen(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#5A635F",
                    fontSize: 10,
                    fontFamily: "'Instrument Sans',sans-serif",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: "2px 0",
                    textAlign: "center",
                  }}
                >
                  Reset calibration to 0°
                </button>
              )}
            </div>
          )}

          {/* Compass / North button (Enlarged circle, thinner border, N moves with arrow, horizontally aligned) */}
          <button
            onClick={() => setCompassMenuOpen((o) => !o)}
            title="North Compass — Click for view options and orientation"
            aria-label="North Compass"
            className="gp-compass-btn"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              width: 52,
              height: 52,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              cursor: "pointer",
              outline: "none",
              transition: "transform .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.45))", overflow: "visible" }}
            >
              {/* The one and only circle (enlarged, thinner border) */}
              <circle
                cx="26"
                cy="26"
                r="18"
                fill={compassMenuOpen ? "#C9F24D" : "#FFFDF8"}
                stroke="#0B0F0E"
                strokeWidth="1.2"
              />

              {/* Tick marks inside the circle */}
              <line x1="26" y1="9.5" x2="26" y2="13" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="26" y1="42.5" x2="26" y2="39" stroke="rgba(11,15,14,.3)" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="9.5" y1="26" x2="13" y2="26" stroke="rgba(11,15,14,.3)" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="42.5" y1="26" x2="39" y2="26" stroke="rgba(11,15,14,.3)" strokeWidth="1.2" strokeLinecap="round" />

              {/* Rotating needle group: N moves with the north arrow */}
              <g style={{ transform: `rotate(${-(vs.yaw - northHeading)}deg)`, transformOrigin: "26px 26px", transition: "transform .12s ease-out" }}>
                {/* Red N label moving with north arrow outside the circle */}
                <text x="26" y="5" textAnchor="middle" fill="#EF4444" fontSize="8" fontWeight="900" fontFamily="'Instrument Sans',sans-serif">N</text>
                {/* North needle (bright red) */}
                <polygon points="26,10.5 22,26 30,26" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
                {/* South needle (dark charcoal) */}
                <polygon points="26,41.5 22,26 30,26" fill="#1E293B" />
              </g>
            </svg>
          </button>
        </div>
        <div className="gp-yaw-pill" style={{ padding: "9px 16px", borderRadius: 999, background: "rgba(11,15,14,.75)", backdropFilter: "blur(8px)", color: "#FFFDF8", fontFamily: "'Instrument Sans',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: ".04em", pointerEvents: "none", display: "flex", gap: 14 }}>
          {addAnnMode && !formVisible
            ? <span>YAW {vs.yaw.toFixed(1)}° · CLICK TO PLACE</span>
            : <>
                <span>YAW {vs.yaw.toFixed(1)}°</span>
                <span style={{ opacity: .35 }}>·</span>
                <span>PITCH {vs.pitch.toFixed(1)}°</span>
              </>
          }
        </div>
        {/* Copy coordinates */}
        <button
          className="gp-ctrl-btn-sm"
          title="Copy yaw and pitch"
          onClick={() => { navigator.clipboard.writeText(`YAW: ${vs.yaw.toFixed(2)}°, PITCH: ${vs.pitch.toFixed(2)}°`).catch(() => {}); }}
          style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(11,15,14,.62)", backdropFilter: "blur(8px)", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: "#FFFDF8" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="8" y="8" width="12" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
            <path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v11A1.5 1.5 0 005.5 18H8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        {/* Share view link */}
        <button
          className="gp-ctrl-btn-sm"
          title={shareCopied ? "Link copied!" : "Share this view"}
          onClick={shareView}
          style={{ width: 32, height: 32, borderRadius: 999, background: shareCopied ? "#C9F24D" : "rgba(11,15,14,.62)", backdropFilter: "blur(8px)", border: "none", cursor: "pointer", display: "grid", placeItems: "center", color: shareCopied ? "#0B0F0E" : "#FFFDF8", transition: "background .2s, color .2s" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.7" />
            <path d="M8.7 10.7l6.6-4.4M8.7 13.3l6.6 4.4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {/* ── Add-annotation toolbar ─────────────────────────────────────────── */}
      {addAnnMode && (
        <div className="gp-add-ann-toolbar" style={{ position: "absolute", bottom: "clamp(12px,2vw,24px)", left: "50%", transform: "translateX(-50%)", zIndex: 36, display: "flex", alignItems: "center", gap: 2, padding: "6px", borderRadius: 999, background: "rgba(255,253,248,.97)", border: "1px solid rgba(11,15,14,.18)", backdropFilter: "blur(12px)", boxShadow: "0 12px 32px -16px rgba(11,15,14,.85)", whiteSpace: "nowrap" }}>
          {(["point", "line", "polygon"] as const).map((k) => (
            <button key={k} onClick={() => {
              setAddAnnKind(k);
              setDraftPts([]);
              setFormVisible(false);
              setAnnForm(f => ({ ...f, subType: k === "point" ? "filled" : k === "line" ? "solid" : "outline" }));
            }}
              style={{ padding: "9px 18px", borderRadius: 999, border: "none", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, fontWeight: addAnnKind === k ? 700 : 500, cursor: "pointer", background: addAnnKind === k ? "#0B0F0E" : "transparent", color: addAnnKind === k ? "#FFFDF8" : "#3E4744", transition: "background .15s, color .15s" }}>
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
          <div style={{ width: 1, height: 22, background: "rgba(11,15,14,.15)", margin: "0 6px", flexShrink: 0 }} />
          {!formVisible && addAnnKind !== "point" && draftPts.length >= (addAnnKind === "polygon" ? 3 : 2) ? (
            <button onClick={handleFinishDraft} style={{ padding: "9px 16px", borderRadius: 999, border: "none", background: "#C9F24D", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#0B0F0E" }}>
              Done
            </button>
          ) : (
            <span style={{ fontSize: 13, color: "#5A635F", padding: "0 8px", fontFamily: "'Instrument Sans',sans-serif" }}>
              {formVisible
                ? "Fill in the form →"
                : draftPts.length > 0 && addAnnKind !== "point"
                  ? `${draftPts.length} pt${draftPts.length > 1 ? "s" : ""} — keep clicking`
                  : "Click once in the panorama."}
            </span>
          )}
          <div style={{ width: 1, height: 22, background: "rgba(11,15,14,.15)", margin: "0 6px", flexShrink: 0 }} />
          <button onClick={() => { setDraftPts([]); setFormVisible(false); }}
            style={{ padding: "9px 16px", borderRadius: 999, border: "1px solid rgba(11,15,14,.22)", background: "transparent", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#0B0F0E" }}>
            Undo
          </button>
          <button onClick={resetAddAnn}
            style={{ padding: "9px 16px", borderRadius: 999, border: "1px solid rgba(11,15,14,.22)", background: "transparent", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#0B0F0E" }}>
            Exit
          </button>
        </div>
      )}

      {/* ── In-panorama navigation arrows (Street View style) ──────────── */}
      {navArrows.map((arrow) => {
        const screenPos = sphereToScreen(arrow.yaw, arrow.pitch, vs.w, vs.h, vs.yaw, vs.pitch, vs.hfov);
        if (!screenPos) return null;
        return (
          <button
            key={arrow.stopId}
            onClick={() => {
              let targetYaw: number | undefined;
              const targetIdx = curPath.stops.findIndex((s) => s.id === arrow.stopId);
              if (targetIdx >= 0) {
                const targetStop = curPath.stops[targetIdx];
                if (arrow.isNext) {
                  // Forward: look ahead towards the next stop in sequence
                  if (targetIdx < curPath.stops.length - 1) {
                    const nextNext = curPath.stops[targetIdx + 1];
                    targetYaw = bearingBetween(targetStop.ll[0], targetStop.ll[1], nextNext.ll[0], nextNext.ll[1]);
                  } else {
                    targetYaw = bearingBetween(curStop.ll[0], curStop.ll[1], targetStop.ll[0], targetStop.ll[1]);
                  }
                } else {
                  // Backward: look back towards the previous stop in sequence
                  if (targetIdx > 0) {
                    const prevPrev = curPath.stops[targetIdx - 1];
                    targetYaw = bearingBetween(targetStop.ll[0], targetStop.ll[1], prevPrev.ll[0], prevPrev.ll[1]);
                  } else {
                    targetYaw = bearingBetween(curStop.ll[0], curStop.ll[1], targetStop.ll[0], targetStop.ll[1]);
                  }
                }
              }
              goToStop(arrow.stopId, targetYaw, 6);
            }}
            title={arrow.title}
            style={{
              position: "absolute",
              left: screenPos.x - 28,
              top: screenPos.y - 28,
              width: 56,
              height: 56,
              zIndex: 15,
              borderRadius: 999,
              background: "rgba(11,15,14,.5)",
              border: "2px solid rgba(201,242,77,.6)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              backdropFilter: "blur(4px)",
              transition: "transform .2s, background .2s, border-color .2s",
              color: "#C9F24D",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.background = "rgba(201,242,77,.2)"; e.currentTarget.style.borderColor = "#C9F24D"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "rgba(11,15,14,.5)"; e.currentTarget.style.borderColor = "rgba(201,242,77,.6)"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5l7 14H5l7-14z" fill="currentColor" opacity=".9" />
            </svg>
            <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: ".06em", color: "#FFFDF8", textTransform: "uppercase", maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
              {arrow.isNext ? "NEXT" : "PREV"}
            </span>
          </button>
        );
      })}
      </main>
      <div style={{ background: "#F4F2ED", flexShrink: 0 }}>
        <PageFooter onNav={onNav} />
      </div>
    </div>
  );
}
