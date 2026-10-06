import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Excel to PDF Converter Online Free",
  description: "Convert Excel spreadsheets to PDF online. Turn XLS and XLSX workbooks into shareable PDF documents with a free converter and no signup.",
  keywords: ["Excel to PDF", "XLSX to PDF", "convert spreadsheet to PDF", "free Excel PDF converter"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/excel-to-pdf" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/excel-to-pdf",
    title: "Excel to PDF Converter Online Free",
    description: "Convert Excel XLS and XLSX spreadsheets into PDF documents online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert Excel to PDF with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Excel to PDF Converter Online Free",
    description: "Convert Excel XLS and XLSX spreadsheets into PDF documents online.",
    images: ["/demo.png"],
  },
};

export default function ExcelToPdfLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
