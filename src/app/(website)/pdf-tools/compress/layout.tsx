import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compress PDF Online Free",
  description: "Reduce PDF file size online while keeping documents easy to read and share. Compress PDFs for free in your browser with no account required.",
  keywords: ["compress PDF", "reduce PDF file size", "free PDF compressor", "shrink PDF online"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/compress" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/compress",
    title: "Compress PDF Online Free",
    description: "Shrink PDF file size online for easier storage, sharing, and uploads.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Compress PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compress PDF Online Free",
    description: "Shrink PDF file size online for easier storage, sharing, and uploads.",
    images: ["/demo.png"],
  },
};

export default function CompressLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
