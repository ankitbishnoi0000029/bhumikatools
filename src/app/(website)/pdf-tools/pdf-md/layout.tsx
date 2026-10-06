import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to Markdown Converter Online",
  description: "Convert PDF documents into Markdown text for notes, documentation, and knowledge bases. Extract PDF content online with a free tool.",
  keywords: ["PDF to Markdown", "convert PDF to MD", "PDF text to Markdown", "extract Markdown from PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/pdf-md" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/pdf-md",
    title: "PDF to Markdown Converter Online",
    description: "Extract PDF document content into Markdown for notes and documentation.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert PDF to Markdown with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Markdown Converter Online",
    description: "Extract PDF document content into Markdown for notes and documentation.",
    images: ["/demo.png"],
  },
};

export default function PdfToMarkdownLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
