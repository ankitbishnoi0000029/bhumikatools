"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, ShieldCheck, Eye, BookOpen, Info } from "lucide-react";

const steps = [
  {
    name: "Open your E-Aadhaar PDF",
    text: "Download or open the E-Aadhaar PDF issued by UIDAI and confirm the name, photograph, address, and QR code are current and readable.",
  },
  {
    name: "Review the printing details",
    text: "Check the card material, layout, pricing, and delivery estimate on the order page, and review the privacy terms for how your file is handled.",
  },
  {
    name: "Place the order",
    text: "Submit your E-Aadhaar PDF through the order route on the Contact page. Cards are printed on 600-micron PVC and dispatched with tracking.",
  },
];

const highlights = [
  {
    icon: ShieldCheck,
    title: "UIDAI-compliant layout",
    description:
      "The layout, logo, and QR code remain unaltered, as required by UIDAI for printed E-Aadhaar cards.",
  },
  {
    icon: Info,
    title: "600-micron PVC",
    description:
      "The same grade of PVC used for bank cards — waterproof, tear-resistant, and pocket-sized.",
  },
  {
    icon: Eye,
    title: "Scannable QR code",
    description:
      "The QR code stays scannable by standard verification apps, so the printed card can be checked like the original.",
  },
  {
    icon: BookOpen,
    title: "Official guidance",
    description:
      "Review the linked UIDAI guidance for the latest rules before ordering, since requirements can change over time.",
  },
];

export function EAadhaarContent() {
  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-16 pb-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      <div className="container mx-auto px-8 relative max-w-[1400px]">
        <div className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              Digital identity — PVC printing
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>UIDAI-compliant</span>
            <span>·</span>
            <span>600-micron PVC</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              E-Aadhaar, printed for everyday carry
            </div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Print your <span className="italic text-[#ff6a00]">E-Aadhaar</span> on a PVC card.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Turn the E-Aadhaar PDF issued by UIDAI into a premium PVC card — the size of a
              credit card, the quality of a bank card. Waterproof, durable, and delivered with
              tracking across India.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
                className="group p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-black/20 hover:-translate-y-1 transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center transition-colors duration-500 mb-8">
                  <Icon size={20} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                </div>
                <h3 className="text-[20px] leading-tight tracking-tight text-black mb-3 transition-colors duration-300 group-hover:text-[#ff6a00]" style={{ fontFamily: "Georgia, serif" }}>
                  {item.title}
                </h3>
                <p className="text-[13px] md:text-[14px] leading-[1.7] text-black/55 font-light">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-start"
        >
          <div className="lg:col-span-5">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              How the service works
            </div>
            <h2 className="text-[36px] md:text-[44px] leading-[1.02] tracking-[-0.02em] mb-6" style={{ fontFamily: "Georgia, serif" }}>
              From PDF to <span className="italic text-[#ff6a00]">PVC</span> in three steps.
            </h2>
            <p className="text-[15px] leading-[1.7] text-black/60 max-w-md">
              The process keeps your E-Aadhaar exactly as UIDAI issued it. Only the material
              changes — from a digital PDF to a printed PVC card you can carry every day.
            </p>
            <Link
              href="/contacts"
              className="group inline-flex items-center gap-3 mt-10"
            >
              <span className="relative text-[14px] font-medium text-black pb-1">
                Check pricing and order
                <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
              </span>
              <span className="w-8 h-8 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                <ArrowUpRight size={13} className="text-black group-hover:text-white transition-colors" />
              </span>
            </Link>
          </div>
          <div className="lg:col-span-7">
            <ol className="space-y-5">
              {steps.map((step, index) => (
                <li
                  key={step.name}
                  className="flex gap-6 p-6 rounded-[18px] bg-white border border-black/[0.06]"
                >
                  <span className="shrink-0 text-[11px] font-mono uppercase tracking-[0.2em] text-[#ff6a00] mt-1.5">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[18px] text-black mb-2" style={{ fontFamily: "Georgia, serif" }}>
                      {step.name}
                    </h3>
                    <p className="text-[14px] leading-[1.7] text-black/60 font-light">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </motion.div>

        <div className="rounded-[22px] bg-black text-[#f4f1ea] p-10 md:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <h2 className="text-[30px] md:text-[40px] leading-[1.05] tracking-[-0.02em] mb-4" style={{ fontFamily: "Georgia, serif" }}>
              Ready to carry your <span className="italic text-[#ff6a00]">E-Aadhaar</span>?
            </h2>
            <p className="text-[14px] md:text-[15px] leading-[1.7] text-white/60 max-w-lg">
              Check the current pricing, delivery estimate, and privacy terms on the order page
              before placing your request.
            </p>
          </div>
          <div className="lg:col-span-5 lg:justify-self-end">
            <Link
              href="/contacts"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#ff6a00] text-black text-[14px] font-medium hover:bg-white transition-colors"
            >
              Order your PVC card
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
