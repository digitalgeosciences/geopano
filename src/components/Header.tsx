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
        className="gp-header-dynamic"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: isMobile ? "12px 16px" : "14px clamp(16px,4vw,56px)",
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

        {/* Mobile: hamburger */}
        {isMobile && (
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
        )}
      </header>

      {/* Mobile backdrop */}
      {isMobile && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(11,15,14,.18)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Mobile dropdown menu: compact width, floating card docked to right */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: "fixed",
            top: 58,
            right: 14,
            width: "min(220px, calc(100vw - 28px))",
            zIndex: 9999,
            background: "rgba(255,253,248,.98)",
            backdropFilter: "blur(20px)",
            borderRadius: 18,
            border: "1px solid rgba(11,15,14,.14)",
            boxShadow: "0 16px 40px -12px rgba(11,15,14,.35)",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Menu header with Close button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px 8px", borderBottom: "1px solid rgba(11,15,14,.08)", marginBottom: 4 }}>
            <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#5A635F", textTransform: "uppercase" }}>
              Menu
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              title="Close menu"
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                border: "1px solid rgba(11,15,14,.18)",
                background: "#FFFDF8",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#0B0F0E",
                padding: 0,
                transition: "background .15s",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {NAV_ITEMS.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? "rgba(11,15,14,.07)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  transition: "background .15s",
                }}
              >
                <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: active ? 700 : 500, fontSize: 15, letterSpacing: "-.01em", color: "#0B0F0E" }}>
                  {item.label}
                </span>
                {active && (
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "#0B0F0E", display: "block" }} />
                )}
              </button>
            );
          })}

          <div style={{ height: 1, background: "rgba(11,15,14,.08)", margin: "4px 4px" }} />

          {/* Two separate buttons for Sign up and Log in */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
            <button
              onClick={() => handleNav("signup")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "9px 14px",
                borderRadius: 12,
                border: "1px solid #0B0F0E",
                background: "#C9F24D",
                color: "#0B0F0E",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Instrument Sans',sans-serif",
                cursor: "pointer",
                transition: "transform .1s",
              }}
            >
              Sign Up
            </button>
            <button
              onClick={() => handleNav("signup")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "8px 14px",
                borderRadius: 12,
                border: "1px solid rgba(11,15,14,.2)",
                background: "#FFFDF8",
                color: "#0B0F0E",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Instrument Sans',sans-serif",
                cursor: "pointer",
                transition: "background .15s",
              }}
            >
              Log In
            </button>
          </div>
        </div>
      )}
    </>
  );
}
