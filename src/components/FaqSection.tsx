"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import type { FaqItem, FaqSectionProps } from "@/types/types";

const SectionMeta = ({ label, right }: { label: string; right?: React.ReactNode }) => (
  <div className="flex items-center justify-between pb-6 mb-14 border-b border-black/[0.12]">
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">{label}</span>
    </div>
    {right && <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">{right}</div>}
  </div>
);

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
        id="faq-section-heading"
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

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-black/[0.08] border-t border-black/[0.08]">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="w-full text-left py-6 flex items-start gap-6 group"
            >
              <span className={`shrink-0 text-[11px] font-mono uppercase tracking-[0.2em] mt-1.5 transition-colors duration-300 ${isOpen ? "text-[#ff6a00]" : "text-black/30"}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={`flex-1 text-[18px] md:text-[22px] leading-[1.35] tracking-[-0.01em] transition-colors duration-300 pr-4 ${isOpen ? "text-[#ff6a00]" : "text-black group-hover:text-black/70"}`} style={{ fontFamily: "Georgia, serif" }}>
                {item.question}
              </span>
              <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${isOpen ? "bg-[#ff6a00] border-[#ff6a00] text-white rotate-180" : "border-black/15 text-black/60 group-hover:border-black/30"}`}>
                {isOpen ? <Minus size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="pb-6 pl-[52px] pr-16">
                    <div className="max-w-[640px] text-[14px] md:text-[15px] leading-[1.75] text-black/60 font-light">
                      {item.answer}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

export function FaqSection({ chapterLabel, metaLabel = "FAQ", metaRight, eyebrow, title, subtitle, items, showSchema = false, className = "" }: FaqSectionProps) {
  const schemaData = showSchema
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  if (items.length === 0) return null;

  return (
    <section
      className={`relative py-24 md:py-32 border-t border-black/[0.08] bg-[#f4f1ea] text-[#0a0a0a] ${className}`}
      aria-labelledby="faq-section-heading"
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
        {chapterLabel && <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">{chapterLabel}</div>}

        <SectionMeta
          label={metaLabel}
          right={
            metaRight ?? (
              <>
                <span>{items.length} Questions</span>
                <span>·</span>
                <span>Quick answers</span>
              </>
            )
          }
        />

        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-8 lg:col-start-3">
            <FaqAccordion items={items} />
          </div>
        </div>
      </div>
    </section>
  );
}
