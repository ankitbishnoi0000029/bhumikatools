import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { AutoIdCropper } from "@/components/home/auto-id-cropper";
import { FeaturedProduct } from "@/components/home/featured-product";
import { Reviews } from "@/components/home/reviews";
import { Faqs } from "@/components/home/faqs";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  title: "Print E-Aadhaar on PVC Card + 31 Free PDF Tools",
  description:
    "Print your E-Aadhaar on premium PVC cards (from ₹99) and access 31+ free PDF tools. UIDAI-compliant. Delivered in 24 hours. No signup required. Trusted by 2M+ Indians.",
  alternates: {
    canonical: "https://idcardtools.com",
  },
  openGraph: {
    title: "idcardtools — Print E-Aadhaar on PVC Card & Free PDF Tools",
    description:
      "Print E-Aadhaar on premium PVC cards. 31+ free PDF tools. UIDAI-compliant. Delivered in 24 hours.",
    url: "https://idcardtools.com",
    images: ["/demo.png"],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is idcardtools really free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — all PDF tools are 100% free, forever. No signup, no hidden charges, no watermarks. We only charge for the physical PVC card delivery service.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to create an account?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No account is required. Just upload your file, use the tool, and download the result. We don't even ask for your email unless you're placing a PVC card order.",
      },
    },
    {
      "@type": "Question",
      name: "What file size can I upload?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free users can upload files up to 5GB per file. All processing is done on our servers and files are auto-deleted within 2 hours.",
      },
    },
    {
      "@type": "Question",
      name: "Is it legal to print E-Aadhaar on a PVC card?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, completely legal. UIDAI officially permits printing E-Aadhaar on PVC cards as long as the layout, logo, and QR code remain unaltered. Our prints are 100% compliant with UIDAI specifications.",
      },
    },
    {
      "@type": "Question",
      name: "How long does PVC card delivery take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard delivery is 3-5 business days across India. Express delivery (24-48 hours) is available in metro cities. All orders come with tracking.",
      },
    },
    {
      "@type": "Question",
      name: "Do my files leave my device?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For most tools (Merge, Split, Compress, Rotate, JPG to PDF), processing happens entirely in your browser — files never leave your device. For cloud-based tools (OCR, AI Summarizer), files are processed on our servers and auto-deleted within 2 hours.",
      },
    },
    {
      "@type": "Question",
      name: "How long do you keep my files?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Files uploaded to our servers are automatically deleted after 2 hours. Browser-based tools never upload anything at all.",
      },
    },
    {
      "@type": "Question",
      name: "What formats do you support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), JPG, PNG, HTML, and Markdown. Both directions — to and from PDF.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use idcardtools for commercial work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All tools are free for both personal and commercial use. No attribution required. We do not claim any rights over your files.",
      },
    },
    {
      "@type": "Question",
      name: "Do you sell my data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Never. We don't sell, share, or rent your data to anyone. We don't run ads. We don't track you across the web.",
      },
    },
  ],
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "E-Aadhaar PVC Card Print",
  image: ["https://idcardtools.com/aadhaar-to-pvc.png"],
  description:
    "Print your E-Aadhaar on a premium 600-micron PVC card. UIDAI-compliant, waterproof, durable. Delivered in 24 hours across India.",
  brand: {
    "@type": "Brand",
    name: "idcardtools",
  },
  sku: "IDCT-AADHAAR-PVC-001",
  mpn: "AADHAAR-PVC",
  category: "ID Card Printing Service",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "99",
    highPrice: "499",
    offerCount: "3",
    availability: "https://schema.org/InStock",
    offers: [
      {
        "@type": "Offer",
        name: "Single Card",
        price: "149",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://idcardtools.com/contacts",
      },
      {
        "@type": "Offer",
        name: "Bulk (10+ cards)",
        price: "99",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: "https://idcardtools.com/contacts",
      },
    ],
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "2847",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Priya Sharma" },
      datePublished: "2025-10-12",
      reviewBody:
        "I printed over 200 E-Aadhaar PVC cards for my clients last month. The quality is exactly like a bank card.",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
      },
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Rajesh Kumar" },
      datePublished: "2025-10-08",
      reviewBody:
        "The AI summarizer saved me hours of reading contracts. What used to take an evening now takes 30 seconds.",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5",
        bestRating: "5",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://idcardtools.com",
    },
  ],
};

export default function Home() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Semantic HTML5 structure */}
      <article itemScope itemType="https://schema.org/WebPage">
        <header className="sr-only">
          <h1>idcardtools — Print E-Aadhaar on PVC Card and Free PDF Tools</h1>
          <p>
            Print your E-Aadhaar on premium PVC cards. 31+ free PDF tools for merge,
            split, compress, convert, sign, and protect. UIDAI-compliant. No signup.
            Trusted by 2 million+ Indians.
          </p>
        </header>

        <Hero />
        <HowItWorks />
        <AutoIdCropper />
        <FeaturedProduct />
        <Reviews />
        <Faqs />
        <FinalCta />
      </article>
    </>
  );
}