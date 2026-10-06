import { NextResponse } from "next/server";

const SITE_URL = "https://idcardtools.com";

const blogPosts = [
  {
    slug: "aadhaar-pvc-guide",
    title: "The Complete Guide to Printing Your E-Aadhaar on a PVC Card (2025)",
    excerpt: "Everything you need to know about printing E-Aadhaar on PVC cards.",
    date: "2025-10-12",
    author: "Team idcardtools",
  },
  {
    slug: "pdf-privacy",
    title: "Why Browser-Based PDF Tools Are Safer Than Cloud Uploads",
    excerpt: "Why browser-based processing is more private than cloud uploads.",
    date: "2025-10-08",
    author: "Priya Sharma",
  },
  {
    slug: "pan-card-guide",
    title: "How to Auto-Crop Your PAN Card in Under 10 Seconds",
    excerpt: "A step-by-step guide to auto-cropping PAN cards.",
    date: "2025-10-03",
    author: "Team idcardtools",
  },
];

export async function GET() {
  const items = blogPosts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <author>hello@idcardtools.com (${post.author})</author>
    </item>`
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>idcardtools Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Expert guides on PDF tools, E-Aadhaar PVC printing, and document privacy.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>idcardtools Blog</title>
      <link>${SITE_URL}/blog</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}