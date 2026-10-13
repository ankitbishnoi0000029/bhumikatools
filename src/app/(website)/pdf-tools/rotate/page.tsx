import RotatePDFPage from "@/components/pdf-tools/rotate";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Rotate PDF",
      url: "https://idcardtools.com/pdf-tools/rotate",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Free online tool to rotate PDF pages, fix PDF orientation, and download the corrected PDF.",
      featureList: [
        "Rotate one PDF page",
        "Rotate all PDF pages",
        "Fix sideways PDF",
        "Fix upside-down PDF",
        "Works on mobile and desktop",
        "No signup required",
      ],
      provider: {
        "@type": "Organization",
        name: "IDCardTools",
        url: "https://idcardtools.com",
      },
    },
    {
      "@type": "HowTo",
      name: "How to Rotate a PDF Online",
      description:
        "Rotate PDF pages left or right and download the corrected PDF file.",
      totalTime: "PT1M",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Upload PDF",
          text: "Select or drag and drop the PDF file you want to rotate.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Select pages",
          text: "Choose a single page or select all pages to rotate.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Choose rotation",
          text: "Rotate the selected pages 90° left or 90° right.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Download PDF",
          text: "Apply the rotation and download the corrected PDF file.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How do I rotate a PDF online?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Upload your PDF, select the pages you want to rotate, choose left or right rotation, then download the corrected PDF.",
          },
        },
        {
          "@type": "Question",
          name: "Can I rotate only one page in a PDF?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can rotate a single page or apply the same rotation to all pages in the PDF.",
          },
        },
        {
          "@type": "Question",
          name: "Does rotating a PDF reduce quality?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Rotating a PDF changes the page orientation without changing the original text, images, or layout quality.",
          },
        },
        {
          "@type": "Question",
          name: "Is this PDF rotator free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. IDCardTools PDF rotator is free to use and does not require signup.",
          },
        },
        {
          "@type": "Question",
          name: "Can I rotate PDF files on my phone?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The tool works on Android, iPhone, iPad, Mac, Windows, and Linux browsers.",
          },
        },
      ],
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
          name: "Rotate PDF",
          item: "https://idcardtools.com/pdf-tools/rotate",
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
      <RotatePDFPage />
    </>
  );
}