import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protect PDF with a Password Online",
  description: "Encrypt a PDF document with a password to help protect it from unauthorized access. Set PDF security options with a free online tool.",
  keywords: ["protect PDF with password", "password protect PDF", "encrypt PDF online", "PDF security tool"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/protect" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/protect",
    title: "Protect PDF with a Password Online",
    description: "Add password protection and security settings to PDF documents online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Protect PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Protect PDF with a Password Online",
    description: "Add password protection and security settings to PDF documents online.",
    images: ["/demo.png"],
  },
};

export default function ProtectLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
