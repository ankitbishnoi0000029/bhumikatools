import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to JPG Converter Online Free",
  description: "Convert PDF pages to JPG images online or extract images from PDF documents. Choose a simple free PDF-to-image converter with no signup.",
  keywords: ["PDF to JPG", "convert PDF to image", "PDF to JPEG converter", "extract images from PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/pdf-jpg" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/pdf-jpg",
    title: "PDF to JPG Converter Online Free",
    description: "Convert PDF pages into JPG images or extract images from PDF documents.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert PDF to JPG with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to JPG Converter Online Free",
    description: "Convert PDF pages into JPG images or extract images from PDF documents.",
    images: ["/demo.png"],
  },
};

export default function PdfToJpgLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
