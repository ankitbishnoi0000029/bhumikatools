import type { Metadata } from "next";
import BlogPage from "@/components/blog-page";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/blog`;

// ============================================
// SEO METADATA
// ============================================

export const metadata: Metadata = {
  title: "Blog — PDF Tips, Aadhaar PVC Guides, Privacy & Document Tools",
  description:
    "Expert guides on PDF tools, E-Aadhaar PVC card printing, document privacy, and digital identity in India. Weekly tutorials, industry insights, and product updates from the idcardtools team.",
  keywords: [
    "idcardtools blog",
    "pdf tools blog",
    "pdf tutorials india",
    "how to print aadhaar card pvc",
    "e-aadhaar pvc card guide",
    "pdf merge tutorial",
    "pdf compress guide",
    "document privacy tips",
    "digital identity india",
    "uidai aadhaar guide",
    "pan card printing guide",
    "voter id print guide",
    "pdf to word tutorial",
    "ai pdf summarizer guide",
    "pdf tools comparison",
    "best pdf tools india",
    "free pdf tools review",
    "privacy-first pdf tools",
    "cyber security documents",
    "document management india",
    "pdf editor tutorial",
    "sign pdf guide",
    "protect pdf tutorial",
    "redact pdf guide",
    "ocr pdf tutorial",
  ],
  authors: [{ name: "idcardtools Team", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "Blog",
  classification: "PDF Tutorials, Guides, Industry News",
  alternates: {
    canonical: PAGE_URL,
    languages: { "en-IN": PAGE_URL },
    types: {
      "application/rss+xml": `${SITE_URL}/blog/rss.xml`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: PAGE_URL,
    siteName: "idcardtools",
    title: "Blog — PDF Tips, Aadhaar PVC Guides & Privacy Insights",
    description:
      "Expert guides on PDF tools, E-Aadhaar PVC printing, and document privacy. Weekly tutorials from the idcardtools team.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/demo.png`,
        width: 1200,
        height: 630,
        alt: "idcardtools Blog — PDF Tools & Document Guides",
        type: "image/png",
      },
      {
        url: `${SITE_URL}/demo.png`,
        width: 1200,
        height: 1200,
        alt: "idcardtools Blog",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "Blog — PDF Tips, Aadhaar PVC Guides & Privacy Insights",
    description:
      "Expert guides on PDF tools, E-Aadhaar PVC printing, and document privacy.",
    images: [`${SITE_URL}/demo.png`],
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
    "article:publisher": "https://idcardtools.com",
    "blog:author": "idcardtools",
  },
};

// ============================================
// BLOG POSTS DATA
// (Yeh real data se replace karna — CMS ya local se fetch karo)
// ============================================

const blogPosts = [
  {
    slug: "aadhaar-pvc-guide",
    title: "The Complete Guide to Printing Your E-Aadhaar on a PVC Card (2025)",
    excerpt:
      "Everything you need to know — from downloading your E-Aadhaar PDF to choosing the right PVC material to UIDAI compliance rules.",
    date: "2025-10-12",
    author: "Team idcardtools",
    category: "Tutorial",
    readTime: "8 min",
    image: `${SITE_URL}/demo.png`,
  },
  {
    slug: "pdf-privacy",
    title: "Why Browser-Based PDF Tools Are Safer Than Cloud Uploads",
    excerpt:
      "Most tools upload your files to their servers. We explain why that's risky and how browser-based processing works.",
    date: "2025-10-08",
    author: "Priya Sharma",
    category: "Privacy",
    readTime: "5 min",
    image: `${SITE_URL}/demo.png`,
  },
  {
    slug: "pan-card-guide",
    title: "How to Auto-Crop Your PAN Card in Under 10 Seconds",
    excerpt:
      "A step-by-step guide to using our AI-powered ID card cropper for perfect PAN card prints.",
    date: "2025-10-03",
    author: "Team idcardtools",
    category: "Tutorial",
    readTime: "4 min",
    image: `${SITE_URL}/demo.png`,
  },
  {
    slug: "ai-ocr",
    title: "Introducing AI-Powered OCR for Scanned Documents",
    excerpt:
      "Turn any scanned document into searchable, editable text — with support for Hindi, Tamil, and 12 other Indian languages.",
    date: "2025-09-28",
    author: "Team idcardtools",
    category: "Product Update",
    readTime: "6 min",
    image: `${SITE_URL}/demo.png`,
  },
  {
    slug: "digital-india",
    title: "The Future of Digital Identity in India: 2026 and Beyond",
    excerpt:
      "From Aadhaar to DigiLocker, India is leading the world in digital public infrastructure. Here's what's coming next.",
    date: "2025-09-22",
    author: "Rajesh Kumar",
    category: "Industry",
    readTime: "10 min",
    image: `${SITE_URL}/demo.png`,
  },
  {
    slug: "merge-pdf-guide",
    title: "How to Merge 100 PDFs Without Paying a Single Rupee",
    excerpt:
      "Forget expensive subscriptions. Here's how to merge unlimited PDFs for free, forever.",
    date: "2025-09-15",
    author: "Team idcardtools",
    category: "Tutorial",
    readTime: "5 min",
    image: `${SITE_URL}/demo.png`,
  },
];

// ============================================
// STRUCTURED DATA
// ============================================

// 1. Blog Schema (with all posts)
const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${PAGE_URL}#blog`,
  name: "idcardtools Blog",
  alternateName: ["ID Card Tools Blog", "idcardtools Journal"],
  description:
    "Expert guides on PDF tools, E-Aadhaar PVC card printing, document privacy, and digital identity in India.",
  url: PAGE_URL,
  inLanguage: "en-IN",
  publisher: {
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: "idcardtools",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/favicon.ico`,
      width: 512,
      height: 512,
    },
  },
  isPartOf: {
    "@type": "WebSite",
    name: "idcardtools",
    url: SITE_URL,
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: PAGE_URL },
    ],
  },
};

// 2. CollectionPage Schema
const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${PAGE_URL}#collection`,
  name: "idcardtools Blog — PDF Guides & Document Tutorials",
  description:
    "Expert guides on PDF tools, Aadhaar PVC printing, and document privacy. Weekly tutorials from the idcardtools team.",
  url: PAGE_URL,
  inLanguage: "en-IN",
  isPartOf: {
    "@type": "WebSite",
    name: "idcardtools",
    url: SITE_URL,
  },
  about: {
    "@id": `${SITE_URL}#organization`,
  },
  mainEntity: {
    "@type": "ItemList",
    name: "Latest Blog Posts",
    numberOfItems: blogPosts.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: blogPosts.map((post, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: post.title,
      url: `${PAGE_URL}#articles`,
    })),
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
      name: "Blog",
      item: PAGE_URL,
    },
  ],
};

// 4. ItemList Schema (for rich results listing)
const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": `${PAGE_URL}#posts`,
  name: "idcardtools Blog Posts",
  description: "Latest articles from the idcardtools blog",
  numberOfItems: blogPosts.length,
  itemListElement: blogPosts.map((post, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${PAGE_URL}#articles`,
    name: post.title,
    image: post.image,
  })),
};

// 5. Organization Schema (referenced by Blog)
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
  sameAs: [
    "https://twitter.com/idcardtools",
    "https://www.instagram.com/idcardtools",
    "https://www.linkedin.com/company/idcardtools",
    "https://github.com/idcardtools",
  ],
};

// 6. FAQPage Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${PAGE_URL}#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "What topics does the idcardtools blog cover?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The idcardtools blog covers PDF tutorials (merge, split, compress, convert), E-Aadhaar PVC card printing guides, document privacy best practices, digital identity news in India, and product updates.",
      },
    },
    {
      "@type": "Question",
      name: "How often is the idcardtools blog updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We publish new articles every week — typically on Tuesdays and Fridays. Product update announcements go out on the same day as feature releases.",
      },
    },
    {
      "@type": "Question",
      name: "Are idcardtools blog articles free to read?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, all articles on the idcardtools blog are completely free to read. No subscription, no signup, no paywall.",
      },
    },
    {
      "@type": "Question",
      name: "Can I republish or cite idcardtools blog articles?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You may quote up to 200 words with attribution and a link back to the original article. For full republishing requests, email press@idcardtools.com.",
      },
    },
    {
      "@type": "Question",
      name: "Who writes for the idcardtools blog?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our blog is written by the idcardtools team — software engineers, privacy advocates, and document specialists based in Bangalore, India.",
      },
    },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Main content */}
      <BlogPage />
    </>
  );
}