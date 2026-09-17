import { View } from "../types";
import PageFooter from "../components/PageFooter";

interface Props {
  onNav: (v: View) => void;
}

const TEAM = [
  { name: "A. Alqubalee", role: "Structural Geology · AlUla", initials: "AA" },
  { name: "M. Al-Rashidi", role: "Field Mapping · Hejaz", initials: "MA" },
  { name: "M. Reis", role: "Heritage Documentation · Lisbon", initials: "MR" },
];

const PRINCIPLES = [
  { n: "01", title: "Field-first", body: "Every feature is designed around the conditions of real fieldwork — intermittent connectivity, gloved hands, bright sun on a screen." },
  { n: "02", title: "Annotation over description", body: "A pinned note on a panorama carries more information than a paragraph. We build tools that make spatial annotation fast and precise." },
  { n: "03", title: "Open records", body: "Documented stops belong to the community. Published paths are citable, shareable, and persistently linked to their coordinates." },
];

export default function About({ onNav }: Props) {
  return (
    <main>
      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px,6vw,96px) clamp(16px,4vw,56px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <span style={{ width: 32, height: 2, background: "#0B0F0E", display: "block" }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#5A635F" }}>
            About Geopano
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: "clamp(16px,4vw,64px)", alignItems: "end" }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(40px,5.5vw,76px)", lineHeight: 0.92, letterSpacing: "-.04em", margin: 0 }}>
            Built for the<br />field record.
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 17, lineHeight: 1.65, color: "#3E4744", maxWidth: "52ch" }}>
            Geopano started as a tool for a single geological traverse in AlUla. It is now a platform for documenting any site where a photograph alone is not enough — where orientation, context, and annotation matter.
          </p>
        </div>
      </section>

      {/* Divider rule */}
      <div style={{ maxWidth: 1200, margin: "clamp(40px,5vw,72px) auto 0", padding: "0 clamp(16px,4vw,56px)" }}>
        <div style={{ height: 1, background: "rgba(11,15,14,.1)" }} />
      </div>

      {/* Principles */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(40px,5vw,72px) clamp(16px,4vw,56px)" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", color: "#5A635F", marginBottom: 36 }}>
          PRINCIPLES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 2 }}>
          {PRINCIPLES.map((p) => (
            <div
              key={p.n}
              style={{ padding: "clamp(24px,3vw,40px)", border: "1px solid rgba(11,15,14,.1)", background: "#FFFDF8" }}
            >
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".16em", color: "#C9F24D", background: "#0B0F0E", display: "inline-block", padding: "4px 10px", borderRadius: 4, marginBottom: 18 }}>
                {p.n}
              </div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "-.02em", margin: "0 0 12px" }}>
                {p.title}
              </h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#3E4744" }}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission statement — full bleed dark */}
      <section style={{ background: "#0B0F0E", color: "#F4F2ED", margin: "0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px,6vw,88px) clamp(16px,4vw,56px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: "clamp(32px,4vw,64px)", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", color: "#C9F24D", marginBottom: 18 }}>
              MISSION
            </div>
            <blockquote style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(22px,2.8vw,36px)", lineHeight: 1.15, letterSpacing: "-.03em", margin: 0, borderLeft: "3px solid #C9F24D", paddingLeft: 24 }}>
              "The outcrop is the primary document. Everything else is interpretation."
            </blockquote>
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#C7CFCB", margin: 0, maxWidth: "48ch" }}>
            We believe that well-documented field observations — anchored in space, annotated with precision, and preserved in full 360° context — are the most durable unit of geological knowledge. Geopano is infrastructure for that documentation.
          </p>
        </div>
      </section>

      {/* Team */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(48px,6vw,88px) clamp(16px,4vw,56px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "baseline", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", color: "#5A635F", marginBottom: 10 }}>CONTRIBUTORS</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(28px,3.5vw,48px)", letterSpacing: "-.04em", margin: 0, lineHeight: 0.96 }}>
              The field team.
            </h2>
          </div>
          <p style={{ fontSize: 15, color: "#5A635F", maxWidth: "40ch", margin: 0 }}>
            Geopano is built by geologists and developers who have carried field notebooks in places where cell service doesn't reach.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
          {TEAM.map((member) => (
            <div
              key={member.name}
              style={{ padding: "24px", border: "1px solid rgba(11,15,14,.12)", borderRadius: 16, background: "#FFFDF8", display: "flex", gap: 16, alignItems: "flex-start" }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0B0F0E", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: ".06em", color: "#C9F24D" }}>{member.initials}</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: "-.01em", marginBottom: 4 }}>{member.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".12em", color: "#5A635F" }}>{member.role.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px,4vw,56px) clamp(48px,6vw,88px)" }}>
        <div style={{ borderRadius: 24, background: "#C9F24D", border: "1.5px solid #0B0F0E", padding: "clamp(28px,4vw,48px)", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", color: "#14504A", marginBottom: 10 }}>GET STARTED</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(22px,2.8vw,36px)", letterSpacing: "-.03em", margin: "0 0 8px", lineHeight: 1.05 }}>
              Document your first stop.
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: "#14504A", maxWidth: "44ch" }}>
              Create a free account and start annotating panoramas in minutes.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => onNav("signup")}
              style={{ padding: "14px 24px", borderRadius: 999, background: "#0B0F0E", color: "#F4F2ED", fontWeight: 600, fontSize: 15, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#14504A")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#0B0F0E")}
            >
              Create account
            </button>
            <button
              onClick={() => onNav("map")}
              style={{ padding: "14px 24px", borderRadius: 999, background: "transparent", color: "#0B0F0E", fontWeight: 600, fontSize: 15, border: "1.5px solid rgba(11,15,14,.3)", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Explore the map <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>↗</span>
            </button>
          </div>
        </div>
      </section>

      <PageFooter onNav={onNav} />
    </main>
  );
}
