"use client";

import {
  BookOpen,
  Circle,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Image,
  Info,
  Layers,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import type { InfoItem, InformationSectionProps } from "@/types/types";

const iconComponents: Record<InfoItem["icon"], typeof Circle> = {
  BookOpen,
  Circle,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Image,
  Info,
  Layers,
  MonitorSmartphone,
  ShieldCheck,
};

// --- SECTION META ---
const SectionMeta = ({ label, right }: { label: string; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between pb-6 mb-14 border-b border-black/[0.12]">
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">{label}</span>
    </div>
    {right && <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">{right}</div>}
  </div>
);

// --- SECTION HEADING ---
const SectionHeading = ({ eyebrow, title, subtitle }: { eyebrow: string; title: React.ReactNode; subtitle?: React.ReactNode }) => (
  <motion.div
    initial={false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end"
  >
    <div className="lg:col-span-7">
      <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">{eyebrow}</div>
      <h2
        id="info-section-heading"
        className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {title}
      </h2>
    </div>
    {subtitle && (
      <div className="lg:col-span-5 lg:pb-4">
        <div className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md lg:ml-auto">{subtitle}</div>
      </div>
    )}
  </motion.div>
);

// --- INFO CARD (default variant) ---
const InfoCard = ({ item, index, variant }: { item: InfoItem; index: number; variant: "default" | "compact" | "featured" }) => {
  const IconComponent = iconComponents[item.icon];

  // Different card styles based on variant
  const cardBase = "group relative p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-black/20 hover:-translate-y-1 transition-all duration-500";

  const featuredExtras = variant === "featured" ? "hover:shadow-[0_24px_50px_-24px_rgba(255,106,0,0.25)]" : variant === "default" ? "hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.22)]" : "";

  const compactPadding = variant === "compact" ? "p-5" : "p-7";

  return (
    <motion.article
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: (index % 6) * 0.08, ease: "easeOut" }}
      className={`${cardBase} ${featuredExtras} ${compactPadding}`}
    >
      {/* Number watermark */}
      <div className="flex items-start justify-between mb-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${variant === "featured" ? "bg-[#ff6a00]/10 group-hover:bg-[#ff6a00]" : "bg-[#f4f1ea] group-hover:bg-[#ff6a00]"}`}>
          <IconComponent
            size={20}
            strokeWidth={1.75}
            className={`transition-colors duration-500 ${variant === "featured" ? "text-[#ff6a00] group-hover:text-white" : "text-black/70 group-hover:text-white"}`}
          />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">{String(index + 1).padStart(2, "0")}</span>
      </div>

      {/* Title */}
      <h3
        className="text-[20px] md:text-[22px] leading-tight tracking-tight text-black mb-3 transition-colors duration-300 group-hover:text-[#ff6a00]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {item.title}
      </h3>

      {/* Description */}
      <p
        className="text-[13px] md:text-[14px] leading-[1.7] text-black/55 font-light"
      >
        {item.description}
        {item.highlight && (
          <>
            {" "}
            <strong className="text-black font-medium">{item.highlight}</strong>
          </>
        )}
      </p>

      {/* Bottom accent line on hover */}
      <div className="absolute bottom-0 left-7 right-7 h-px bg-[#ff6a00] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
    </motion.article>
  );
};

// --- MAIN COMPONENT ---
export function InformationSection({ chapterLabel, metaLabel = "Information", metaRight, eyebrow, title, subtitle, items, columns = 3, variant = "default", showSchema = false, className = "" }: InformationSectionProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns];

  const schemaData = showSchema
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: typeof title === "string" ? title : eyebrow,
        description: typeof subtitle === "string" ? subtitle : eyebrow,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.title,
          description: item.description,
        })),
      }
    : null;

  return (
    <section
      className={`relative py-24 md:py-32 border-t border-black/[0.08] bg-[#f4f1ea] text-[#0a0a0a] ${className}`}
      aria-labelledby="info-section-heading"
    >
      {schemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schemaData).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <div className="container mx-auto px-8 relative max-w-[1400px]">
        {/* Optional chapter label */}
        {chapterLabel && <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">{chapterLabel}</div>}

        {/* Section Meta */}
        <SectionMeta
          label={metaLabel}
          right={
            metaRight ?? (
              <>
                <span>{items.length} Details</span>
                <span>·</span>
                <span>Page information</span>
              </>
            )
          }
        />

        {/* Section Heading */}
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
        />

        {/* Cards Grid */}
        <div className={`grid ${gridCols} gap-5`}>
          {items.map((item, index) => (
            <InfoCard
              key={item.id}
              item={item}
              index={index}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
