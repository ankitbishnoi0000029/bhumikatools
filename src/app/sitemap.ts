import type { MetadataRoute } from "next";

const SITE_URL = "https://idcardtools.com";

const pdfTools = [
  "merge", "split", "rotate", "organize", "page-numbers", "crop",
  "compress", "repair", "ocr", "scan",
  "pdf-word", "pdf-ppt", "pdf-excel", "word-pdf", "ppt-pdf", "excel-pdf",
  "pdf-jpg", "jpg-pdf", "html-pdf", "pdf-a", "pdf-md", "markdown-pdf",
  "edit", "sign", "watermark", "forms",
  "unlock", "protect", "redact",
  "compare", "ai-summarizer", "translate",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/pdf-tools`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/aadhaar-pvc`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const toolPages: MetadataRoute.Sitemap = pdfTools.map((slug) => ({
    url: `${SITE_URL}/pdf-tools/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...toolPages];
}