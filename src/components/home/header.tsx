"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Search, ChevronDown, Menu, X, ArrowUpRight, User2, Layers, Scissors, RotateCw, LayoutList, FileText, Crop, Minimize, Wrench, ScanText, FileInput, FileOutput, Presentation, FileSpreadsheet, Image as ImageIcon, FileCode2, Edit3, PenTool, Stamp, Lock, Unlock, EyeOff, ShieldAlert, Brain, Languages, Sparkles, LucideCreditCardReader } from "lucide-react";

// --- CATEGORIES WITH TOOLS ---
const toolsMenu = [
  {
    name: "Organize PDF",
    slug: "organize",
    desc: "Merge, split, rotate, and rearrange",
    color: "#ff6a00",
    tools: [
      { id: "pdf-read", title: "Read PDF", icon: LucideCreditCardReader },
      { id: "merge", title: "Merge PDF", icon: Layers },
      { id: "split", title: "Split PDF", icon: Scissors },
      { id: "rotate", title: "Rotate PDF", icon: RotateCw },
      { id: "organize", title: "Organize PDF", icon: LayoutList },
      { id: "page-numbers", title: "Page Numbers", icon: FileText },
      { id: "crop", title: "Crop PDF", icon: Crop },
    ],
  },
  {
    name: "Optimize PDF",
    slug: "optimize",
    desc: "Compress, repair, and OCR",
    color: "#10b981",
    tools: [
      { id: "compress", title: "Compress PDF", icon: Minimize },
      { id: "repair", title: "Repair PDF", icon: Wrench },
      { id: "ocr", title: "OCR PDF", icon: ScanText },
      { id: "scan", title: "Scan to PDF", icon: FileInput },
    ],
  },
  {
    name: "Convert PDF",
    slug: "convert",
    desc: "To and from any format",
    color: "#3b82f6",
    tools: [
      { id: "pdf-word", title: "PDF to Word", icon: FileOutput },
      { id: "pdf-to-powerpoint", title: "PDF to PowerPoint", icon: Presentation },
      { id: "pdf-to-excel", title: "PDF to Excel", icon: FileSpreadsheet },
      { id: "word-pdf", title: "Word to PDF", icon: FileText },
      { id: "jpg-pdf", title: "JPG to PDF", icon: ImageIcon },
      { id: "html-pdf", title: "HTML to PDF", icon: FileCode2 },
      { id: "pdf-md", title: "PDF to Markdown", icon: FileCode2, isNew: true },
    ],
  },
  {
    name: "Edit PDF",
    slug: "edit",
    desc: "Edit, sign, and annotate",
    color: "#a855f7",
    tools: [
      { id: "edit", title: "Edit PDF", icon: Edit3 },
      { id: "sign", title: "Sign PDF", icon: PenTool },
      { id: "watermark", title: "Watermark", icon: Stamp },
      { id: "forms", title: "PDF Forms", icon: FileInput, isNew: true },
    ],
  },
  {
    name: "PDF Security",
    slug: "security",
    desc: "Protect, unlock, and redact",
    color: "#ef4444",
    tools: [
      { id: "unlock", title: "Unlock PDF", icon: Unlock },
      { id: "protect", title: "Protect PDF", icon: Lock },
      { id: "redact", title: "Redact PDF", icon: EyeOff },
    ],
  },
  {
    name: "PDF Intelligence",
    slug: "intelligence",
    desc: "AI-powered tools",
    color: "#ec4899",
    tools: [
      { id: "compare", title: "Compare PDF", icon: ShieldAlert },
      { id: "ai-summarizer", title: "AI Summarizer", icon: Brain, isNew: true },
      { id: "translate", title: "Translate PDF", icon: Languages, isNew: true },
    ],
  },
];

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [activeToolsCategory, setActiveToolsCategory] = useState(0);

  const { scrollY } = useScroll();
  const headerPadding = useTransform(scrollY, [0, 100], ["20px", "14px"]);

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setScrolled(latest > 50);
    });
    return () => unsubscribe();
  }, [scrollY]);

  const navItems = [
    { name: "Home", href: "/", active: true },
    { name: "PDF Tools", href: "/pdf-tools", dropdown: true },
    { name: "Contacts", href: "/contacts" },
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
  ];

  const activeCat = toolsMenu[activeToolsCategory];

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
        style={{ paddingTop: headerPadding, paddingBottom: headerPadding }}
        className="fixed top-0 left-0 w-full z-50 px-6 md:px-8 transition-all duration-500"
        onMouseLeave={() => setShowToolsMenu(false)}
      >
        {/* Scroll-based background */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: scrolled || showToolsMenu ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-[#f4f1ea]/95 backdrop-blur-xl border-b border-black/[0.08] pointer-events-none"
        />

        <div className="relative w-full flex justify-between items-center max-w-[1400px] mx-auto">
          {/* ================= LEFT: LOGO ================= */}
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg
                viewBox="0 0 40 40"
                className="absolute inset-0 w-full h-full text-black"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
              >
                <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" />
              </svg>
              <span
                className="relative z-10 text-[13px] font-semibold text-[#ff6a00] italic"
                style={{ fontFamily: "Georgia, serif" }}
              >
                ID
              </span>
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-baseline">
                <span className="text-[15px] font-semibold tracking-tight text-black">idcardtools</span>
              </div>
              <span className="text-[7.5px] font-mono uppercase tracking-[0.22em] text-black/40 mt-1">Secure · Innovate · Succeed</span>
            </div>
          </Link>

          {/* ================= CENTER: NAVIGATION ================= */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => {
                  if (item.dropdown) setShowToolsMenu(true);
                  else setShowToolsMenu(false);
                }}
              >
                <Link
                  href={item.href}
                  className={`relative flex items-center gap-1 text-[13px] font-medium tracking-tight transition-colors pb-1 ${item.active ? "text-black" : "text-black/55 hover:text-black"}`}
                >
                  {item.name}
                  {item.dropdown && (
                    <ChevronDown
                      size={12}
                      className={`mt-0.5 transition-all duration-300 ${showToolsMenu ? "rotate-180 opacity-100 text-[#ff6a00]" : "opacity-50"}`}
                    />
                  )}
                  {item.active && <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-[#ff6a00]" />}
                  {!item.active && <span className={`absolute -bottom-0.5 left-0 right-0 h-px bg-black/40 origin-left transition-transform duration-300 ease-out ${showToolsMenu && item.dropdown ? "scale-x-100 bg-[#ff6a00]" : "scale-x-0 group-hover:scale-x-100"}`} />}
                </Link>
              </div>
            ))}
          </nav>

          {/* ================= RIGHT: ACTIONS ================= */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-black/[0.12] hover:border-black hover:bg-black hover:text-white text-black transition-all duration-300 group">
              <Search
                size={14}
                className="transition-transform group-hover:scale-110"
              />
            </button>

            <Link
              href="/auth/login"
              className="hidden md:inline-flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full bg-black text-white text-[12px] font-medium tracking-tight hover:bg-[#ff6a00] transition-colors duration-300 group"
            >
              Login / Sign Up
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <User2 size={11} />
              </span>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full border border-black/[0.12] text-black hover:bg-black hover:text-white transition-all duration-300"
              aria-label="Menu"
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={16} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={16} />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showToolsMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              className="hidden lg:block absolute left-0 right-0 top-full"
              onMouseEnter={() => setShowToolsMenu(true)}
            >
              <div className="max-w-[1400px] mx-auto px-8 pt-4">
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
                  className="bg-[#f4f1ea] border border-black/[0.08] rounded-[22px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden"
                >
                  <div className="grid grid-cols-12">
                    {/* ==================== LEFT: CATEGORY LIST ==================== */}
                    <div className="col-span-4 bg-white border-r border-black/[0.06] py-4 relative">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 }}
                        className="px-6 pb-3 mb-1 border-b border-black/[0.06]"
                      >
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Categories</div>
                      </motion.div>

                      {toolsMenu.map((cat, i) => {
                        const isActive = activeToolsCategory === i;
                        return (
                          <motion.div
                            key={cat.slug}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{
                              delay: 0.08 + i * 0.05,
                              duration: 0.4,
                              ease: [0.22, 1, 0.36, 1] as const,
                            }}
                            onMouseEnter={() => setActiveToolsCategory(i)}
                            className={`relative px-6 py-3 cursor-pointer transition-all duration-300 ${isActive ? "bg-[#f4f1ea]" : "hover:bg-black/[0.02]"}`}
                          >
                            {/* Active left bar */}
                            {isActive && (
                              <motion.div
                                layoutId="activeCategoryBar"
                                className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#ff6a00]"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}

                            <div className="flex items-start gap-3">
                              {/* Dot with pulse effect on active */}
                              <motion.div
                                animate={{
                                  scale: isActive ? 1.6 : 1,
                                  boxShadow: isActive ? `0 0 0 4px ${cat.color}20, 0 0 12px ${cat.color}60` : "0 0 0 0px transparent, 0 0 0px transparent",
                                }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
                                className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <motion.span
                                    animate={{
                                      x: isActive ? 2 : 0,
                                      color: isActive ? "#ff6a00" : "#0a0a0a",
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[14px]"
                                    style={{ fontFamily: isActive ? "Georgia, serif" : "inherit" }}
                                  >
                                    {cat.name}
                                  </motion.span>

                                  {/* Count badge with animated bg */}
                                  <motion.span
                                    animate={{
                                      backgroundColor: isActive ? `${cat.color}15` : "rgba(0,0,0,0)",
                                      color: isActive ? cat.color : "rgba(0,0,0,0.3)",
                                    }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[10px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full"
                                  >
                                    {String(cat.tools.length).padStart(2, "0")}
                                  </motion.span>
                                </div>

                                <motion.p
                                  animate={{
                                    opacity: isActive ? 1 : 0.55,
                                    height: isActive ? "auto" : 16,
                                  }}
                                  transition={{ duration: 0.3 }}
                                  className="text-[11px] text-black/45 mt-0.5 truncate"
                                >
                                  {cat.desc}
                                </motion.p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* ==================== RIGHT: TOOLS OF ACTIVE CATEGORY ==================== */}
                    <div className="col-span-8 p-6 relative overflow-hidden">
                      {/* Animated background aura (changes color with category) */}
                      <motion.div
                        key={`aura-${activeToolsCategory}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.4, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                        className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none"
                        style={{ backgroundColor: activeCat.color }}
                      />

                      {/* Header — animated on category change */}
                      <motion.div
                        key={`header-${activeToolsCategory}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
                        className="relative flex items-center justify-between mb-5 pb-4 border-b border-black/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          {/* Big colored dot with ping effect */}
                          <div className="relative">
                            <div
                              className="w-2 h-2 rounded-full relative z-10"
                              style={{ backgroundColor: activeCat.color }}
                            />
                            <motion.div
                              key={`ping-${activeToolsCategory}`}
                              initial={{ scale: 0.8, opacity: 0.8 }}
                              animate={{ scale: 2.5, opacity: 0 }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: activeCat.color }}
                            />
                          </div>

                          <span
                            className="text-[15px] text-black"
                            style={{ fontFamily: "Georgia, serif" }}
                          >
                            {activeCat.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">· {activeCat.tools.length} tools</span>
                        </div>
                        <Link
                          href={`/pdf-tools?category=${activeCat.slug}`}
                          className="group inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-[#ff6a00] transition-colors"
                        >
                          View all
                          <ArrowUpRight
                            size={11}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </Link>
                      </motion.div>

                      {/* Tools grid — staggered entry */}
                      <div className="relative">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeToolsCategory}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: {
                                  staggerChildren: 0.04,
                                  delayChildren: 0.05,
                                },
                              },
                              exit: { opacity: 0 },
                            }}
                            className="grid grid-cols-2 gap-1"
                          >
                            {activeCat.tools.map((tool, idx) => {
                              const Icon = tool.icon;
                              return (
                                <motion.div
                                  key={tool.id}
                                  variants={{
                                    hidden: { opacity: 0, y: 15, scale: 0.95 },
                                    visible: {
                                      opacity: 1,
                                      y: 0,
                                      scale: 1,
                                      transition: {
                                        duration: 0.4,
                                        ease: [0.22, 1, 0.36, 1] as const,
                                      },
                                    },
                                    exit: {
                                      opacity: 0,
                                      y: -10,
                                      transition: { duration: 0.15 },
                                    },
                                  }}
                                >
                                  <Link
                                    href={
                                      tool.id === "crop" || tool.id === "ai-summarizer"
                                        ? "/pdf-tools"
                                        : `/pdf-tools/${tool.id}`
                                    }
                                    className="group/tool flex items-center gap-3 p-3 rounded-[12px] hover:bg-white transition-all duration-300 relative overflow-hidden"
                                  >
                                    {/* Slide-in accent on hover */}
                                    <motion.div
                                      initial={false}
                                      className="absolute inset-0 rounded-[12px] opacity-0 group-hover/tool:opacity-100 transition-opacity duration-300 pointer-events-none"
                                      style={{
                                        background: `linear-gradient(90deg, ${activeCat.color}08 0%, transparent 60%)`,
                                      }}
                                    />

                                    {/* Icon box with rotate on hover */}
                                    <motion.div
                                      whileHover={{ rotate: -6, scale: 1.05 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                      className="relative z-10 w-9 h-9 rounded-[10px] bg-white group-hover/tool:bg-[#ff6a00] flex items-center justify-center transition-all duration-300 shrink-0"
                                      style={{
                                        boxShadow: `0 0 0 0px ${activeCat.color}40`,
                                      }}
                                    >
                                      <Icon
                                        size={15}
                                        strokeWidth={1.75}
                                        className="text-black/70 group-hover/tool:text-white transition-colors duration-300"
                                      />
                                    </motion.div>

                                    <div className="relative z-10 flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[13px] text-black group-hover/tool:text-[#ff6a00] transition-colors truncate">{tool.title}</span>
                                        {tool.isNew && (
                                          <motion.span
                                            animate={{
                                              rotate: [0, 8, -8, 0],
                                              scale: [1, 1.15, 1],
                                            }}
                                            transition={{
                                              duration: 1.5,
                                              repeat: Infinity,
                                              ease: "easeInOut",
                                            }}
                                            className="shrink-0 flex items-center"
                                          >
                                            <Sparkles
                                              size={10}
                                              className="text-[#ff6a00]"
                                            />
                                          </motion.span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Arrow slides in from right on hover */}
                                    <motion.div
                                      initial={{ opacity: 0, x: -4 }}
                                      whileHover={{ opacity: 1, x: 0 }}
                                      className="relative z-10 opacity-0 group-hover/tool:opacity-100 transition-opacity duration-300 shrink-0"
                                    >
                                      <ArrowUpRight
                                        size={12}
                                        className="text-[#ff6a00] group-hover/tool:translate-x-0.5 transition-transform"
                                      />
                                    </motion.div>
                                  </Link>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Progress indicator — how many tools visible */}
                      <motion.div
                        key={`progress-${activeToolsCategory}`}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                        className="relative mt-4 pt-4 border-t border-black/[0.06] flex items-center justify-between"
                      >
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          {activeCat.tools.length} tools in {activeCat.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {toolsMenu.map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{
                                width: i === activeToolsCategory ? 16 : 6,
                                backgroundColor: i === activeToolsCategory ? activeCat.color : "rgba(0,0,0,0.15)",
                              }}
                              transition={{ duration: 0.3 }}
                              className="h-1 rounded-full"
                            />
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* ==================== BOTTOM STRIP ==================== */}
                  <div className="border-t border-black/[0.06] bg-white px-6 py-3 flex items-center justify-between overflow-hidden">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="flex items-center gap-3"
                    >
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-6 h-6 rounded-full bg-[#ff6a00]/10 border border-[#ff6a00]/20 flex items-center justify-center"
                      >
                        <Sparkles
                          size={10}
                          className="text-[#ff6a00]"
                        />
                      </motion.div>
                      <span className="text-[11px] text-black/60">
                        <span className="font-medium text-black">New:</span> AI Summarizer can now handle 500-page PDFs
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45, duration: 0.5 }}
                    >
                      <Link
                        href="/pdf-tools"
                        className="group inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black hover:text-[#ff6a00] transition-colors"
                      >
                        Try it
                        <ArrowUpRight
                          size={11}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ================= MEGA DROPDOWN MENU ================= */}
        <AnimatePresence>
          {showToolsMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              className="hidden lg:block absolute left-0 right-0 top-full"
              onMouseEnter={() => setShowToolsMenu(true)}
            >
              <div className="max-w-[1400px] mx-auto px-8 pt-4">
                <div className="bg-[#f4f1ea] border border-black/[0.08] rounded-[22px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
                  <div className="grid grid-cols-12">
                    {/* LEFT: CATEGORY LIST */}
                    <div className="col-span-4 bg-white border-r border-black/[0.06] py-4">
                      <div className="px-6 pb-3 mb-1 border-b border-black/[0.06]">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Categories</div>
                      </div>

                      {toolsMenu.map((cat, i) => {
                        const isActive = activeToolsCategory === i;
                        return (
                          <div
                            key={cat.slug}
                            onMouseEnter={() => setActiveToolsCategory(i)}
                            className={`relative px-6 py-3 cursor-pointer transition-colors duration-200 ${isActive ? "bg-[#f4f1ea]" : "hover:bg-black/[0.02]"}`}
                          >
                            {/* Active indicator */}
                            {isActive && (
                              <motion.div
                                layoutId="activeCategory"
                                className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#ff6a00]"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}

                            <div className="flex items-start gap-3">
                              <div
                                className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 transition-transform duration-300"
                                style={{
                                  backgroundColor: cat.color,
                                  transform: isActive ? "scale(1.5)" : "scale(1)",
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`text-[14px] transition-colors ${isActive ? "text-[#ff6a00]" : "text-black"}`}
                                    style={{ fontFamily: isActive ? "Georgia, serif" : "inherit" }}
                                  >
                                    {cat.name}
                                  </span>
                                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/30">{String(cat.tools.length).padStart(2, "0")}</span>
                                </div>
                                <p className="text-[11px] text-black/45 mt-0.5 truncate">{cat.desc}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* RIGHT: TOOLS OF ACTIVE CATEGORY */}
                    <div className="col-span-8 p-6">
                      <div className="flex items-center justify-between mb-5 pb-4 border-b border-black/[0.06]">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: activeCat.color }}
                          />
                          <span
                            className="text-[15px] text-black"
                            style={{ fontFamily: "Georgia, serif" }}
                          >
                            {activeCat.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">· {activeCat.tools.length} tools</span>
                        </div>
                        <Link
                          href={`/pdf-tools?category=${activeCat.slug}`}
                          className="group inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-[#ff6a00] transition-colors"
                        >
                          View all
                          <ArrowUpRight
                            size={11}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </Link>
                      </div>

                      {/* Tools grid */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeToolsCategory}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
                          className="grid grid-cols-2 gap-1"
                        >
                          {activeCat.tools.map((tool) => {
                            const Icon = tool.icon;
                            return (
                              <Link
                                key={tool.id}
                                href={
                                  tool.id === "crop" || tool.id === "ai-summarizer"
                                    ? "/pdf-tools"
                                    : `/pdf-tools/${tool.id}`
                                }
                                className="group/tool flex items-center gap-3 p-3 rounded-[12px] hover:bg-white transition-colors duration-200"
                              >
                                <div className="w-9 h-9 rounded-[10px] bg-white group-hover/tool:bg-[#ff6a00] flex items-center justify-center transition-all duration-300 shrink-0">
                                  <Icon
                                    size={15}
                                    strokeWidth={1.75}
                                    className="text-black/70 group-hover/tool:text-white transition-colors"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] text-black group-hover/tool:text-[#ff6a00] transition-colors truncate">{tool.title}</span>
                                    {tool.isNew && (
                                      <Sparkles
                                        size={10}
                                        className="text-[#ff6a00] shrink-0"
                                      />
                                    )}
                                  </div>
                                </div>
                                <ArrowUpRight
                                  size={12}
                                  className="text-black/20 group-hover/tool:text-[#ff6a00] group-hover/tool:translate-x-0.5 transition-all shrink-0"
                                />
                              </Link>
                            );
                          })}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Bottom strip — featured tool */}
                  <div className="border-t border-black/[0.06] bg-white px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#ff6a00]/10 border border-[#ff6a00]/20 flex items-center justify-center">
                        <Sparkles
                          size={10}
                          className="text-[#ff6a00]"
                        />
                      </div>
                      <span className="text-[11px] text-black/60">
                        <span className="font-medium text-black">New:</span> AI Summarizer can now handle 500-page PDFs
                      </span>
                    </div>
                    <Link
                      href="/pdf-tools"
                      className="group inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black hover:text-[#ff6a00] transition-colors"
                    >
                      Try it
                      <ArrowUpRight
                        size={11}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ================= MOBILE MENU ================= */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed top-0 right-0 h-full w-[85%] max-w-sm bg-[#f4f1ea] z-50 lg:hidden border-l border-black/[0.1] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.08]">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-black/[0.12] text-black hover:bg-black hover:text-white transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              <nav className="flex flex-col px-6 pt-8">
                {navItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] as const }}
                    className="border-b border-black/[0.08]"
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between py-4 transition-colors ${item.active ? "text-[#ff6a00]" : "text-black hover:text-[#ff6a00]"}`}
                    >
                      <span
                        className="text-2xl font-normal tracking-tight"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/30">0{index + 1}</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-8 px-6 pb-8">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">Get in touch</div>
                <a
                  href="mailto:hello@idcardtools.com"
                  className="block text-lg tracking-tight text-black hover:text-[#ff6a00] transition-colors"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  hello@idcardtools.com
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
