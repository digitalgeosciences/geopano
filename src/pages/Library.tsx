import { useState } from "react";
import db from "../data/db.json";
import { LibraryItem, View } from "../types";
import { useIsMobile } from "../hooks/useWindowWidth";
import PageFooter from "../components/PageFooter";

const library = db.library as LibraryItem[];
const CATS = ["All", "Geology", "Heritage"];
const SORTS = ["Newest", "A–Z", "Most annotated"];

interface Props {
  onNav: (v: View) => void;
  onSelectStop: (pathId: string, stopId: string) => void;
}


export default function Library({ onNav, onSelectStop }: Props) {
  const isMobile = useIsMobile(768);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Newest");

  const q = query.trim().toLowerCase();
  let items = library.filter(
    (p) =>
      (filter === "All" || p.cat === filter) &&
      (!q || (p.title + " " + p.country + " " + p.pathName + " " + p.cat).toLowerCase().includes(q))
  );
  if (sort === "A–Z") items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "Most annotated") items = [...items].sort((a, b) => b.notes - a.notes);

  const chip = (on: boolean) => ({
    padding: "8px 16px",
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
      window.location.hash = `#/stop/${item.pathId}/${item.stopId}`;
    }
  }

  return (
    <main>
      {/* Header */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(32px,4vw,68px) clamp(16px,4vw,56px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ width: 32, height: 2, background: "#0B0F0E", display: "block" }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#5A635F" }}>
            Stop index
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(16px,3vw,48px)", alignItems: "end" }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(36px,5vw,68px)", lineHeight: 0.94, letterSpacing: "-.04em", margin: 0 }}>
            Field library.
          </h1>
          <p style={{ margin: "0 0 6px", maxWidth: "50ch", fontSize: 16, lineHeight: 1.55, color: "#3E4744" }}>
            Every documented stop, searchable by site, country, or path. Filter by type or sort by annotation density.
          </p>
        </div>
      </section>

      {/* Sticky filter bar */}
      <section
        style={{
          position: "sticky",
          top: 57,
          zIndex: 30,
          background: "rgba(244,242,237,.92)",
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
              placeholder="Search stops, countries or paths"
              style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'Instrument Sans',sans-serif", fontSize: 14, color: "#0B0F0E", width: "100%" }}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
            {CATS.map((c) => (
              <button key={c} onClick={() => setFilter(c)} style={chip(filter === c)}>{c}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Count + sort */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "14px clamp(16px,4vw,56px) 0", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".14em", color: "#5A635F" }}>
          {items.length} {items.length === 1 ? "STOP" : "STOPS"}
        </span>
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 999, background: "rgba(11,15,14,.06)" }}>
          {SORTS.map((s) => (
            <button key={s} onClick={() => setSort(s)} style={sortBtn(sort === s)}>{s}</button>
          ))}
        </div>
      </section>

      {/* Table */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "16px clamp(16px,4vw,56px) clamp(44px,6vw,80px)" }}>
        {items.length === 0 ? (
          <div style={{ border: "1px dashed rgba(11,15,14,.24)", borderRadius: 16, padding: "52px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 600, fontSize: 20, letterSpacing: "-.02em", marginBottom: 8 }}>No stops match that.</div>
            <p style={{ margin: "0 0 20px", color: "#5A635F", fontSize: 15 }}>Try a broader search, or clear the filters.</p>
            <button
              onClick={() => { setQuery(""); setFilter("All"); }}
              style={{ padding: "12px 22px", borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Clear filters
            </button>
          </div>
        ) : isMobile ? (
          /* Mobile: card stack */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item) => {
              const cat = CAT_COLORS[item.cat] ?? { bg: "rgba(11,15,14,.06)", color: "#3E4744" };
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpen(item)}
                  style={{ border: "1px solid rgba(11,15,14,.12)", borderRadius: 14, background: "#FFFDF8", padding: "16px", cursor: item.stopId ? "pointer" : "default", transition: "border-color .15s" }}
                  onTouchStart={(e) => (e.currentTarget.style.borderColor = "#0B0F0E")}
                  onTouchEnd={(e) => (e.currentTarget.style.borderColor = "rgba(11,15,14,.12)")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: "-.01em", marginBottom: 3 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: "#5A635F", lineHeight: 1.45 }}>{item.blurb}</div>
                    </div>
                    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: cat.bg, color: cat.color, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {item.cat.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(11,15,14,.08)", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".1em", color: "#9AA39E", marginBottom: 2 }}>{item.country.toUpperCase()}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".08em", color: "#5A635F" }}>{item.pathName}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 36, height: 3, borderRadius: 2, background: "rgba(11,15,14,.1)", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (item.notes / 45) * 100)}%`, height: "100%", background: "#C9F24D", borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#3E4744" }}>{item.notes}</span>
                      </div>
                      {item.stopId ? (
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: "#14504A" }}>↗</span>
                      ) : (
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#9AA39E", letterSpacing: ".08em" }}>SOON</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop: table */
          <div style={{ border: "1px solid rgba(11,15,14,.12)", borderRadius: 16, overflow: "hidden", background: "#FFFDF8" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(11,15,14,.12)", background: "rgba(11,15,14,.03)" }}>
                  {["Stop", "Country", "Path", "Type", "Annotations", ""].map((h) => (
                    <th
                      key={h}
                      style={{ padding: "12px 18px", textAlign: "left", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#5A635F", fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      {h.toUpperCase()}
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
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", color: "#C9F24D", marginBottom: 10 }}>MISSING A STOP</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(22px,2.6vw,34px)", letterSpacing: "-.03em", margin: "0 0 8px", lineHeight: 1.05 }}>Add it to the index.</h2>
            <p style={{ margin: 0, color: "#C7CFCB", fontSize: 15, maxWidth: "44ch" }}>Pin a stop to the map, annotate the outcrop, and it joins the field library when you publish.</p>
          </div>
          <button
            onClick={() => onNav("map")}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 24px", borderRadius: 999, background: "#C9F24D", color: "#0B0F0E", fontWeight: 600, fontSize: 15, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFFDF8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#C9F24D")}
          >
            Open the map <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>↗</span>
          </button>
        </div>
      </section>

      <PageFooter onNav={onNav} />
    </main>
  );
}

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Geology: { bg: "#FEF3E8", color: "#8C4A20" },
  Heritage: { bg: "#E7F3F1", color: "#14504A" },
};

function TableRow({ item, isLast, onOpen }: { item: LibraryItem; isLast: boolean; onOpen: (i: LibraryItem) => void }) {
  const [hovered, setHovered] = useState(false);
  const cat = CAT_COLORS[item.cat] ?? { bg: "rgba(11,15,14,.06)", color: "#3E4744" };

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
      {/* Stop */}
      <td style={{ padding: "16px 18px", minWidth: 180 }}>
        <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: "-.01em", color: "#0B0F0E" }}>
          {item.title}
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: "#5A635F", lineHeight: 1.4 }}>{item.blurb}</div>
      </td>

      {/* Country */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".1em", color: "#3E4744" }}>
          {item.country}
        </span>
      </td>

      {/* Path */}
      <td style={{ padding: "16px 18px", minWidth: 160 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".1em", color: "#5A635F" }}>
          <svg width="22" height="8" viewBox="0 0 22 8" fill="none" aria-hidden="true">
            <path d="M1 6.5L6 3l5 3 9-4.5" stroke="#0B0F0E" strokeWidth="1.1" strokeDasharray="2.5 2" />
            <circle cx="1" cy="6.5" r="1.5" fill="#0B0F0E" />
            <circle cx="20" cy="2" r="1.5" fill="#C9F24D" stroke="#0B0F0E" strokeWidth="1" />
          </svg>
          {item.pathName}
        </span>
      </td>

      {/* Type */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap" }}>
        <span style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 999,
          background: cat.bg,
          color: cat.color,
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 10,
          letterSpacing: ".12em",
          fontWeight: 600,
        }}>
          {item.cat.toUpperCase()}
        </span>
      </td>

      {/* Annotations */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 48, height: 3, borderRadius: 2, background: "rgba(11,15,14,.1)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (item.notes / 45) * 100)}%`, height: "100%", background: "#C9F24D", borderRadius: 2 }} />
          </div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".1em", color: "#3E4744" }}>
            {item.notes}
          </span>
        </div>
      </td>

      {/* Action */}
      <td style={{ padding: "16px 18px", whiteSpace: "nowrap", textAlign: "right" }}>
        {item.stopId ? (
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: hovered ? "#0B0F0E" : "#14504A",
            fontFamily: "inherit",
            transition: "color .12s",
          }}>
            Open ↗
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#9AA39E", fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".1em" }}>
            COMING SOON
          </span>
        )}
      </td>
    </tr>
  );
}
