import type { Metadata } from "next";
import { EAadhaarContent } from "@/components/e-aadhaar-content";
import {
  JsonLd,
  organizationSchema,
  webSiteSchema,
  breadcrumbSchema,
  howToSchema,
  productSchema,
} from "@/components/SeoSchemas";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/e-aadhaar`;

export const metadata: Metadata = {
  title: "E-Aadhaar PVC Card Printing — UIDAI-Compliant PVC Card Guide",
  description:
    "Print your E-Aadhaar on a premium 600-micron PVC card. UIDAI-compliant layout, logo, and QR code. Waterproof, pocket-sized, delivered with tracking across India.",
  keywords: [
    "e-aadhaar pvc card",
    "print e-aadhaar on pvc card",
    "e-aadhaar card printing",
    "aadhaar pvc card print online",
    "uidai compliant pvc card",
    "e-aadhaar pdf to pvc",
    "aadhaar card printing service",
    "pvc aadhaar card india",
  ],
  authors: [{ name: "idcardtools", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "ID Card Printing",
  classification: "E-Aadhaar, PVC Card Printing, UIDAI",
  alternates: {
    canonical: PAGE_URL,
    languages: { "en-IN": PAGE_URL },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: PAGE_URL,
    siteName: "idcardtools",
    title: "E-Aadhaar PVC Card Printing — idcardtools",
    description:
      "Turn your E-Aadhaar PDF into a premium PVC card. UIDAI-compliant, waterproof, delivered with tracking.",
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/aitools.png`,
        width: 1200,
        height: 630,
        alt: "E-Aadhaar printed on a PVC card",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "E-Aadhaar PVC Card Printing — idcardtools",
    description: "UIDAI-compliant PVC printing of your E-Aadhaar. Waterproof, tracked delivery.",
    images: [`${SITE_URL}/aitools.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const steps = [
  {
    name: "Open your E-Aadhaar PDF",
    text: "Download or open the E-Aadhaar PDF issued by UIDAI and confirm the name, photograph, address, and QR code are current and readable.",
  },
  {
    name: "Review the printing details",
    text: "Check the card material, layout, pricing, and delivery estimate on the order page, and review the privacy terms for how your file is handled.",
  },
  {
    name: "Place the order",
    text: "Submit your E-Aadhaar PDF through the order route on the Contact page. Cards are printed on 600-micron PVC and dispatched with tracking.",
  },
];

export default function EAadhaarPage() {
  return (
    <>
      <JsonLd
        data={[
          organizationSchema(),
          webSiteSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "E-Aadhaar", path: "/e-aadhaar" },
          ]),
          howToSchema({
            name: "Print your E-Aadhaar on a PVC card",
            description: "Prepare, review, and order an E-Aadhaar PVC card.",
            steps,
          }),
          productSchema({
            name: "E-Aadhaar PVC Card Print",
            description:
              "Print your E-Aadhaar on a premium 600-micron PVC card. UIDAI-compliant, waterproof, durable.",
            path: "/e-aadhaar",
          }),
        ]}
      />
      <EAadhaarContent />
    </>
  );
}
