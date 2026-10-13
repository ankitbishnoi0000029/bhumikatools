import SplitPDFPage from "@/components/pdf-tools/split";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Split PDF",
      url: "https://idcardtools.com/pdf-tools/split",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Free online tool to split PDF files, separate pages, and extract selected pages.",
      featureList: [
        "Split PDF by page ranges",
        "Extract all PDF pages",
        "Extract selected pages",
        "No signup required",
      ],
      provider: {
        "@type": "Organization",
        name: "IDCardTools",
        url: "https://idcardtools.com",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://idcardtools.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "PDF Tools",
          item: "https://idcardtools.com/pdf-tools",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Split PDF",
          item: "https://idcardtools.com/pdf-tools/split",
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SplitPDFPage />
    </>
  );
}