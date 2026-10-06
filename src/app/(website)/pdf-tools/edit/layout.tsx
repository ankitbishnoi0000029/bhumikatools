import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit PDF Online Free",
  description: "Edit PDF documents online by adding text, images, shapes, and annotations. Make quick changes to your PDF with a free browser-based editor.",
  keywords: ["edit PDF online", "free PDF editor", "add text to PDF", "annotate PDF"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/edit" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/edit",
    title: "Edit PDF Online Free",
    description: "Add text, images, shapes, and annotations to PDF files with a free online editor.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Edit PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Edit PDF Online Free",
    description: "Add text, images, shapes, and annotations to PDF files with a free online editor.",
    images: ["/demo.png"],
  },
};

export default function EditLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
