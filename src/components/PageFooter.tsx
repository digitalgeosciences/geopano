import { View } from "../types";

interface Props {
  onNav: (v: View) => void;
}

export default function PageFooter({ onNav }: Props) {
  return (
    <footer className="gp-page-footer">
      <span style={{ color: "#5A635F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1 }}>
        © 2026 Geopano<span className="gp-footer-full">. All rights reserved.</span>
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px,2vw,20px)", flexShrink: 0, whiteSpace: "nowrap" }}>
        <a href="mailto:hello@geopano.com" className="gp-footer-email" style={{ color: "#5A635F" }}>hello@geopano.com</a>
        <button onClick={() => onNav("privacy")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", fontSize: "inherit", fontFamily: "inherit" }}>Privacy</button>
        <button onClick={() => onNav("terms")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5A635F", fontSize: "inherit", fontFamily: "inherit" }}>Terms</button>
      </div>
    </footer>
  );
}
