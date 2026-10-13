import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: ["GPTBot", "Claude-Web"],
        allow: "/",
      },
    ],
    sitemap: [
      "https://idcardtools.com/sitemap.xml",
      "https://idcardtools.com/sitemap-general.xml",
      "https://idcardtools.com/sitemap-pdf-tools.xml",
      "https://idcardtools.com/sitemap-image-tools.xml",
    ],
  };
}
