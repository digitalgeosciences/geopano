import { View } from "../types";
import PageFooter from "../components/PageFooter";

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
  return (
    <main>
      {/* Header */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(40px,5vw,80px) clamp(16px,4vw,56px) 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ width: 32, height: 2, background: "#0B0F0E", display: "block" }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#5A635F" }}>
            Legal
          </span>
        </div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(36px,5vw,68px)", lineHeight: 0.94, letterSpacing: "-.04em", margin: "0 0 20px" }}>
          Terms of Service
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".14em", color: "#5A635F" }}>
            EFFECTIVE DATE: 1 SEPTEMBER 2026
          </span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: ".14em", color: "#5A635F" }}>
            VERSION 1.0
          </span>
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth: 1200, margin: "clamp(28px,3vw,48px) auto 0", padding: "0 clamp(16px,4vw,56px)" }}>
        <div style={{ height: 1, background: "rgba(11,15,14,.1)" }} />
      </div>

      {/* Body — two-column on wide screens */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(28px,4vw,56px) clamp(16px,4vw,56px) clamp(48px,6vw,88px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "clamp(24px,4vw,80px)" }}>
        {/* TOC sidebar */}
        <div style={{ position: "sticky", top: 80, alignSelf: "start" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".18em", color: "#5A635F", marginBottom: 16 }}>CONTENTS</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#section-${s.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", color: "#3E4744", fontSize: 13, textDecoration: "none", borderBottom: "1px solid rgba(11,15,14,.06)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#0B0F0E")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#3E4744")}
              >
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: ".12em", color: "#9AA39E", flexShrink: 0 }}>{s.id.padStart(2, "0")}</span>
                {s.title}
              </a>
            ))}
          </nav>
          <button
            onClick={() => onNav("privacy")}
            style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid rgba(11,15,14,.18)", borderRadius: 999, padding: "10px 16px", cursor: "pointer", fontSize: 13, color: "#3E4744", fontFamily: "inherit", transition: "border-color .15s, color .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0B0F0E"; e.currentTarget.style.color = "#0B0F0E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(11,15,14,.18)"; e.currentTarget.style.color = "#3E4744"; }}
          >
            Privacy Policy <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>→</span>
          </button>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {SECTIONS.map((s) => (
            <div key={s.id} id={`section-${s.id}`}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".16em", color: "#C9F24D", background: "#0B0F0E", padding: "3px 8px", borderRadius: 4 }}>
                  {s.id.padStart(2, "0")}
                </span>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(18px,2vw,24px)", letterSpacing: "-.02em", margin: 0 }}>
                  {s.title}
                </h2>
              </div>
              {s.body.split("\n\n").map((para, i) => (
                <p key={i} style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.75, color: "#3E4744", whiteSpace: "pre-line" }}>{para}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <PageFooter onNav={onNav} />
    </main>
  );
}
