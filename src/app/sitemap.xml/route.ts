import { sitemapIndexXml } from "@/lib/sitemap-data";

export function GET() {
  return new Response(sitemapIndexXml(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
