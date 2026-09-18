import { useEffect, useRef, useState } from "react";
import db from "../data/db.json";
import { View } from "../types";
import PageFooter from "../components/PageFooter";

import { resolveAssetUrl } from "../data/pathsData";

interface Props {
  onNav: (v: View) => void;
}

const STEPS = [
  { num: "01", label: "Photograph a rock face or outcrop as a 360° equirectangular panorama." },
  { num: "02", label: "Upload the panorama and pin it to its GPS coordinates." },
  { num: "03", label: "Annotate features directly in the viewer — bedding, faults, contacts." },
  { num: "04", label: "Publish. Every note travels with the panorama, forever." },
];

export default function Landing({ onNav }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<{ destroy: () => void; getYaw: () => number } | null>(null);
  const [yaw, setYaw] = useState(0);

  // Take the real path and stop data directly from db.paths
  const realPath = db.paths.find((p) => p.id === "pt00001") || db.paths[0];
  const firstStop = realPath.stops[0];
  const panoUrl = resolveAssetUrl(firstStop.panorama);
  const prevUrl = resolveAssetUrl(firstStop.panorama.replace('/uploads/', '/uploads/preview/'));

  useEffect(() => {
    if (!viewerRef.current || !window.pannellum) return;
    if (pannellumRef.current) return;

    const viewer = window.pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: panoUrl,
      preview: prevUrl,
      autoLoad: true,
      showControls: false,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      yaw: (firstStop as any).defaultYaw ?? 85,
      pitch: (firstStop as any).defaultPitch ?? 6,
      autoRotate: -0.4,
      autoRotateInactivityDelay: 2000,
      compass: false,
      hfov: 90,
      hotSpots: [],
      strings: { loadingLabel: "" },
    });

    pannellumRef.current = viewer;

    const interval = window.setInterval(() => {
      try { setYaw(Math.round(viewer.getYaw())); } catch { /* destroyed */ }
    }, 200);

    return () => {
      clearInterval(interval);
      try { viewer.destroy(); } catch { /* already destroyed */ }
      pannellumRef.current = null;
    };
  }, [firstStop]);

  const yawLabel = `YAW ${yaw}°`;

  return (
    <main>
      {/* Hero */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))",
          gap: "clamp(24px,4vw,56px)",
          alignItems: "center",
          padding: "clamp(36px,5vw,76px) clamp(16px,4vw,56px) clamp(28px,4vw,48px)",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        {/* Copy */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
              animation: "gp-fade .7s both",
            }}
          >
            <span
              style={{
                width: 32,
                height: 2,
                background: "#0B0F0E",
                display: "block",
                transformOrigin: "left",
                animation: "gp-rule .8s .1s both cubic-bezier(.2,.7,.2,1)",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "#5A635F",
              }}
            >
              Field geology, in 360°
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(42px,6vw,88px)",
              lineHeight: 0.94,
              letterSpacing: "-.04em",
              margin: "0 0 24px",
              animation: "gp-rise .8s .05s both cubic-bezier(.2,.7,.2,1)",
            }}
          >
            Read the{" "}
            <span
              style={{
                background:
                  "linear-gradient(transparent 62%, #C9F24D 62%) no-repeat",
                animation:
                  "gp-mark .9s .7s both cubic-bezier(.2,.7,.2,1)",
                backgroundSize: "0% 100%",
              }}
            >
              outcrop
            </span>{" "}
            from every angle.
          </h1>

          <p
            style={{
              maxWidth: "46ch",
              fontSize: "clamp(16px,1.2vw,18px)",
              lineHeight: 1.55,
              color: "#3E4744",
              margin: "0 0 32px",
              animation: "gp-rise .8s .18s both cubic-bezier(.2,.7,.2,1)",
            }}
          >
            Capture a rock face as a 360° panorama and annotate it where the evidence sits. Bedding, faults, contacts and fossils stay pinned to the rock, so one geologist's reading of a section can be shared, questioned and built on by everyone who cannot stand in front of it.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              animation: "gp-rise .8s .28s both cubic-bezier(.2,.7,.2,1)",
            }}
          >
            <button
              onClick={() => onNav("map")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "15px 26px",
                borderRadius: 999,
                background: "#C9F24D",
                color: "#0B0F0E",
                fontWeight: 600,
                fontSize: 15,
                border: "1px solid #0B0F0E",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background .25s, color .25s, transform .25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0B0F0E";
                e.currentTarget.style.color = "#C9F24D";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#C9F24D";
                e.currentTarget.style.color = "#0B0F0E";
                e.currentTarget.style.transform = "none";
              }}
            >
              Explore the map{" "}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>↗</span>
            </button>
            <button
              onClick={() => onNav("library")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "15px 26px",
                borderRadius: 999,
                background: "transparent",
                color: "#0B0F0E",
                fontWeight: 600,
                fontSize: 15,
                border: "1px solid rgba(11,15,14,.24)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "border-color .25s, background .25s, transform .25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#0B0F0E";
                e.currentTarget.style.background = "rgba(11,15,14,.04)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(11,15,14,.24)";
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "none";
              }}
            >
              Browse library
            </button>
          </div>
        </div>

        {/* Live artifact */}
        <div
          style={{
            minWidth: 0,
            border: "1px solid rgba(11,15,14,.14)",
            borderRadius: 24,
            background: "#FFFDF8",
            overflow: "hidden",
            boxShadow: "0 24px 60px -34px rgba(11,15,14,.5)",
            animation: "gp-rise .9s .34s both cubic-bezier(.2,.7,.2,1)",
          }}
        >
          {/* Artifact header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 16px",
              borderBottom: "1px solid rgba(11,15,14,.1)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: "#C9F24D",
                  border: "1px solid #0B0F0E",
                  display: "block",
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{realPath.name}</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "#5A635F",
                }}
              >
                {realPath.stops.length} stops · {realPath.city}
              </span>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#5A635F",
              }}
            >
              {yawLabel}
            </span>
          </div>

          {/* Pannellum 360 viewer */}
          <div style={{ position: "relative", height: "clamp(230px,30vw,320px)", background: "#0B0F0E" }}>
            <div ref={viewerRef} style={{ position: "absolute", inset: 0 }} />
            {/* Overlays from real stop in database */}
            <div style={{ position: "absolute", right: 14, bottom: 14, zIndex: 10, padding: "8px 14px", borderRadius: 999, background: "rgba(255,253,248,.92)", color: "#0B0F0E", fontSize: 12, fontWeight: 600, pointerEvents: "none" }}>
              {firstStop.title}
            </div>
            <div style={{ position: "absolute", right: 14, top: 14, zIndex: 10, padding: "6px 12px", borderRadius: 999, background: "rgba(11,15,14,.55)", color: "#FFFDF8", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".14em", pointerEvents: "none" }}>
              DRAG TO LOOK
            </div>
          </div>

          {/* Mini map with path */}
          <div
            style={{
              position: "relative",
              height: 154,
              background: "#EDEAE2",
              borderTop: "1px solid rgba(11,15,14,.1)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(11,15,14,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(11,15,14,.05) 1px,transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            {/* SVG path connecting the stops sequentially */}
            {(() => {
              const count = realPath.stops.length;
              // Compute layout positions for stops across the mini map
              const stepPositions = realPath.stops.map((s, i) => {
                const leftPct = count > 1 ? 16 + (i * (84 - 16)) / (count - 1) : 50;
                // Subtle topographic curve (alternating heights)
                const topPcts = [68, 48, 62, 38];
                const topPct = topPcts[i % topPcts.length];
                return { ...s, leftPct, topPct };
              });

              return (
                <>
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                    aria-hidden="true"
                  >
                    <polyline
                      points={stepPositions.map((s) => `${s.leftPct},${s.topPct}`).join(" ")}
                      fill="none"
                      stroke="#0B0F0E"
                      strokeWidth="1.6"
                      strokeDasharray="5 4"
                      vectorEffect="non-scaling-stroke"
                      style={{ animation: "gp-dash 2.6s linear infinite" }}
                    />
                  </svg>
                  {stepPositions.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        window.location.hash = `#/stop/${realPath.id}/${s.id}`;
                      }}
                      aria-label={s.title}
                      style={{
                        position: "absolute",
                        left: `${s.leftPct}%`,
                        top: `${s.topPct}%`,
                        transform: "translate(-50%,-50%)",
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        border: "2px solid #0B0F0E",
                        background: i === 0 ? "#C9F24D" : "#FFFDF8",
                        color: "#0B0F0E",
                        cursor: "pointer",
                        padding: 0,
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        fontWeight: 500,
                        transition: "background .2s, transform .2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#C9F24D";
                        e.currentTarget.style.transform = "translate(-50%,-50%) scale(1.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = i === 0 ? "#C9F24D" : "#FFFDF8";
                        e.currentTarget.style.transform = "translate(-50%,-50%) scale(1)";
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </>
              );
            })()}

          </div>
        </div>
      </section>

      {/* For Creators band */}
      <section
        style={{
          padding: "0 clamp(16px,4vw,56px) clamp(48px,6vw,88px)",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            borderRadius: 28,
            background: "#14504A",
            color: "#F4F2ED",
            padding: "clamp(28px,4vw,52px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
            gap: "clamp(24px,3vw,44px)",
            alignItems: "center",
            animation: "gp-rise .9s .45s both cubic-bezier(.2,.7,.2,1)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: ".18em",
                color: "#C9F24D",
                marginBottom: 16,
              }}
            >
              FOR CREATORS
            </div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(28px,3.2vw,42px)",
                lineHeight: 1.02,
                letterSpacing: "-.03em",
                margin: "0 0 14px",
              }}
            >
              Publish an outcrop in an afternoon.
            </h2>
            <p
              style={{
                margin: "0 0 26px",
                fontSize: 16,
                lineHeight: 1.6,
                color: "#CBD9D5",
                maxWidth: "44ch",
              }}
            >
              Add a single stop for one rock face, or chain several into a path along a traverse. Annotate the features, cite what you interpreted, and the notes travel with the panorama for students, reviewers and field teams.
            </p>
            <button
              onClick={() => onNav("map")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "15px 26px",
                borderRadius: 999,
                background: "#C9F24D",
                color: "#0B0F0E",
                fontWeight: 600,
                fontSize: 15,
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background .25s, transform .25s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.transform = "none"; }}
            >
              Explore stops{" "}
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>↗</span>
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STEPS.map((st) => (
              <div
                key={st.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderRadius: 14,
                  background: "rgba(255,253,248,.07)",
                  border: "1px solid rgba(255,253,248,.14)",
                  transition: "background .25s, border-color .25s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "rgba(255,253,248,.13)";
                  el.style.borderColor = "rgba(201,242,77,.5)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "rgba(255,253,248,.07)";
                  el.style.borderColor = "rgba(255,253,248,.14)";
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "#C9F24D",
                    flexShrink: 0,
                  }}
                >
                  {st.num}
                </span>
                <span style={{ fontSize: 15 }}>{st.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageFooter onNav={onNav} />
    </main>
  );
}
