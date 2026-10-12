import { homeSitemapUrls, sitemapUrlSetXml } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapUrlSetXml(homeSitemapUrls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
