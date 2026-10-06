import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OCR PDF Online Free",
  description: "Use optical character recognition to extract searchable text from scanned PDF documents. Convert image-based PDFs into text online.",
  keywords: ["OCR PDF online", "searchable PDF", "extract text from scanned PDF", "PDF text recognition"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/ocr" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/ocr",
    title: "OCR PDF Online Free",
    description: "Recognize text in scanned PDF documents and make them searchable online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Run OCR on PDFs with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OCR PDF Online Free",
    description: "Recognize text in scanned PDF documents and make them searchable online.",
    images: ["/demo.png"],
  },
};

export default function OcrLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
