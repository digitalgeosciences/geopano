import { View } from "../types";

interface Props {
  onNav: (v: View) => void;
}

export default function PageFooter({ onNav }: Props) {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(11,15,14,.1)",
        padding: "10px clamp(12px,3vw,36px)",
        maxWidth: 1200,
        margin: "0 auto",
        display: "flex",
        flexWrap: "nowrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "'Instrument Sans',sans-serif",
        fontSize: "clamp(11px,2.4vw,13px)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <span style={{ color: "#5A635F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1 }}>
        © 2026 Geopano<span className="gp-footer-full">. All rights reserved.</span>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(10px,2vw,20px)", flexShrink: 0, whiteSpace: "nowrap" }}>
        <a href="mailto:hello@geopano.com" className="gp-footer-email" style={{ color: "#5A635F" }}>hello@geopano.com</a>
        <button onClick={() => onNav("privacy")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", fontSize: "inherit", fontFamily: "inherit" }}>Privacy</button>
        <button onClick={() => onNav("terms")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", fontSize: "inherit", fontFamily: "inherit" }}>Terms</button>
      </div>
    </footer>
  );
}
