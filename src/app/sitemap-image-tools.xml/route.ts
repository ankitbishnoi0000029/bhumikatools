import { imageToolSitemapUrls, sitemapUrlSetXml } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapUrlSetXml(imageToolSitemapUrls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
