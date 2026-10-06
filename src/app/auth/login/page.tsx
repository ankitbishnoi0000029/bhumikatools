import type { Metadata } from "next";
import LoginPage from "@/components/login";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/login`;

// ============================================
// SEO METADATA — NOINDEX (Critical for auth pages)
// ============================================

export const metadata: Metadata = {
  // ---------- Basic Meta ----------
  title: "Login / Sign Up — idcardtools Account",
  description:
    "Sign in to your idcardtools account to track PVC card orders, access bulk tools, and save your favorite PDF tools. New users can create a free account in seconds.",

  // ---------- CRITICAL: No index, no follow ----------
  robots: {
    index: false,       // ← Do NOT index this page
    follow: false,      // ← Do NOT follow links from this page
    nocache: true,      // ← Do NOT cache in Google
    noarchive: true,    // ← Do NOT archive
    nosnippet: true,    // ← Do NOT show snippet
    noimageindex: true, // ← Do NOT index images
    notranslate: false, // Allow translation if needed
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },

  // ---------- Canonical (for duplicate prevention) ----------
  alternates: {
    canonical: PAGE_URL,
  },

  // ---------- Authors / Publisher ----------
  authors: [{ name: "idcardtools", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "Authentication",

  // ---------- Keywords (for internal use, not search) ----------
  keywords: [
    "idcardtools login",
    "idcardtools sign up",
    "idcardtools account",
    "track pvc card order",
    "pdf tools account",
  ],

  // ---------- OpenGraph (for social sharing) ----------
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: PAGE_URL,
    siteName: "idcardtools",
    title: "Login / Sign Up — idcardtools",
    description:
      "Sign in to your idcardtools account to track orders and access premium tools.",
    images: [
      {
        url: `${SITE_URL}/og-login.png`,
        width: 1200,
        height: 630,
        alt: "Login to idcardtools",
        type: "image/png",
      },
    ],
  },

  // ---------- Twitter Card ----------
  twitter: {
    card: "summary",
    site: "@idcardtools",
    title: "Login / Sign Up — idcardtools",
    description:
      "Sign in to your idcardtools account to track PVC card orders and access all tools.",
    images: [`${SITE_URL}/og-login.png`],
  },

  // ---------- Other meta ----------
  other: {
    referrer: "no-referrer",
    "format-detection": "telephone=no",
  },
};

// ============================================
// STRUCTURED DATA — Minimal (WebPage only)
// ============================================

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#webpage`,
  name: "Login / Sign Up — idcardtools",
  description:
    "Sign in or create your idcardtools account to track PVC card orders and access premium PDF tools.",
  url: PAGE_URL,
  inLanguage: "en-IN",
  isPartOf: {
    "@type": "WebSite",
    name: "idcardtools",
    url: SITE_URL,
  },
  potentialAction: {
    "@type": "LoginAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: PAGE_URL,
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
  },
};

// ============================================
// PAGE COMPONENT
// ============================================

export default function Page() {
  return (
    <>
      {/* Minimal structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      {/* Main content */}
      <LoginPage />
    </>
  );
}