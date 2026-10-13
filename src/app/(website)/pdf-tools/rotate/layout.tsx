import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotate PDF Pages Online Free – Fix PDF Orientation | IDCardTools",
  description:
    "Rotate PDF pages left or right online free. Fix sideways or upside-down PDFs, rotate one page or all pages, and download the corrected PDF. No signup required.",
  keywords: [
    "rotate PDF",
    "rotate PDF online",
    "rotate PDF pages",
    "turn PDF pages",
    "fix PDF orientation",
    "rotate PDF free",
    "PDF rotator",
    "rotate one page PDF",
    "rotate all pages PDF",
  ],
  alternates: {
    canonical: "https://idcardtools.com/pdf-tools/rotate",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "https://idcardtools.com/pdf-tools/rotate",
    title: "Rotate PDF Pages Online Free – Fix PDF Orientation | IDCardTools",
    description:
      "Correct PDF page orientation by rotating pages online. Rotate one page or the whole file and download instantly.",
    siteName: "IDCardTools",
    images: [
      {
        url: "/aitools.png",
        width: 1200,
        height: 630,
        alt: "Rotate PDF pages online with IDCardTools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rotate PDF Pages Online Free – Fix PDF Orientation | IDCardTools",
    description:
      "Correct PDF page orientation by rotating pages online. Rotate one page or the whole file and download instantly.",
    images: ["/aitools.png"],
    // site: "@idcardtools",
    // creator: "@idcardtools",
  },
  category: "UtilitiesApplication",
  applicationName: "IDCardTools",
  authors: [{ name: "IDCardTools", url: "https://idcardtools.com" }],
  creator: "IDCardTools",
  publisher: "IDCardTools",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: "/favicon.ico",
  },
};

export default function RotateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}