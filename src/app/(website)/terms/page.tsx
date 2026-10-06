import type { Metadata } from "next";
import TermsPage from "@/components/terms-page";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/terms`;

// ============================================
// SEO METADATA
// ============================================

export const metadata: Metadata = {
  title: "Terms of Service — Rules for Using idcardtools | idcardtools",
  description:
    "Read idcardtools' terms of service in plain English. Free PDF tools, UIDAI-compliant PVC card printing, full refund policy within 24 hours, and your rights as a user. Governed by Indian law.",
  keywords: [
    "idcardtools terms of service",
    "idcardtools terms and conditions",
    "pdf tools terms of use",
    "terms of service pdf tools india",
    "idcardtools refund policy",
    "pvc card refund policy",
    "pvc card order terms",
    "aadhaar printing terms of service",
    "user agreement pdf tools",
    "idcardtools legal terms",
    "free pdf tools license",
    "commercial use pdf tools",
    "idcardtools acceptable use policy",
    "pdf tools india terms",
    "digital personal data protection act compliance",
    "india legal pdf tools",
    "bangalore pdf tools terms",
    "idcardtools governing law",
  ],
  authors: [{ name: "idcardtools Legal Team", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "Legal",
  classification: "Terms of Service",
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
    title: "Terms of Service — Rules for Using idcardtools",
    description:
      "Plain-English terms. Free tools, refund policy, and your rights. Governed by Indian law.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/og-terms.png`,
        width: 1200,
        height: 630,
        alt: "idcardtools Terms of Service",
        type: "image/png",
      },
      {
        url: `${SITE_URL}/og-terms-square.png`,
        width: 1200,
        height: 1200,
        alt: "idcardtools Terms",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "Terms of Service — idcardtools",
    description:
      "Plain-English terms of service. Free tools, refund policy, and your rights.",
    images: [`${SITE_URL}/og-terms.png`],
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
    "article:published_time": "2023-06-01",
    "article:modified_time": "2025-10-15",
    "article:section": "Legal",
    "legal:terms_contact": "legal@idcardtools.com",
    "legal:jurisdiction": "Bangalore, Karnataka, India",
  },
};

// ============================================
// STRUCTURED DATA
// ============================================

// 1. WebPage Schema
const termsPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#webpage`,
  name: "Terms of Service — idcardtools",
  headline: "Terms, without the tricks",
  description:
    "Terms and conditions for using idcardtools PDF tools and PVC card printing services. Governed by Indian law.",
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
    name: "Terms of Service",
    description: "Legal agreement between idcardtools and its users",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Users of idcardtools services",
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
      { "@type": "ListItem", position: 2, name: "Terms of Service", item: PAGE_URL },
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
  email: "legal@idcardtools.com",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "legal",
      email: "legal@idcardtools.com",
      areaServed: "Worldwide",
      availableLanguage: ["English"],
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
      name: "Terms of Service",
      item: PAGE_URL,
    },
  ],
};

// 4. FAQPage Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${PAGE_URL}#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "Are idcardtools PDF tools really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — all 31 PDF tools are 100% free, forever. No signup, no hidden charges, no watermarks. We only charge for the optional physical PVC card printing and delivery service (from ₹99).",
      },
    },
    {
      "@type": "Question",
      name: "What is the refund policy for PVC card orders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You get a full refund if you cancel before printing begins (usually within 2 hours of order). Once dispatched, we don't offer refunds — but we re-print and re-ship at no extra cost if the card is lost in transit.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use idcardtools for commercial work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All PDF tools are free for both personal and commercial use. No attribution is required. We claim no rights over your files or the documents you create.",
      },
    },
    {
      "@type": "Question",
      name: "What content is prohibited on idcardtools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You may not use idcardtools to process illegal content, forge identity documents, abuse the infrastructure (DDoS, scraping), reverse-engineer the code, or resell the service without written permission.",
      },
    },
    {
      "@type": "Question",
      name: "Which laws govern idcardtools' terms of service?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our Terms of Service are governed by the laws of India. Any dispute arising from your use of idcardtools is subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.",
      },
    },
    {
      "@type": "Question",
      name: "Do I own the files I create with idcardtools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. You retain 100% ownership of anything you upload or create. We claim no rights, license, or ownership over your files. Once deleted (within 2 hours), they're gone forever.",
      },
    },
    {
      "@type": "Question",
      name: "How do I delete my idcardtools account?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can stop using idcardtools at any time and delete your account from the settings page. All associated data will be purged within 7 days of account deletion.",
      },
    },
    {
      "@type": "Question",
      name: "What is the minimum age to use idcardtools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You must be at least 13 years old to use idcardtools. If you are under 18, you confirm that you have permission from a parent or legal guardian.",
      },
    },
    {
      "@type": "Question",
      name: "How will I know if idcardtools changes its terms?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "When we make material changes to our Terms of Service, we'll notify you by email (if you have an account) and post a prominent notice on the website at least 14 days before the changes take effect.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if a PVC card is lost in transit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If your PVC card is lost in transit, we re-print and re-ship it at no extra cost. Just email hello@idcardtools.com with your order number and we'll take care of it.",
      },
    },
  ],
};

// 5. TermsOfService Schema (Schema.org type)
const termsOfServiceSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}#terms-of-service`,
  name: "idcardtools Terms of Service",
  url: PAGE_URL,
  datePublished: "2023-06-01",
  dateModified: "2025-10-15",
  inLanguage: "en-IN",
  publisher: {
    "@id": `${SITE_URL}#organization`,
  },
  jurisdiction: {
    "@type": "AdministrativeArea",
    name: "Karnataka, India",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Global",
  },
  hasPart: [
    { "@type": "WebPageElement", name: "Acceptance of Terms" },
    { "@type": "WebPageElement", name: "The Service" },
    { "@type": "WebPageElement", name: "Your Account" },
    { "@type": "WebPageElement", name: "Acceptable Use" },
    { "@type": "WebPageElement", name: "Payments & Refunds" },
    { "@type": "WebPageElement", name: "Intellectual Property" },
    { "@type": "WebPageElement", name: "Limitation of Liability" },
    { "@type": "WebPageElement", name: "Termination" },
    { "@type": "WebPageElement", name: "Changes to These Terms" },
    { "@type": "WebPageElement", name: "Governing Law" },
  ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsPageSchema) }}
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsOfServiceSchema) }}
      />

      {/* Main content */}
      <TermsPage />
    </>
  );
}