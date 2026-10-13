import { pdfToolSitemapUrls, sitemapUrlSetXml } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapUrlSetXml(pdfToolSitemapUrls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
