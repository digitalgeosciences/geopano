import { useEffect, useRef, useState } from "react";
import db from "../data/db.json";
import type { Path, View } from "../types";
import { useIsMobile } from "../hooks/useWindowWidth";

const paths = db.paths as unknown as Path[];

interface Props {
  onNav: (v: View) => void;
  onSelectStop: (pathId: string, stopId: string) => void;
}

type BaseKey = "canvas" | "imagery" | "topo";

const BASE_DEFS: Record<BaseKey, [string, string | null]> = {
  canvas: ["Canvas/World_Light_Gray_Base", "Canvas/World_Light_Gray_Reference"],
  imagery: ["World_Imagery", "Reference/World_Boundaries_and_Places"],
  topo: ["World_Topo_Map", null],
};

const SCALE_STEPS = [
  500, 1000, 2000, 5000, 10_000, 20_000, 50_000,
  100_000, 200_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
];

function computeScale(zoom: number, lat: number, targetPx = 120) {
  const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const targetMeters = metersPerPx * targetPx;
  const nice = SCALE_STEPS.find((s) => s >= targetMeters / 2) ?? SCALE_STEPS[SCALE_STEPS.length - 1];
  const barPx = nice / metersPerPx;
  const label = nice >= 1000 ? `${nice / 1000} km` : `${nice} m`;
  return { barPx, label };
}

function esriUrl(name: string) {
  return `https://services.arcgisonline.com/ArcGIS/rest/services/${name}/MapServer/tile/{z}/{y}/{x}`;
}

// ── shared close button ───────────────────────────────────────────────────────
const closeBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 999, background: "#C9F24D",
  border: "1px solid #0B0F0E", cursor: "pointer", display: "grid",
  placeItems: "center", flexShrink: 0,
};
const CloseX = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
    <path d="M2 2l8 8M10 2L2 10" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ── Add Stop / Path modal ─────────────────────────────────────────────────────
function AddModal({ pathIdx, onClose }: { pathIdx: number; onClose: () => void }) {
  const [tab, setTab] = useState<"stop" | "path">("stop");
  const [stopName, setStopName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [selPath, setSelPath] = useState(pathIdx);
  const [pathName, setPathName] = useState("");
  const [pathCity, setPathCity] = useState("");
  const [done, setDone] = useState<"stop" | "path" | null>(null);

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(11,15,14,.18)", background: "#F7F6F1",
    fontFamily: "'Instrument Sans',sans-serif", fontSize: 14,
    color: "#0B0F0E", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontFamily: "'JetBrains Mono',monospace",
    fontSize: 10, letterSpacing: ".14em", color: "#5A635F", marginBottom: 6,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 800, background: "rgba(11,15,14,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "min(480px,100%)", borderRadius: 20, overflow: "hidden", background: "#FFFDF8", border: "1px solid #0B0F0E", boxShadow: "0 32px 72px -24px rgba(11,15,14,.9)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "14px 18px", borderBottom: "1px solid rgba(11,15,14,.1)" }}>
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {(["stop", "path"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setDone(null); }}
                style={{ padding: "7px 18px", borderRadius: 999, border: "1px solid", borderColor: tab === t ? "#0B0F0E" : "rgba(11,15,14,.18)", background: tab === t ? "#0B0F0E" : "transparent", color: tab === t ? "#C9F24D" : "#5A635F", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".14em", cursor: "pointer", transition: "all .15s" }}
              >
                {t === "stop" ? "NEW STOP" : "NEW PATH"}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={closeBtn}><CloseX /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 22px 22px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 22 }}>✓</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                {done === "stop" ? "Stop added" : "Path created"}
              </div>
              <div style={{ fontSize: 14, color: "#5A635F", marginBottom: 20 }}>
                {done === "stop" ? `Pinned to ${paths[selPath].name}` : `"${pathName}" is ready`}
              </div>
              <button onClick={onClose} style={{ padding: "12px 32px", borderRadius: 999, background: "#0B0F0E", color: "#C9F24D", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                Done
              </button>
            </div>
          ) : tab === "stop" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={lbl}>STOP NAME</span>
                <input value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="e.g. Wabah Crater Rim" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={lbl}>LATITUDE</span>
                  <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="22.9011" style={inp} />
                </div>
                <div>
                  <span style={lbl}>LONGITUDE</span>
                  <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="41.1392" style={inp} />
                </div>
              </div>
              <div>
                <span style={lbl}>ASSIGN TO PATH</span>
                <select value={selPath} onChange={(e) => setSelPath(Number(e.target.value))} style={{ ...inp, appearance: "none" as React.CSSProperties["appearance"] }}>
                  {paths.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => { if (stopName && lat && lng) setDone("stop"); }}
                disabled={!stopName || !lat || !lng}
                style={{ padding: "14px 0", borderRadius: 12, border: "none", background: (!stopName || !lat || !lng) ? "rgba(11,15,14,.1)" : "#C9F24D", color: (!stopName || !lat || !lng) ? "#9AA39E" : "#0B0F0E", fontWeight: 700, fontSize: 15, cursor: (!stopName || !lat || !lng) ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background .15s" }}
              >
                Add Stop
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={lbl}>PATH NAME</span>
                <input value={pathName} onChange={(e) => setPathName(e.target.value)} placeholder="e.g. Harrat Kishb Traverse" style={inp} />
              </div>
              <div>
                <span style={lbl}>REGION / CITY</span>
                <input value={pathCity} onChange={(e) => setPathCity(e.target.value)} placeholder="e.g. Hafir Kishb, Saudi Arabia" style={inp} />
              </div>
              <button
                onClick={() => { if (pathName && pathCity) setDone("path"); }}
                disabled={!pathName || !pathCity}
                style={{ padding: "14px 0", borderRadius: 12, border: "none", background: (!pathName || !pathCity) ? "rgba(11,15,14,.1)" : "#C9F24D", color: (!pathName || !pathCity) ? "#9AA39E" : "#0B0F0E", fontWeight: 700, fontSize: 15, cursor: (!pathName || !pathCity) ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background .15s" }}
              >
                Create Path
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function MapPage({ onNav, onSelectStop }: Props) {
  const isMobile = useIsMobile(768);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof window.L.map> | null>(null);
  const layerGroupRef = useRef<ReturnType<typeof window.L.layerGroup> | null>(null);
  const baseLayers = useRef<[unknown, unknown]>([null, null]);

  const [base, setBase] = useState<BaseKey>("canvas");
  const [layersOpen, setLayersOpen] = useState(false);
  const [pathIdx, setPathIdx] = useState(0);
  const [stopIdx, setStopIdx] = useState(0);
  const [panel, setPanel] = useState<"paths" | "stop" | "annotations" | "none">("none");
  const [addModalOpen, setAddModalOpen] = useState(false);

  // search & view-more per popover
  const [pathSearch, setPathSearch] = useState("");
  const [pathsExpanded, setPathsExpanded] = useState(false);
  const [annSearch, setAnnSearch] = useState("");
  const [annExpanded, setAnnExpanded] = useState(false);

  // map state
  const [query, setQuery] = useState("");
  const [annotations, setAnnotations] = useState<{ id: string; title: string; note: string; ll: [number, number] }[]>([]);
  const [mouseCoords, setMouseCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(4);

  const curPath = paths[pathIdx];
  const curStop = curPath.stops[Math.min(stopIdx, curPath.stops.length - 1)];

  // popover shared style
  const popoverStyle = (topOffset = 0): React.CSSProperties =>
    isMobile
      ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 600, borderRadius: "16px 16px 0 0", minHeight: "55vh", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "rgba(255,253,248,.99)", border: "1px solid rgba(11,15,14,.14)", backdropFilter: "blur(16px)", boxShadow: "0 -8px 32px -8px rgba(11,15,14,.3)" }
      : { position: "absolute", left: 52, top: topOffset, width: 300, borderRadius: 16, overflow: "hidden", background: "rgba(255,253,248,.97)", border: "1px solid rgba(11,15,14,.14)", backdropFilter: "blur(12px)", boxShadow: "0 12px 32px -16px rgba(11,15,14,.7)" };

  function applyBase(key: BaseKey, map: ReturnType<typeof window.L.map>) {
    const L = window.L;
    const [a, b] = baseLayers.current as [ReturnType<typeof L.tileLayer> | null, ReturnType<typeof L.tileLayer> | null];
    if (a) map.removeLayer(a);
    if (b) map.removeLayer(b);
    const [nameA, nameB] = BASE_DEFS[key];
    const la = L.tileLayer(esriUrl(nameA), { maxZoom: 16, attribution: "Esri, HERE, Garmin, &copy; OpenStreetMap contributors" }).addTo(map);
    la.setZIndex(1);
    const lb = nameB ? L.tileLayer(esriUrl(nameB), { maxZoom: 16, opacity: 0.9 }).addTo(map) : null;
    if (lb) lb.setZIndex(2);
    baseLayers.current = [la, lb];
  }

  function drawMap(map: ReturnType<typeof window.L.map>, lg: ReturnType<typeof window.L.layerGroup>, selPath: number, selStop: number, q: string) {
    const L = window.L;
    lg.clearLayers();
    const lq = q.trim().toLowerCase();
    paths.forEach((p, pi) => {
      const hit = !lq || (p.name + " " + p.city + " " + p.stops.map((s) => s.title).join(" ")).toLowerCase().includes(lq);
      if (!hit) return;
      const isSel = pi === selPath;
      L.polyline(p.stops.map((s) => s.ll as [number, number]), { color: "#0B0F0E", weight: isSel ? 2 : 1.2, opacity: isSel ? 1 : 0.35, dashArray: "5 5" }).addTo(lg);
      const z = map.getZoom();
      const size = z >= 11 ? 14 : 9;
      p.stops.forEach((s, si) => {
        const active = isSel && si === selStop;
        const visited = isSel && si < selStop;
        const cls = "gp-pin" + (active ? " is-active" : visited ? " is-visited" : "");
        L.marker(s.ll as [number, number], {
          icon: L.divIcon({ className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<div class="${cls}" style="width:${size}px;height:${size}px;opacity:${isSel ? 1 : 0.62}"></div>` }),
          title: s.title,
        }).addTo(lg).on("click", () => { setPathIdx(pi); setStopIdx(si); setPanel("stop"); });
      });
    });
  }

  useEffect(() => {
    if (!mapDivRef.current || !window.L) return;
    const L = window.L;
    if (mapRef.current) return;
    const map = L.map(mapDivRef.current, { zoomControl: false, attributionControl: true, worldCopyJump: true }).setView([25, 30], 4);
    const lg = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = lg;
    applyBase("canvas", map);
    map.on("mousemove", (e: { latlng: { lat: number; lng: number } }) => setMouseCoords({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.on("mouseout", () => setMouseCoords(null));
    map.on("zoomend", () => { setZoom(map.getZoom()); drawMap(map, lg, pathIdx, stopIdx, query); });
    drawMap(map, lg, pathIdx, stopIdx, query);
    return () => { map.remove(); mapRef.current = null; layerGroupRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && layerGroupRef.current) drawMap(mapRef.current, layerGroupRef.current, pathIdx, stopIdx, query);
  }, [pathIdx, stopIdx, query]);

  useEffect(() => { if (mapRef.current) applyBase(base, mapRef.current); }, [base]);

  function flyToPath(pi: number) {
    setPathIdx(pi); setStopIdx(0); setPanel("paths");
    if (mapRef.current) {
      const p = paths[pi];
      mapRef.current.flyToBounds(p.stops.map((s) => s.ll as [number, number]), { padding: [140, 140], maxZoom: 15, duration: 1.1 } as Parameters<typeof mapRef.current.flyToBounds>[1]);
    }
  }

  const railBtn = (on: boolean): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer",
    boxShadow: "0 8px 20px -14px rgba(11,15,14,.7)",
    border: on ? "1px solid #0B0F0E" : "1px solid rgba(11,15,14,.2)",
    background: on ? "#C9F24D" : "#FFFDF8", color: on ? "#0B0F0E" : "#3E4744", transition: "background .2s, border .2s",
  });

  const searchBar = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 12px 0", padding: "8px 12px", borderRadius: 10, background: "#F4F2ED", border: "1px solid rgba(11,15,14,.1)" }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#9AA39E" strokeWidth="1.6" /><path d="M11 11l3.4 3.4" stroke="#9AA39E" strokeWidth="1.6" strokeLinecap="round" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Instrument Sans',sans-serif", fontSize: 12, color: "#0B0F0E", width: "100%" }} />
      {value && <button onClick={() => onChange("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "#9AA39E", lineHeight: 1, fontSize: 14 }}>×</button>}
    </div>
  );

  // filtered lists
  const filteredPaths = paths.filter((p) => {
    const q = pathSearch.trim().toLowerCase();
    return !q || (p.name + " " + p.city).toLowerCase().includes(q);
  });
  const visiblePaths = pathsExpanded ? filteredPaths : filteredPaths.slice(0, 5);

  const filteredAnns = annotations.filter((a) => {
    const q = annSearch.trim().toLowerCase();
    return !q || a.title.toLowerCase().includes(q) || a.note.toLowerCase().includes(q);
  });
  const visibleAnns = annExpanded ? filteredAnns : filteredAnns.slice(0, 5);

  // stops in selected path
  const pathStops = curPath.stops;
  const [stopsExpanded, setStopsExpanded] = useState(false);
  const visibleStops = stopsExpanded ? pathStops : pathStops.slice(0, 5);

  return (
    <main style={{ position: "relative", height: "calc(100vh - 57px)", overflow: "hidden" }}>
      <div ref={mapDivRef} style={{ position: "absolute", inset: 0, background: "#E4E0D6" }} />

      {/* ── Add Stop/Path modal ─────────────────────────────────────────── */}
      {addModalOpen && <AddModal pathIdx={pathIdx} onClose={() => setAddModalOpen(false)} />}

      {/* ── Left rail ──────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", left: "clamp(12px,2vw,24px)", top: "clamp(12px,2vw,24px)", zIndex: 500, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>

        {/* Top search bar */}
        <label style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 999, background: "rgba(255,253,248,.95)", border: "1px solid rgba(11,15,14,.16)", backdropFilter: "blur(10px)", boxShadow: "0 8px 20px -14px rgba(11,15,14,.55)", width: isMobile ? 180 : 220 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#5A635F" strokeWidth="1.6" /><path d="M11 11l3.4 3.4" stroke="#5A635F" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search paths or stops" style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Instrument Sans',sans-serif", fontSize: 13, color: "#0B0F0E", width: "100%" }} />
        </label>

        {/* Icon rail */}
        <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", gap: 6 }}>

          {/* ── Paths icon ── */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setPanel((p) => (p === "paths" || p === "stop" ? "none" : "paths"))} aria-label="Paths & stops" title="Paths & stops" style={railBtn(panel === "paths" || panel === "stop")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 18l6-9 5 6 5-9" stroke="currentColor" strokeWidth="1.8" strokeDasharray="4 3" /><circle cx="4" cy="18" r="2.4" fill="currentColor" /><circle cx="20" cy="6" r="2.4" fill="currentColor" /></svg>
            </button>

            {(panel === "paths" || panel === "stop") && (
              <div style={{ ...popoverStyle(0), display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 8px" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".18em", color: "#5A635F" }}>PATHS · {filteredPaths.length}</span>
                  <button onClick={() => setPanel("none")} style={closeBtn}><CloseX /></button>
                </div>
                {/* Search inside popover */}
                <div style={{ flexShrink: 0, paddingBottom: 10 }}>
                  {searchBar(pathSearch, (v) => { setPathSearch(v); setPathsExpanded(false); }, "Search paths…")}
                </div>
                {/* Path list */}
                <div style={{ flex: isMobile ? 1 : undefined, maxHeight: isMobile ? "none" : 220, overflowY: "auto" }}>
                  {visiblePaths.map((p) => {
                    const pi = paths.indexOf(p);
                    const on = pi === pathIdx;
                    return (
                      <button key={p.id} onClick={() => flyToPath(pi)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "none", borderBottom: "1px solid rgba(11,15,14,.06)", cursor: "pointer", textAlign: "left", background: on ? "rgba(201,242,77,.28)" : "transparent", transition: "background .12s", fontFamily: "inherit" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, border: "1px solid #0B0F0E", background: on ? "#C9F24D" : "#FFFDF8", display: "block" }} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".1em", color: "#5A635F" }}>{p.city} · {p.stops.length} STOP{p.stops.length !== 1 ? "S" : ""}</span>
                        </span>
                      </button>
                    );
                  })}
                  {filteredPaths.length > 5 && (
                    <button onClick={() => setPathsExpanded((x) => !x)}
                      style={{ width: "100%", padding: "9px 14px", border: "none", borderBottom: "1px solid rgba(11,15,14,.06)", cursor: "pointer", textAlign: "left", background: "transparent", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".14em", color: "#14504A" }}>
                      {pathsExpanded ? "SHOW LESS ↑" : `VIEW MORE (${filteredPaths.length - 5}) ↓`}
                    </button>
                  )}
                </div>
                {/* Selected stop section */}
                {panel === "stop" && (
                  <div style={{ flexShrink: 0, borderTop: "1px solid rgba(11,15,14,.1)", background: "rgba(11,15,14,.02)" }}>
                    <div style={{ padding: "10px 14px 4px", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".16em", color: "#5A635F" }}>
                      STOPS IN {curPath.name.toUpperCase()}
                    </div>
                    {visibleStops.map((s, si) => {
                      const active = si === stopIdx;
                      return (
                        <button key={s.id} onClick={() => setStopIdx(si)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", border: "none", borderBottom: "1px solid rgba(11,15,14,.05)", cursor: "pointer", textAlign: "left", background: active ? "rgba(201,242,77,.22)" : "transparent", fontFamily: "inherit", transition: "background .12s" }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#9AA39E", flexShrink: 0, width: 18 }}>{(si + 1).toString().padStart(2, "0")}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</span>
                          {active && <span style={{ fontSize: 10, color: "#14504A", flexShrink: 0 }}>●</span>}
                        </button>
                      );
                    })}
                    {pathStops.length > 5 && (
                      <button onClick={() => setStopsExpanded((x) => !x)}
                        style={{ width: "100%", padding: "8px 14px", border: "none", cursor: "pointer", textAlign: "left", background: "transparent", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".14em", color: "#14504A" }}>
                        {stopsExpanded ? "SHOW LESS ↑" : `VIEW MORE (${pathStops.length - 5}) ↓`}
                      </button>
                    )}
                    {/* CTA row */}
                    <div style={{ padding: "10px 14px 14px", display: "flex", gap: 7 }}>
                      <button onClick={() => { onSelectStop(curPath.id, curStop.id); onNav("stop"); }}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        View 360° ↗
                      </button>
                      <button onClick={() => setStopIdx((i) => Math.min(i + 1, curPath.stops.length - 1))} disabled={stopIdx >= curPath.stops.length - 1}
                        style={{ padding: "9px 12px", borderRadius: 999, background: "transparent", border: "1px solid rgba(11,15,14,.22)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", opacity: stopIdx >= curPath.stops.length - 1 ? 0.35 : 1 }}>
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Annotations icon ── */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setPanel((p) => (p === "annotations" ? "none" : "annotations"))} aria-label="Annotations" title="Annotations" style={railBtn(panel === "annotations")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="M8 20l4-4h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>

            {panel === "annotations" && (
              <div style={{ ...popoverStyle(0), display: "flex", flexDirection: "column" }}>
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 8px" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".18em", color: "#5A635F" }}>ANNOTATIONS · {filteredAnns.length}</span>
                  <button onClick={() => setPanel("none")} style={closeBtn}><CloseX /></button>
                </div>
                <div style={{ flexShrink: 0, paddingBottom: 10 }}>
                  {searchBar(annSearch, (v) => { setAnnSearch(v); setAnnExpanded(false); }, "Search annotations…")}
                </div>
                <div style={{ flex: isMobile ? 1 : undefined, maxHeight: isMobile ? "none" : 240, overflowY: "auto" }}>
                  {filteredAnns.length === 0 ? (
                    <div style={{ padding: "24px 14px", textAlign: "center", color: "#9AA39E", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em" }}>
                      {annSearch ? "NO MATCHES" : "NO ANNOTATIONS YET"}
                    </div>
                  ) : visibleAnns.map((a) => (
                    <div key={a.id} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(11,15,14,.06)", display: "flex", alignItems: "flex-start", gap: 9 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: "#C9F24D", border: "1px solid #0B0F0E", display: "block", flexShrink: 0, marginTop: 4 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#5A635F" }}>{a.ll[0].toFixed(3)}, {a.ll[1].toFixed(3)}</div>
                      </div>
                      <button onClick={() => setAnnotations((prev) => prev.filter((x) => x.id !== a.id))} style={{ ...closeBtn, width: 22, height: 22 }}><CloseX /></button>
                    </div>
                  ))}
                  {filteredAnns.length > 5 && (
                    <button onClick={() => setAnnExpanded((x) => !x)}
                      style={{ width: "100%", padding: "9px 14px", border: "none", cursor: "pointer", textAlign: "left", background: "transparent", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".14em", color: "#14504A" }}>
                      {annExpanded ? "SHOW LESS ↑" : `VIEW MORE (${filteredAnns.length - 5}) ↓`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Add Stop/Path icon ── */}
          <button onClick={() => setAddModalOpen(true)} aria-label="Add stop or path" title="Add stop or path" style={railBtn(addModalOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M12 7v6M9 10h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          {/* ── Upload GeoJSON icon ── */}
          <button
            onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".geojson,application/geo+json,application/json"; inp.onchange = () => { if (inp.files?.[0]) alert("GeoJSON uploaded: " + inp.files[0].name); }; inp.click(); }}
            aria-label="Upload GeoJSON" title="Upload GeoJSON" style={railBtn(false)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 14V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      {/* ── Right: layers ──────────────────────────────────────────────────── */}
      <div style={{ position: "absolute", right: "clamp(12px,2vw,24px)", top: "clamp(12px,2vw,24px)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <button onClick={() => setLayersOpen((o) => !o)} aria-label="Map layers" style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 8px 20px -14px rgba(11,15,14,.7)", border: layersOpen ? "1px solid #0B0F0E" : "1px solid rgba(11,15,14,.2)", background: layersOpen ? "#C9F24D" : "#FFFDF8", color: layersOpen ? "#0B0F0E" : "#3E4744", transition: "background .2s, border .2s" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3.6l8.4 4.3-8.4 4.3-8.4-4.3 8.4-4.3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M4.6 12.4l7.4 3.8 7.4-3.8M4.6 16.4l7.4 3.8 7.4-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        </button>
        {layersOpen && (
          <div style={{ width: 200, borderRadius: 16, overflow: "hidden", background: "rgba(255,253,248,.96)", border: "1px solid rgba(11,15,14,.14)", backdropFilter: "blur(10px)", boxShadow: "0 16px 38px -22px rgba(11,15,14,.8)" }}>
            <div style={{ padding: "11px 14px 10px", borderBottom: "1px solid rgba(11,15,14,.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#5A635F" }}>BASEMAP</span>
              <button onClick={() => setLayersOpen(false)} style={closeBtn}><CloseX /></button>
            </div>
            {(["canvas", "imagery", "topo"] as BaseKey[]).map((k) => (
              <button key={k} onClick={() => { setBase(k); setLayersOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", border: "none", borderBottom: "1px solid rgba(11,15,14,.07)", cursor: "pointer", textAlign: "left", background: base === k ? "rgba(201,242,77,.28)" : "transparent", transition: "background .15s" }}>
                <span style={{ fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{k}</span>
                {base === k && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#0B0F0E" }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scale bar + coordinates ──────────────────────────────────────── */}
      {(() => {
        const scaleLat = mouseCoords?.lat ?? 25;
        const { barPx, label } = computeScale(zoom, scaleLat);
        const fmtDeg = (val: number, pos: string, neg: string) => `${Math.abs(val).toFixed(4)}° ${val >= 0 ? pos : neg}`;
        return (
          <div style={{ position: "absolute", left: "clamp(12px,2vw,24px)", bottom: "clamp(12px,2vw,24px)", zIndex: isMobile ? 499 : 500, display: "flex", alignItems: "center", gap: 18, padding: "9px 16px", borderRadius: 12, background: "rgba(255,253,248,.95)", border: "1px solid rgba(11,15,14,.16)", backdropFilter: "blur(10px)", boxShadow: "0 8px 20px -14px rgba(11,15,14,.55)", pointerEvents: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
              <div style={{ position: "relative", height: 10, width: barPx, flexShrink: 0 }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 1.5, height: 10, background: "#0B0F0E", borderRadius: 1 }} />
                <div style={{ position: "absolute", left: barPx / 2 - 0.75, top: 3, width: 1.5, height: 7, background: "#0B0F0E", borderRadius: 1 }} />
                <div style={{ position: "absolute", right: 0, top: 0, width: 1.5, height: 10, background: "#0B0F0E", borderRadius: 1 }} />
                <div style={{ position: "absolute", left: 0, top: 4, height: 3, width: barPx / 2, background: "#0B0F0E" }} />
                <div style={{ position: "absolute", left: barPx / 2, top: 4, height: 3, width: barPx / 2, background: "rgba(11,15,14,.18)" }} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".14em", color: "#5A635F" }}>{label}</span>
            </div>
            <div style={{ width: 1, height: 28, background: "rgba(11,15,14,.12)", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {mouseCoords ? (
                <>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", color: "#0B0F0E" }}>{fmtDeg(mouseCoords.lat, "N", "S")}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", color: "#0B0F0E" }}>{fmtDeg(mouseCoords.lng, "E", "W")}</span>
                </>
              ) : (
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", color: "#9AA39E" }}>— move cursor —</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Zoom controls ───────────────────────────────────────────────── */}
      <div style={{ position: "absolute", right: "clamp(12px,2vw,24px)", bottom: "clamp(12px,2vw,24px)", zIndex: isMobile ? 499 : 500, display: "flex", flexDirection: "column", gap: 8 }}>
        {[{ label: "+", action: () => mapRef.current?.zoomIn() }, { label: "−", action: () => mapRef.current?.zoomOut() }].map(({ label, action }) => (
          <button key={label} onClick={action} style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFDF8", border: "1px solid rgba(11,15,14,.2)", fontSize: 17, cursor: "pointer", boxShadow: "0 8px 20px -14px rgba(11,15,14,.7)", transition: "background .2s, border .2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.borderColor = "#0B0F0E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.borderColor = "rgba(11,15,14,.2)"; }}>
            {label}
          </button>
        ))}
        <button onClick={() => mapRef.current?.fitWorld()} aria-label="Reset view" style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFDF8", border: "1px solid rgba(11,15,14,.2)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 8px 20px -14px rgba(11,15,14,.7)", transition: "background .2s, border .2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.borderColor = "#0B0F0E"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.borderColor = "rgba(11,15,14,.2)"; }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 7V4.6A1.6 1.6 0 014.6 3H7M13 3h2.4A1.6 1.6 0 0117 4.6V7M17 13v2.4a1.6 1.6 0 01-1.6 1.6H13M7 17H4.6A1.6 1.6 0 013 15.4V13" stroke="#0B0F0E" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="10" r="1.7" fill="#0B0F0E" /></svg>
        </button>
      </div>
    </main>
  );
}
