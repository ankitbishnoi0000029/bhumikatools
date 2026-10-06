import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to Excel Converter Online Free",
  description: "Convert tables and data from PDF documents into Excel spreadsheets online. Create XLSX files with a free PDF-to-Excel converter.",
  keywords: ["PDF to Excel", "PDF to XLSX", "convert PDF tables to Excel", "PDF spreadsheet converter"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/pdf-to-excel" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/pdf-to-excel",
    title: "PDF to Excel Converter Online Free",
    description: "Move tables and data from PDF files into Excel spreadsheets online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Convert PDF to Excel with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF to Excel Converter Online Free",
    description: "Move tables and data from PDF files into Excel spreadsheets online.",
    images: ["/demo.png"],
  },
};

export default function PdfToExcelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
