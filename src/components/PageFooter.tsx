import { View } from "../types";

interface Props {
  onNav: (v: View) => void;
}

export default function PageFooter({ onNav }: Props) {
  return (
    <footer style={{ borderTop: "1px solid rgba(11,15,14,.1)", padding: "28px clamp(16px,4vw,56px)", maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "#5A635F" }}>© 2026 Geopano. All rights reserved.</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 13 }}>
        <a href="mailto:hello@geopano.com" style={{ color: "#5A635F" }}>hello@geopano.com</a>
        <button onClick={() => onNav("privacy")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", fontSize: 13, fontFamily: "inherit" }}>Privacy</button>
        <button onClick={() => onNav("terms")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", fontSize: 13, fontFamily: "inherit" }}>Terms</button>
      </div>
    </footer>
  );
}
