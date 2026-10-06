import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotate PDF Pages Online Free",
  description: "Rotate PDF pages left or right and save the document in the correct orientation. Fix sideways or upside-down PDFs with a free online tool.",
  keywords: ["rotate PDF", "rotate PDF pages online", "turn PDF pages", "fix PDF orientation"],
  alternates: { canonical: "https://idcardtools.com/pdf-tools/rotate" },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/rotate",
    title: "Rotate PDF Pages Online Free",
    description: "Correct PDF page orientation by rotating pages online.",
    siteName: "idcardtools",
    images: [{ url: "/demo.png", width: 1200, height: 630, alt: "Rotate PDF pages with idcardtools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rotate PDF Pages Online Free",
    description: "Correct PDF page orientation by rotating pages online.",
    images: ["/demo.png"],
  },
};

export default function RotateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
