import { useEffect, useRef, useState } from "react";
import db from "../data/db.json";
import { Path, View } from "../types";

const paths = db.paths as unknown as Path[];
// ── types ────────────────────────────────────────────────────────────────────

interface SpherePoint { yaw: number; pitch: number; }

interface LocalAnnotation {
  id: string;
  kind: "point" | "line" | "polygon";
  pts: SpherePoint[];
  points?: SpherePoint[];
  title: string;
  body: string;
  note?: string;
  added?: string;
  refLink?: string;
  refLabel?: string;
  tags?: string[];
  category?: string;
  color?: string;
  priority?: "Low" | "Medium" | "High";
}

interface AnnForm {
  title: string;
  note: string;
  refLink: string;
  refLabel: string;
  tags: string;
  category: string;
  color: string;
  priority: "Low" | "Medium" | "High";
}

interface Props {
  pathId: string;
  stopId: string;
  onNav: (v: View) => void;
  onSelectStop: (pathId: string, stopId: string) => void;
  initialYaw?: number;
  initialPitch?: number;
  initialAnnId?: string;
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
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Seed from db.json on first visit
  return dbAnns.map((a, i) => ({
    id: `db_${i}`,
    kind: a.kind as "point" | "line" | "polygon",
    pts: [{ yaw: a.yaw as number, pitch: a.pitch as number }],
    title: a.title as string,
    body: (a.body as string) || "",
    refLink: a.refLink || "",
    refLabel: a.refLabel || "",
    tags: a.tags || [],
    category: a.category || "Geology",
    color: a.color || "#C9F24D",
    priority: a.priority || "Medium",
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
  const [shareCopied, setShareCopied] = useState(false);
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

  // Navigation arrow config
  const [navConfigOpen, setNavConfigOpen] = useState(false);
  const [placingArrow, setPlacingArrow] = useState<"next" | "prev" | null>(null);

  // add-annotation flow
  const [addAnnMode, setAddAnnMode] = useState(false);
  const [addAnnKind, setAddAnnKind] = useState<"point" | "line" | "polygon">("point");
  const [draftPts, setDraftPts] = useState<SpherePoint[]>([]);
  const [cursorSphere, setCursorSphere] = useState<SpherePoint | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [annForm, setAnnForm] = useState<AnnForm>({ title: "", note: "", refLink: "", refLabel: "", tags: "", category: "Geology", color: "#C9F24D", priority: "Medium" });

  const curPath = paths.find((p) => p.id === pathId) || paths[0];
  const stopIdx = curPath.stops.findIndex((s) => s.id === stopId);
  const curStop = curPath.stops[stopIdx] || curPath.stops[0];
  const panoramaUrl = curStop.panorama || "/uploads/sp00009.jpg";
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
    setPlacingArrow(null);
    setNavConfigOpen(false);
    resetAddAnn();
  }, [pathId, stopId]);

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

  const anyPanelOpen = annListOpen || pathPanelOpen || navConfigOpen || !!openAnnId || addAnnMode || formVisible;

  // Pannellum init
  useEffect(() => {
    if (!viewerRef.current || !window.pannellum) return;
    setPanoLoaded(false);
    setLoadProgress(0);

    // Simulate loading progress while image downloads
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let currentProgress = 0;
    progressInterval = setInterval(() => {
      if (currentProgress < 85) {
        currentProgress += Math.random() * 8 + 2;
        currentProgress = Math.min(currentProgress, 85);
        setLoadProgress(Math.round(currentProgress));
      }
    }, 200);

    const startYaw = initialYaw ?? curStop.defaultYaw ?? 0;
    const startPitch = initialPitch ?? curStop.defaultPitch ?? 0;

    const viewer = window.pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: panoramaUrl,
      preview: previewUrl,
      autoLoad: true,
      showControls: false,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      autoRotate: 0,
      autoRotateInactivityDelay: -1,
      compass: false,
      hfov: 90,
      yaw: startYaw,
      pitch: startPitch,
      hotSpots: [],
      strings: { loadingLabel: "" },
    });
    pannellumRef.current = viewer;

    // Listen for full panorama load completion
    const checkLoaded = setInterval(() => {
      try {
        // Pannellum sets the loaded flag internally; check via the container
        const container = viewerRef.current;
        if (container) {
          const loadingEl = container.querySelector('.pnlm-load-box');
          if (!loadingEl || (loadingEl as HTMLElement).style.display === 'none') {
            setPanoLoaded(true);
            if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
            setLoadProgress(100);
            clearInterval(checkLoaded);
          }
        }
      } catch { /* viewer destroyed */ clearInterval(checkLoaded); }
    }, 100);

    const id = window.setInterval(() => {
      try {
        const el = viewerRef.current;
        setVs({
          yaw: viewer.getYaw(),
          pitch: viewer.getPitch(),
          hfov: viewer.getHfov(),
          w: el?.clientWidth ?? 0,
          h: el?.clientHeight ?? 0,
        });
      } catch { /* destroyed */ }
    }, 33);

    return () => {
      clearInterval(id);
      clearInterval(checkLoaded);
      if (progressInterval) clearInterval(progressInterval);
      try { viewer.destroy(); } catch { /* */ }
      pannellumRef.current = null;
    };
  }, [panoramaUrl, previewUrl, pathId, stopId]);

  // Always keep auto-rotation stopped
  useEffect(() => {
    const v = pannellumRef.current;
    if (!v) return;
    try { v.stopAutoRotate(); } catch { /* viewer may be mid-init */ }
  }, [anyPanelOpen, addAnnMode]);

  // ── annotation placement ──────────────────────────────────────────────────

  function handleCaptureClick(e: React.MouseEvent<HTMLDivElement>) {
    // Arrow placement mode
    if (placingArrow) {
      const rect = e.currentTarget.getBoundingClientRect();
      const sp = pixelToSphere(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, vs.yaw, vs.pitch, vs.hfov);
      const newConfig = { ...arrowConfig };
      if (placingArrow === "next") {
        newConfig.nextArrow = { yaw: sp.yaw, pitch: sp.pitch };
      } else {
        newConfig.prevArrow = { yaw: sp.yaw, pitch: sp.pitch };
      }
      setArrowConfig(newConfig);
      persistNavArrows(pathId, stopId, newConfig);
      setPlacingArrow(null);
      return;
    }
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

  function handleSave() {
    if (!annForm.title.trim() || draftPts.length === 0) return;
    const ann: LocalAnnotation = {
      id: Date.now().toString(),
      kind: addAnnKind,
      pts: draftPts,
      points: draftPts,
      title: annForm.title.trim(),
      body: annForm.note.trim(),
      note: annForm.note.trim(),
      refLink: annForm.refLink.trim(),
      refLabel: annForm.refLabel.trim(),
      added: new Date().toISOString().split("T")[0],
    };
    const next = [...localAnns, ann];
    setLocalAnns(next);
    persistAnns(pathId, stopId, next);
    resetAddAnn();
  }

  function resetAddAnn() {
    setAddAnnMode(false);
    setDraftPts([]);
    setFormVisible(false);
    setCursorSphere(null);
    setAnnForm({
      title: "",
      note: "",
      refLink: "",
      refLabel: "",
      tags: "",
      category: "Geology",
      color: "#C9F24D",
      priority: "Medium",
    });
  }

  // ── navigation ────────────────────────────────────────────────────────────

  function goToStop(sid: string) {
    onSelectStop(curPath.id, sid);
    setOpenAnnId(null);
    // Update URL hash
    window.history.pushState(null, "", `#/stop/${curPath.id}/${sid}`);
  }

  function shareView() {
    const url = `${window.location.origin}${window.location.pathname}#/stop/${pathId}/${stopId}?yaw=${vs.yaw.toFixed(1)}&pitch=${vs.pitch.toFixed(1)}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {});
  }

  function shareAnnotation(annId: string) {
    const url = `${window.location.origin}${window.location.pathname}#/stop/${pathId}/${stopId}/ann/${annId}`;
    navigator.clipboard.writeText(url).catch(() => {});
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
    <main style={{ position: "relative", height: "calc(100vh - 57px)", overflow: "hidden", background: "#0B0F0E" }}>

      {/* Pannellum */}
      <div ref={viewerRef} style={{ position: "absolute", inset: 0, zIndex: 1 }} />

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
          const color = active ? "#C9F24D" : "rgba(201,242,77,.9)";
          const stroke = "#0B0F0E";

          if (ann.kind === "point") {
            const { x, y } = pts[0];
            return (
              <g key={ann.id} style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => { setOpenAnnId(ann.id === openAnnId ? null : ann.id); setAnnListOpen(false); }}>
                <circle cx={x} cy={y} r={14} fill="transparent" />
                <circle cx={x} cy={y} r={8} fill={color} stroke={stroke} strokeWidth={1.5} />
                <circle cx={x} cy={y} r={3} fill={stroke} />
              </g>
            );
          }

          const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

          if (ann.kind === "line") {
            return (
              <path key={ann.id} d={pathD} fill="none" stroke={color} strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round"
                style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => { setOpenAnnId(ann.id === openAnnId ? null : ann.id); setAnnListOpen(false); }} />
            );
          }
          if (ann.kind === "polygon" && pts.length >= 3) {
            return (
              <path key={ann.id} d={pathD + "Z"}
                fill={active ? "rgba(201,242,77,.35)" : "rgba(201,242,77,.18)"}
                stroke={color} strokeWidth={2} strokeLinejoin="round"
                style={{ pointerEvents: "auto", cursor: "pointer" }}
                onClick={() => { setOpenAnnId(ann.id === openAnnId ? null : ann.id); setAnnListOpen(false); }} />
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
        style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: (addAnnMode && !formVisible) || placingArrow ? "auto" : "none", cursor: (addAnnMode && !formVisible) || placingArrow ? "crosshair" : "default" }}
        onClick={handleCaptureClick}
        onMouseMove={handleCaptureMove}
        onMouseLeave={() => setCursorSphere(null)}
      />

      {/* ── Top-right: info card with X ───────────────────────────────────── */}
      {!openAnn && !formVisible && (
        <div style={{ position: "absolute", right: "clamp(12px,2vw,24px)", top: "clamp(12px,2vw,24px)", zIndex: 20, width: "min(310px,calc(100% - 80px))", pointerEvents: "auto" }}>
          <div style={{ padding: "14px 18px", borderRadius: 20, background: "rgba(255,253,248,.95)", border: "1px solid rgba(11,15,14,.16)", backdropFilter: "blur(10px)", boxShadow: "0 14px 34px -22px rgba(11,15,14,.7)", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#5A635F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {curPath.name.toUpperCase()} · STOP {stopIdx + 1} OF {curPath.stops.length}
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(18px,2vw,24px)", letterSpacing: "-.03em", lineHeight: 1.05, margin: "7px 0 6px" }}>
                {curStop.title}
              </h1>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".12em", color: "#5A635F" }}>
                {curStop.lat}, {curStop.lon}
              </div>
            </div>
            <button onClick={() => onNav("library")} title="Close" style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Top-left: rail ────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", left: "clamp(12px,2vw,24px)", top: "clamp(12px,2vw,24px)", zIndex: 20, width: "min(340px,calc(100% - 24px))", display: "flex", flexDirection: "column", gap: 12, pointerEvents: "none" }}>

        {/* Rail */}
        <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", gap: 8, width: 40 }}>
          <button onClick={() => { setAnnListOpen((o) => !o); setPathPanelOpen(false); setNavConfigOpen(false); setPlacingArrow(null); }} aria-label="Annotations" title="Annotations" style={railBtn(annListOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3.5" y="5" width="17" height="12.5" rx="4" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="8.6" cy="11.2" r="2" fill="currentColor" />
              <path d="M13 9.4h5M13 13.4h3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          {curPath.stops.length > 1 && (
            <button onClick={() => { setPathPanelOpen((o) => !o); setAnnListOpen(false); setNavConfigOpen(false); setPlacingArrow(null); }} aria-label="Path stops" title="Path stops" style={railBtn(pathPanelOpen)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 18l6-9 5 6 5-9" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 3" />
                <circle cx="4" cy="18" r="2.4" fill="currentColor" />
                <circle cx="20" cy="6" r="2.4" fill="currentColor" />
              </svg>
            </button>
          )}
          {curPath.stops.length > 1 && (
            <button onClick={() => { setNavConfigOpen((o) => !o); setAnnListOpen(false); setPathPanelOpen(false); setPlacingArrow(null); }} aria-label="Configure navigation arrows" title="Configure navigation arrows" style={railBtn(navConfigOpen)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
                      return {
                        id: `import_${Date.now()}_${i}`,
                        kind,
                        points,
                        title: String(props.title ?? props.name ?? `Imported ${i + 1}`),
                        note: String(props.description ?? props.note ?? props.body ?? ""),
                        refLink: String(props.refLink ?? props.url ?? ""),
                        refLabel: String(props.refLabel ?? ""),
                        added: new Date().toISOString().split("T")[0],
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
          <button onClick={() => { const on = !addAnnMode; setAddAnnMode(on); if (!on) resetAddAnn(); setAnnListOpen(false); setPathPanelOpen(false); setNavConfigOpen(false); setPlacingArrow(null); }} aria-label="Add annotation" title="Add annotation" style={railBtn(addAnnMode)}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M4 20h4l10.5-10.5a2.828 2.828 0 10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M14.5 5.5l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Annotations list panel */}
        {annListOpen && (
          <div style={{ pointerEvents: "auto", position: "absolute", left: 52, top: 118, width: "min(310px,calc(100vw - 90px))", maxHeight: "calc(100vh - 200px)", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", background: "rgba(255,253,248,.96)", border: "1px solid rgba(11,15,14,.14)", backdropFilter: "blur(10px)", boxShadow: "0 18px 42px -24px rgba(11,15,14,.8)" }}>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px 12px 18px", borderBottom: "1px solid rgba(11,15,14,.1)" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#5A635F" }}>ANNOTATIONS · {localAnns.length}</span>
              <button onClick={() => setAnnListOpen(false)} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
              {localAnns.length === 0 && (
                <div style={{ padding: "24px 18px", textAlign: "center", color: "#5A635F", fontSize: 13 }}>No annotations yet.</div>
              )}
              {localAnns.map((a) => (
                <button key={a.id} onClick={() => { setOpenAnnId(a.id === openAnnId ? null : a.id); setAnnListOpen(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 18px", border: "none", borderBottom: "1px solid rgba(11,15,14,.07)", cursor: "pointer", textAlign: "left", background: a.id === openAnnId ? "rgba(201,242,77,.28)" : "transparent", transition: "background .15s", fontFamily: "inherit" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <span style={{ width: 26, height: 26, borderRadius: a.kind === "point" ? 999 : a.kind === "polygon" ? 7 : 3, border: "1.5px solid #0B0F0E", background: a.kind === "point" ? "#C9F24D" : a.kind === "polygon" ? "rgba(201,242,77,.45)" : "#FFFDF8", display: "grid", placeItems: "center", flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10 }}>
                      {a.kind === "point" ? "•" : a.kind === "line" ? "∕" : "◇"}
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{a.title}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", color: "#5A635F" }}>{a.kind.toUpperCase()}{a.added ? ` · ${a.added}` : ""}</span>
                    </span>
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#5A635F" }}>↗</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Path panel */}
        {pathPanelOpen && (
          <div style={{ pointerEvents: "auto", position: "absolute", left: 52, top: 166, width: "min(310px,calc(100vw - 90px))", borderRadius: 20, overflow: "hidden", background: "#14504A", color: "#F4F2ED", border: "1px solid #0B0F0E", boxShadow: "0 18px 42px -24px rgba(11,15,14,.9)", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#C9F24D" }}>{curPath.name.toUpperCase()}</div>
              <button onClick={() => setPathPanelOpen(false)} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {curPath.stops.map((s, i) => {
                const on = i === stopIdx;
                return (
                  <button key={s.id} onClick={() => { onSelectStop(curPath.id, s.id); setPathPanelOpen(false); setOpenAnnId(null); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid", borderColor: on ? "#C9F24D" : "rgba(255,253,248,.14)", borderRadius: 12, background: on ? "rgba(201,242,77,.15)" : "rgba(255,253,248,.07)", cursor: "pointer", textAlign: "left", color: "#F4F2ED", fontFamily: "inherit", transition: "background .15s" }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, border: "2px solid", borderColor: on ? "#C9F24D" : "rgba(255,253,248,.4)", background: on ? "#C9F24D" : "transparent", color: on ? "#0B0F0E" : "rgba(255,253,248,.6)", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation arrow config panel */}
        {navConfigOpen && curPath.stops.length > 1 && (
          <div style={{ pointerEvents: "auto", position: "absolute", left: 52, top: 166, width: "min(310px,calc(100vw - 90px))", maxHeight: "calc(100vh - 220px)", overflowY: "auto", borderRadius: 20, background: "rgba(255,253,248,.96)", border: "1px solid rgba(11,15,14,.14)", backdropFilter: "blur(10px)", boxShadow: "0 18px 42px -24px rgba(11,15,14,.8)", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#5A635F" }}>NAVIGATION ARROWS</span>
              <button onClick={() => { setNavConfigOpen(false); setPlacingArrow(null); }} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
              </button>
            </div>

            {placingArrow && (
              <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, background: "#C9F24D", border: "1px solid #0B0F0E", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                Click in the panorama to place the {placingArrow === "next" ? "NEXT" : "PREV"} arrow
              </div>
            )}

            {/* Next stop arrow config */}
            {stopIdx < curPath.stops.length - 1 && (
              <div style={{ marginBottom: 14, padding: "14px", borderRadius: 14, border: "1px solid rgba(11,15,14,.12)", background: "#F7F6F1" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#14504A" }}>→</span> Next: {curPath.stops[stopIdx + 1].title}
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", color: "#5A635F", marginBottom: 4 }}>YAW</div>
                    <input
                      key={`next-yaw-${arrowConfig.nextArrow?.yaw}`}
                      type="number" step="0.1"
                      defaultValue={arrowConfig.nextArrow?.yaw ?? ""}
                      placeholder={bearingBetween(curStop.ll[0], curStop.ll[1], curPath.stops[stopIdx + 1].ll[0], curPath.stops[stopIdx + 1].ll[1]).toFixed(1)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const p = arrowConfig.nextArrow?.pitch ?? -10;
                          const nc = { ...arrowConfig, nextArrow: { yaw: val, pitch: p } };
                          setArrowConfig(nc); persistNavArrows(pathId, stopId, nc);
                        }
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(11,15,14,.18)", background: "#FFFDF8", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#0B0F0E", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", color: "#5A635F", marginBottom: 4 }}>PITCH</div>
                    <input
                      key={`next-pitch-${arrowConfig.nextArrow?.pitch}`}
                      type="number" step="0.1"
                      defaultValue={arrowConfig.nextArrow?.pitch ?? ""}
                      placeholder="-10.0"
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const fallbackYaw = bearingBetween(curStop.ll[0], curStop.ll[1], curPath.stops[stopIdx + 1].ll[0], curPath.stops[stopIdx + 1].ll[1]);
                          const y = arrowConfig.nextArrow?.yaw ?? fallbackYaw;
                          const nc = { ...arrowConfig, nextArrow: { yaw: y, pitch: val } };
                          setArrowConfig(nc); persistNavArrows(pathId, stopId, nc);
                        }
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(11,15,14,.18)", background: "#FFFDF8", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#0B0F0E", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setPlacingArrow(placingArrow === "next" ? null : "next")}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: placingArrow === "next" ? "1.5px solid #0B0F0E" : "1px solid rgba(11,15,14,.2)", background: placingArrow === "next" ? "#C9F24D" : "#FFFDF8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Instrument Sans',sans-serif" }}
                  >
                    {placingArrow === "next" ? "Placing…" : "Place in panorama"}
                  </button>
                  {arrowConfig.nextArrow && (
                    <button
                      onClick={() => { const nc = { ...arrowConfig }; delete nc.nextArrow; setArrowConfig(nc); persistNavArrows(pathId, stopId, nc); }}
                      style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(11,15,14,.2)", background: "#FFFDF8", fontSize: 12, cursor: "pointer", color: "#E71D36", fontFamily: "'Instrument Sans',sans-serif" }}
                    >Reset</button>
                  )}
                </div>
              </div>
            )}

            {/* Prev stop arrow config */}
            {stopIdx > 0 && (
              <div style={{ padding: "14px", borderRadius: 14, border: "1px solid rgba(11,15,14,.12)", background: "#F7F6F1" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#14504A" }}>←</span> Prev: {curPath.stops[stopIdx - 1].title}
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", color: "#5A635F", marginBottom: 4 }}>YAW</div>
                    <input
                      key={`prev-yaw-${arrowConfig.prevArrow?.yaw}`}
                      type="number" step="0.1"
                      defaultValue={arrowConfig.prevArrow?.yaw ?? ""}
                      placeholder={bearingBetween(curStop.ll[0], curStop.ll[1], curPath.stops[stopIdx - 1].ll[0], curPath.stops[stopIdx - 1].ll[1]).toFixed(1)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const p = arrowConfig.prevArrow?.pitch ?? -10;
                          const nc = { ...arrowConfig, prevArrow: { yaw: val, pitch: p } };
                          setArrowConfig(nc); persistNavArrows(pathId, stopId, nc);
                        }
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(11,15,14,.18)", background: "#FFFDF8", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#0B0F0E", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", color: "#5A635F", marginBottom: 4 }}>PITCH</div>
                    <input
                      key={`prev-pitch-${arrowConfig.prevArrow?.pitch}`}
                      type="number" step="0.1"
                      defaultValue={arrowConfig.prevArrow?.pitch ?? ""}
                      placeholder="-10.0"
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const fallbackYaw = bearingBetween(curStop.ll[0], curStop.ll[1], curPath.stops[stopIdx - 1].ll[0], curPath.stops[stopIdx - 1].ll[1]);
                          const y = arrowConfig.prevArrow?.yaw ?? fallbackYaw;
                          const nc = { ...arrowConfig, prevArrow: { yaw: y, pitch: val } };
                          setArrowConfig(nc); persistNavArrows(pathId, stopId, nc);
                        }
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(11,15,14,.18)", background: "#FFFDF8", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#0B0F0E", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setPlacingArrow(placingArrow === "prev" ? null : "prev")}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: placingArrow === "prev" ? "1.5px solid #0B0F0E" : "1px solid rgba(11,15,14,.2)", background: placingArrow === "prev" ? "#C9F24D" : "#FFFDF8", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Instrument Sans',sans-serif" }}
                  >
                    {placingArrow === "prev" ? "Placing…" : "Place in panorama"}
                  </button>
                  {arrowConfig.prevArrow && (
                    <button
                      onClick={() => { const nc = { ...arrowConfig }; delete nc.prevArrow; setArrowConfig(nc); persistNavArrows(pathId, stopId, nc); }}
                      style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(11,15,14,.2)", background: "#FFFDF8", fontSize: 12, cursor: "pointer", color: "#E71D36", fontFamily: "'Instrument Sans',sans-serif" }}
                    >Reset</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Annotation detail card ─────────────────────────────────────────── */}
      {openAnn && !formVisible && (
        <div style={{ position: "absolute", right: "clamp(12px,2vw,24px)", top: "clamp(12px,2vw,24px)", zIndex: 25, width: "min(310px,calc(100vw - 32px))", maxHeight: "calc(100% - 116px)", display: "flex", flexDirection: "column", borderRadius: 18, overflow: "hidden", background: "#FFFDF8", border: "1px solid #0B0F0E", boxShadow: "0 24px 56px -26px rgba(11,15,14,.95)" }}>
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 10px 14px", background: openAnn.color || "#C9F24D", borderBottom: "1px solid #0B0F0E" }}>
            <span style={{ flex: 1, minWidth: 0, fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: "-.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{openAnn.title}</span>
            <button
              title="Share annotation"
              onClick={() => shareAnnotation(openAnn.id)}
              style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "rgba(255,253,248,.3)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, color: "#0B0F0E" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M8.7 10.7l6.6-4.4M8.7 13.3l6.6 4.4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button onClick={() => setOpenAnnId(null)} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "rgba(255,253,248,.3)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "inset 0 0 0 1.5px rgba(11,15,14,.25)" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "16px 18px" }}>
            {(openAnn.note || openAnn.body) && <p style={{ margin: "0 0 14px", color: "#3E4744", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{openAnn.note || openAnn.body}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, paddingTop: (openAnn.note || openAnn.body) ? 14 : 0, borderTop: (openAnn.note || openAnn.body) ? "1px solid rgba(11,15,14,.1)" : "none" }}>
              {[
                { k: "KIND", v: openAnn.kind.toUpperCase() },
                { k: "CATEGORY", v: openAnn.category || "—" },
                { k: "PRIORITY", v: openAnn.priority || "—" },
                { k: "ADDED", v: openAnn.added || "—" },
              ].map(({ k, v }) => (
                <div key={k}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".14em", color: "#5A635F" }}>{k}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
            {openAnn.tags && openAnn.tags.length > 0 && (
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {openAnn.tags.map(t => (
                  <span key={t} style={{ padding: "4px 8px", borderRadius: 4, background: "rgba(11,15,14,.06)", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "#3E4744" }}>#{t}</span>
                ))}
              </div>
            )}
            {openAnn.refLink && (
              <a href={openAnn.refLink} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 14, fontSize: 13, color: "#14504A" }}>
                {openAnn.refLabel || openAnn.refLink}
              </a>
            )}
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
            <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#0B0F0E", fontWeight: 700 }}>NEW ANNOTATION</span>
            <button onClick={resetAddAnn} style={{ width: 28, height: 28, borderRadius: 999, border: "1px solid #0B0F0E", background: "#C9F24D", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "inset 0 0 0 1.5px rgba(11,15,14,.25)" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "18px 18px 8px" }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Title</label>
            <input value={annForm.title} onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))} placeholder="Bedding plane, 23°" style={inputStyle} />

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Note</label>
            <textarea value={annForm.note} onChange={(e) => setAnnForm((f) => ({ ...f, note: e.target.value }))} placeholder={"Write as much as the place deserves —\nhistory, detail, what to look for."} rows={5} style={{ ...inputStyle, resize: "none", lineHeight: 1.55 }} />

            <button style={{ width: "100%", marginTop: 16, padding: "13px 0", borderRadius: 10, border: "1.5px dashed rgba(11,15,14,.28)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, color: "#3E4744", fontFamily: "'Instrument Sans',sans-serif", fontWeight: 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.7" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" /><path d="M3 16l5-5 4 4 3-3 6 5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
              Attach a photo or clip
            </button>

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Tags (comma separated)</label>
            <input value={annForm.tags} onChange={(e) => setAnnForm((f) => ({ ...f, tags: e.target.value }))} placeholder="fault, sedimentary, fossil" style={inputStyle} />

            <div style={{ display: "flex", gap: 12, margin: "16px 0 6px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Category</label>
                <select value={annForm.category} onChange={(e) => setAnnForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
                  <option>Geology</option>
                  <option>Infrastructure</option>
                  <option>Biology</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Priority</label>
                <select value={annForm.priority} onChange={(e) => setAnnForm((f) => ({ ...f, priority: e.target.value as "Low"|"Medium"|"High" }))} style={inputStyle}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Color</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["#C9F24D", "#FF9F1C", "#2EC4B6", "#FFBF69", "#E71D36"].map(c => (
                <button
                  key={c}
                  onClick={() => setAnnForm(f => ({ ...f, color: c }))}
                  style={{ width: 24, height: 24, borderRadius: 999, border: annForm.color === c ? "2px solid #0B0F0E" : "1px solid rgba(11,15,14,.2)", background: c, cursor: "pointer" }}
                />
              ))}
            </div>

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
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".14em", color: "#5A635F" }}>{k}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, marginTop: 3, fontWeight: 600 }}>{v}</div>
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
            <button onClick={handleSave}
              style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "1px solid rgba(11,15,14,.2)", background: "#FFFDF8", fontFamily: "'Instrument Sans',sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#0B0F0E", transition: "background .15s, border-color .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.borderColor = "#0B0F0E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.borderColor = "rgba(11,15,14,.2)"; }}>
              Save annotation
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom-left: Compass + YAW / PITCH + share ──────────────────── */}
      <div style={{ position: "absolute", left: "clamp(12px,2vw,24px)", bottom: "clamp(12px,2vw,24px)", zIndex: 20, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
        {/* Compass */}
        <div style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(11,15,14,.62)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: `rotate(${-vs.yaw}deg)`, transition: "transform .15s ease-out" }}>
            {/* North needle */}
            <polygon points="10,2 8,10 12,10" fill="#C9F24D" />
            {/* South needle */}
            <polygon points="10,18 8,10 12,10" fill="rgba(255,253,248,.3)" />
            {/* N label */}
            <text x="10" y="5.5" textAnchor="middle" fill="#0B0F0E" fontSize="4" fontWeight="800" fontFamily="'JetBrains Mono',monospace">N</text>
          </svg>
        </div>
        <div style={{ padding: "9px 16px", borderRadius: 999, background: "rgba(11,15,14,.62)", backdropFilter: "blur(8px)", color: "#FFFDF8", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".08em", pointerEvents: "none", display: "flex", gap: 14 }}>
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
        <div style={{ position: "absolute", bottom: "clamp(12px,2vw,24px)", left: "50%", transform: "translateX(-50%)", zIndex: 25, display: "flex", alignItems: "center", gap: 2, padding: "6px", borderRadius: 999, background: "rgba(255,253,248,.97)", border: "1px solid rgba(11,15,14,.18)", backdropFilter: "blur(12px)", boxShadow: "0 12px 32px -16px rgba(11,15,14,.85)", whiteSpace: "nowrap" }}>
          {(["point", "line", "polygon"] as const).map((k) => (
            <button key={k} onClick={() => { setAddAnnKind(k); setDraftPts([]); setFormVisible(false); }}
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
            onClick={() => goToStop(arrow.stopId)}
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
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, letterSpacing: ".1em", color: "#FFFDF8", textTransform: "uppercase", maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
              {arrow.isNext ? "NEXT" : "PREV"}
            </span>
          </button>
        );
      })}
    </main>
  );
}
