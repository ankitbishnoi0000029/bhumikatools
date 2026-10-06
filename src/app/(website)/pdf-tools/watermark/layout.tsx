import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add or Remove a PDF Watermark Online",
  description: "Add a text or image watermark to PDF pages, or remove supported watermarks. Customize placement and appearance with a free online tool.",
  keywords: ["add watermark to PDF", "remove PDF watermark", "PDF watermark tool", "watermark PDF online"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/watermark" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/watermark",
    title: "Add or Remove a PDF Watermark Online",
    description: "Customize text or image watermarks on PDF documents online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Add a PDF watermark with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Add or Remove a PDF Watermark Online",
    description: "Customize text or image watermarks on PDF documents online.",
    images: ["/demo.png"],
  },
};

export default function WatermarkLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
