import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare PDF Files Online Free",
  description: "Compare two PDF documents side by side and quickly spot changed text, pages, and content. Free, secure PDF comparison with no signup required.",
  keywords: ["compare PDF files", "PDF comparison online", "compare two PDFs", "PDF difference checker"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/compare" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/compare",
    title: "Compare PDF Files Online Free",
    description: "Find differences between two PDF documents with a free online PDF comparison tool.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Compare PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Compare PDF Files Online Free",
    description: "Find differences between two PDF documents with a free online PDF comparison tool.",
    images: ["/demo.png"],
  },
};

export default function CompareLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
