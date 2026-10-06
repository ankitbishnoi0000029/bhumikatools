import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HTML to PDF Converter Online Free",
  description: "Convert HTML files and web content to PDF documents online. Create a portable PDF from HTML with a free converter and no account.",
  keywords: ["HTML to PDF", "convert HTML file to PDF", "HTML PDF converter", "webpage to PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/html-pdf" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/html-pdf",
    title: "HTML to PDF Converter Online Free",
    description: "Turn HTML documents into shareable PDF files with a free online converter.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert HTML to PDF with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HTML to PDF Converter Online Free",
    description: "Turn HTML documents into shareable PDF files with a free online converter.",
    images: ["/demo.png"],
  },
};

export default function HtmlToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
