"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SITE_URL = "https://idcardtools.com";

const labels: Record<string, string> = {
  about: "About",
  blog: "Blog",
  contacts: "Contact",
  "image-tools": "Image Tools",
  "pdf-tools": "PDF Tools",
  privacy: "Privacy",
  terms: "Terms",
  "ai-summarizer": "AI Summarizer",
  "bg-remove": "Background Remover",
  "excel-to-pdf": "Excel to PDF",
  "html-pdf": "HTML to PDF",
  "jpg-pdf": "JPG to PDF",
  "pdf-jpg": "PDF to JPG",
  "pdf-md": "PDF to Markdown",
  "pdf-read": "PDF Reader",
  "pdf-to-excel": "PDF to Excel",
  "pdf-to-powerpoint": "PDF to PowerPoint",
  "pdf-word": "PDF to Word",
  "ppt-pdf": "PowerPoint to PDF",
  "word-pdf": "Word to PDF",
};

function labelFor(segment: string) {
  return (
    labels[segment] ??
    segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const items = [
    { label: "Home", href: "/" },
    ...segments.map((segment, index) => ({
      label: labelFor(segment),
      href: `/${segments.slice(0, index + 1).join("/")}`,
    })),
  ];

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${SITE_URL}${item.href === "/" ? "" : item.href}`,
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="container mx-auto max-w-350 px-8 pt-5">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/50">
          {items.map((item, index) => {
            const isCurrent = index === items.length - 1;

            return (
              <li key={item.href} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden="true">/</span>}
                {isCurrent ? (
                  <span aria-current="page" className="text-black/75">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-[#ff6a00]">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
