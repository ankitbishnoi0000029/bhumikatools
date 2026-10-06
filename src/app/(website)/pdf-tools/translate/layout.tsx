import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translate PDF Documents Online",
  description: "Translate PDF document text into another language online. Make multilingual documents easier to understand with a free browser-based tool.",
  keywords: ["translate PDF", "PDF translator online", "translate PDF document", "document translation tool"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/translate" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/translate",
    title: "Translate PDF Documents Online",
    description: "Translate the text in PDF documents to another language online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Translate PDF documents with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Translate PDF Documents Online",
    description: "Translate the text in PDF documents to another language online.",
    images: ["/demo.png"],
  },
};

export default function TranslateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
