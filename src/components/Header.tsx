import { useState } from "react";
import Logo from "./Logo";
import { View } from "../types";
import { useIsMobile } from "../hooks/useWindowWidth";

interface HeaderProps {
  view: View;
  onNav: (v: View) => void;
}

const NAV_ITEMS: { label: string; view: View }[] = [
  { label: "Home", view: "landing" },
  { label: "Map", view: "map" },
  { label: "Library", view: "library" },
  { label: "About", view: "about" },
];

export default function Header({ view, onNav }: HeaderProps) {
  const isMobile = useIsMobile(768);
  const [menuOpen, setMenuOpen] = useState(false);

  const tab = (active: boolean) =>
    [
      "px-4 py-2 rounded-full border-none text-sm font-semibold whitespace-nowrap font-[inherit] transition-colors duration-200",
      active
        ? "bg-[#0B0F0E] text-[#F4F2ED]"
        : "bg-transparent text-[#5A635F] hover:text-[#0B0F0E]",
    ].join(" ");

  function handleNav(v: View) {
    onNav(v);
    setMenuOpen(false);
  }

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: isMobile ? "12px 16px" : "14px clamp(16px,4vw,56px)",
          background: "rgba(244,242,237,.92)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(11,15,14,.08)",
        }}
      >
        {/* Logo */}
        <button
          onClick={() => handleNav("landing")}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          aria-label="Geopano home"
        >
          <Logo />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: "-.02em" }}>
            Geopano
          </span>
        </button>

        {/* Desktop nav */}
        {!isMobile && (
          <nav style={{ display: "flex", alignItems: "center", gap: 4, padding: 4, borderRadius: 999, background: "rgba(11,15,14,.06)" }}>
            {NAV_ITEMS.map((item) => (
              <button key={item.view} className={tab(view === item.view)} onClick={() => handleNav(item.view)}>
                {item.label}
              </button>
            ))}
          </nav>
        )}

        {/* Desktop Sign up */}
        {!isMobile && (
          <a
            href="#signup"
            onClick={(e) => { e.preventDefault(); handleNav("signup"); }}
            style={{ display: "inline-flex", alignItems: "center", padding: "10px 18px", borderRadius: 999, background: "#0B0F0E", color: "#F4F2ED", fontSize: 14, fontWeight: 600, transition: "background .2s", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#14504A")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#0B0F0E")}
          >
            Sign up
          </a>
        )}

        {/* Mobile: Sign up + hamburger */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a
              href="#signup"
              onClick={(e) => { e.preventDefault(); handleNav("signup"); }}
              style={{ display: "inline-flex", alignItems: "center", padding: "8px 14px", borderRadius: 999, background: "#C9F24D", color: "#0B0F0E", fontSize: 13, fontWeight: 700, border: "1px solid #0B0F0E", flexShrink: 0 }}
            >
              Sign up
            </a>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid rgba(11,15,14,.18)", background: menuOpen ? "#0B0F0E" : "#FFFDF8", color: menuOpen ? "#F4F2ED" : "#0B0F0E", display: "grid", placeItems: "center", cursor: "pointer", transition: "background .15s", flexShrink: 0 }}
            >
              {menuOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: "fixed",
            top: 57,
            left: 0,
            right: 0,
            zIndex: 39,
            background: "rgba(244,242,237,.98)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(11,15,14,.1)",
            padding: "8px 16px 16px",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNav(item.view)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "14px 4px",
                border: "none",
                borderBottom: "1px solid rgba(11,15,14,.07)",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: view === item.view ? 700 : 500, fontSize: 18, letterSpacing: "-.02em", color: "#0B0F0E" }}>
                {item.label}
              </span>
              {view === item.view && (
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#C9F24D", border: "1px solid #0B0F0E", display: "block" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
