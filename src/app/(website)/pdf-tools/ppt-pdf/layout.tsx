import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PowerPoint to PDF Converter Online",
  description: "Convert PowerPoint presentations to PDF online. Export PPT and PPTX slides as easy-to-share PDF documents with a free converter.",
  keywords: ["PowerPoint to PDF", "PPT to PDF", "PPTX to PDF", "convert presentation to PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/ppt-pdf" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/ppt-pdf",
    title: "PowerPoint to PDF Converter Online",
    description: "Export PPT and PPTX presentations to portable PDF documents online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert PowerPoint to PDF with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PowerPoint to PDF Converter Online",
    description: "Export PPT and PPTX presentations to portable PDF documents online.",
    images: ["/demo.png"],
  },
};

export default function PowerPointToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
