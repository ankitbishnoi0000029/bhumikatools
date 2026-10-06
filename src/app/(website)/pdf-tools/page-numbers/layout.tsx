import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Page Numbers to PDF Online",
  description: "Add page numbers to PDF files and choose their position and style. Number PDF pages online with a free tool and no signup.",
  keywords: ["add page numbers to PDF", "number PDF pages online", "PDF page numbering", "free page number tool"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/page-numbers" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/page-numbers",
    title: "Add Page Numbers to PDF Online",
    description: "Number pages in PDF documents and customize where page numbers appear.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Add PDF page numbers with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Add Page Numbers to PDF Online",
    description: "Number pages in PDF documents and customize where page numbers appear.",
    images: ["/demo.png"],
  },
};

export default function PageNumbersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
