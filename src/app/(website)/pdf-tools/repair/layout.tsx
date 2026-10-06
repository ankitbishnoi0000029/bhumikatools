import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repair Corrupted PDF Files Online",
  description: "Try to recover a damaged or unreadable PDF document online. Diagnose common PDF issues and export a repaired copy with a free tool.",
  keywords: ["repair PDF online", "fix corrupted PDF", "recover damaged PDF", "PDF repair tool"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/repair" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/repair",
    title: "Repair Corrupted PDF Files Online",
    description: "Diagnose and attempt to repair damaged or unreadable PDF documents.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Repair PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Repair Corrupted PDF Files Online",
    description: "Diagnose and attempt to repair damaged or unreadable PDF documents.",
    images: ["/demo.png"],
  },
};

export default function RepairLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
