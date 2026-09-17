import { useState } from "react";
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

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [selectedPathId, setSelectedPathId] = useState("st00009-path");
  const [selectedStopId, setSelectedStopId] = useState("st00009");

  function handleSelectStop(pathId: string, stopId: string) {
    setSelectedPathId(pathId);
    setSelectedStopId(stopId);
  }

  function handleNav(v: View) {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F2ED" }}>
      <Header view={view} onNav={handleNav} />

      {view === "landing" && <Landing onNav={handleNav} />}
      {view === "map" && (
        <MapPage
          onNav={handleNav}
          onSelectStop={handleSelectStop}
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
          pathId={selectedPathId}
          stopId={selectedStopId}
          onNav={handleNav}
          onSelectStop={handleSelectStop}
        />
      )}
    </div>
  );
}
