import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan to PDF Online",
  description: "Create PDF documents from scanned pages and images in your browser. Prepare a convenient PDF copy of documents with a free online scan tool.",
  keywords: ["scan to PDF", "create PDF from scan", "document scan to PDF", "online PDF scanner"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/scan" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/scan",
    title: "Scan to PDF Online",
    description: "Turn document scans and images into PDF files online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Scan documents to PDF with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scan to PDF Online",
    description: "Turn document scans and images into PDF files online.",
    images: ["/demo.png"],
  },
};

export default function ScanLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
