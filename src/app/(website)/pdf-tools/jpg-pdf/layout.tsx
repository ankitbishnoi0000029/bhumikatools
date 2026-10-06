import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JPG to PDF Converter Online Free",
  description: "Convert JPG and JPEG images to PDF online. Combine pictures into a PDF and adjust page layout using a free image-to-PDF converter.",
  keywords: ["JPG to PDF", "JPEG to PDF", "convert image to PDF", "pictures to PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/jpg-pdf" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/jpg-pdf",
    title: "JPG to PDF Converter Online Free",
    description: "Turn JPG and JPEG images into PDF documents with a free online converter.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert JPG to PDF with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "JPG to PDF Converter Online Free",
    description: "Turn JPG and JPEG images into PDF documents with a free online converter.",
    images: ["/demo.png"],
  },
};

export default function JpgToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
