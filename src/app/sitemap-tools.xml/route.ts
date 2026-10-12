import { sitemapUrlSetXml, toolSitemapUrls } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapUrlSetXml(toolSitemapUrls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
