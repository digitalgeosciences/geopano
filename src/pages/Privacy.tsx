import { View } from "../types";
import PageFooter from "../components/PageFooter";

interface Props {
  onNav: (v: View) => void;
}

const SECTIONS = [
  {
    id: "1",
    title: "Who We Are",
    body: `Geopano is a field documentation platform designed for geological researchers, heritage documentarians, students, and educators. We are committed to protecting your personal data and handling it responsibly.

For the purposes of this Privacy Policy, "Geopano", "we", "us", and "our" refer to the Geopano platform and its operating team. Questions or requests can be directed to hello@geopano.com.`,
  },
  {
    id: "2",
    title: "Information We Collect",
    body: `We collect information in three ways:

Information you provide directly — When you create an account, you give us your name, email address, password, and optional role information (e.g. researcher, student, educator). When you upload content, we store the panoramas, annotations, field notes, and geographic coordinates you provide.

Information collected automatically — When you use Geopano, we collect basic usage data including pages visited, features used, browser type, operating system, and approximate location derived from IP address. We use cookies and similar technologies to maintain session state and remember your preferences.

Information from third parties — If you sign in via a supported identity provider in the future, we may receive a limited profile including your name and email address as authorised by that provider.`,
  },
  {
    id: "3",
    title: "How We Use Your Information",
    body: `We use your information to:

— Provide, maintain, and improve the Geopano platform
— Authenticate your account and authorise access to your data
— Send transactional emails such as account confirmations and password resets
— Respond to support requests and feedback
— Analyse aggregate usage patterns to improve performance and features
— Detect and prevent abuse, fraud, or security incidents
— Comply with legal obligations

We do not sell your personal data to third parties, and we do not use your field content to train AI models without explicit consent.`,
  },
  {
    id: "4",
    title: "Legal Bases for Processing",
    body: `We process your personal data on the following legal grounds:

Contract — Processing your account information is necessary to perform the contract between you and Geopano (i.e., to provide the service you signed up for).

Legitimate interests — We process usage analytics and security logs based on our legitimate interest in operating a reliable and secure platform.

Legal obligation — We may process or retain data where required to comply with applicable law.

Consent — Where we rely on consent (e.g. optional marketing emails), you may withdraw it at any time without affecting the lawfulness of prior processing.`,
  },
  {
    id: "5",
    title: "Data Retention",
    body: `We retain your account information and field content for as long as your account is active or as needed to provide the service. If you delete your account, we will delete or anonymise your personal data within 30 days, except where retention is required by law or necessary to resolve ongoing disputes.

Aggregated, anonymised usage statistics that cannot be linked to you may be retained indefinitely.`,
  },
  {
    id: "6",
    title: "Cookies and Tracking",
    body: `Geopano uses essential cookies to keep you logged in and remember your interface preferences. We do not use third-party advertising cookies.

You can control cookie behaviour through your browser settings. Disabling essential cookies will prevent you from remaining signed in to the platform.`,
  },
  {
    id: "7",
    title: "Data Sharing",
    body: `We share your data only in the following limited circumstances:

Service providers — We use trusted third-party providers for infrastructure (hosting, storage, email delivery). These providers process data only on our behalf and are bound by data processing agreements.

Legal requirements — We may disclose data if required by law, court order, or to protect the rights, property, or safety of Geopano, our users, or the public.

Business transfers — In the event of a merger, acquisition, or sale of assets, user data may be transferred to the successor entity, subject to the same privacy protections.

We do not share your personal data with data brokers, advertisers, or analytics platforms that sell audience data.`,
  },
  {
    id: "8",
    title: "International Transfers",
    body: `Geopano's infrastructure may be located in multiple regions. If your data is transferred outside your country of residence, we ensure appropriate safeguards are in place — such as standard contractual clauses — to protect it in accordance with applicable data protection law.`,
  },
  {
    id: "9",
    title: "Your Rights",
    body: `Depending on your jurisdiction, you may have the right to:

— Access the personal data we hold about you
— Correct inaccurate or incomplete data
— Request deletion of your personal data ("right to erasure")
— Object to or restrict certain processing activities
— Receive your data in a portable, machine-readable format
— Withdraw consent where processing is based on consent
— Lodge a complaint with your local data protection authority

To exercise any of these rights, contact us at hello@geopano.com. We will respond within 30 days.`,
  },
  {
    id: "10",
    title: "Security",
    body: `We implement industry-standard security measures including encrypted data transmission (TLS), encrypted storage of credentials, access controls, and regular security reviews. No system is perfectly secure, and we cannot guarantee absolute security, but we take reasonable steps to protect your data from unauthorised access or disclosure.

If you discover a security vulnerability, please report it responsibly to hello@geopano.com rather than disclosing it publicly.`,
  },
  {
    id: "11",
    title: "Children",
    body: `Geopano is not directed at children under 16 years of age. We do not knowingly collect personal data from children. If you believe we have inadvertently collected data from a child, please contact us and we will delete it promptly.`,
  },
  {
    id: "12",
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or via an in-platform notice at least 14 days before the changes take effect. Your continued use of Geopano after changes take effect constitutes acceptance of the revised policy.`,
  },
  {
    id: "13",
    title: "Contact Us",
    body: `For privacy-related questions, access requests, or complaints, contact our team at:

hello@geopano.com

We aim to respond to all requests within 30 days.`,
  },
];

export default function Privacy({ onNav }: Props) {
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
          Privacy Policy
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

      {/* Commitment band */}
      <div style={{ background: "#14504A", color: "#FFFDF8", padding: "clamp(28px,4vw,48px) clamp(16px,4vw,56px)", margin: "0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <blockquote style={{ margin: 0, fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(18px,2.5vw,30px)", letterSpacing: "-.025em", lineHeight: 1.3 }}>
            "We do not sell your data. We do not use your field content to train AI models. Your research is yours."
          </blockquote>
          <p style={{ margin: "16px 0 0", fontSize: 14, color: "rgba(255,253,248,.65)", lineHeight: 1.6 }}>
            This policy explains in plain language what we collect, why, and how you can control it.
          </p>
        </div>
      </div>

      {/* Body */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(28px,4vw,56px) clamp(16px,4vw,56px) clamp(48px,6vw,88px)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "clamp(24px,4vw,80px)" }}>
        {/* TOC sidebar */}
        <div style={{ position: "sticky", top: 80, alignSelf: "start" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".18em", color: "#5A635F", marginBottom: 16 }}>CONTENTS</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#priv-section-${s.id}`}
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
            onClick={() => onNav("terms")}
            style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid rgba(11,15,14,.18)", borderRadius: 999, padding: "10px 16px", cursor: "pointer", fontSize: 13, color: "#3E4744", fontFamily: "inherit", transition: "border-color .15s, color .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0B0F0E"; e.currentTarget.style.color = "#0B0F0E"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(11,15,14,.18)"; e.currentTarget.style.color = "#3E4744"; }}
          >
            Terms of Service <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>→</span>
          </button>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
          {SECTIONS.map((s) => (
            <div key={s.id} id={`priv-section-${s.id}`}>
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
