import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Split PDF Files Online Free",
  description: "Split a PDF into separate files or extract selected pages online. Divide PDF documents for free with no signup required.",
  keywords: ["split PDF", "separate PDF pages", "extract PDF pages", "free PDF splitter"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/split" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/split",
    title: "Split PDF Files Online Free",
    description: "Separate PDF pages or extract selected sections with a free online PDF splitter.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Split PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Split PDF Files Online Free",
    description: "Separate PDF pages or extract selected sections with a free online PDF splitter.",
    images: ["/demo.png"],
  },
};

export default function SplitLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
