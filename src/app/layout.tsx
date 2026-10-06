import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://idcardtools.com";
const SITE_NAME = "idcardtools";
const SITE_TITLE = "idcardtools — Print E-Aadhaar on PVC Card & Free PDF Tools";
const SITE_DESCRIPTION =
  "Print your E-Aadhaar on premium PVC cards. 31+ free PDF tools — merge, split, compress, convert, sign, and protect. UIDAI-compliant. No signup. Privacy-first. Trusted by 2M+ Indians.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },

  description: SITE_DESCRIPTION,

  keywords: [
    "print e-aadhaar on pvc card",
    "e-aadhaar pvc card print online",
    "aadhaar card printing service",
    "uidai approved pvc card",
    "free pdf tools online",
    "merge pdf free",
    "split pdf online",
    "compress pdf free",
    "pdf to word converter",
    "pdf to excel converter",
    "pdf to jpg converter",
    "jpg to pdf converter",
    "sign pdf online free",
    "protect pdf with password",
    "unlock pdf password",
    "ai pdf summarizer",
    "translate pdf free",
    "ocr pdf online",
    "pdf tools india",
    "idcardtools",
    "id card tools",
    "idcardtools.com",
    "aadhaar card pvc print",
    "pan card print",
    "voter id print",
    "id card auto crop",
    "print aadhaar card",
  ],

  authors: [{ name: "idcardtools", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  applicationName: SITE_NAME,
  generator: "Next.js",
  category: "Productivity",
  classification: "PDF Tools, ID Card Printing",

  // Icons
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: "/favicon.ico",
  },

  // Canonical
  alternates: {
    canonical: SITE_URL,
    languages: { "en-IN": SITE_URL },
  },

  // OpenGraph
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    countryName: "India",
    images: [
      {
        url: `${SITE_URL}/demo.png`,
        width: 1200,
        height: 630,
        alt: "idcardtools — Print E-Aadhaar on PVC Card & Free PDF Tools",
        type: "image/png",
      },
      {
        url: `${SITE_URL}/demo.png`,
        width: 1200,
        height: 1200,
        alt: "idcardtools",
        type: "image/png",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/demo.png`],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Other meta
  other: {
    "theme-color": "#f4f1ea",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": SITE_NAME,
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#ff6a00",
    "msapplication-config": "/browserconfig.xml",
  },

  // PWA Manifest
  manifest: "/manifest.webmanifest",

  // App links
  appLinks: {
    web: {
      url: SITE_URL,
      should_fallback: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#f4f1ea" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" dir="ltr">
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://unpkg.com" />

        {/* Structured Data — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "idcardtools",
              alternateName: ["ID Card Tools", "idcardtools.com"],
              url: SITE_URL,
              logo: `${SITE_URL}/favicon.ico`,
              description: SITE_DESCRIPTION,
              foundingDate: "2023",
              founders: [{ "@type": "Person", name: "idcardtools Team" }],
              address: {
                "@type": "PostalAddress",
                addressLocality: "Bangalore",
                addressRegion: "Karnataka",
                postalCode: "560038",
                addressCountry: "IN",
                streetAddress: "Indiranagar",
              },
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  telephone: "+91-9876543210",
                  contactType: "customer support",
                  email: "hello@idcardtools.com",
                  areaServed: "IN",
                  availableLanguage: ["English", "Hindi"],
                },
                {
                  "@type": "ContactPoint",
                  telephone: "+91-9876543210",
                  contactType: "sales",
                  email: "sales@idcardtools.com",
                  areaServed: "IN",
                },
              ],
              sameAs: [
                "https://twitter.com/idcardtools",
                "https://www.instagram.com/idcardtools",
                "https://www.linkedin.com/company/idcardtools",
                "https://github.com/idcardtools",
                "https://www.youtube.com/@idcardtools",
              ],
            }),
          }}
        />

        {/* Structured Data — WebSite with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              alternateName: "ID Card Tools",
              url: SITE_URL,
              description: SITE_DESCRIPTION,
              inLanguage: "en-IN",
              publisher: {
                "@type": "Organization",
                name: "idcardtools",
                logo: {
                  "@type": "ImageObject",
                  url: `${SITE_URL}/favicon.ico`,
                },
              },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${SITE_URL}/pdf-tools?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        {/* Structured Data — LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": `${SITE_URL}#business`,
              name: "idcardtools",
              image: `${SITE_URL}/demo.png`,
              url: SITE_URL,
              telephone: "+91-9876543210",
              priceRange: "₹99 - ₹499",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Indiranagar",
                addressLocality: "Bangalore",
                addressRegion: "Karnataka",
                postalCode: "560038",
                addressCountry: "IN",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 12.9716,
                longitude: 77.5946,
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                  opens: "10:00",
                  closes: "18:00",
                },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "2847",
                bestRating: "5",
                worstRating: "1",
              },
            }),
          }}
        />
      </head>

      <body className="relative min-h-screen bg-[#f4f1ea] text-[#0a0a0a] antialiased">
        <main className="relative mt-20">{children}</main>
      </body>
    </html>
  );
}