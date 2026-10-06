import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unlock PDF Online",
  description: "Remove password protection from PDF files when you have permission and the required password. Unlock your PDF online with a free tool.",
  keywords: ["unlock PDF", "remove PDF password", "open password protected PDF", "PDF password remover"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/unlock" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/unlock",
    title: "Unlock PDF Online",
    description: "Remove PDF password protection from documents you are authorized to access.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Unlock PDF files with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unlock PDF Online",
    description: "Remove PDF password protection from documents you are authorized to access.",
    images: ["/demo.png"],
  },
};

export default function UnlockLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
