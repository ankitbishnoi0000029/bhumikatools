import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fill and Create PDF Forms Online",
  description: "Fill in PDF forms online or create interactive fillable PDF documents. Complete form fields in your browser with this free PDF forms tool.",
  keywords: ["fill PDF forms online", "fillable PDF", "create PDF forms", "PDF form filler"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/forms" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/forms",
    title: "Fill and Create PDF Forms Online",
    description: "Complete PDF form fields or prepare interactive fillable PDF documents online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Fill PDF forms with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fill and Create PDF Forms Online",
    description: "Complete PDF form fields or prepare interactive fillable PDF documents online.",
    images: ["/demo.png"],
  },
};

export default function FormsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
