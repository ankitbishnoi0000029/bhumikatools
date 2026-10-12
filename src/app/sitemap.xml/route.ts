import { sitemapUrlSetXml, sitemapUrls } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapUrlSetXml(sitemapUrls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
