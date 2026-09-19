import { useEffect, useState, useCallback } from "react";
import { View } from "./types";
import Header from "./components/Header";
import Landing from "./pages/Landing";
import MapPage from "./pages/MapPage";
import Library from "./pages/Library";
import StopViewer from "./pages/StopViewer";
import SignUp from "./pages/SignUp";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

// ── Hash-based routing ─────────────────────────────────────────────────────────

interface RouteState {
  view: View;
  pathId: string;
  stopId: string;
  yaw?: number;
  pitch?: number;
  annId?: string;
}

function parseHash(hash: string): RouteState {
  const raw = hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const segments = path.split("/").filter(Boolean);
  const params = new URLSearchParams(qs || "");
  const yaw = params.has("yaw") ? parseFloat(params.get("yaw")!) : undefined;
  const pitch = params.has("pitch") ? parseFloat(params.get("pitch")!) : undefined;

  // #/stop/{pathId}/{stopId}
  if (segments[0] === "stop" && segments[1] && segments[2]) {
    const annId = segments[3] === "ann" && segments[4] ? segments[4] : undefined;
    return { view: "stop", pathId: segments[1], stopId: segments[2], yaw, pitch, annId };
  }
  if (segments[0] === "stop" && segments[1]) {
    const defaultStop = segments[1] === "pt00001" ? "sp00001" : "sp00009";
    return { view: "stop", pathId: segments[1], stopId: defaultStop, yaw, pitch };
  }
  if (segments[0] === "stop") {
    return { view: "stop", pathId: "pt00001", stopId: "sp00001", yaw, pitch };
  }
  // #/map/{pathId}/{stopId}
  if (segments[0] === "map" && segments[1] && segments[2]) {
    return { view: "map", pathId: segments[1], stopId: segments[2] };
  }
  if (segments[0] === "map" && segments[1]) {
    const defaultStop = segments[1] === "pt00001" ? "sp00001" : "sp00009";
    return { view: "map", pathId: segments[1], stopId: defaultStop };
  }
  if (segments[0] === "map") return { view: "map", pathId: "", stopId: "" };
  if (segments[0] === "library") return { view: "library", pathId: "sp00009-path", stopId: "sp00009" };
  if (segments[0] === "signup") return { view: "signup", pathId: "sp00009-path", stopId: "sp00009" };
  if (segments[0] === "about") return { view: "about", pathId: "sp00009-path", stopId: "sp00009" };
  if (segments[0] === "terms") return { view: "terms", pathId: "sp00009-path", stopId: "sp00009" };
  if (segments[0] === "privacy") return { view: "privacy", pathId: "sp00009-path", stopId: "sp00009" };

  return { view: "landing", pathId: "sp00009-path", stopId: "sp00009" };
}

function buildHash(view: View, pathId?: string, stopId?: string, extra?: { yaw?: number; pitch?: number; annId?: string }): string {
  if (view === "landing") return "#/";
  if (view === "stop" && pathId && stopId) {
    let h = `#/stop/${pathId}/${stopId}`;
    if (extra?.annId) h += `/ann/${extra.annId}`;
    const params: string[] = [];
    if (extra?.yaw !== undefined) params.push(`yaw=${extra.yaw.toFixed(1)}`);
    if (extra?.pitch !== undefined) params.push(`pitch=${extra.pitch.toFixed(1)}`);
    if (params.length) h += `?${params.join("&")}`;
    return h;
  }
  if (view === "map" && pathId && stopId) return `#/map/${pathId}/${stopId}`;
  if (view === "map") return "#/map";
  return `#/${view}`;
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const initial = parseHash(window.location.hash);
  const [view, setView] = useState<View>(initial.view);
  const [selectedPathId, setSelectedPathId] = useState<string | undefined>(initial.pathId);
  const [selectedStopId, setSelectedStopId] = useState<string | undefined>(initial.stopId);
  const [initialYaw, setInitialYaw] = useState<number | undefined>(initial.yaw);
  const [initialPitch, setInitialPitch] = useState<number | undefined>(initial.pitch);
  const [initialAnnId, setInitialAnnId] = useState<string | undefined>(initial.annId);

  // Sync state → hash
  const updateHash = useCallback((v: View, pId?: string, sId?: string) => {
    const hash = buildHash(v, pId || selectedPathId, sId || selectedStopId);
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
  }, [selectedPathId, selectedStopId]);

  // Listen for browser back/forward
  useEffect(() => {
    function onHashChange() {
      const route = parseHash(window.location.hash);
      setView(route.view);
      setSelectedPathId(route.pathId);
      setSelectedStopId(route.stopId);
      setInitialYaw(route.yaw);
      setInitialPitch(route.pitch);
      setInitialAnnId(route.annId);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleSelectStop(pathId: string, stopId: string, yaw?: number, pitch?: number) {
    setSelectedPathId(pathId);
    setSelectedStopId(stopId);
    setInitialYaw(yaw);
    setInitialPitch(pitch);
    setInitialAnnId(undefined);
    if (view === "stop") {
      const hash = buildHash("stop", pathId, stopId, { yaw, pitch });
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }
    }
  }

  function handleNav(v: View) {
    setView(v);
    setInitialYaw(undefined);
    setInitialPitch(undefined);
    setInitialAnnId(undefined);
    if (v === "map") {
      setSelectedPathId(undefined);
      setSelectedStopId(undefined);
      if (window.location.hash !== "#/map") {
        window.history.pushState(null, "", "#/map");
      }
    } else {
      updateHash(v);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNavToStop(pathId: string, stopId: string) {
    setSelectedPathId(pathId);
    setSelectedStopId(stopId);
    setView("stop");
    setInitialYaw(undefined);
    setInitialPitch(undefined);
    setInitialAnnId(undefined);
    const hash = buildHash("stop", pathId, stopId);
    window.history.pushState(null, "", hash);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const isFixedLayout = view === "map" || view === "stop";

  return (
    <div
      style={{
        minHeight: "100vh",
        height: isFixedLayout ? "100dvh" : "auto",
        display: isFixedLayout ? "flex" : "block",
        flexDirection: "column",
        overflow: isFixedLayout ? "hidden" : "visible",
        background: "#F4F2ED",
      }}
    >
      <Header view={view} onNav={handleNav} />

      {view === "landing" && <Landing onNav={handleNav} />}
      {view === "map" && (
        <MapPage
          onNav={handleNav}
          onSelectStop={handleSelectStop}
          selectedPathId={selectedPathId}
          selectedStopId={selectedStopId}
        />
      )}
      {view === "library" && (
        <Library
          onNav={handleNav}
          onSelectStop={handleSelectStop}
        />
      )}
      {view === "signup" && <SignUp onNav={handleNav} />}
      {view === "about" && <About onNav={handleNav} />}
      {view === "terms" && <Terms onNav={handleNav} />}
      {view === "privacy" && <Privacy onNav={handleNav} />}
      {view === "stop" && (
        <StopViewer
          pathId={selectedPathId || "pt00001"}
          stopId={selectedStopId || "sp00001"}
          onNav={handleNav}
          onSelectStop={handleSelectStop}
          initialYaw={initialYaw}
          initialPitch={initialPitch}
          initialAnnId={initialAnnId}
        />
      )}
    </div>
  );
}
