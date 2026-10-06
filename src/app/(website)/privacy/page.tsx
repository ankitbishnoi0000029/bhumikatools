import PrivacyPage from "@/components/privacy-page";
import type { Metadata } from "next";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/privacy`;

// ============================================
// SEO METADATA
// ============================================

export const metadata: Metadata = {
  title: "Privacy Policy — How We Protect Your Data | idcardtools",
  description:
    "Read idcardtools' privacy policy in plain English. 2-hour file auto-deletion, TLS 1.3 encryption, zero tracking, and no data selling. Your documents stay yours — always.",
  keywords: [
    "idcardtools privacy policy",
    "pdf tools privacy",
    "document privacy india",
    "data protection pdf tools",
    "gdpr compliant pdf tools",
    "browser-based pdf privacy",
    "aadhaar printing privacy",
    "secure pdf tools",
    "no tracking pdf tools",
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
    languages: {
      "en-IN": PAGE_URL,
      "hi-IN": `${PAGE_URL}?lang=hi`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    alternateLocale: ["hi_IN"],
    url: PAGE_URL,
    siteName: "idcardtools",
    title: "Privacy Policy — How We Protect Your Data | idcardtools",
    description:
      "Plain-English privacy policy. 2-hour deletion, TLS 1.3 encryption, zero tracking. Your documents stay yours.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/og-privacy.png`,
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
      "Plain-English privacy policy. 2-hour deletion. Zero tracking. No data selling.",
    images: [`${SITE_URL}/og-privacy.png`],
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
    "article:modified_time": "2025-10-15",
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
  dateModified: "2025-10-15",
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
      url: `${SITE_URL}/logo.png`,
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
    url: `${SITE_URL}/logo.png`,
    width: 512,
    height: 512,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "privacy",
      email: "privacy@idcardtools.com",
      areaServed: "Worldwide",
      availableLanguage: ["English", "Hindi"],
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@idcardtools.com",
      telephone: "+91-9876543210",
      areaServed: "IN",
    },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Indiranagar",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    postalCode: "560038",
    addressCountry: "IN",
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
        text: "Never. We do not sell, share, or rent your data to anyone. We don't run ads, we don't use third-party analytics, and we don't track you across the web.",
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
        text: "We use only the essential cookies required to keep you logged in and protect against CSRF attacks. No tracking cookies, no third-party pixels, no advertising IDs.",
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
  dateModified: "2025-10-15",
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