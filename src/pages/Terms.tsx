import { useState } from "react";
import { View } from "../types";
import PageFooter from "../components/PageFooter";
import { useIsMobile } from "../hooks/useWindowWidth";

interface Props {
  onNav: (v: View) => void;
}

const SECTIONS = [
  {
    id: "1",
    title: "Acceptance of Terms",
    body: `By creating a Geopano account or accessing any part of the platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use the service.

These terms apply to all users of the platform, including contributors who upload panoramas, annotate stops, publish paths, or otherwise interact with field records on Geopano.`,
  },
  {
    id: "2",
    title: "Description of Service",
    body: `Geopano is a field documentation platform that allows users to upload 360° panoramic imagery, pin stops to geographic coordinates, annotate outcrops and sites of interest, and organise stops into traverses and paths.

The platform is intended for use by geologists, field researchers, heritage documentarians, students, and educators engaged in legitimate fieldwork and academic study. Commercial use requires a separate agreement.`,
  },
  {
    id: "3",
    title: "User Accounts",
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate and complete information when creating an account and keep that information up to date.

You may not share your account with others, create accounts for automated access without prior written consent, or use another user's account without permission. Geopano reserves the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    id: "4",
    title: "User Content and Licensing",
    body: `You retain ownership of all panoramas, annotations, field notes, and other content you upload or create on Geopano ("User Content"). By uploading content, you grant Geopano a worldwide, non-exclusive, royalty-free licence to store, display, reproduce, and distribute that content solely for the purpose of operating and improving the platform.

You represent that you have all necessary rights to the content you upload and that it does not infringe any third-party intellectual property, privacy, or other rights. You are solely responsible for ensuring you have the right to document and share the locations and sites you record.`,
  },
  {
    id: "5",
    title: "Prohibited Conduct",
    body: `You may not use Geopano to:

— Upload content depicting illegal activity, sites accessed without authorisation, or sensitive locations whose publication could cause harm to communities, ecosystems, or individuals.
— Reverse-engineer, scrape, or systematically extract data from the platform without written consent.
— Impersonate any person or organisation, or misrepresent the provenance or authenticity of field records.
— Upload malware, phishing content, or any code that could harm the platform or other users.
— Use the platform in any way that could disable, overburden, or impair its infrastructure.`,
  },
  {
    id: "6",
    title: "Intellectual Property",
    body: `All platform software, design, branding, and non-user content is the property of Geopano and is protected by applicable intellectual property laws. Nothing in these terms transfers any ownership rights to you.

The Geopano name, logo, and product design may not be used without express written permission. Feedback and suggestions you provide may be used to improve the platform without obligation to you.`,
  },
  {
    id: "7",
    title: "Privacy",
    body: `Your use of Geopano is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the platform, you consent to the data practices described in the Privacy Policy.`,
  },
  {
    id: "8",
    title: "Disclaimer of Warranties",
    body: `Geopano is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of harmful components. Field documentation data is provided for reference only — always verify observations independently before relying on them for safety-critical decisions.`,
  },
  {
    id: "9",
    title: "Limitation of Liability",
    body: `To the maximum extent permitted by law, Geopano shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the platform, including loss of data, loss of profits, or personal injury sustained during fieldwork documented on the platform.`,
  },
  {
    id: "10",
    title: "Modifications to Terms",
    body: `We may update these Terms of Service from time to time. We will notify users of material changes by email or by posting a notice within the platform. Continued use of Geopano after changes take effect constitutes acceptance of the revised terms.`,
  },
  {
    id: "11",
    title: "Governing Law",
    body: `These terms are governed by and construed in accordance with applicable law. Any disputes arising from these terms or your use of the platform shall be resolved through binding arbitration or, where arbitration is not permitted, in the courts of competent jurisdiction.`,
  },
  {
    id: "12",
    title: "Contact",
    body: `If you have questions about these Terms of Service, please contact us at hello@geopano.com. We aim to respond within five business days.`,
  },
];

export default function Terms({ onNav }: Props) {
  const isMobile = useIsMobile(768);
  const [activeSec, setActiveSec] = useState<string>("1");

  const scrollTo = (id: string) => {
    setActiveSec(id);
    const el = document.getElementById(`terms-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F4F2ED" }}>
      {/* Header */}
      <section style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: isMobile ? "28px 16px 0" : "clamp(36px,5vw,72px) clamp(16px,4vw,56px) 0", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ width: 28, height: 2, background: "#0B0F0E", display: "block" }} />
          <span style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#5A635F" }}>
            Legal Documentation
          </span>
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(32px,5.5vw,64px)", lineHeight: 1.0, letterSpacing: "-.035em", margin: "0 0 16px", color: "#0B0F0E" }}>
          Terms of Service
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, background: "rgba(11,15,14,.06)", fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 600, color: "#3E4744" }}>
            Effective: 1 September 2026
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, background: "rgba(11,15,14,.06)", fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 600, color: "#5A635F" }}>
            Version 1.0
          </span>
        </div>
      </section>

      {/* Commitment Banner */}
      <div style={{ background: "#0B0F0E", color: "#FFFDF8", margin: isMobile ? "24px 0 0" : "32px 0 0", padding: isMobile ? "22px 16px" : "36px clamp(16px,4vw,56px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <blockquote style={{ margin: 0, fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(18px,2.8vw,28px)", letterSpacing: "-.02em", lineHeight: 1.35, color: "#C9F24D" }}>
            "Open science, clear rules, and complete respect for scientific attribution."
          </blockquote>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "rgba(255,253,248,.7)", lineHeight: 1.6 }}>
            These terms govern your access to and use of Geopano's panoramic mapping and field recording tools.
          </p>
        </div>
      </div>

      {/* Mobile Sticky Quick Jump Navigation */}
      {isMobile && (
        <div
          style={{
            position: "sticky",
            top: 57,
            zIndex: 40,
            background: "rgba(244,242,237,.94)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(11,15,14,.1)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#5A635F", flexShrink: 0 }}>
            Jump:
          </span>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                flexShrink: 0,
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: activeSec === s.id ? 700 : 500,
                border: activeSec === s.id ? "1px solid #0B0F0E" : "1px solid rgba(11,15,14,.14)",
                background: activeSec === s.id ? "#C9F24D" : "#FFFDF8",
                color: "#0B0F0E",
                cursor: "pointer",
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}
            >
              {s.id}. {s.title}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Layout */}
      <section
        style={{
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: isMobile ? "24px 16px 48px" : "clamp(36px,4vw,56px) clamp(16px,4vw,56px) clamp(48px,6vw,80px)",
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: "240px minmax(0, 1fr)",
          gap: "clamp(32px,5vw,72px)",
          alignItems: "start",
          boxSizing: "border-box",
        }}
      >
        {/* Desktop Sticky Sidebar */}
        {!isMobile && (
          <aside style={{ position: "sticky", top: 80, alignSelf: "start" }}>
            <div style={{ fontFamily: "'Instrument Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#5A635F", marginBottom: 14 }}>
              Table of Contents
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#terms-section-${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(s.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 8,
                    color: activeSec === s.id ? "#0B0F0E" : "#4B5552",
                    background: activeSec === s.id ? "rgba(201,242,77,.28)" : "transparent",
                    fontSize: 13,
                    fontWeight: activeSec === s.id ? 700 : 500,
                    textDecoration: "none",
                    transition: "all .12s",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: activeSec === s.id ? "#0B0F0E" : "#9AA39E", width: 18, flexShrink: 0 }}>
                    {s.id.padStart(2, "0")}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                </a>
              ))}
            </nav>

            <button
              onClick={() => onNav("privacy")}
              style={{
                marginTop: 28,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                background: "#FFFDF8",
                border: "1px solid rgba(11,15,14,.18)",
                borderRadius: 999,
                padding: "10px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "#0B0F0E",
                fontFamily: "inherit",
                transition: "background .15s, border-color .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#C9F24D"; e.currentTarget.style.borderColor = "#0B0F0E"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFDF8"; e.currentTarget.style.borderColor = "rgba(11,15,14,.18)"; }}
            >
              <span>Privacy Policy</span>
              <span>→</span>
            </button>
          </aside>
        )}

        {/* Section List */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 32 : 44, minWidth: 0 }}>
          {SECTIONS.map((s) => (
            <article
              key={s.id}
              id={`terms-section-${s.id}`}
              style={{
                scrollMarginTop: 120,
                background: "#FFFDF8",
                border: "1px solid rgba(11,15,14,.1)",
                borderRadius: 16,
                padding: isMobile ? "18px 16px" : "28px 32px",
                boxShadow: "0 2px 8px -2px rgba(11,15,14,.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "#0B0F0E",
                    color: "#C9F24D",
                    fontFamily: "'Instrument Sans',sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {s.id}
                </span>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(18px,2.5vw,22px)", letterSpacing: "-.02em", margin: 0, color: "#0B0F0E" }}>
                  {s.title}
                </h2>
              </div>

              {s.body.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  style={{
                    margin: "0 0 12px",
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "#3E4744",
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    whiteSpace: "pre-line",
                  }}
                >
                  {para}
                </p>
              ))}
            </article>
          ))}

          {/* Switch page card for mobile */}
          {isMobile && (
            <div style={{ marginTop: 8, padding: 16, borderRadius: 14, background: "#FFFDF8", border: "1px solid rgba(11,15,14,.12)", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#5A635F", marginBottom: 10 }}>Have questions about how we handle your data?</div>
              <button
                onClick={() => onNav("privacy")}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 999,
                  background: "#C9F24D",
                  border: "1px solid #0B0F0E",
                  color: "#0B0F0E",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Read Privacy Policy →
              </button>
            </div>
          )}
        </div>
      </section>

      <PageFooter onNav={onNav} />
    </main>
  );
}
