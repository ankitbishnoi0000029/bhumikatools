import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign PDF Online Free",
  description: "Add your signature to a PDF document online. Sign PDFs in your browser with a free electronic signature tool and no account required.",
  keywords: ["sign PDF online", "add signature to PDF", "electronic signature PDF", "free PDF signer"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/sign" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/sign",
    title: "Sign PDF Online Free",
    description: "Place an electronic signature on PDF documents online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Sign PDF documents with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign PDF Online Free",
    description: "Place an electronic signature on PDF documents online.",
    images: ["/demo.png"],
  },
};

export default function SignLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
