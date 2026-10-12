import { blogSitemapUrls, sitemapUrlSetXml } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapUrlSetXml(blogSitemapUrls), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
