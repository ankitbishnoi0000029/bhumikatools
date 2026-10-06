import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organize PDF Pages Online Free",
  description: "Reorder, rotate, add, or remove pages from a PDF document online. Organize PDF pages with a free browser-based tool and no signup.",
  keywords: ["organize PDF pages", "reorder PDF pages", "delete PDF pages", "rearrange PDF online"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/organize" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/organize",
    title: "Organize PDF Pages Online Free",
    description: "Rearrange, rotate, and remove PDF pages with a free online PDF organizer.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Organize PDF pages with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Organize PDF Pages Online Free",
    description: "Rearrange, rotate, and remove PDF pages with a free online PDF organizer.",
    images: ["/demo.png"],
  },
};

export default function OrganizeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
