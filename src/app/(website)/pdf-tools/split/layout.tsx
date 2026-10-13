import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Split PDF Online Free – Separate PDF Pages | IDCardTools",
  description: "Split PDF files online free. Separate PDF pages by range, extract selected pages, or split every page into multiple PDFs. No signup, fast and secure.",
  keywords: ["split PDF", "split PDF online", "separate PDF pages", "extract PDF pages", "free PDF splitter", "PDF page splitter", "split PDF by range", "divide PDF"],
  alternates: {
    canonical: "https://idcardtools.com/pdf-tools/split",
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
    url: "https://idcardtools.com/pdf-tools/split",
    title: "Split PDF Online Free – Separate PDF Pages | IDCardTools",
    description: "Separate PDF pages or extract selected sections with a free online PDF splitter. No signup required.",
    siteName: "IDCardTools",
    images: [
      {
        url: "/aitools.png",
        width: 1200,
        height: 630,
        alt: "Split PDF files online with IDCardTools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Split PDF Online Free – Separate PDF Pages | IDCardTools",
    description: "Separate PDF pages or extract selected sections with a free online PDF splitter.",
    images: ["/aitools.png"],
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

export default function SplitLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
