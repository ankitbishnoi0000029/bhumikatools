import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word to PDF Converter Online Free",
  description: "Convert Word DOC and DOCX documents to PDF online. Create a portable PDF version of your Word file with a free converter and no signup.",
  keywords: ["Word to PDF", "DOCX to PDF", "DOC to PDF converter", "convert Word document to PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/word-pdf" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/word-pdf",
    title: "Word to PDF Converter Online Free",
    description: "Convert Word DOC and DOCX files into portable PDF documents online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert Word to PDF with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Word to PDF Converter Online Free",
    description: "Convert Word DOC and DOCX files into portable PDF documents online.",
    images: ["/demo.png"],
  },
};

export default function WordToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
