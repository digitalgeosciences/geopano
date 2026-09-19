import { useState, useMemo } from "react";
import { getAllPaths } from "../data/pathsData";
import { LibraryItem, View } from "../types";
import { useIsMobile } from "../hooks/useWindowWidth";
import PageFooter from "../components/PageFooter";

const FILTERS = ["All", "Stops", "Paths", "Annotations"] as const;
type FilterType = (typeof FILTERS)[number];

const SORTS = ["Newest", "A–Z", "Most annotated"] as const;

interface Props {
  onNav: (v: View) => void;
  onSelectStop: (pathId: string, stopId: string) => void;
}

function buildLibraryItems(): LibraryItem[] {
  const allPaths = getAllPaths();
  const items: LibraryItem[] = [];

  // 1. Paths
  for (const p of allPaths) {
    let totalAnns = 0;
    for (const s of p.stops) {
      totalAnns += (s.annotations || []).length;
      try {
        const raw = localStorage.getItem(`geopano_ann_${p.id}_${s.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) totalAnns += parsed.length;
        }
      } catch { /* ignore */ }
    }
    items.push({
      id: `path_${p.id}`,
      title: p.name,
      itemType: "path",
      location: p.city,
      country: p.city,
      pathName: p.name,
      pathId: p.id,
      stopId: p.stops[0]?.id || null,
      blurb: `Field traverse featuring ${p.stops.length} stop${p.stops.length === 1 ? "" : "s"} across ${p.city}.`,
      notes: totalAnns,
      bg: p.bg || "linear-gradient(165deg,#4A6080,#B0C8D8)",
      hasImage: false,
    });
  }

  // 2. Stops
  for (const p of allPaths) {
    for (const s of p.stops) {
      let stopAnns = (s.annotations || []).length;
      try {
        const raw = localStorage.getItem(`geopano_ann_${p.id}_${s.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) stopAnns += parsed.length;
        }
      } catch { /* ignore */ }

      items.push({
        id: `stop_${s.id}`,
        title: s.title,
        itemType: "stop",
        location: p.city,
        country: p.city,
        pathName: p.name,
        pathId: p.id,
        stopId: s.id,
        blurb: s.blurb || "Outcrop station and 360° observation point.",
        notes: stopAnns,
        bg: p.bg || "linear-gradient(165deg,#2E5F72,#9ECAD4)",
        hasImage: !!s.panorama,
      });
    }
  }

  // 3. Annotations
  for (const p of allPaths) {
    for (const s of p.stops) {
      // From db
      const dbAnns = s.annotations || [];
      dbAnns.forEach((a, idx) => {
        items.push({
          id: `ann_db_${s.id}_${idx}`,
          title: a.title || `${(a.kind || "point").toUpperCase()} observation`,
          itemType: "annotation",
          location: p.city,
          country: p.city,
          pathName: p.name,
          pathId: p.id,
          stopId: s.id,
          annotationId: `db_${idx}`,
          yaw: a.yaw,
          pitch: a.pitch,
          blurb: a.body || (a.tags?.length ? a.tags.join(" · ") : `${a.kind || "point"} annotation`),
          notes: 1,
          kind: a.kind || "point",
          tags: a.tags,
          hasImage: false,
        });
      });

      // From localStorage
      try {
        const raw = localStorage.getItem(`geopano_ann_${p.id}_${s.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((a: any) => {
              if (a.id && typeof a.id === "string" && a.id.startsWith("db_")) return;
              items.push({
                id: `ann_local_${a.id || Math.random()}`,
                title: a.title || `${(a.kind || "point").toUpperCase()} annotation`,
                itemType: "annotation",
                location: p.city,
                country: p.city,
                pathName: p.name,
                pathId: p.id,
                stopId: s.id,
                annotationId: a.id,
                yaw: a.pts?.[0]?.yaw ?? 0,
                pitch: a.pts?.[0]?.pitch ?? 0,
                blurb: a.body || (a.tags?.length ? a.tags.join(" · ") : "User field note"),
                notes: 1,
                kind: a.kind || "point",
                tags: a.tags,
                hasImage: false,
              });
            });
          }
        }
      } catch { /* ignore */ }
    }
  }

  return items;
}

const TYPE_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  stop: { bg: "#E7F3F1", color: "#14504A", label: "STOP" },
  path: { bg: "#FEF3E8", color: "#8C4A20", label: "PATH" },
  annotation: { bg: "rgba(201,242,77,.28)", color: "#1E3B06", label: "ANNOTATION" },
};

export default function Library({ onNav, onSelectStop }: Props) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Newest");

  const rawItems = useMemo(() => buildLibraryItems(), []);

  const q = query.trim().toLowerCase();
  let items = rawItems.filter((p) => {
    if (filter === "Stops" && p.itemType !== "stop") return false;
    if (filter === "Paths" && p.itemType !== "path") return false;
    if (filter === "Annotations" && p.itemType !== "annotation") return false;

    if (!q) return true;
    const searchable = (
      p.title +
      " " +
      p.location +
      " " +
      p.pathName +
      " " +
      p.itemType +
      " " +
      (p.tags ? p.tags.join(" ") : "") +
      " " +
      p.blurb
    ).toLowerCase();
    return searchable.includes(q);
  });

  if (sort === "A–Z") items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "Most annotated") items = [...items].sort((a, b) => b.notes - a.notes);

  const chip = (on: boolean) => ({
    padding: "8px 18px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    border: on ? "1px solid #0B0F0E" : "1px solid rgba(11,15,14,.16)",
    background: on ? "#C9F24D" : "#FFFDF8",
    color: on ? "#0B0F0E" : "#3E4744",
    transition: "background .15s, border .15s",
  } as React.CSSProperties);

  const sortBtn = (on: boolean) => ({
    padding: "6px 14px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    background: on ? "#0B0F0E" : "transparent",
    color: on ? "#F4F2ED" : "#5A635F",
    transition: "background .15s, color .15s",
  } as React.CSSProperties);

  function handleOpen(item: LibraryItem) {
    if (item.pathId && item.stopId) {
      onSelectStop(item.pathId, item.stopId);
      if (item.itemType === "annotation" && item.annotationId) {
        const params: string[] = [];
        if (item.yaw !== undefined) params.push(`yaw=${item.yaw.toFixed(1)}`);
        if (item.pitch !== undefined) params.push(`pitch=${item.pitch.toFixed(1)}`);
        const qs = params.length ? `?${params.join("&")}` : "";
        window.location.hash = `#/stop/${item.pathId}/${item.stopId}/ann/${item.annotationId}${qs}`;
      } else {
        window.location.hash = `#/stop/${item.pathId}/${item.stopId}`;
      }
    }
  }

  const countLabel =
    filter === "Paths"
      ? items.length === 1
        ? "PATH"
        : "PATHS"
      : filter === "Stops"
      ? items.length === 1
        ? "STOP"
        : "STOPS"
      : filter === "Annotations"
      ? items.length === 1
        ? "ANNOTATION"
        : "ANNOTATIONS"
      : items.length === 1
      ? "RECORD"
      : "RECORDS";

  return (
    <main style={{ background: "#F4F2ED", minHeight: "100vh" }}>
      {/* Header */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(32px,4vw,68px) clamp(16px,4vw,56px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ width: 32, height: 2, background: "#0B0F0E", display: "block" }} />
          <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#5A635F" }}>
            Field Catalog &amp; Observations
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(16px,3vw,48px)", alignItems: "end" }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(36px,5vw,68px)", lineHeight: 0.94, letterSpacing: "-.04em", margin: 0, color: "#0B0F0E" }}>
            Field library.
          </h1>
          <p style={{ margin: "0 0 6px", maxWidth: "50ch", fontSize: 16, lineHeight: 1.55, color: "#3E4744" }}>
            Explore documented field stops, traverses, and 360° outcrop annotations. Search across sites, regions, or observation tags.
          </p>
        </div>
      </section>

      {/* Sticky filter bar */}
      <section
        style={{
          position: "sticky",
          top: 57,
          zIndex: 30,
          background: "rgba(244,242,237,.94)",
          backdropFilter: "blur(12px)",
          marginTop: "clamp(24px,3vw,40px)",
          borderTop: "1px solid rgba(11,15,14,.1)",
          borderBottom: "1px solid rgba(11,15,14,.1)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px clamp(16px,4vw,56px)", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 240px", maxWidth: 380, padding: "10px 16px", borderRadius: 999, background: "#FFFDF8", border: "1px solid rgba(11,15,14,.16)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="#5A635F" strokeWidth="1.6" />
              <path d="M11 11l3.4 3.4" stroke="#5A635F" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stops, paths or annotations..."
              style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Instrument Sans',sans-serif", fontSize: isMobile ? 16 : 14, color: "#0B0F0E", width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={chip(filter === f)}>{f}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Count + sort */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "14px clamp(16px,4vw,56px) 0", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".14em", color: "#5A635F" }}>
          {items.length} {countLabel}
        </span>
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(11,15,14,.06)" }}>
          {SORTS.map((s) => (
            <button key={s} onClick={() => setSort(s)} style={sortBtn(sort === s)}>{s}</button>
          ))}
        </div>
      </section>

      {/* Content Table / Cards */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "16px clamp(16px,4vw,56px) clamp(44px,6vw,80px)" }}>
        {items.length === 0 ? (
          <div style={{ border: "1px dashed rgba(11,15,14,.24)", borderRadius: 16, padding: "52px 24px", textAlign: "center", background: "#FFFDF8" }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-.02em", marginBottom: 8, color: "#0B0F0E" }}>
              No field items match that filter.
            </div>
            <p style={{ margin: "0 0 20px", color: "#5A635F", fontSize: 15 }}>Try clearing your search query or selecting a different filter category.</p>
            <button
              onClick={() => { setQuery(""); setFilter("All"); }}
              style={{ padding: "12px 24px", borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#0B0F0E" }}
            >
              Show all items
            </button>
          </div>
        ) : isMobile ? (
          /* Mobile card stack */
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => {
              const badge = TYPE_BADGES[item.itemType] || TYPE_BADGES.stop;
              const badgeText = item.itemType === "annotation" && item.kind ? `ANN · ${item.kind.toUpperCase()}` : badge.label;
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpen(item)}
                  style={{
                    border: "1px solid rgba(11,15,14,.12)",
                    borderRadius: 14,
                    background: "#FFFDF8",
                    padding: "16px",
                    cursor: item.stopId ? "pointer" : "default",
                    transition: "border-color .15s",
                    boxShadow: "0 2px 6px -2px rgba(11,15,14,.04)",
                  }}
                  onTouchStart={(e) => (e.currentTarget.style.borderColor = "#0B0F0E")}
                  onTouchEnd={(e) => (e.currentTarget.style.borderColor = "rgba(11,15,14,.12)")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "-.01em", color: "#0B0F0E", marginBottom: 3 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 13, color: "#5A635F", lineHeight: 1.45 }}>
                        {item.blurb}
                      </div>
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: badge.bg,
                        color: badge.color,
                        fontFamily: "'Instrument Sans',sans-serif",
                        fontSize: 10,
                        letterSpacing: ".08em",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {badgeText}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(11,15,14,.08)", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#5A635F" }}>
                        {item.location}
                      </div>
                      <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, color: "#5A635F" }}>
                        {item.pathName}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {item.itemType !== "annotation" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 36, height: 3, borderRadius: 2, background: "rgba(11,15,14,.1)", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, (item.notes / 15) * 100)}%`, height: "100%", background: "#C9F24D", borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, color: "#3E4744" }}>
                            {item.notes}
                          </span>
                        </div>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#14504A" }}>
                        {item.itemType === "annotation" ? "View 360° ↗" : "Open ↗"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop table */
          <div style={{ border: "1px solid rgba(11,15,14,.12)", borderRadius: 16, overflow: "hidden", background: "#FFFDF8" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(11,15,14,.12)", background: "rgba(11,15,14,.03)" }}>
                  {["Title / Observation", "Type", "Location", "Path / Traverse", "Annotations", ""].map((h) => (
                    <th
                      key={h}
                      style={{ padding: "12px 18px", textAlign: "left", fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, letterSpacing: ".08em", color: "#5A635F", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <TableRow key={item.id} item={item} isLast={i === items.length - 1} onOpen={handleOpen} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CTA band */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px,4vw,56px) clamp(48px,6vw,88px)" }}>
        <div style={{ borderRadius: 24, background: "#0B0F0E", color: "#F4F2ED", padding: "clamp(24px,4vw,40px)", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".18em", color: "#C9F24D", marginBottom: 10, textTransform: "uppercase" }}>
              Field Contributions
            </div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(22px,2.6vw,34px)", letterSpacing: "-.03em", margin: "0 0 8px", lineHeight: 1.05 }}>
              Add a new outcrop station or path.
            </h2>
            <p style={{ margin: 0, color: "#C7CFCB", fontSize: 15, maxWidth: "46ch" }}>
              Pin a stop on the map, link your 360° panorama, and annotate geological features to share with the research community.
            </p>
          </div>
          <button
            onClick={() => onNav("map")}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 24px", borderRadius: 999, background: "#C9F24D", color: "#0B0F0E", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFFDF8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#C9F24D")}
          >
            Open the map ↗
          </button>
        </div>
      </section>

      <PageFooter onNav={onNav} />
    </main>
  );
}

function TableRow({ item, isLast, onOpen }: { item: LibraryItem; isLast: boolean; onOpen: (i: LibraryItem) => void }) {
  const [hovered, setHovered] = useState(false);
  const badge = TYPE_BADGES[item.itemType] || TYPE_BADGES.stop;
  const badgeText = item.itemType === "annotation" && item.kind ? `ANN · ${item.kind.toUpperCase()}` : badge.label;

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: isLast ? "none" : "1px solid rgba(11,15,14,.08)",
        background: hovered ? "rgba(201,242,77,.08)" : "transparent",
        transition: "background .12s",
        cursor: item.stopId ? "pointer" : "default",
      }}
      onClick={() => onOpen(item)}
    >
      {/* Title / Description */}
      <td style={{ padding: "16px 18px", minWidth: 200, maxWidth: 360 }}>
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "-.01em", color: "#0B0F0E" }}>
          {item.title}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#5A635F", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {item.blurb}
        </div>
      </td>

      {/* Type Badge */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap" }}>
        <span
          style={{
            display: "inline-block",
            padding: "4px 10px",
            borderRadius: 999,
            background: badge.bg,
            color: badge.color,
            fontFamily: "'Instrument Sans',sans-serif",
            fontSize: 10,
            letterSpacing: ".08em",
            fontWeight: 700,
          }}
        >
          {badgeText}
        </span>
      </td>

      {/* Location */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#3E4744" }}>
          {item.location}
        </span>
      </td>

      {/* Path / Context */}
      <td style={{ padding: "16px 18px", minWidth: 150 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'Instrument Sans',sans-serif", fontSize: 12, color: "#5A635F" }}>
          <svg width="18" height="8" viewBox="0 0 22 8" fill="none" aria-hidden="true">
            <path d="M1 6.5L6 3l5 3 9-4.5" stroke="#0B0F0E" strokeWidth="1.1" strokeDasharray="2.5 2" />
            <circle cx="1" cy="6.5" r="1.5" fill="#0B0F0E" />
            <circle cx="20" cy="2" r="1.5" fill="#C9F24D" stroke="#0B0F0E" strokeWidth="1" />
          </svg>
          {item.pathName}
        </span>
      </td>

      {/* Annotations */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap" }}>
        {item.itemType === "annotation" ? (
          <span style={{ fontSize: 11, fontFamily: "'Instrument Sans',sans-serif", fontWeight: 600, color: "#14504A", background: "rgba(20,80,74,.08)", padding: "3px 8px", borderRadius: 6 }}>
            {item.tags?.length ? item.tags.slice(0, 2).join(", ") : "360° Marker"}
          </span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 44, height: 3, borderRadius: 2, background: "rgba(11,15,14,.1)", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (item.notes / 15) * 100)}%`, height: "100%", background: "#C9F24D", borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 12, fontWeight: 700, color: "#3E4744" }}>
              {item.notes}
            </span>
          </div>
        )}
      </td>

      {/* Action */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap", textAlign: "right" }}>
        {item.stopId ? (
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: hovered ? "#0B0F0E" : "#14504A",
              fontFamily: "inherit",
              transition: "color .12s",
            }}
          >
            {item.itemType === "annotation" ? "View 360° ↗" : "Open ↗"}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "#5A635F", fontFamily: "'Instrument Sans',sans-serif", fontWeight: 600, letterSpacing: ".06em" }}>
            VIEW MAP
          </span>
        )}
      </td>
    </tr>
  );
}
