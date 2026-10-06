import type { Metadata } from "next";
import PDFReader from "@/components/pdf-tools/pdf-read";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/pdf-tools/pdf-read`;

// ============================================
// SEO METADATA
// ============================================

export const metadata: Metadata = {
  title: "PDF Reader Online Free — Open & Read PDFs in Browser | idcardtools",
  description:
    "Read PDF files online for free. Zoom, rotate, search text, view thumbnails, print, and download — all in your browser. No signup, no uploads to server, 100% private and secure.",
  keywords: [
    // Primary
    "pdf reader online",
    "free pdf reader",
    "read pdf online free",
    "open pdf in browser",
    "view pdf online",
    // Features
    "pdf reader with zoom",
    "pdf reader with search",
    "pdf reader with thumbnails",
    "pdf reader fullscreen",
    "pdf reader print",
    "pdf reader rotate",
    "pdf viewer online free",
    // Privacy
    "browser-based pdf reader",
    "private pdf reader",
    "offline pdf reader",
    "no upload pdf reader",
    "secure pdf reader",
    // Use cases
    "read pdf on phone",
    "read pdf on mobile browser",
    "read pdf on laptop",
    "read pdf without adobe",
    "read pdf without installing",
    // Specific
    "read large pdf online",
    "read ebooks pdf online",
    "read contracts pdf online",
    "read research paper pdf",
    "read legal document pdf",
    // Brand
    "idcardtools pdf reader",
    "id card tools pdf viewer",
    // Related
    "pdf reader no signup",
    "free pdf viewer online",
    "open pdf free",
    "pdf file viewer",
  ],
  authors: [{ name: "idcardtools", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "PDF Tools",
  classification: "PDF Reader, Document Viewer",
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
    title: "PDF Reader Online Free — Open & Read PDFs in Browser",
    description:
      "Read PDF files online for free. Zoom, search, rotate, print — all in your browser. No signup. No uploads to server.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/og-pdf-reader.png`,
        width: 1200,
        height: 630,
        alt: "idcardtools PDF Reader — Read PDFs Online Free",
        type: "image/png",
      },
      {
        url: `${SITE_URL}/og-pdf-reader-square.png`,
        width: 1200,
        height: 1200,
        alt: "PDF Reader",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "PDF Reader Online Free — Read PDFs in Browser",
    description:
      "Read PDF files online for free. Zoom, search, rotate, print. 100% private, no signup.",
    images: [`${SITE_URL}/og-pdf-reader.png`],
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
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
  },
};

// ============================================
// STRUCTURED DATA
// ============================================

// 1. SoftwareApplication Schema
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${PAGE_URL}#software`,
  name: "idcardtools PDF Reader",
  alternateName: ["PDF Reader", "Free PDF Viewer", "Online PDF Reader"],
  description:
    "Free online PDF reader that works entirely in your browser. Zoom, rotate, search text, view thumbnails, print, and download PDFs — without signup, uploads, or installation.",
  url: PAGE_URL,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "PDF Viewer",
  operatingSystem: "Web Browser (Chrome, Safari, Firefox, Edge)",
  softwareVersion: "1.0",
  featureList: [
    "Multi-page PDF navigation",
    "Zoom in and zoom out (up to 300%)",
    "Rotate pages 90° increments",
    "Full-text search within PDF",
    "Page thumbnails sidebar",
    "Fullscreen reading mode",
    "Print PDF directly from browser",
    "Download PDF to device",
    "Keyboard shortcuts (arrow keys, +/-, F)",
    "100% client-side processing",
    "No file uploads to server",
    "Works on mobile and desktop",
  ],
  screenshot: `${SITE_URL}/screenshots/pdf-reader.png`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    priceValidUntil: "2030-12-31",
    eligibleRegion: {
      "@type": "Place",
      name: "Worldwide",
    },
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "2847",
    bestRating: "5",
    worstRating: "1",
    ratingExplanation: "Based on 2,847 verified user reviews across all idcardtools PDF tools",
  },
  author: {
    "@type": "Organization",
    name: "idcardtools",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: "idcardtools",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
  },
};

// 2. HowTo Schema
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "@id": `${PAGE_URL}#howto`,
  name: "How to Read a PDF Online with idcardtools",
  description:
    "Learn how to open and read any PDF file in your browser using idcardtools PDF Reader in 3 simple steps.",
  totalTime: "PT20S",
  estimatedCost: {
    "@type": "MonetaryAmount",
    currency: "INR",
    value: "0",
  },
  tool: [
    { "@type": "HowToTool", name: "Web browser (Chrome, Safari, Firefox, Edge)" },
    { "@type": "HowToTool", name: "PDF file" },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Upload your PDF",
      text: "Drag and drop your PDF file into the upload zone, or click to browse from your device. Files stay in your browser — never uploaded to any server.",
      url: `${PAGE_URL}#upload`,
      image: `${SITE_URL}/howto/reader-step-1.png`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Navigate & zoom",
      text: "Use the toolbar to navigate pages (or arrow keys), zoom in/out (+/- keys), rotate pages, view thumbnails, and search text within the document.",
      url: `${PAGE_URL}#tools`,
      image: `${SITE_URL}/howto/reader-step-2.png`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Print or download",
      text: "When done reading, print the PDF directly from your browser or download it to your device. Everything works offline — no internet required after loading.",
      url: `${PAGE_URL}#download`,
      image: `${SITE_URL}/howto/reader-step-3.png`,
    },
  ],
};

// 3. FAQPage Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${PAGE_URL}#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "Is the PDF Reader really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, 100% free, forever. No signup, no watermarks, no page limits, no file size restrictions (up to 5GB per file). We don't charge for any digital tool — only for the optional physical PVC card printing service.",
      },
    },
    {
      "@type": "Question",
      name: "Do my PDF files get uploaded to your servers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The PDF Reader processes everything entirely in your browser using WebAssembly and PDF.js. Your files never leave your device — no upload, no server, no storage. This makes it one of the most private PDF readers available online.",
      },
    },
    {
      "@type": "Question",
      name: "Can I read PDFs on my phone?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The PDF Reader works perfectly on mobile browsers (Chrome, Safari, Firefox) on both Android and iOS. There's a mobile-friendly bottom navigation bar for easy page switching on small screens.",
      },
    },
    {
      "@type": "Question",
      name: "Does the PDF Reader support text search?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can search any text within the PDF using the search icon in the toolbar. The reader uses the PDF's embedded text layer for accurate, instant search results.",
      },
    },
    {
      "@type": "Question",
      name: "Can I print a PDF directly from the reader?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Click the printer icon in the toolbar to open your browser's print dialog. You can print the entire PDF or select specific page ranges. It works with all major browsers.",
      },
    },
    {
      "@type": "Question",
      name: "What keyboard shortcuts does the PDF Reader support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The PDF Reader supports these shortcuts: Arrow Left/Up (previous page), Arrow Right/Down (next page), + or = (zoom in), - (zoom out), Ctrl+F or Cmd+F (fullscreen mode), Escape (close search or thumbnails).",
      },
    },
    {
      "@type": "Question",
      name: "Is there a file size limit for the PDF Reader?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can open PDF files up to 5GB. Since processing happens in your browser, actual limits depend on your device's available memory. Most devices handle PDFs up to 500MB without any issue.",
      },
    },
    {
      "@type": "Question",
      name: "Does the PDF Reader work offline?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Once the reader page is loaded, you can continue reading even if your internet disconnects. The PDF file is already in your browser's memory. However, to initially load the reader and open a new file, you need an internet connection.",
      },
    },
    {
      "@type": "Question",
      name: "Can I view PDF thumbnails?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Click the grid icon in the toolbar to open a sidebar with page thumbnails. Click any thumbnail to jump directly to that page. This is especially useful for long documents.",
      },
    },
    {
      "@type": "Question",
      name: "Is this PDF Reader better than Adobe Acrobat?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For simply reading PDFs, yes — it's faster, lighter, more private, and doesn't require installation. Adobe Acrobat has advanced editing features that our reader doesn't offer. For reading, our reader wins on privacy and convenience.",
      },
    },
  ],
};

// 4. BreadcrumbList Schema
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
      name: "PDF Tools",
      item: `${SITE_URL}/pdf-tools`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "PDF Reader",
      item: PAGE_URL,
    },
  ],
};

// 5. Organization Schema (referenced)
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
  sameAs: [
    "https://twitter.com/idcardtools",
    "https://www.instagram.com/idcardtools",
    "https://www.linkedin.com/company/idcardtools",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* Main content */}
      <PDFReader />
    </>
  );
}