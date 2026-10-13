"use client";

import { usePathname } from "next/navigation";
import { InformationSection } from "@/components/InformationSection";
import { getPageInformation } from "@/lib/pagecontent";

export function PageInformationSection() {
  const pathname = usePathname();
  const pageInformation = getPageInformation(pathname);

  if (!pageInformation) return null;

  return <InformationSection {...pageInformation} />;
}
