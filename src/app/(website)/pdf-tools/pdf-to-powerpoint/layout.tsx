import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to PowerPoint Converter Online",
  description: "Convert PDF documents into PowerPoint presentations online. Turn PDF pages into editable PPT slides with a free PDF converter.",
  keywords: ["PDF to PowerPoint", "PDF to PPT", "PDF to PPTX converter", "convert PDF to slides"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/pdf-to-powerpoint" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/pdf-to-powerpoint",
    title: "PDF to PowerPoint Converter Online",
    description: "Turn PDF documents into PowerPoint presentation slides online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert PDF to PowerPoint with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to PowerPoint Converter Online",
    description: "Turn PDF documents into PowerPoint presentation slides online.",
    images: ["/demo.png"],
  },
};

export default function PdfToPowerPointLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
