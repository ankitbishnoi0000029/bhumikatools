import PrivacyPage from "@/components/privacy-page";
import type { Metadata } from "next";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/privacy`;

// ============================================
// SEO METADATA
// ============================================

export const metadata: Metadata = {
  title: "Privacy Policy — How We Protect Your Data",
  description:
    "Review how idcardtools handles files, accounts, orders, and optional analytics. Learn what information is collected, how it is used, and how to change your privacy choices.",
  keywords: [
    "idcardtools privacy policy",
    "pdf tools privacy",
    "document privacy india",
    "data protection pdf tools",
    "gdpr compliant pdf tools",
    "browser-based pdf privacy",
    "aadhaar printing privacy",
    "secure pdf tools",
    "consent based analytics",
    "2 hour file deletion",
    "tls encryption pdf",
    "how idcardtools protects data",
    "pdf tools data policy",
    "document security india",
    "uidai privacy compliance",
    "india data protection law",
    "dpdp act compliance",
    "privacy-first pdf tools",
  ],
  authors: [{ name: "idcardtools Legal Team", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "Legal",
  classification: "Privacy Policy",
  alternates: {
    canonical: PAGE_URL,
    languages: { "en-IN": PAGE_URL },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: PAGE_URL,
    siteName: "idcardtools",
    title: "Privacy Policy — How We Protect Your Data | idcardtools",
    description:
      "Plain-English details about file handling, account data, orders, and optional analytics. Review your privacy choices at any time.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/aitools.png`,
        width: 1200,
        height: 630,
        alt: "idcardtools Privacy Policy",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "Privacy Policy — idcardtools",
    description:
      "How we handle your documents, accounts, orders, and optional analytics.",
    images: [`${SITE_URL}/aitools.png`],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "article:modified_time": "2026-10-12",
    "article:published_time": "2023-06-01",
    "legal:privacy_contact": "privacy@idcardtools.com",
    "legal:dpo": "idcardtools Legal Team",
  },
};

// ============================================
// STRUCTURED DATA
// ============================================

// 1. WebPage + PrivacyPolicy Schema
const privacyPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#webpage`,
  name: "Privacy Policy — idcardtools",
  description:
    "How idcardtools collects, uses, stores, and deletes data. Plain-English privacy policy.",
  url: PAGE_URL,
  inLanguage: "en-IN",
  datePublished: "2023-06-01",
  dateModified: "2026-10-12",
  isPartOf: {
    "@type": "WebSite",
    name: "idcardtools",
    url: SITE_URL,
  },
  about: {
    "@type": "Thing",
    name: "Privacy Policy",
    description: "Data collection, usage, storage, and deletion practices",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Users of idcardtools PDF tools",
  },
  publisher: {
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: "idcardtools",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.ico`,
      width: 512,
      height: 512,
    },
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Privacy Policy", item: PAGE_URL },
    ],
  },
};

// 2. Organization Schema (referenced)
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}#organization`,
  name: "idcardtools",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/favicon.ico`,
    width: 512,
    height: 512,
  },
};

// 3. BreadcrumbList Schema
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "@id": `${PAGE_URL}#breadcrumb`,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Privacy Policy",
      item: PAGE_URL,
    },
  ],
};

// 4. FAQPage Schema (privacy-related)
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${PAGE_URL}#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "How long does idcardtools keep my uploaded files?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every file uploaded to idcardtools is automatically and permanently deleted within 2 hours of processing. This is enforced by an automated cron job that runs every 15 minutes. Browser-based tools never upload anything to our servers at all.",
      },
    },
    {
      "@type": "Question",
      name: "Does idcardtools sell my data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We do not sell your personal information. If Google Analytics is configured, it is loaded only after you opt in and is used to measure site visits and Core Web Vitals. You can reject or withdraw that choice in Privacy settings.",
      },
    },
    {
      "@type": "Question",
      name: "What encryption does idcardtools use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We use TLS 1.3 for data in transit and AES-256 encryption at rest. This is the same encryption standard used by banks and healthcare providers.",
      },
    },
    {
      "@type": "Question",
      name: "Do browser-based PDF tools send my files to your servers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Tools like Merge, Split, Compress, Rotate, and JPG to PDF process entirely in your browser using WebAssembly. Files never leave your device for these tools.",
      },
    },
    {
      "@type": "Question",
      name: "How do I delete my idcardtools account and data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can delete your account at any time from the settings page. All associated data is purged within 7 days. You can also email privacy@idcardtools.com to request deletion.",
      },
    },
    {
      "@type": "Question",
      name: "Does idcardtools comply with Indian data protection laws?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. We comply with the Digital Personal Data Protection Act (DPDP Act) 2023. You have the right to access, correct, delete, and export your data at any time.",
      },
    },
    {
      "@type": "Question",
      name: "Who is the Data Protection Officer at idcardtools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our Data Protection Officer is part of the idcardtools Legal Team, based in Bangalore, India. You can contact them at privacy@idcardtools.com for any data-related questions.",
      },
    },
    {
      "@type": "Question",
      name: "Does idcardtools use cookies?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Analytics is not loaded unless you opt in. If enabled, Google Analytics may use cookies after consent. Your choice is stored in this browser and can be changed using Privacy settings.",
      },
    },
  ],
};

// 5. PrivacyPolicy Schema (Schema.org type)
const privacyPolicySchema = {
  "@context": "https://schema.org",
  "@type": "PrivacyPolicy",
  "@id": `${PAGE_URL}#privacy-policy`,
  name: "idcardtools Privacy Policy",
  url: PAGE_URL,
  datePublished: "2023-06-01",
  dateModified: "2026-10-12",
  inLanguage: "en-IN",
  publisher: {
    "@id": `${SITE_URL}#organization`,
  },
  jurisdiction: {
    "@type": "AdministrativeArea",
    name: "India",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Global",
  },
};

// ============================================
// PAGE COMPONENT
// ============================================

export default function Page() {
  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyPolicySchema) }}
      />

      {/* Main content */}
      <PrivacyPage />
    </>
  );
}