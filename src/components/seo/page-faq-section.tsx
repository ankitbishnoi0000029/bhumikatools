"use client";

import { usePathname } from "next/navigation";
import { FaqSection } from "@/components/FaqSection";
import { getFaqsForPath } from "@/lib/pagecontent";

export function PageFaqSection() {
  const pathname = usePathname();
  const faqs = getFaqsForPath(pathname);

  if (!faqs) return null;

  return (
    <FaqSection
      chapterLabel="Page questions"
      metaLabel="Common questions"
      eyebrow="Frequently asked"
      title="Questions, answered."
      subtitle="Short answers about this page and the tools it covers."
      items={faqs}
      showSchema
    />
  );
}
