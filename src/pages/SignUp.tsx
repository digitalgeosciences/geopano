import { useState } from "react";
import { View } from "../types";
import Logo from "../components/Logo";
import { useIsMobile } from "../hooks/useWindowWidth";

interface Props {
  onNav: (v: View) => void;
}

const ROLES = ["Field Geologist", "Researcher", "Student", "Educator"];

const FEATURES = [
  { icon: "◈", label: "Annotate outcrops", detail: "Pin point, line, and polygon annotations directly onto 360° panoramas." },
  { icon: "⊕", label: "Build traverses", detail: "Chain stops into ordered field paths with metadata and coordinates." },
  { icon: "◎", label: "Share findings", detail: "Publish to the field library or share a direct link to any stop." },
];

export default function SignUp({ onNav }: Props) {
  const isMobile = useIsMobile(768);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !role) return;
    setSubmitted(true);
  }

  const fieldStyle = (id: string): React.CSSProperties => ({
    width: "100%",
    padding: "13px 16px",
    borderRadius: 12,
    border: focused === id ? "1.5px solid #0B0F0E" : "1.5px solid rgba(11,15,14,.18)",
    background: "#FFFDF8",
    fontFamily: "'Instrument Sans', sans-serif",
    fontSize: 15,
    color: "#0B0F0E",
    outline: "none",
    transition: "border-color .15s",
    boxSizing: "border-box",
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: ".16em",
    color: "#5A635F",
    marginBottom: 7,
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "calc(100vh - 57px)", display: "grid", placeItems: "center", padding: "clamp(32px,6vw,80px) clamp(16px,4vw,56px)" }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: "#C9F24D", border: "1.5px solid #0B0F0E", display: "grid", placeItems: "center", fontSize: 26, margin: "0 auto 28px" }}>✓</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: "clamp(30px,4vw,48px)", letterSpacing: "-.04em", margin: "0 0 14px" }}>
            You're in, {name.split(" ")[0]}.
          </h1>
          <p style={{ fontSize: 16, color: "#3E4744", lineHeight: 1.6, margin: "0 0 32px" }}>
            Your account has been created. Start by exploring the field map or browsing the stop library.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => onNav("map")}
              style={{ padding: "13px 24px", borderRadius: 999, background: "#0B0F0E", color: "#F4F2ED", fontWeight: 600, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Open the map
            </button>
            <button
              onClick={() => onNav("library")}
              style={{ padding: "13px 24px", borderRadius: 999, background: "transparent", color: "#0B0F0E", fontWeight: 600, fontSize: 15, border: "1.5px solid rgba(11,15,14,.24)", cursor: "pointer" }}
            >
              Browse library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 57px)",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        alignItems: "stretch",
      }}
    >
      {/* Left panel — brand (hidden on mobile) */}
      <div
        style={{
          display: isMobile ? "none" : "flex",
          background: "#0B0F0E",
          color: "#F4F2ED",
          padding: "clamp(36px,5vw,72px) clamp(28px,5vw,64px)",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Topographic grid motif */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06, pointerEvents: "none" }}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="topo-grid" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
              <line x1="0" y1="28" x2="56" y2="28" stroke="#F4F2ED" strokeWidth="0.8" />
              <line x1="28" y1="0" x2="28" y2="56" stroke="#F4F2ED" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-grid)" />
          {/* Contour rings */}
          {[40, 80, 120, 160, 200].map((r, i) => (
            <ellipse
              key={i}
              cx="72%"
              cy="68%"
              rx={r * 1.6}
              ry={r}
              fill="none"
              stroke="#C9F24D"
              strokeWidth="0.7"
              opacity={0.7 - i * 0.12}
            />
          ))}
        </svg>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <Logo />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: "-.02em" }}>
            Geopano
          </span>
        </div>

        {/* Headline */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ width: 28, height: 1.5, background: "#C9F24D", display: "block" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".18em", color: "#C9F24D" }}>
              FIELD DOCUMENTATION PLATFORM
            </span>
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: "clamp(32px,3.6vw,52px)", lineHeight: 0.94, letterSpacing: "-.04em", margin: "0 0 24px" }}>
            Document what the<br />map can't capture.
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: "#C7CFCB", maxWidth: "40ch", margin: 0 }}>
            Geopano turns 360° panoramas into annotated field records — pinned to coordinates, tied to paths, open to your team.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
          {FEATURES.map((f) => (
            <div key={f.label} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(201,242,77,.28)", display: "grid", placeItems: "center", color: "#C9F24D", fontSize: 16, flexShrink: 0, background: "rgba(201,242,77,.07)" }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: "-.01em", marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: 13, color: "#9AA39E", lineHeight: 1.5 }}>{f.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          background: "#F4F2ED",
          padding: isMobile ? "32px 20px 48px" : "clamp(36px,5vw,72px) clamp(28px,5vw,64px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: isMobile ? "stretch" : "flex-start",
        }}
      >
        <div style={{ maxWidth: isMobile ? "100%" : 420, width: "100%" }}>
          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".18em", color: "#5A635F", marginBottom: 12 }}>
              CREATE ACCOUNT
            </div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: "clamp(28px,3vw,40px)", letterSpacing: "-.04em", lineHeight: 0.96, margin: 0 }}>
              Join the field.
            </h1>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Full name */}
            <div>
              <label htmlFor="name" style={labelStyle}>FULL NAME</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
                style={fieldStyle("name")}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" style={labelStyle}>EMAIL</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="ada@fieldwork.io"
                autoComplete="email"
                required
                style={fieldStyle("email")}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" style={labelStyle}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  style={{ ...fieldStyle("password"), paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#5A635F", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".06em" }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? "HIDE" : "SHOW"}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4].map((n) => {
                    const strength = Math.min(4, Math.floor(password.length / 3));
                    const colors = ["#E85B4A", "#E8A24A", "#C9F24D", "#14504A"];
                    return (
                      <div
                        key={n}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: n <= strength ? colors[strength - 1] : "rgba(11,15,14,.1)",
                          transition: "background .2s",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label style={labelStyle}>ROLE</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      border: role === r ? "1.5px solid #0B0F0E" : "1.5px solid rgba(11,15,14,.18)",
                      background: role === r ? "#C9F24D" : "#FFFDF8",
                      color: "#0B0F0E",
                      transition: "background .15s, border-color .15s",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!name || !email || !password || !role || password.length < 8}
              style={{
                marginTop: 4,
                width: "100%",
                padding: "15px 24px",
                borderRadius: 999,
                border: "none",
                background: (!name || !email || !password || !role || password.length < 8) ? "rgba(11,15,14,.12)" : "#C9F24D",
                color: (!name || !email || !password || !role || password.length < 8) ? "#9AA39E" : "#0B0F0E",
                fontWeight: 700,
                fontSize: 15,
                cursor: (!name || !email || !password || !role || password.length < 8) ? "not-allowed" : "pointer",
                transition: "background .2s, color .2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
              onMouseEnter={(e) => {
                if (name && email && password && role && password.length >= 8)
                  e.currentTarget.style.background = "#0B0F0E";
                  (e.currentTarget as HTMLButtonElement).style.color = "#C9F24D";
              }}
              onMouseLeave={(e) => {
                if (name && email && password && role && password.length >= 8)
                  e.currentTarget.style.background = "#C9F24D";
                  (e.currentTarget as HTMLButtonElement).style.color = "#0B0F0E";
              }}
            >
              Create account
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>→</span>
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(11,15,14,.1)" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".14em", color: "#9AA39E" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(11,15,14,.1)" }} />
            </div>

            {/* Log in link */}
            <p style={{ margin: 0, textAlign: "center", fontSize: 14, color: "#5A635F" }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => onNav("landing")}
                style={{ background: "none", border: "none", fontWeight: 600, color: "#14504A", cursor: "pointer", fontSize: 14, padding: 0, fontFamily: "inherit" }}
              >
                Log in
              </button>
            </p>
          </form>

          {/* Legal */}
          <p style={{ marginTop: 28, fontSize: 12, color: "#9AA39E", lineHeight: 1.6, textAlign: "center" }}>
            By creating an account you agree to the{" "}
            <button onClick={() => onNav("terms")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", textDecoration: "underline", fontSize: "inherit", fontFamily: "inherit" }}>Terms of Service</button>{" "}
            and{" "}
            <button onClick={() => onNav("privacy")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", textDecoration: "underline", fontSize: "inherit", fontFamily: "inherit" }}>Privacy Policy</button>.
          </p>
        </div>
      </div>
    </div>
  );
}
