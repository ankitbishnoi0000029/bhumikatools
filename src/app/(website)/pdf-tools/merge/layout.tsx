import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merge PDF Files Online Free",
  description: "Combine multiple PDF files into one document online. Arrange files in order and merge PDFs for free with no signup required.",
  keywords: ["merge PDF", "combine PDF files", "join PDFs online", "free PDF merger"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/merge" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/merge",
    title: "Merge PDF Files Online Free",
    description: "Join multiple PDF documents into a single file with a free online PDF merger.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Merge PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merge PDF Files Online Free",
    description: "Join multiple PDF documents into a single file with a free online PDF merger.",
    images: ["/demo.png"],
  },
};

export default function MergeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
