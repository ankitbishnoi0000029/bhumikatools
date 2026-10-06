import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redact PDF Online Free",
  description: "Permanently remove sensitive information from PDF documents with a free online redaction tool. Hide private text before sharing a file.",
  keywords: ["redact PDF", "remove sensitive text from PDF", "PDF redaction online", "hide information in PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/redact" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/redact",
    title: "Redact PDF Online Free",
    description: "Remove sensitive information from PDF documents before sharing them.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Redact PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Redact PDF Online Free",
    description: "Remove sensitive information from PDF documents before sharing them.",
    images: ["/demo.png"],
  },
};

export default function RedactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
