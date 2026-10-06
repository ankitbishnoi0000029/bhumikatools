import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Markdown to PDF Converter Online Free",
  description: "Convert Markdown files to clean PDF documents online. Preserve readable formatting when exporting notes and documents with a free converter.",
  keywords: ["Markdown to PDF", "convert Markdown file to PDF", "MD to PDF", "Markdown PDF converter"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/markdown-pdf" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/markdown-pdf",
    title: "Markdown to PDF Converter Online Free",
    description: "Export Markdown notes and documents as formatted PDF files online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert Markdown to PDF with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Markdown to PDF Converter Online Free",
    description: "Export Markdown notes and documents as formatted PDF files online.",
    images: ["/demo.png"],
  },
};

export default function MarkdownToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
