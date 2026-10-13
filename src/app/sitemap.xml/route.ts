import { allSitemapUrls, sitemapUrlSetXml } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapUrlSetXml(allSitemapUrls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
