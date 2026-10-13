import { imageToolSlugs } from "@/lib/image-tool-metadata";

const SITE_URL = "https://idcardtools.com";
const LAST_MODIFIED = "2026-10-13";

export type SitemapEntry = {
  url: string;
  lastModified: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
};

const pdfToolSlugs = [
  "compare", "compress", "edit", "excel-to-pdf", "forms",
  "html-pdf", "jpg-pdf", "markdown-pdf", "merge", "ocr", "organize",
  "page-numbers", "pdf-jpg", "pdf-md", "pdf-read", "pdf-to-excel",
  "pdf-to-powerpoint", "pdf-word", "ppt-pdf", "protect", "redact",
  "repair", "rotate", "scan", "sign", "split", "translate",
  "watermark", "word-pdf",
];

const generalSitemapUrls: SitemapEntry[] = [
  SITE_URL,
  `${SITE_URL}/e-aadhaar`,
  `${SITE_URL}/about`,
  `${SITE_URL}/contacts`,
  `${SITE_URL}/blog`,
  `${SITE_URL}/blog/aadhaar-pvc-guide`,
  `${SITE_URL}/privacy`,
  `${SITE_URL}/terms`,
].map((url) => ({
  url,
  lastModified: LAST_MODIFIED,
  changeFrequency: url === SITE_URL ? ("weekly" as const) : ("monthly" as const),
  priority: url === SITE_URL ? 1 : url.endsWith("/blog") ? 0.8 : 0.6,
}));

export const pdfToolSitemapUrls: SitemapEntry[] = [
  `${SITE_URL}/pdf-tools`,
  ...pdfToolSlugs.map((slug) => `${SITE_URL}/pdf-tools/${slug}`),
].map((url) => ({
  url,
  lastModified: LAST_MODIFIED,
  changeFrequency: "monthly" as const,
  priority: url === `${SITE_URL}/pdf-tools` ? 0.8 : 0.6,
}));

export const imageToolSitemapUrls: SitemapEntry[] = [
  `${SITE_URL}/image-tools`,
  ...imageToolSlugs.map((slug) => `${SITE_URL}/image-tools/${slug}`),
].map((url) => ({
  url,
  lastModified: LAST_MODIFIED,
  changeFrequency: "monthly" as const,
  priority: url === `${SITE_URL}/image-tools` ? 0.8 : 0.6,
}));

export const allSitemapUrls: SitemapEntry[] = [
  ...generalSitemapUrls,
  ...pdfToolSitemapUrls,
  ...imageToolSitemapUrls,
];

export function sitemapUrlSetXml(urls: SitemapEntry[]) {
  const entries = urls
    .map(
      ({ url, lastModified, changeFrequency, priority }) =>
        `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastModified}</lastmod>\n    <changefreq>${changeFrequency}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
