import type { MetadataRoute } from "next";

const SITE_URL = "https://idcardtools.com";

const pdfTools = [
  "compare",
  "compress",
  "edit",
  "excel-to-pdf",
  "forms",
  "html-pdf",
  "jpg-pdf",
  "markdown-pdf",
  "merge",
  "ocr",
  "organize",
  "page-numbers",
  "pdf-jpg",
  "pdf-md",
  "pdf-read",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "pdf-word",
  "ppt-pdf",
  "protect",
  "redact",
  "repair",
  "rotate",
  "scan",
  "sign",
  "split",
  "translate",
  "unlock",
  "watermark",
  "word-pdf",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/pdf-tools`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contacts`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const toolPages: MetadataRoute.Sitemap = pdfTools.map((slug) => ({
    url: `${SITE_URL}/pdf-tools/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...toolPages];
}