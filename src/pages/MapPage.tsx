import { useEffect, useRef, useState } from "react";
import type { Path, Stop, View } from "../types";
import { useIsMobile } from "../hooks/useWindowWidth";
import {
  getAllPaths,
  registerPanoramaUrl,
  createStandaloneStop,
  createNewPathWithStop,
  addStopToPath,
} from "../data/pathsData";

interface Props {
  onNav: (v: View) => void;
  onSelectStop: (pathId: string, stopId: string) => void;
  selectedPathId?: string;
  selectedStopId?: string;
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
interface AddModalProps {
  paths: Path[];
  pathIdx: number;
  initialLat?: string;
  initialLng?: string;
  onClose: () => void;
  onPickOnMap: () => void;
  onCreated: (path: Path, stopId?: string) => void;
  onNavTo360: (pathId: string, stopId: string) => void;
}

function AddModal({
  paths,
  pathIdx,
  initialLat,
  initialLng,
  onClose,
  onPickOnMap,
  onCreated,
  onNavTo360,
}: AddModalProps) {
  const [tab, setTab] = useState<"stop" | "path">("stop");

  // Stop fields
  const [stopName, setStopName] = useState("");
  const [lat, setLat] = useState(initialLat || "");
  const [lng, setLng] = useState(initialLng || "");
  const [blurb, setBlurb] = useState("");

  // 360 Panorama fields
  const [panoMode, setPanoMode] = useState<"upload" | "url">("upload");
  const [panoFile, setPanoFile] = useState<File | null>(null);
  const [panoPreview, setPanoPreview] = useState<string>("");
  const [panoUrl, setPanoUrl] = useState<string>("");

  // Destination mode (independent / not forced to existing data)
  const [destMode, setDestMode] = useState<"standalone" | "new_path" | "existing_path">("standalone");
  const [newPathName, setNewPathName] = useState("");
  const [newPathCity, setNewPathCity] = useState("");
  const [selPathId, setSelPathId] = useState(paths[pathIdx]?.id || paths[0]?.id || "");

  // Path tab fields
  const [pathName, setPathName] = useState("");
  const [pathCity, setPathCity] = useState("");

  // Success result
  const [doneInfo, setDoneInfo] = useState<{ path: Path; stop?: Stop } | null>(null);

  useEffect(() => {
    if (initialLat) setLat(initialLat);
    if (initialLng) setLng(initialLng);
  }, [initialLat, initialLng]);

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(11,15,14,.18)", background: "#F7F6F1",
    fontFamily: "'Instrument Sans',sans-serif", fontSize: 13,
    color: "#0B0F0E", outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontFamily: "'JetBrains Mono',monospace",
    fontSize: 10, letterSpacing: ".14em", color: "#5A635F", marginBottom: 6,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPanoFile(file);
      const preview = URL.createObjectURL(file);
      setPanoPreview(preview);
    }
  };

  const handleStopSubmit = () => {
    if (!stopName.trim() || !lat.trim() || !lng.trim()) return;
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) return;

    const stopId = `sp_${Date.now()}`;
    let finalPano = "/uploads/sp00009.jpg";

    if (panoMode === "upload" && panoFile) {
      const objUrl = panoPreview || URL.createObjectURL(panoFile);
      registerPanoramaUrl(stopId, objUrl);
      finalPano = objUrl;
    } else if (panoMode === "url" && panoUrl.trim()) {
      finalPano = panoUrl.trim();
    }

    const newStop: Stop = {
      id: stopId,
      title: stopName.trim(),
      ll: [numLat, numLng],
      lat: `${Math.abs(numLat).toFixed(4)}° ${numLat >= 0 ? "N" : "S"}`,
      lon: `${Math.abs(numLng).toFixed(4)}° ${numLng >= 0 ? "E" : "W"}`,
      blurb: blurb.trim() || "Field outcrop and geological observation point.",
      panorama: finalPano,
      annotations: [],
    };

    let targetPath: Path;
    if (destMode === "standalone") {
      targetPath = createStandaloneStop(newStop, newPathCity.trim() || "Outcrop Station");
    } else if (destMode === "new_path") {
      targetPath = createNewPathWithStop(newPathName.trim() || stopName.trim(), newPathCity.trim() || "Saudi Arabia", newStop);
    } else {
      targetPath = addStopToPath(selPathId, newStop);
    }

    setDoneInfo({ path: targetPath, stop: newStop });
    onCreated(targetPath, stopId);
  };

  const handlePathSubmit = () => {
    if (!pathName.trim() || !pathCity.trim()) return;
    const targetPath = createNewPathWithStop(pathName.trim(), pathCity.trim());
    setDoneInfo({ path: targetPath });
    onCreated(targetPath);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 800, background: "rgba(11,15,14,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "min(520px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", borderRadius: 20, overflow: "hidden", background: "#FFFDF8", border: "1px solid #0B0F0E", boxShadow: "0 32px 72px -24px rgba(11,15,14,.9)" }}>
        {/* Header */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(11,15,14,.1)" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["stop", "path"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setDoneInfo(null); }}
                style={{ padding: "7px 18px", borderRadius: 999, border: "1px solid", borderColor: tab === t ? "#0B0F0E" : "rgba(11,15,14,.18)", background: tab === t ? "#0B0F0E" : "transparent", color: tab === t ? "#C9F24D" : "#5A635F", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".14em", cursor: "pointer", transition: "all .15s" }}
              >
                {t === "stop" ? "NEW STOP / 360°" : "NEW PATH"}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={closeBtn}><CloseX /></button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {doneInfo ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 24 }}>✓</div>
              <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 6 }}>
                {doneInfo.stop ? "360° Stop Added Successfully" : "Path Created Successfully"}
              </div>
              <p style={{ fontSize: 14, color: "#5A635F", margin: "0 auto 20px", maxWidth: 360 }}>
                {doneInfo.stop
                  ? `"${doneInfo.stop.title}" is ready and pinned at ${doneInfo.stop.lat}, ${doneInfo.stop.lon}.`
                  : `"${doneInfo.path.name}" has been created and saved.`}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
                {doneInfo.stop && (
                  <button
                    onClick={() => {
                      onNavTo360(doneInfo.path.id, doneInfo.stop!.id);
                    }}
                    style={{ padding: "12px 24px", borderRadius: 999, background: "#C9F24D", color: "#0B0F0E", fontWeight: 700, fontSize: 14, border: "1px solid #0B0F0E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform .1s" }}
                  >
                    <span>Open in 360° Viewer</span>
                    <span>↗</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{ padding: "12px 24px", borderRadius: 999, background: "#0B0F0E", color: "#FFFDF8", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer" }}
                >
                  View on Map
                </button>
              </div>
            </div>
          ) : tab === "stop" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Stop title */}
              <div>
                <span style={lbl}>STOP / STATION NAME *</span>
                <input value={stopName} onChange={(e) => setStopName(e.target.value)} placeholder="e.g. Al-Wahbah Crater Rim" style={inp} />
              </div>

              {/* 360 Panorama Source */}
              <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(11,15,14,.03)", border: "1px solid rgba(11,15,14,.1)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={lbl}>360° EQUIRECTANGULAR PANORAMA</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setPanoMode("upload")}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", border: "1px solid", borderColor: panoMode === "upload" ? "#0B0F0E" : "transparent", background: panoMode === "upload" ? "#0B0F0E" : "transparent", color: panoMode === "upload" ? "#C9F24D" : "#5A635F", cursor: "pointer" }}
                    >
                      FILE
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanoMode("url")}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", border: "1px solid", borderColor: panoMode === "url" ? "#0B0F0E" : "transparent", background: panoMode === "url" ? "#0B0F0E" : "transparent", color: panoMode === "url" ? "#C9F24D" : "#5A635F", cursor: "pointer" }}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {panoMode === "upload" ? (
                  <div>
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 14px", border: "1.5px dashed rgba(11,15,14,.25)", borderRadius: 10, background: "#FFFDF8", cursor: "pointer", transition: "border .15s" }}>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: "none" }} />
                      <div style={{ width: 32, height: 32, borderRadius: 999, background: "#C9F24D", display: "grid", placeItems: "center", border: "1px solid #0B0F0E", marginBottom: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V3M8 7l4-4 4 4" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 17v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2" stroke="#0B0F0E" strokeWidth="1.8" strokeLinecap="round" /></svg>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0B0F0E" }}>
                        {panoFile ? panoFile.name : "Choose 360° Photo (.jpg / .png)"}
                      </span>
                      <span style={{ fontSize: 11, color: "#5A635F", marginTop: 2 }}>
                        {panoFile ? `${(panoFile.size / 1024 / 1024).toFixed(2)} MB — Ready to view in 360°` : "Equirectangular 2:1 image recommended"}
                      </span>
                    </label>
                    {panoPreview && (
                      <div style={{ marginTop: 10, position: "relative", height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(11,15,14,.15)" }}>
                        <img src={panoPreview} alt="Panorama preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <span style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(11,15,14,.75)", color: "#C9F24D", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontFamily: "'JetBrains Mono',monospace" }}>360° LOADED</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      value={panoUrl}
                      onChange={(e) => setPanoUrl(e.target.value)}
                      placeholder="https://... or /uploads/sp00001.jpg"
                      style={inp}
                    />
                    <span style={{ display: "block", fontSize: 11, color: "#5A635F", marginTop: 4 }}>
                      Leave blank to use the default high-resolution geological panorama.
                    </span>
                  </div>
                )}
              </div>

              {/* Coordinates */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={lbl}>COORDINATES *</span>
                  <button
                    type="button"
                    onClick={onPickOnMap}
                    style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(11,15,14,.2)", background: "#FFFDF8", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#0B0F0E", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <span>📍</span>
                    <span>Pick on map</span>
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude (e.g. 24.5281)" style={inp} />
                  </div>
                  <div>
                    <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude (e.g. 46.3950)" style={inp} />
                  </div>
                </div>
              </div>

              {/* Geological notes */}
              <div>
                <span style={lbl}>DESCRIPTION / FIELD OBSERVATIONS</span>
                <textarea
                  value={blurb}
                  onChange={(e) => setBlurb(e.target.value)}
                  placeholder="Lithology, stratigraphic unit, jointing, dip/strike notes..."
                  rows={2}
                  style={{ ...inp, resize: "vertical" }}
                />
              </div>

              {/* Destination Mode: Standalone, New Path, or Existing */}
              <div style={{ borderTop: "1px solid rgba(11,15,14,.1)", paddingTop: 14 }}>
                <span style={lbl}>SUBMISSION MODE (NOT FORCED TO EXISTING DATA)</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { id: "standalone", title: "Standalone Stop", desc: "No path" },
                    { id: "new_path", title: "New Path", desc: "Create path" },
                    { id: "existing_path", title: "Existing Path", desc: "Link to path" },
                  ].map((m) => {
                    const active = destMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setDestMode(m.id as typeof destMode)}
                        style={{ padding: "10px 8px", borderRadius: 10, border: active ? "1.5px solid #0B0F0E" : "1px solid rgba(11,15,14,.15)", background: active ? "rgba(201,242,77,.25)" : "#FFFDF8", cursor: "pointer", textAlign: "center", transition: "all .12s" }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#0B0F0E" }}>{m.title}</div>
                        <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "#5A635F", marginTop: 2 }}>{m.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {destMode === "standalone" && (
                  <div>
                    <span style={lbl}>LOCATION / OUTCROP AREA</span>
                    <input
                      value={newPathCity}
                      onChange={(e) => setNewPathCity(e.target.value)}
                      placeholder="e.g. Tuwaiq Escarpment, Saudi Arabia"
                      style={inp}
                    />
                  </div>
                )}

                {destMode === "new_path" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <span style={lbl}>NEW PATH NAME *</span>
                      <input
                        value={newPathName}
                        onChange={(e) => setNewPathName(e.target.value)}
                        placeholder="e.g. AlUla Sandstone Traverse"
                        style={inp}
                      />
                    </div>
                    <div>
                      <span style={lbl}>REGION / CITY</span>
                      <input
                        value={newPathCity}
                        onChange={(e) => setNewPathCity(e.target.value)}
                        placeholder="e.g. AlUla, Saudi Arabia"
                        style={inp}
                      />
                    </div>
                  </div>
                )}

                {destMode === "existing_path" && (
                  <div>
                    <span style={lbl}>CHOOSE EXISTING PATH</span>
                    <select
                      value={selPathId}
                      onChange={(e) => setSelPathId(e.target.value)}
                      style={{ ...inp, appearance: "none" as React.CSSProperties["appearance"] }}
                    >
                      {paths.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.stops.length} stops)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <div style={{ paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={handleStopSubmit}
                  disabled={!stopName.trim() || !lat.trim() || !lng.trim() || (destMode === "new_path" && !newPathName.trim())}
                  style={{
                    width: "100%", padding: "13px 0", borderRadius: 12, border: "1px solid #0B0F0E",
                    background: (!stopName.trim() || !lat.trim() || !lng.trim() || (destMode === "new_path" && !newPathName.trim())) ? "rgba(11,15,14,.1)" : "#C9F24D",
                    color: (!stopName.trim() || !lat.trim() || !lng.trim() || (destMode === "new_path" && !newPathName.trim())) ? "#9AA39E" : "#0B0F0E",
                    fontWeight: 700, fontSize: 14, cursor: (!stopName.trim() || !lat.trim() || !lng.trim() || (destMode === "new_path" && !newPathName.trim())) ? "not-allowed" : "pointer",
                    fontFamily: "inherit", transition: "background .15s",
                  }}
                >
                  Submit Stop &amp; 360° Panorama
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <span style={lbl}>PATH NAME *</span>
                <input value={pathName} onChange={(e) => setPathName(e.target.value)} placeholder="e.g. Harrat Kishb Traverse" style={inp} />
              </div>
              <div>
                <span style={lbl}>REGION / CITY *</span>
                <input value={pathCity} onChange={(e) => setPathCity(e.target.value)} placeholder="e.g. Hafir Kishb, Saudi Arabia" style={inp} />
              </div>
              <button
                type="button"
                onClick={handlePathSubmit}
                disabled={!pathName.trim() || !pathCity.trim()}
                style={{
                  padding: "14px 0", borderRadius: 12, border: "1px solid #0B0F0E",
                  background: (!pathName.trim() || !pathCity.trim()) ? "rgba(11,15,14,.1)" : "#C9F24D",
                  color: (!pathName.trim() || !pathCity.trim()) ? "#9AA39E" : "#0B0F0E",
                  fontWeight: 700, fontSize: 15, cursor: (!pathName.trim() || !pathCity.trim()) ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "background .15s", marginTop: 8,
                }}
              >
                Create Empty Path
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function MapPage({ onNav, onSelectStop, selectedPathId, selectedStopId }: Props) {
  const isMobile = useIsMobile(768);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof window.L.map> | null>(null);
  const layerGroupRef = useRef<ReturnType<typeof window.L.layerGroup> | null>(null);
  const baseLayers = useRef<[unknown, unknown]>([null, null]);

  const [paths, setPaths] = useState<Path[]>(() => getAllPaths());

  useEffect(() => {
    const handler = () => setPaths(getAllPaths());
    window.addEventListener("geopano-paths-changed", handler);
    return () => window.removeEventListener("geopano-paths-changed", handler);
  }, []);

  const [base, setBase] = useState<BaseKey>("imagery");
  const [layersOpen, setLayersOpen] = useState(false);

  const initP = selectedPathId ? paths.findIndex((p) => p.id === selectedPathId) : 0;
  const initPathIdx = initP >= 0 ? initP : 0;
  const [pathIdx, setPathIdx] = useState(initPathIdx);

  const initS = selectedStopId && paths[initPathIdx] ? paths[initPathIdx].stops.findIndex((s) => s.id === selectedStopId) : 0;
  const [stopIdx, setStopIdx] = useState(initS >= 0 ? initS : 0);
  const [panel, setPanel] = useState<"paths" | "stop" | "annotations" | "none">("paths");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pickingMode, setPickingMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<any[]>([]);

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

  const curPath = paths[pathIdx] || paths[0];
  const curStop = curPath.stops[Math.min(stopIdx, curPath.stops.length - 1)] || curPath.stops[0];

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

    // Draw GeoJSON
    geoJsonData.forEach(geo => {
      L.geoJSON(geo, {
        style: { color: "#FF9F1C", weight: 3 },
        pointToLayer: (feature: any, latlng: any) => L.circleMarker(latlng, { radius: 6, fillColor: "#FF9F1C", color: "#0B0F0E", weight: 2, fillOpacity: 0.8 }),
        onEachFeature: (feature: any, layer: any) => {
          if (feature.properties && feature.properties.name) {
            layer.bindPopup(feature.properties.name);
          }
        }
      }).addTo(lg);
    });

    const lq = q.trim().toLowerCase();
    const z = map.getZoom();

    paths.forEach((p, pi) => {
      const hit = !lq || (p.name + " " + p.city + " " + p.stops.map((s) => s.title).join(" ")).toLowerCase().includes(lq);
      if (!hit) return;
      const isSel = pi === selPath;

      if (p.stops.length > 1) {
        L.polyline(p.stops.map((s) => s.ll as [number, number]), {
          color: isSel ? "#0B0F0E" : "#5A635F",
          weight: isSel ? 2.5 : 1.5,
          opacity: isSel ? 0.9 : 0.4,
          dashArray: "6 6",
        }).addTo(lg);
      }

      p.stops.forEach((s, si) => {
        const active = isSel && si === selStop;
        const visited = isSel && si < selStop;
        const baseSize = z >= 12 ? 22 : z >= 8 ? 17 : 14;
        const markerSize = active ? baseSize + 8 : baseSize;
        const cls = "gp-pin" + (active ? " is-active" : visited ? " is-visited" : "");

        const marker = L.marker(s.ll as [number, number], {
          icon: L.divIcon({
            className: "gp-pin-wrapper",
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2],
            html: `<div class="${cls}" style="width:${markerSize}px;height:${markerSize}px;opacity:${isSel ? 1 : 0.75}"></div>`,
          }),
          title: s.title,
          zIndexOffset: active ? 1000 : isSel ? 500 : 0,
        });

        marker.bindTooltip(`<strong>${s.title}</strong><br/><span style="font-size:10px;opacity:0.8">${p.name} · ${p.city}</span>`, {
          direction: "top",
          offset: [0, -markerSize / 2],
          className: "gp-map-tooltip",
        });

        marker.addTo(lg).on("click", () => {
          setPathIdx(pi);
          setStopIdx(si);
          setPanel("stop");
          map.flyTo(s.ll as [number, number], Math.max(map.getZoom(), 14), { duration: 0.8 });
        });
      });
    });
  }

  useEffect(() => {
    if (!mapDivRef.current || !window.L) return;
    const L = window.L;
    if (mapRef.current) return;
    const map = L.map(mapDivRef.current, { zoomControl: false, attributionControl: true, worldCopyJump: true });
    const lg = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = lg;
    applyBase("imagery", map);
    map.on("mousemove", (e: { latlng: { lat: number; lng: number } }) => setMouseCoords({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.on("mouseout", () => setMouseCoords(null));
    map.on("zoomend", () => { setZoom(map.getZoom()); drawMap(map, lg, pathIdx, stopIdx, query); });

    // Center on initial path/stop
    const currentPath = paths[initPathIdx];
    if (currentPath && currentPath.stops.length > 0) {
      if (currentPath.stops.length === 1) {
        map.setView(currentPath.stops[0].ll as [number, number], 13);
      } else {
        map.fitBounds(currentPath.stops.map((s) => s.ll as [number, number]), { padding: [100, 100], maxZoom: 15 });
      }
    } else {
      map.setView([25, 42], 5);
    }

    drawMap(map, lg, pathIdx, stopIdx, query);

    // Event listeners for coordinate picking
    const handlePickMap = () => { setPickingMode(true); };
    window.addEventListener('geopano-pick-map', handlePickMap);

    map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
      if (pickingMode) {
        setPickingMode(false);
        setPickedCoords({
          lat: e.latlng.lat.toFixed(5),
          lng: e.latlng.lng.toFixed(5),
        });
        setAddModalOpen(true);
      }
    });

    return () => { 
      map.remove(); mapRef.current = null; layerGroupRef.current = null; 
      window.removeEventListener('geopano-pick-map', handlePickMap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickingMode]);

  useEffect(() => {
    if (mapRef.current && layerGroupRef.current) drawMap(mapRef.current, layerGroupRef.current, pathIdx, stopIdx, query);
  }, [pathIdx, stopIdx, query, geoJsonData]);

  useEffect(() => { if (mapRef.current) applyBase(base, mapRef.current); }, [base]);

  function flyToPath(pi: number) {
    setPathIdx(pi);
    setStopIdx(0);
    setPanel("stop");
    if (mapRef.current) {
      const p = paths[pi];
      if (p.stops.length === 1) {
        mapRef.current.flyTo(p.stops[0].ll as [number, number], 14, { duration: 1.1 });
      } else if (p.stops.length > 1) {
        mapRef.current.flyToBounds(p.stops.map((s) => s.ll as [number, number]), { padding: [100, 100], maxZoom: 15, duration: 1.1 } as Parameters<typeof mapRef.current.flyToBounds>[1]);
      }
    }
  }

  function resetToAllStops() {
    if (!mapRef.current) return;
    const allStops = paths.flatMap((p) => p.stops.map((s) => s.ll as [number, number]));
    if (allStops.length > 0) {
      mapRef.current.flyToBounds(allStops, { padding: [80, 80], maxZoom: 14, duration: 1.2 } as Parameters<typeof mapRef.current.flyToBounds>[1]);
    } else {
      mapRef.current.setView([25, 42], 5);
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
      {addModalOpen && (
        <AddModal
          paths={paths}
          pathIdx={pathIdx}
          initialLat={pickedCoords?.lat}
          initialLng={pickedCoords?.lng}
          onClose={() => setAddModalOpen(false)}
          onPickOnMap={() => {
            setAddModalOpen(false);
            setPickingMode(true);
          }}
          onCreated={(newPath, newStopId) => {
            const all = getAllPaths();
            setPaths(all);
            const pi = all.findIndex((p) => p.id === newPath.id);
            if (pi >= 0) {
              setPathIdx(pi);
              if (newStopId) {
                const si = newPath.stops.findIndex((s) => s.id === newStopId);
                setStopIdx(si >= 0 ? si : 0);
                setPanel("stop");
                const stop = newPath.stops.find((s) => s.id === newStopId);
                if (stop && mapRef.current) {
                  mapRef.current.flyTo(stop.ll as [number, number], 14, { duration: 1.1 });
                }
              } else {
                flyToPath(pi);
              }
            }
          }}
          onNavTo360={(pId, sId) => {
            onSelectStop(pId, sId);
            window.location.hash = `#/stop/${pId}/${sId}`;
          }}
        />
      )}

      {/* Picking overlay */}
      {pickingMode && (
        <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: "#0B0F0E", color: "#C9F24D", padding: "12px 24px", borderRadius: 999, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 600, boxShadow: "0 8px 32px rgba(11,15,14,.5)", pointerEvents: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <span>📍 Click on the map to set coordinates</span>
          <button onClick={() => { setPickingMode(false); setAddModalOpen(true); }} style={{ background: "rgba(255,253,248,.2)", border: "none", color: "#FFFDF8", padding: "4px 10px", borderRadius: 99, cursor: "pointer", fontSize: 12 }}>Cancel</button>
        </div>
      )}

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
              </div>
            )}

            {/* Stops popup — separate card */}
            {panel === "stop" && (
              <div style={{ ...(isMobile
                ? { position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 601, borderRadius: "16px 16px 0 0", maxHeight: "45vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "rgba(255,253,248,.99)", border: "1px solid rgba(11,15,14,.14)", backdropFilter: "blur(16px)", boxShadow: "0 -8px 32px -8px rgba(11,15,14,.3)" }
                : { position: "absolute", left: 52, top: 360, width: 300, borderRadius: 16, overflow: "hidden", background: "rgba(255,253,248,.97)", border: "1px solid rgba(11,15,14,.14)", backdropFilter: "blur(12px)", boxShadow: "0 12px 32px -16px rgba(11,15,14,.7)" }
              ), display: "flex", flexDirection: "column" }}>
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 8px" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".16em", color: "#5A635F" }}>
                    STOPS IN {curPath.name.toUpperCase()}
                  </span>
                  <button onClick={() => setPanel("paths")} style={closeBtn}><CloseX /></button>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {visibleStops.map((s, si) => {
                    const active = si === stopIdx;
                    return (
                      <button key={s.id} onClick={() => {
                        setStopIdx(si);
                        if (mapRef.current) {
                          mapRef.current.flyTo(s.ll as [number, number], Math.max(mapRef.current.getZoom(), 14), { duration: 0.8 });
                        }
                      }}
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
                </div>
                {/* CTA row */}
                <div style={{ flexShrink: 0, padding: "10px 14px 14px", display: "flex", gap: 7, borderTop: "1px solid rgba(11,15,14,.08)" }}>
                  <button onClick={() => { onSelectStop(curPath.id, curStop.id); onNav("stop"); }}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    View 360° ↗
                  </button>
                  <button onClick={() => {
                    const nextIdx = Math.min(stopIdx + 1, curPath.stops.length - 1);
                    setStopIdx(nextIdx);
                    const nextStop = curPath.stops[nextIdx];
                    if (nextStop && mapRef.current) {
                      mapRef.current.flyTo(nextStop.ll as [number, number], Math.max(mapRef.current.getZoom(), 14), { duration: 0.8 });
                    }
                  }} disabled={stopIdx >= curPath.stops.length - 1}
                    style={{ padding: "9px 12px", borderRadius: 999, background: "transparent", border: "1px solid rgba(11,15,14,.22)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", opacity: stopIdx >= curPath.stops.length - 1 ? 0.35 : 1 }}>
                    Next →
                  </button>
                </div>
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
            onClick={() => { 
              const inp = document.createElement("input"); 
              inp.type = "file"; 
              inp.accept = ".geojson,application/geo+json,application/json"; 
              inp.onchange = () => { 
                if (inp.files?.[0]) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const geo = JSON.parse(e.target?.result as string);
                      setGeoJsonData(prev => [...prev, geo]);
                      alert("GeoJSON imported successfully");
                    } catch {
                      alert("Invalid GeoJSON file");
                    }
                  };
                  reader.readAsText(inp.files[0]);
                } 
              }; 
              inp.click(); 
            }}
            aria-label="Upload GeoJSON" title="Upload GeoJSON" style={railBtn(geoJsonData.length > 0)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 14V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      {/* ── Right: layers + zoom controls ──────────────────────────────────── */}
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

        {/* ── Zoom controls (below layers) ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          {[{ label: "+", action: () => mapRef.current?.zoomIn() }, { label: "−", action: () => mapRef.current?.zoomOut() }].map(({ label, action }) => (
            <button key={label} onClick={action} style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFDF8", border: "1px solid rgba(11,15,14,.2)", fontSize: 17, fontWeight: 500, cursor: "pointer", boxShadow: "0 8px 20px -14px rgba(11,15,14,.7)", transition: "background .2s, border .2s, color .2s", color: "#3E4744", display: "grid", placeItems: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.color = "#0B0F0E"; e.currentTarget.style.borderColor = "#0B0F0E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.color = "#3E4744"; e.currentTarget.style.borderColor = "rgba(11,15,14,.2)"; }}>
              {label}
            </button>
          ))}
          <button onClick={resetToAllStops} aria-label="Reset view to all collected stops" title="Reset view to all collected stops" style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFDF8", border: "1px solid rgba(11,15,14,.2)", cursor: "pointer", display: "grid", placeItems: "center", boxShadow: "0 8px 20px -14px rgba(11,15,14,.7)", transition: "background .2s, border .2s, color .2s", color: "#3E4744" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.color = "#0B0F0E"; e.currentTarget.style.borderColor = "#0B0F0E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.color = "#3E4744"; e.currentTarget.style.borderColor = "rgba(11,15,14,.2)"; }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 7V4.6A1.6 1.6 0 014.6 3H7M13 3h2.4A1.6 1.6 0 0117 4.6V7M17 13v2.4a1.6 1.6 0 01-1.6 1.6H13M7 17H4.6A1.6 1.6 0 013 15.4V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="10" r="1.7" fill="currentColor" /></svg>
          </button>
        </div>
      </div>

      {/* ── Scale bar + coordinates (dark theme, attached to map) ────────── */}
      {(() => {
        const scaleLat = mouseCoords?.lat ?? 25;
        const { barPx, label } = computeScale(zoom, scaleLat);
        const fmtDeg = (val: number, pos: string, neg: string) => `${Math.abs(val).toFixed(4)}° ${val >= 0 ? pos : neg}`;
        const coordText = mouseCoords ? `${fmtDeg(mouseCoords.lat, "N", "S")}, ${fmtDeg(mouseCoords.lng, "E", "W")}` : "";
        return (
          <div style={{ position: "absolute", left: "clamp(12px,2vw,24px)", bottom: "clamp(12px,2vw,24px)", zIndex: isMobile ? 499 : 500, display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", borderRadius: 999, background: "rgba(11,15,14,.72)", backdropFilter: "blur(8px)", pointerEvents: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative", height: 10, width: barPx, flexShrink: 0 }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: 1.5, height: 10, background: "#FFFDF8", borderRadius: 1 }} />
                <div style={{ position: "absolute", left: barPx / 2 - 0.75, top: 3, width: 1.5, height: 7, background: "#FFFDF8", borderRadius: 1 }} />
                <div style={{ position: "absolute", right: 0, top: 0, width: 1.5, height: 10, background: "#FFFDF8", borderRadius: 1 }} />
                <div style={{ position: "absolute", left: 0, top: 4, height: 3, width: barPx / 2, background: "#FFFDF8" }} />
                <div style={{ position: "absolute", left: barPx / 2, top: 4, height: 3, width: barPx / 2, background: "rgba(255,253,248,.3)" }} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".12em", color: "rgba(255,253,248,.85)", whiteSpace: "nowrap" }}>{label}</span>
            </div>
            <div style={{ width: 1, height: 14, background: "rgba(255,253,248,.2)", flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", color: mouseCoords ? "#FFFDF8" : "rgba(255,253,248,.5)", whiteSpace: "nowrap" }}>
              {mouseCoords ? coordText : "— move cursor —"}
            </span>
          </div>
        );
      })()}

      {/* Zoom controls moved to top-right (see "Right: layers + zoom controls" above) */}
    </main>
  );
}
