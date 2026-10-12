import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SITE_URL = "https://idcardtools.com";

const pdfTools = ["compare", "compress", "edit", "excel-to-pdf", "forms", "html-pdf", "jpg-pdf", "markdown-pdf", "merge", "ocr", "organize", "page-numbers", "pdf-jpg", "pdf-md", "pdf-read", "pdf-to-excel", "pdf-to-powerpoint", "pdf-word", "ppt-pdf", "protect", "redact", "repair", "rotate", "scan", "sign", "split", "translate", "unlock", "watermark", "word-pdf"];

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

type SitemapEntry = {
  url: string;
  lastModified: string;
  changeFrequency: string;
  priority: number;
};

export async function GET() {
  const now = new Date().toISOString();

  const staticPages: SitemapEntry[] = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/pdf-tools`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contacts`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const toolPages: SitemapEntry[] = pdfTools.map((slug) => ({
    url: `${SITE_URL}/pdf-tools/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const allUrls = [...staticPages, ...toolPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (page) => `  <url>
    <loc>${escapeXml(page.url)}</loc>
    <lastmod>${page.lastModified}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
