import type { Metadata } from "next";
import AboutPage from "@/components/about/page";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/about`;

// ============================================
// SEO METADATA
// ============================================

export const metadata: Metadata = {
  title: "About Us — India's Privacy-First PDF Tools & Aadhaar PVC Service",
  description:
    "Learn about idcardtools — a Bangalore-based team building free, privacy-first PDF tools and premium E-Aadhaar PVC card printing for 2M+ Indians since 2023. No ads, no tracking, no data selling.",
  keywords: [
    "about idcardtools",
    "idcardtools company",
    "idcardtools story",
    "idcardtools bangalore",
    "privacy-first pdf tools",
    "indian pdf tools company",
    "free pdf tools india",
    "aadhaar pvc card company",
    "uidai compliant printing",
    "make in india pdf tools",
    "pdf tools founded",
    "idcardtools team",
    "cyber nexas pdf tools",
    "secure pdf tools india",
    "aadhaar card printing service india",
    "trusted pdf tools",
    "pdf tools privacy policy",
    "2 million users pdf tools",
    "browser-based pdf tools",
    "indian saas pdf tools",
  ],
  authors: [{ name: "idcardtools Team", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "About",
  classification: "Company Information",
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
    title: "About idcardtools — Privacy-First PDF Tools & Aadhaar PVC",
    description:
      "Bangalore-based team building free PDF tools and premium PVC cards. No ads. No tracking. No data selling. Trusted by 2M+ Indians.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/og-about.png`,
        width: 1200,
        height: 630,
        alt: "About idcardtools — Privacy-First PDF Tools",
        type: "image/png",
      },
      {
        url: `${SITE_URL}/og-about-square.png`,
        width: 1200,
        height: 1200,
        alt: "idcardtools About",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "About idcardtools — Privacy-First PDF Tools",
    description:
      "Building free, privacy-first PDF tools and premium Aadhaar PVC cards. Trusted by 2M+ Indians.",
    images: [`${SITE_URL}/og-about.png`],
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
    "profile:first_name": "idcardtools",
    "profile:last_name": "Team",
    "business:contact_data:locality": "Bangalore",
    "business:contact_data:region": "Karnataka",
    "business:contact_data:country_name": "India",
  },
};

// ============================================
// STRUCTURED DATA
// ============================================

// 1. AboutPage Schema
const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${PAGE_URL}#aboutpage`,
  name: "About idcardtools",
  headline: "Building privacy-first PDF tools for India",
  description:
    "idcardtools is a Bangalore-based team building free, privacy-first PDF tools and premium E-Aadhaar PVC card printing services. Trusted by 2M+ users across India since 2023.",
  url: PAGE_URL,
  inLanguage: "en-IN",
  isPartOf: {
    "@type": "WebSite",
    name: "idcardtools",
    url: SITE_URL,
  },
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: `${SITE_URL}/og-about.png`,
    width: 1200,
    height: 630,
  },
  about: {
    "@id": `${SITE_URL}#organization`,
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "About", item: PAGE_URL },
    ],
  },
};

// 2. Organization Schema (detailed)
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}#organization`,
  name: "idcardtools",
  alternateName: ["ID Card Tools", "idcardtools.com"],
  legalName: "idcardtools",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/logo.png`,
    width: 512,
    height: 512,
  },
  image: `${SITE_URL}/og-about.png`,
  description:
    "idcardtools provides 31+ free, privacy-first PDF tools and premium E-Aadhaar PVC card printing services across India. Founded in 2023. Trusted by 2M+ users.",
  slogan: "Secure · Innovate · Succeed",
  foundingDate: "2023",
  foundingLocation: {
    "@type": "Place",
    name: "Bangalore, Karnataka, India",
  },
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    minValue: 5,
    maxValue: 20,
  },
  email: "hello@idcardtools.com",
  telephone: "+91-9876543210",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Indiranagar",
    addressLocality: "Bangalore",
    addressRegion: "Karnataka",
    postalCode: "560038",
    addressCountry: "IN",
  },
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  knowsAbout: [
    "PDF Tools",
    "Document Processing",
    "Aadhaar PVC Card Printing",
    "UIDAI Compliance",
    "Browser-based Processing",
    "AI Document Summarization",
    "OCR Technology",
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+91-9876543210",
      email: "hello@idcardtools.com",
      contactType: "customer support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
    {
      "@type": "ContactPoint",
      email: "sales@idcardtools.com",
      contactType: "sales",
      areaServed: "IN",
    },
    {
      "@type": "ContactPoint",
      email: "press@idcardtools.com",
      contactType: "press",
      areaServed: "Worldwide",
    },
  ],
  sameAs: [
    "https://twitter.com/idcardtools",
    "https://www.instagram.com/idcardtools",
    "https://www.linkedin.com/company/idcardtools",
    "https://github.com/idcardtools",
    "https://www.youtube.com/@idcardtools",
  ],
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
      name: "About",
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
      name: "What is idcardtools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "idcardtools is a free, privacy-first online toolkit with 31+ PDF tools and a premium E-Aadhaar PVC card printing service. Founded in 2023 in Bangalore, India, we serve over 2 million users across India.",
      },
    },
    {
      "@type": "Question",
      name: "Who founded idcardtools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "idcardtools was founded in 2023 as a side project to help people print their E-Aadhaar on PVC cards easily. It was built by a small team of Indian software engineers based in Bangalore.",
      },
    },
    {
      "@type": "Question",
      name: "Where is idcardtools based?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "idcardtools is headquartered in Indiranagar, Bangalore, Karnataka, India. Our team works remotely across India.",
      },
    },
    {
      "@type": "Question",
      name: "Is idcardtools really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — all 31 PDF tools are 100% free, forever. No signup, no watermarks, no page limits. We only charge for the optional physical PVC card printing and delivery service (from ₹99).",
      },
    },
    {
      "@type": "Question",
      name: "How does idcardtools make money if the PDF tools are free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our only revenue comes from the physical E-Aadhaar PVC card printing and delivery service. We do not run ads, do not sell user data, and do not charge for any digital tool.",
      },
    },
    {
      "@type": "Question",
      name: "How many users does idcardtools have?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "As of October 2025, idcardtools has over 2 million active users and has processed over 18 million documents. We have also delivered over 50,000 physical PVC cards across India.",
      },
    },
    {
      "@type": "Question",
      name: "What makes idcardtools different from other PDF tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Three things: (1) Privacy-first architecture — most tools run entirely in your browser, (2) 100% free with no hidden charges, and (3) UIDAI-compliant Aadhaar PVC card printing with 24-hour dispatch.",
      },
    },
    {
      "@type": "Question",
      name: "Does idcardtools sell my data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Never. We don't sell, share, or rent your data to anyone. We don't run ads. We don't use third-party analytics. Files uploaded to our servers are auto-deleted within 2 hours.",
      },
    },
  ],
};

// 5. Person Schema (for team, optional — helps E-E-A-T)
const teamPersonSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE_URL}#founder`,
  name: "idcardtools Founding Team",
  jobTitle: "Founder",
  worksFor: {
    "@id": `${SITE_URL}#organization`,
  },
  url: `${SITE_URL}/about`,
  knowsAbout: [
    "PDF Processing",
    "Web Development",
    "UIDAI Compliance",
    "Privacy Engineering",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(teamPersonSchema) }}
      />

      {/* Main content */}
      <AboutPage />
    </>
  );
}