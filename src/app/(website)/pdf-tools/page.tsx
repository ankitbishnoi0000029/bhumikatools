import type { Metadata } from "next";
import PdfToolsPage from "@/components/pdf-tools/pdf-landing";

// ============================================
// SEO METADATA
// ============================================

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/pdf-tools`;

export const metadata: Metadata = {
  // ---------- Basic Meta ----------
  title: "Free PDF Tools Online — Merge, Split, Compress, Convert & More | idcardtools",
  description:
    "31+ free PDF tools to merge, split, compress, convert, sign, and protect PDFs. No signup, no watermarks, no limits. Files processed in your browser — 100% private and secure. Trusted by 2M+ Indians.",
  
  keywords: [
    // Primary
    "free pdf tools",
    "pdf tools online",
    "pdf editor free",
    "pdf converter online",
    // Organize
    "merge pdf online free",
    "combine pdf files",
    "join pdf documents",
    "split pdf online",
    "extract pdf pages",
    "rotate pdf",
    "organize pdf pages",
    "add page numbers to pdf",
    "crop pdf online",
    // Optimize
    "compress pdf free",
    "reduce pdf file size",
    "repair corrupt pdf",
    "ocr pdf online",
    "scan to pdf converter",
    // Convert
    "pdf to word converter",
    "pdf to docx free",
    "pdf to excel converter",
    "pdf to powerpoint",
    "pdf to jpg converter",
    "word to pdf converter",
    "excel to pdf online",
    "jpg to pdf converter",
    "html to pdf converter",
    "pdf to markdown",
    "markdown to pdf",
    "pdf to pdf/a",
    // Edit
    "edit pdf online free",
    "sign pdf electronically",
    "add watermark to pdf",
    "fill pdf forms online",
    // Security
    "protect pdf with password",
    "unlock pdf password",
    "redact pdf online",
    "remove pdf password",
    // Intelligence
    "ai pdf summarizer",
    "compare pdf files",
    "translate pdf free",
    "ai document summary",
    // Brand
    "idcardtools pdf",
    "id card tools",
    // Indian Context
    "pdf tools india",
    "free pdf tools hindi",
    "aadhaar pdf tools",
  ],

  // ---------- Authors ----------
  authors: [{ name: "idcardtools", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",

  // ---------- Category ----------
  category: "Productivity Tools",
  classification: "PDF Tools, Document Management, Online Utilities",

  // ---------- Canonical ----------
  alternates: {
    canonical: PAGE_URL,
    languages: {
      "en-IN": PAGE_URL,
      "hi-IN": `${PAGE_URL}?lang=hi`,
    },
  },

  // ---------- Open Graph ----------
  openGraph: {
    type: "website",
    locale: "en_IN",
    alternateLocale: ["hi_IN"],
    url: PAGE_URL,
    siteName: "idcardtools",
    title: "Free PDF Tools Online — 31+ Tools for Every Task",
    description:
      "Merge, split, compress, convert, sign, protect. All PDF tools free forever. No signup. Files processed in your browser.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/og-tools.png`,
        width: 1200,
        height: 630,
        alt: "idcardtools — 31+ Free PDF Tools",
        type: "image/png",
      },
      {
        url: `${SITE_URL}/og-tools-square.png`,
        width: 1200,
        height: 1200,
        alt: "idcardtools PDF Tools",
        type: "image/png",
      },
    ],
  },

  // ---------- Twitter ----------
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "Free PDF Tools — 31+ Tools for Every Task",
    description:
      "Merge, split, compress, convert PDFs. Free forever. No signup. Privacy-first.",
    images: [`${SITE_URL}/og-tools.png`],
  },

  // ---------- Robots ----------
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

  // ---------- App Links ----------
  appLinks: {
    web: {
      url: PAGE_URL,
      should_fallback: true,
    },
  },
};

// ============================================
// STRUCTURED DATA
// ============================================

// 1. CollectionPage Schema
const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${PAGE_URL}#collection`,
  name: "Free PDF Tools — 31+ Tools for Every Task",
  headline: "Every tool for every PDF task",
  description:
    "31+ free PDF tools to merge, split, compress, convert, sign, and protect PDFs. All browser-based. No signup. 100% free forever.",
  url: PAGE_URL,
  inLanguage: "en-IN",
  isPartOf: {
    "@type": "WebSite",
    name: "idcardtools",
    url: SITE_URL,
  },
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: `${SITE_URL}/og-tools.png`,
    width: 1200,
    height: 630,
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
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
        item: PAGE_URL,
      },
    ],
  },
  mainEntity: {
    "@type": "ItemList",
    name: "PDF Tools",
    numberOfItems: 31,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: [
      // Organize
      { "@type": "ListItem", position: 1, name: "Merge PDF", url: `${PAGE_URL}/merge` },
      { "@type": "ListItem", position: 2, name: "Split PDF", url: `${PAGE_URL}/split` },
      { "@type": "ListItem", position: 3, name: "Rotate PDF", url: `${PAGE_URL}/rotate` },
      { "@type": "ListItem", position: 4, name: "Organize PDF", url: `${PAGE_URL}/organize` },
      { "@type": "ListItem", position: 5, name: "Page Numbers", url: `${PAGE_URL}/page-numbers` },
      { "@type": "ListItem", position: 6, name: "Crop PDF", url: `${PAGE_URL}/crop` },
      // Optimize
      { "@type": "ListItem", position: 7, name: "Compress PDF", url: `${PAGE_URL}/compress` },
      { "@type": "ListItem", position: 8, name: "Repair PDF", url: `${PAGE_URL}/repair` },
      { "@type": "ListItem", position: 9, name: "OCR PDF", url: `${PAGE_URL}/ocr` },
      { "@type": "ListItem", position: 10, name: "Scan to PDF", url: `${PAGE_URL}/scan` },
      // Convert
      { "@type": "ListItem", position: 11, name: "PDF to Word", url: `${PAGE_URL}/pdf-word` },
      { "@type": "ListItem", position: 12, name: "PDF to PowerPoint", url: `${PAGE_URL}/pdf-ppt` },
      { "@type": "ListItem", position: 13, name: "PDF to Excel", url: `${PAGE_URL}/pdf-excel` },
      { "@type": "ListItem", position: 14, name: "Word to PDF", url: `${PAGE_URL}/word-pdf` },
      { "@type": "ListItem", position: 15, name: "PowerPoint to PDF", url: `${PAGE_URL}/ppt-pdf` },
      { "@type": "ListItem", position: 16, name: "Excel to PDF", url: `${PAGE_URL}/excel-pdf` },
      { "@type": "ListItem", position: 17, name: "PDF to JPG", url: `${PAGE_URL}/pdf-jpg` },
      { "@type": "ListItem", position: 18, name: "JPG to PDF", url: `${PAGE_URL}/jpg-pdf` },
      { "@type": "ListItem", position: 19, name: "HTML to PDF", url: `${PAGE_URL}/html-pdf` },
      { "@type": "ListItem", position: 20, name: "PDF to PDF/A", url: `${PAGE_URL}/pdf-a` },
      { "@type": "ListItem", position: 21, name: "PDF to Markdown", url: `${PAGE_URL}/pdf-md` },
      // Edit
      { "@type": "ListItem", position: 22, name: "Edit PDF", url: `${PAGE_URL}/edit` },
      { "@type": "ListItem", position: 23, name: "Sign PDF", url: `${PAGE_URL}/sign` },
      { "@type": "ListItem", position: 24, name: "Watermark PDF", url: `${PAGE_URL}/watermark` },
      { "@type": "ListItem", position: 25, name: "PDF Forms", url: `${PAGE_URL}/forms` },
      // Security
      { "@type": "ListItem", position: 26, name: "Unlock PDF", url: `${PAGE_URL}/unlock` },
      { "@type": "ListItem", position: 27, name: "Protect PDF", url: `${PAGE_URL}/protect` },
      { "@type": "ListItem", position: 28, name: "Redact PDF", url: `${PAGE_URL}/redact` },
      // Intelligence
      { "@type": "ListItem", position: 29, name: "Compare PDF", url: `${PAGE_URL}/compare` },
      { "@type": "ListItem", position: 30, name: "AI Summarizer", url: `${PAGE_URL}/ai-summarizer` },
      { "@type": "ListItem", position: 31, name: "Translate PDF", url: `${PAGE_URL}/translate` },
    ],
  },
};

// 2. SoftwareApplication Schema
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${PAGE_URL}#software`,
  name: "idcardtools PDF Toolkit",
  alternateName: ["ID Card Tools PDF", "idcardtools"],
  description:
    "A comprehensive suite of 31+ free PDF tools. Merge, split, compress, convert, edit, sign, protect, and analyze PDF files online.",
  url: PAGE_URL,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "PDF Tools",
  operatingSystem: "Web Browser (Chrome, Safari, Firefox, Edge)",
  softwareVersion: "2.0",
  releaseNotes: "Added AI Summarizer, Translate PDF, PDF to Markdown",
  featureList: [
    "Merge multiple PDFs",
    "Split PDF into multiple files",
    "Compress PDF without quality loss",
    "Convert PDF to Word, Excel, PowerPoint",
    "Convert JPG, HTML, Markdown to PDF",
    "Sign PDF documents electronically",
    "Add watermarks to PDFs",
    "Protect PDFs with password",
    "Unlock password-protected PDFs",
    "Redact sensitive information",
    "OCR scanned PDFs",
    "AI-powered document summarization",
    "Translate PDFs while preserving layout",
    "Compare two PDF versions",
  ],
  screenshot: `${SITE_URL}/screenshots/pdf-tools.png`,
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
    ratingExplanation: "Based on 2,847 verified user reviews",
  },
  author: {
    "@type": "Organization",
    name: "idcardtools",
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "idcardtools",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
  },
};

// 3. FAQPage Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${PAGE_URL}#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "Are all PDF tools on idcardtools really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — all 31 PDF tools are 100% free, forever. No signup, no hidden charges, no watermarks, no page limits. We only charge for the optional physical PVC card printing and delivery service.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to create an account to use the PDF tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No account is required. Just upload your file, use the tool, and download the result. We don't even ask for your email unless you're placing a PVC card order.",
      },
    },
    {
      "@type": "Question",
      name: "What is the maximum file size I can upload?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free users can upload PDF files up to 5GB per file. All processing is done securely, and files are automatically deleted within 2 hours.",
      },
    },
    {
      "@type": "Question",
      name: "Are my PDF files safe and private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Most tools (Merge, Split, Compress, Rotate, JPG to PDF) process entirely in your browser — files never leave your device. For cloud-based tools (OCR, AI Summarizer), files are processed on our encrypted servers and auto-deleted within 2 hours.",
      },
    },
    {
      "@type": "Question",
      name: "Do my files leave my device when I use these tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For most tools like Merge PDF, Split PDF, Compress PDF, Rotate PDF, and JPG to PDF, processing happens entirely in your browser using WebAssembly — files never leave your device. Cloud-based tools like OCR and AI Summarizer use our servers but delete your files within 2 hours.",
      },
    },
    {
      "@type": "Question",
      name: "What file formats does idcardtools support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We support PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), JPG, PNG, GIF, HTML, and Markdown. Conversions work in both directions — to and from PDF.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use idcardtools for commercial work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All PDF tools are free for both personal and commercial use. No attribution is required. We do not claim any rights over your files or the documents you create.",
      },
    },
    {
      "@type": "Question",
      name: "How long do you keep my uploaded files?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Files uploaded to our servers are automatically deleted after 2 hours. This is enforced by an automated cron job that runs every 15 minutes. Browser-based tools never upload anything to our servers at all.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if a PDF conversion fails?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If something goes wrong during conversion, try again with a smaller file or a different format. If it still fails, email the file to hello@idcardtools.com and our team will investigate within 24 hours.",
      },
    },
    {
      "@type": "Question",
      name: "Do you sell my data or track me?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Never. We don't sell, share, or rent your data to anyone. We don't run ads. We don't use third-party analytics. We don't track you across the web.",
      },
    },
    {
      "@type": "Question",
      name: "Does idcardtools work on mobile devices?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All PDF tools work perfectly in mobile browsers (Chrome, Safari, Firefox, Edge) on Android and iOS. No app installation required.",
      },
    },
    {
      "@type": "Question",
      name: "Can I convert multiple files at once?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Most tools support bulk processing. Just drag multiple files into the upload zone, and they'll be processed together or one by one as appropriate.",
      },
    },
  ],
};

// 4. HowTo Schema (for the "How It Works" section)
const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "@id": `${PAGE_URL}#howto`,
  name: "How to Use idcardtools PDF Tools",
  description:
    "Learn how to use any of the 31 free PDF tools on idcardtools in 3 simple steps.",
  totalTime: "PT30S",
  estimatedCost: {
    "@type": "MonetaryAmount",
    currency: "INR",
    value: "0",
  },
  tool: [
    { "@type": "HowToTool", name: "Web browser" },
    { "@type": "HowToTool", name: "PDF file" },
  ],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Upload your file",
      text: "Drag and drop your PDF, Word, Excel, or image into the upload zone. Files up to 5GB supported.",
      url: `${PAGE_URL}#upload`,
      image: `${SITE_URL}/howto/step-1.png`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Choose your tool",
      text: "Select from merge, split, compress, convert, sign, or protect. All tools are available in one clean workspace.",
      url: `${PAGE_URL}#tools`,
      image: `${SITE_URL}/howto/step-2.png`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Download instantly",
      text: "Your processed file is ready in seconds. No signup, no watermarks, no limits.",
      url: `${PAGE_URL}#download`,
      image: `${SITE_URL}/howto/step-3.png`,
    },
  ],
};

// 5. BreadcrumbList Schema
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
      item: PAGE_URL,
    },
  ],
};

// 6. ItemList Schema (for individual tools SEO)
const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${PAGE_URL}#tools-list`,
  name: "idcardtools PDF Tools",
  description: "Complete list of 31 free PDF tools offered by idcardtools",
  numberOfItems: 31,
  itemListElement: [
    {
      "@type": "SoftwareApplication",
      position: 1,
      name: "Merge PDF",
      url: `${PAGE_URL}/merge`,
      applicationCategory: "PDF Tool",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    {
      "@type": "SoftwareApplication",
      position: 2,
      name: "Split PDF",
      url: `${PAGE_URL}/split`,
      applicationCategory: "PDF Tool",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    {
      "@type": "SoftwareApplication",
      position: 3,
      name: "Compress PDF",
      url: `${PAGE_URL}/compress`,
      applicationCategory: "PDF Tool",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    },
    // ... add all 31
  ],
};

// ============================================
// PAGE COMPONENT
// ============================================

const Page = () => {
  return (
    <>
      {/* ==================== STRUCTURED DATA ==================== */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      {/* ==================== SEMANTIC WRAPPER ==================== */}
      <article
        itemScope
        itemType="https://schema.org/CollectionPage"
        className="contents"
      >
        {/* SEO-only hidden H1 (if PdfToolsPage already has visible H1, this can be removed or used for screen readers) */}
        <header className="sr-only">
          <h1 itemProp="name">
            Free PDF Tools Online — Merge, Split, Compress, Convert PDFs | idcardtools
          </h1>
          <p itemProp="description">
            31+ free PDF tools to merge, split, compress, convert, sign, and protect PDF files.
            No signup required. Files processed in your browser. 100% free forever.
            Trusted by 2 million+ users across India.
          </p>
          <nav aria-label="Breadcrumb">
            <ol>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/pdf-tools" aria-current="page">
                  PDF Tools
                </a>
              </li>
            </ol>
          </nav>
        </header>

        {/* Main content */}
        <PdfToolsPage />
      </article>
    </>
  );
};

export default Page;