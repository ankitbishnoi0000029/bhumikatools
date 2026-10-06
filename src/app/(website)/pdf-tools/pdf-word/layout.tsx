import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to Word Converter Online Free",
  description: "Convert PDF files into editable Word documents online. Export to DOC or DOCX with a free PDF-to-Word converter and no signup.",
  keywords: ["PDF to Word", "PDF to DOCX", "convert PDF to Word online", "free PDF Word converter"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/pdf-word" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/pdf-word",
    title: "PDF to Word Converter Online Free",
    description: "Make PDF content editable by converting documents to Word DOC and DOCX files.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert PDF to Word with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Word Converter Online Free",
    description: "Make PDF content editable by converting documents to Word DOC and DOCX files.",
    images: ["/demo.png"],
  },
};

export default function PdfToWordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
