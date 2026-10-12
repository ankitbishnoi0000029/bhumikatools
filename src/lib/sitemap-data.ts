import { imageToolSlugs } from "@/lib/image-tool-metadata";

const SITE_URL = "https://idcardtools.com";

export const homeSitemapUrls = [
  SITE_URL,
  `${SITE_URL}/about`,
  `${SITE_URL}/contacts`,
  `${SITE_URL}/privacy`,
  `${SITE_URL}/terms`,
];

export const toolSitemapUrls = [
  `${SITE_URL}/pdf-tools`,
  `${SITE_URL}/image-tools`,
  ...imageToolSlugs.map((slug) => `${SITE_URL}/image-tools/${slug}`),
  ...[
    "compare",
    "compress",
    "crop",
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
  ].map((slug) => `${SITE_URL}/pdf-tools/${slug}`),
];

export const blogSitemapUrls = [
  `${SITE_URL}/blog`,
  `${SITE_URL}/blog/aadhaar-pvc-guide`,
];

export const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE_URL}/sitemap-home.xml</loc></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-tools.xml</loc></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-blog.xml</loc></sitemap>
</sitemapindex>`;

export function sitemapUrlSetXml(urls: string[]) {
  const entries = urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
