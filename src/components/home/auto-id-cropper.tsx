"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Sparkles, ArrowUpRight, CheckCircle2, Crop, RotateCw, Wand2, ArrowLeft, ArrowRight } from "lucide-react";

const supportedIds = [
  { name: "Aadhaar", code: "UIDAI", color: "#ff6a00" },
  { name: "PAN Card", code: "ITD", color: "#3b82f6" },
  { name: "Voter ID", code: "ECI", color: "#10b981" },
  { name: "Driving License", code: "RTO", color: "#a855f7" },
  { name: "Passport", code: "MEA", color: "#ec4899" },
  { name: "Ration Card", code: "FCS", color: "#eab308" },
  { name: "Health Card", code: "ABDM", color: "#06b6d4" },
  { name: "Employee ID", code: "CORP", color: "#ef4444" },
];

// --- SLIDER DATA — Each ID card with example ---
const sliderCards = [
  {
    id: "aadhaar",
    name: "Aadhaar Card",
    code: "UIDAI",
    color: "#ff6a00",
    country: "India",
    tagline: "The world's largest biometric ID system.",
    corners: 4,
    processingTime: "0.8s",
  },
  {
    id: "pan",
    name: "PAN Card",
    code: "Income Tax Dept",
    color: "#3b82f6",
    country: "India",
    tagline: "Permanent Account Number for tax purposes.",
    corners: 4,
    processingTime: "0.6s",
  },
  {
    id: "voter",
    name: "Voter ID",
    code: "Election Commission",
    color: "#10b981",
    country: "India",
    tagline: "Official identity for electoral participation.",
    corners: 4,
    processingTime: "0.7s",
  },
  {
    id: "dl",
    name: "Driving License",
    code: "RTO",
    color: "#a855f7",
    country: "India",
    tagline: "Union & state-issued driving permit.",
    corners: 4,
    processingTime: "0.9s",
  },
  {
    id: "passport",
    name: "Passport",
    code: "Ministry of External Affairs",
    color: "#ec4899",
    country: "India",
    tagline: "Your gateway to international travel.",
    corners: 4,
    processingTime: "1.0s",
  },
  {
    id: "ration",
    name: "Ration Card",
    code: "Food & Civil Supplies",
    color: "#eab308",
    country: "India",
    tagline: "Entitlement for subsidized food grains.",
    corners: 4,
    processingTime: "0.5s",
  },
  {
    id: "health",
    name: "Health Card",
    code: "ABDM",
    color: "#06b6d4",
    country: "India",
    tagline: "Digital health records under Ayushman Bharat.",
    corners: 4,
    processingTime: "0.8s",
  },
  {
    id: "employee",
    name: "Employee ID",
    code: "Corporate",
    color: "#ef4444",
    country: "Global",
    tagline: "Company-issued identity for workplace access.",
    corners: 4,
    processingTime: "0.6s",
  },
];

const steps = [
  {
    n: "01",
    title: "Upload any photo",
    desc: "Blurry, tilted, or taken at an angle — our AI handles it all.",
  },
  {
    n: "02",
    title: "AI detects edges",
    desc: "Automatically finds the 4 corners of the ID card in milliseconds.",
  },
  {
    n: "03",
    title: "Auto-crop & straighten",
    desc: "Perspective-corrected, de-skewed, and perfectly framed output.",
  },
];

const capabilities = ["Perspective correction", "Auto edge detection", "Multi-card detection", "Background removal", "De-skew & rotation fix", "Output up to 4K resolution"];

export const AutoIdCropper = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Auto-scroll slider
  useEffect(() => {
    if (isSliderPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderCards.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isSliderPaused]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsSliderPaused(true);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliderCards.length);
    setIsSliderPaused(true);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sliderCards.length) % sliderCards.length);
    setIsSliderPaused(true);
  };

  const activeCard = sliderCards[currentSlide];

  return (
    <section className="relative bg-[#f4f1ea] text-[#0a0a0a] py-24 md:py-32 overflow-hidden">
      {/* Vertical rules */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      <div className="container mx-auto px-8 relative max-w-[1400px]">
        {/* ===== TOP META ROW ===== */}
        <div className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">New Feature — AI Powered</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Auto Crop</span>
            <span>·</span>
            <span>8 ID Types Supported</span>
          </div>
        </div>

        {/* ===== HEADING ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Chapter 06 — Smart Cropping</div>
            <h2
              className="text-[48px] md:text-[68px] lg:text-[76px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Every ID card,
              <br />
              <span className="italic text-[#ff6a00]">auto-cropped.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">Drop in a photo from your phone — tilted, poorly lit, wrinkled. Our AI finds the card, straightens it, and crops it perfectly. Every single time.</p>
          </div>
        </motion.div>

        {/* ===== MAIN: VISUAL DEMO + FEATURES ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-24">
          {/* LEFT: Interactive Demo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="lg:col-span-7"
          >
            <div
              className="relative rounded-[22px] bg-white border border-black/[0.06] p-6 overflow-hidden group cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                    <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                    <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">auto-crop.png</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff6a00]">
                  <Sparkles size={11} />
                  AI Active
                </div>
              </div>

              {/* Image frame */}
              <div className="relative aspect-[4/3] rounded-[14px] overflow-hidden bg-[#f4f1ea]">
                <Image
                  src="/demo.png"
                  alt="ID card being auto-cropped"
                  fill
                  className="object-cover opacity-90"
                />

                {/* Dark mask overlay */}
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: isHovering ? 0 : 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 pointer-events-none"
                >
                  <div className="absolute top-0 left-0 right-0 h-[12%] bg-black/60 backdrop-blur-sm" />
                  <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black/60 backdrop-blur-sm" />
                  <div className="absolute top-[12%] bottom-[12%] left-0 w-[18%] bg-black/60 backdrop-blur-sm" />
                  <div className="absolute top-[12%] bottom-[12%] right-0 w-[18%] bg-black/60 backdrop-blur-sm" />
                </motion.div>

                {/* Detection corners */}
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: isHovering ? 0.3 : 1 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-[12%] pointer-events-none"
                >
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#ff6a00]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#ff6a00]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#ff6a00]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#ff6a00]" />
                </motion.div>

                {/* Scanning line */}
                {!isHovering && (
                  <motion.div
                    animate={{ top: ["12%", "88%", "12%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-[12%] right-[12%] h-px bg-[#ff6a00] shadow-[0_0_12px_#ff6a00]"
                  />
                )}

                {/* Cropped badge */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovering ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-[0.2em] text-white bg-black/70 backdrop-blur px-2.5 py-1 rounded-full"
                >
                  Cropped ✓
                </motion.div>
              </div>

              {/* Bottom controls row */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-black/[0.06]">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                    <Crop size={12} />
                    Auto Crop
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                    <RotateCw size={12} />
                    De-skew
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                    <Wand2 size={12} />
                    Enhance
                  </div>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">Hover to crop</div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Feature list */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-5 flex flex-col justify-center"
          >
            <div className="mb-10">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-6">How it works</div>
              <div className="space-y-6">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.n}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-5 pb-6 border-b border-black/[0.08] last:border-0 last:pb-0"
                  >
                    <span className="shrink-0 text-[11px] font-mono uppercase tracking-[0.2em] text-[#ff6a00] mt-1">{step.n}</span>
                    <div>
                      <div
                        className="text-[17px] text-black mb-1"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {step.title}
                      </div>
                      <div className="text-[13px] text-black/55 font-light leading-[1.6]">{step.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">What you get</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {capabilities.map((cap) => (
                  <div
                    key={cap}
                    className="flex items-center gap-2 text-[13px] text-black/60"
                  >
                    <CheckCircle2
                      size={13}
                      className="text-emerald-500 shrink-0"
                    />
                    {cap}
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/pdf-tools"
              className="group inline-flex items-center gap-3"
            >
              <span className="relative text-[15px] font-medium text-black pb-1">
                Try Auto Crop
                <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
              </span>
              <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                <ArrowUpRight
                  size={15}
                  className="text-black group-hover:text-white transition-colors"
                />
              </span>
            </Link>
          </motion.div>
        </div>

        {/* ===== NEW: ID CARD SLIDER SECTION ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pt-16 border-t border-black/[0.12]"
        >
          {/* Slider header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-3">Gallery — Supported IDs</div>
              <h3
                className="text-[32px] md:text-[42px] leading-tight tracking-tight text-black"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Every card, <span className="italic text-[#ff6a00]">perfectly</span> cropped.
              </h3>
            </div>

            {/* Arrow buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full border border-black/[0.15] flex items-center justify-center text-black/60 hover:bg-black hover:text-white hover:border-black transition-all duration-300"
                aria-label="Previous"
              >
                <ArrowLeft size={15} />
              </button>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full border border-black/[0.15] flex items-center justify-center text-black/60 hover:bg-black hover:text-white hover:border-black transition-all duration-300"
                aria-label="Next"
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Slider track */}
          <div
            ref={sliderRef}
            className="relative overflow-hidden"
            onMouseEnter={() => setIsSliderPaused(true)}
            onMouseLeave={() => setIsSliderPaused(false)}
          >
            {/* Fade edges mask */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#f4f1ea] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#f4f1ea] to-transparent z-10 pointer-events-none" />

            <motion.div
              animate={{ x: `calc(-${currentSlide * 320}px + ${currentSlide > 0 ? currentSlide * 0 : 0}px)` }}
              transition={{ type: "spring", stiffness: 120, damping: 25 }}
              className="flex gap-5 py-2"
            >
              {sliderCards.map((card, i) => {
                const isActive = i === currentSlide;
                return (
                  <motion.div
                    key={card.id}
                    onClick={() => goToSlide(i)}
                    className={`relative shrink-0 w-[300px] cursor-pointer transition-all duration-500 ${isActive ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
                  >
                    {/* Card */}
                    <div
                      className={`relative aspect-[1.586/1] rounded-[18px] overflow-hidden border transition-all duration-500 ${isActive ? "border-[#ff6a00]/40 shadow-[0_20px_50px_-15px_rgba(255,106,0,0.25)]" : "border-black/[0.08]"}`}
                      style={{
                        background: `linear-gradient(135deg, ${card.color}15 0%, #ffffff 100%)`,
                      }}
                    >
                      {/* Card corner accent */}
                      <div
                        className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-30"
                        style={{ backgroundColor: card.color }}
                      />

                      {/* Card content */}
                      <div className="relative z-10 p-5 h-full flex flex-col">
                        {/* Top row */}
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: card.color }}
                            />
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-black/50">{card.country}</span>
                          </div>
                          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40">{card.processingTime}</span>
                        </div>

                        {/* Card name */}
                        <div className="flex-1">
                          <h4
                            className="text-[22px] leading-tight tracking-tight text-black mb-2"
                            style={{ fontFamily: "Georgia, serif" }}
                          >
                            {card.name}
                          </h4>
                          <p className="text-[11px] text-black/50 font-light leading-[1.5]">{card.tagline}</p>
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-end justify-between pt-4 border-t border-black/[0.08]">
                          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-black/40">{card.code}</div>
                          <div className="flex items-center gap-1.5">
                            <Crop
                              size={10}
                              style={{ color: card.color }}
                            />
                            <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/50">{card.corners} corners</span>
                          </div>
                        </div>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeCardBorder"
                          className="absolute inset-0 rounded-[18px] border-2 border-[#ff6a00] pointer-events-none"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </div>

                    {/* Index number below card */}
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-[10px] font-mono uppercase tracking-[0.2em] transition-colors ${isActive ? "text-[#ff6a00]" : "text-black/30"}`}>{String(i + 1).padStart(2, "0")}</span>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff6a00]"
                        >
                          Active
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Progress indicator bar */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex-1 h-px bg-black/[0.08] relative overflow-hidden">
              <motion.div
                animate={{ width: `${((currentSlide + 1) / sliderCards.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="absolute top-0 left-0 h-full bg-[#ff6a00]"
              />
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              {String(currentSlide + 1).padStart(2, "0")} / {String(sliderCards.length).padStart(2, "0")}
            </div>
          </div>

          {/* Active card info strip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCard.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-black/[0.08]"
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-2">Currently Viewing</div>
                <div
                  className="text-[24px] text-black leading-tight"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {activeCard.name}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-2">Issuing Authority</div>
                <div
                  className="text-[15px] text-black/80 leading-tight"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {activeCard.code}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-2">Processing Time</div>
                <div
                  className="text-[15px] text-black/80 leading-tight"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Under {activeCard.processingTime}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dot indicators (mobile friendly) */}
          <div className="flex md:hidden items-center justify-center gap-2 mt-8">
            {sliderCards.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "w-6 bg-[#ff6a00]" : "w-1.5 bg-black/20"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
