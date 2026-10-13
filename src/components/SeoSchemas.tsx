import type { ReactNode } from "react";

const SITE_URL = "https://idcardtools.com";

type SchemaRecord = Record<string, unknown>;

export function JsonLd({ data }: { data: SchemaRecord | SchemaRecord[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function organizationSchema(): SchemaRecord {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: "idcardtools",
    alternateName: ["ID Card Tools", "idcardtools.com"],
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.ico`,
      width: 512,
      height: 512,
    },
    description:
      "idcardtools provides free, privacy-first PDF and image tools plus premium E-Aadhaar PVC card printing across India.",
    foundingDate: "2023",
    email: "info@idcardtools.com",
    telephone: "+91-9876543210",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Indiranagar",
      addressLocality: "Bangalore",
      addressRegion: "Karnataka",
      postalCode: "560038",
      addressCountry: "IN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-9876543210",
        email: "info@idcardtools.com",
        contactType: "customer support",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi", "Kannada"],
      },
    ],
  };
}

export function webSiteSchema(): SchemaRecord {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    name: "idcardtools",
    alternateName: "ID Card Tools",
    url: SITE_URL,
    description:
      "Free online PDF tools, image tools, and E-Aadhaar PVC card printing information.",
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/pdf-tools`,
      },
      "query-input": "required name=query",
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): SchemaRecord {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path === "/" ? SITE_URL : `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]): SchemaRecord {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function softwareApplicationSchema(options: {
  name: string;
  description: string;
  path: string;
}): SchemaRecord {
  const url = `${SITE_URL}${options.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: options.name,
    applicationCategory: "WebApplication",
    operatingSystem: "Any",
    description: options.description,
    url,
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    publisher: { "@id": `${SITE_URL}#organization` },
  };
}

export function itemListSchema(options: {
  name: string;
  description: string;
  path: string;
  entries: { name: string; path: string }[];
}): SchemaRecord {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: options.name,
    description: options.description,
    numberOfItems: options.entries.length,
    itemListElement: options.entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      url: `${SITE_URL}${entry.path}`,
    })),
  };
}

export function howToSchema(options: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}): SchemaRecord {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: options.name,
    description: options.description,
    totalTime: "PT1M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "INR",
      value: "0",
    },
    step: options.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function productSchema(options: {
  name: string;
  description: string;
  path: string;
  price?: string;
  priceCurrency?: string;
}): SchemaRecord {
  const url = `${SITE_URL}${options.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: options.name,
    description: options.description,
    url,
    brand: {
      "@type": "Brand",
      name: "idcardtools",
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: options.priceCurrency ?? "INR",
      price: options.price ?? "0",
      availability: "https://schema.org/InStock",
    },
  };
}

export function articleSchema(options: {
  headline: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}): SchemaRecord {
  const url = `${SITE_URL}${options.path}`;
  const today = options.dateModified ?? new Date().toISOString().slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    datePublished: options.datePublished ?? today,
    dateModified: today,
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
    },
    inLanguage: "en-IN",
  };
}

export function faqPageScripts(items: { question: string; answer: string }[]): ReactNode {
  return <JsonLd data={faqSchema(items)} />;
}
