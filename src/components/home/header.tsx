"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Search, ChevronDown, Menu, X, ArrowUpRight, User2, Layers, Scissors, RotateCw, LayoutList, FileText, Crop, Minimize, Wrench, ScanText, FileInput, FileOutput, Presentation, FileSpreadsheet, Image as ImageIcon, FileCode2, Edit3, PenTool, Stamp, Lock, Unlock, EyeOff, ShieldAlert, Languages, Sparkles, LucideCreditCardReader, ImageDown, ImageUp, Eraser, Expand, Palette, Scaling, UserRound, Circle, type LucideIcon, Grid3x3 } from "lucide-react";

type MenuTool = {
  id: string;
  title: string;
  icon: LucideIcon;
  desc?: string;
  isNew?: boolean;
};

type MenuCategory = {
  name: string;
  slug: string;
  group: "pdf" | "image";
  desc: string;
  color: string;
  tools: MenuTool[];
};

// --- CATEGORIES WITH TOOLS ---
const toolsMenu: MenuCategory[] = [
  // ===================== PDF GROUPS =====================
  {
    name: "Organize PDF",
    slug: "organize",
    group: "pdf",
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
    group: "pdf",
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
    group: "pdf",
    desc: "To and from any format",
    color: "#3b82f6",
    tools: [
      { id: "pdf-word", title: "PDF to Word", icon: FileOutput },
      { id: "pdf-to-powerpoint", title: "PDF to PowerPoint", icon: Presentation },
      { id: "pdf-to-excel", title: "PDF to Excel", icon: FileSpreadsheet },
      { id: "pdf-jpg", title: "PDF to JPG", icon: ImageIcon },
      { id: "word-pdf", title: "Word to PDF", icon: FileText },
      { id: "jpg-pdf", title: "JPG to PDF", icon: ImageIcon },
      { id: "html-pdf", title: "HTML to PDF", icon: FileCode2 },
      { id: "pdf-md", title: "PDF to Markdown", icon: FileCode2, isNew: true },
    ],
  },
  {
    name: "Edit PDF",
    slug: "edit",
    group: "pdf",
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
    group: "pdf",
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
    group: "pdf",
    desc: "Compare and translate PDF documents",
    color: "#ec4899",
    tools: [
      { id: "compare", title: "Compare PDF", icon: ShieldAlert },
      { id: "translate", title: "Translate PDF", icon: Languages, isNew: true },
    ],
  },

  // ===================== IMAGE GROUPS =====================
  {
    name: "AI Image",
    slug: "image-ai",
    group: "image",
    desc: "Generate, enhance, and remove with AI",
    color: "#8b5cf6",
    tools: [
      { id: "bg-remove", title: "Remove Background", icon: Eraser, desc: "Instantly detect and cut out backgrounds.", isNew: true },
      { id: "upscale-image", title: "Upscale Image", icon: Expand, desc: "Enlarge images without quality loss.", isNew: true },
      { id: "colorize-photo", title: "Colorize Photo", icon: Palette, desc: "Add colour to black & white photos." },
    ],
  },
  {
    name: "Convert Image",
    slug: "image-convert",
    group: "image",
    desc: "Convert to and from any image format",
    color: "#3b82f6",
    tools: [
      { id: "convert-to-jpg", title: "Convert to JPG", icon: ImageDown, desc: "PNG, GIF, TIF, PSD, SVG, WEBP, HEIC, RAW → JPG." },
      { id: "convert-from-jpg", title: "Convert from JPG", icon: ImageUp, desc: "JPG → PNG, GIF, or animated GIF." },
      { id: "heic-to-jpg", title: "HEIC to JPG", icon: ImageDown, desc: "Convert iPhone HEIC images to JPG." },
      { id: "heic-to-png", title: "HEIC to PNG", icon: ImageUp, desc: "Convert iPhone HEIC images to PNG." },
      { id: "webp-to-jpg", title: "WebP to JPG", icon: ImageDown, desc: "Upload WebP and download as JPG." },
      { id: "webp-to-png", title: "WEBP to PNG", icon: ImageUp, desc: "Convert a WEBP image to PNG online." },
      { id: "png-to-jpg", title: "PNG to JPG", icon: ImageDown, desc: "Convert a PNG image to JPG online." },
      { id: "jpg-to-png", title: "JPG to PNG", icon: ImageUp, desc: "Convert a JPG image to PNG online." },
      { id: "png-to-webp", title: "PNG to WEBP", icon: ImageUp, desc: "Convert a PNG image to WEBP online." },
      { id: "jpg-to-webp", title: "JPG to WEBP", icon: ImageUp, desc: "Convert a JPG image to WEBP online." },
      { id: "png-to-svg", title: "PNG to SVG", icon: FileCode2, desc: "Convert a PNG image to SVG online." },
      { id: "jpg-to-svg", title: "JPG to SVG", icon: FileCode2, desc: "Convert a JPG image to SVG online." },
      { id: "svg-to-png", title: "SVG to PNG", icon: ImageUp, desc: "Convert an SVG image to PNG free." },
      { id: "jpg-to-gif", title: "JPG to GIF", icon: ImageUp, desc: "Convert a JPG image to GIF online." },
    ],
  },
  {
    name: "Optimize Image",
    slug: "image-optimize",
    group: "image",
    desc: "Compress, resize, crop, and rotate",
    color: "#10b981",
    tools: [
      { id: "compress-image", title: "Compress IMAGE", icon: Minimize, desc: "Compress JPG, PNG, SVG, and GIFs while saving space." },
      { id: "resize-image", title: "Resize IMAGE", icon: Scaling, desc: "Resize by percent or pixel." },
      { id: "crop-image", title: "Crop IMAGE", icon: Crop, desc: "Crop with pixel or visual editor." },
      { id: "rotate-image", title: "Rotate IMAGE", icon: RotateCw, desc: "Rotate many JPG, PNG or GIF at once." },
      { id: "pixelate-image", title: "Pixelate Image", icon: Grid3x3, desc: "Pixelate any part of your photo." },
      { id: "html-to-image", title: "HTML to IMAGE", icon: FileCode2, desc: "Convert webpages in HTML to JPG or SVG." },
    ],
  },
  {
    name: "Edit Image",
    slug: "image-edit",
    group: "image",
    desc: "Edit, style, and compose images",
    color: "#f59e0b",
    tools: [
      { id: "photo-editor", title: "Photo Editor", icon: Palette, desc: "Add text, effects, frames or stickers." },
      { id: "combine-images", title: "Combine Images", icon: Layers, desc: "Combine multiple images online." },
      { id: "image-splitter", title: "Image Splitter", icon: Grid3x3, desc: "Cut an image into pieces." },
      { id: "make-round-image", title: "Make Round Image", icon: Circle, desc: "Make any image round in one click." },
      { id: "profile-photo-maker", title: "Profile Photo Maker", icon: UserRound, desc: "Create a round profile photo." },
      { id: "watermark-image", title: "Watermark IMAGE", icon: Stamp, desc: "Stamp text/image with position control." },
    ],
  },

];

// --- HELPERS ---
const getToolHref = (tool: { id: string }, category: { slug: string; group: string }) => {
  if (category.group === "image") return `/image-tools/${tool.id}`;
  if (tool.id === "crop" || tool.id === "ai-summarizer") return "/pdf-tools";
  return `/pdf-tools/${tool.id}`;
};

const getCategoryHref = (category: { slug: string; group: string }) => {
  if (category.group === "image") return `/image-tools?category=${category.slug}`;
  return `/pdf-tools?category=${category.slug}`;
};

export const Header = () => {
  const pathname = usePathname();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [activeMenuGroup, setActiveMenuGroup] = useState<"pdf" | "image">("pdf");
  const [activeToolsCategory, setActiveToolsCategory] = useState<string>("organize");

  const headerRef = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollY } = useScroll();
  const headerPadding = useTransform(scrollY, [0, 100], ["20px", "14px"]);

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setScrolled(latest > 50);
    });
    return () => unsubscribe();
  }, [scrollY]);

  /* ------------------------------------------------------------------ */
  /* HOVER HELPERS                                                       */
  /* ------------------------------------------------------------------ */
  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openToolsMenu = (group: "pdf" | "image", category: string) => {
    clearCloseTimer();
    setActiveMenuGroup(group);
    setActiveToolsCategory(category);
    setShowToolsMenu(true);
  };

  const closeToolsMenu = (delay = 0) => {
    clearCloseTimer();
    if (delay <= 0) {
      setShowToolsMenu(false);
      return;
    }
    closeTimer.current = setTimeout(() => {
      setShowToolsMenu(false);
      closeTimer.current = null;
    }, delay);
  };

  // cleanup timer on unmount
  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  // close dropdown when clicking anywhere outside the header
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  // close everything on route change
  useEffect(() => {
    setShowToolsMenu(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  /* ------------------------------------------------------------------ */
  /* NAV ITEMS + ACTIVE STATE (pathname based)                           */
  /* ------------------------------------------------------------------ */
  const navItems = [
    { name: "Home", href: "/" },
    {
      name: "PDF Tools",
      href: "/pdf-tools",
      dropdown: true,
      group: "pdf" as const,
      defaultCategory: "organize",
    },
    {
      name: "Image Tools",
      href: "/image-tools",
      dropdown: true,
      group: "image" as const,
      defaultCategory: "image-ai",
    },
    { name: "Contacts", href: "/contacts" },
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
  ].map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`) || pathname.startsWith(`${item.href}?`);

    return { ...item, active };
  });

  // Filter categories by active group
  const visibleCategories = toolsMenu.filter((cat) => cat.group === activeMenuGroup);

  const activeCat = toolsMenu.find((c) => c.slug === activeToolsCategory) ?? visibleCategories[0];

  const isMediaGroup = activeMenuGroup === "image";

  const groupLabel = activeMenuGroup === "image" ? "Image Categories" : "PDF Categories";

  return (
    <>
      <motion.header
        ref={headerRef}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
        style={{ paddingTop: headerPadding, paddingBottom: headerPadding }}
        className="fixed top-0 left-0 w-full z-50 px-6 md:px-8 transition-all duration-500"
        onMouseLeave={() => closeToolsMenu(120)}
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
            onMouseEnter={() => closeToolsMenu(0)}
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
            {navItems.map((item) => {
              const isDropdownOpen = showToolsMenu && item.dropdown && item.group === activeMenuGroup;

              return (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => {
                    if (item.dropdown && item.group) {
                      openToolsMenu(item.group, item.defaultCategory!);
                    } else {
                      closeToolsMenu(0);
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => closeToolsMenu(0)}
                    className={`group relative flex items-center gap-1 text-[13px] font-medium tracking-tight transition-colors pb-1 ${item.active ? "text-black" : "text-black/55 hover:text-black"}`}
                  >
                    {item.name}
                    {item.dropdown && (
                      <ChevronDown
                        size={12}
                        className={`mt-0.5 transition-all duration-300 ${isDropdownOpen ? "rotate-180 opacity-100 text-[#ff6a00]" : "opacity-50"}`}
                      />
                    )}

                    {/* single underline: active OR dropdown-open OR hover */}
                    <span className={`absolute -bottom-0.5 left-0 right-0 h-px origin-left transition-transform duration-300 ease-out ${item.active || isDropdownOpen ? "scale-x-100 bg-[#ff6a00]" : "scale-x-0 bg-black/40 group-hover:scale-x-100"}`} />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* ================= RIGHT: ACTIONS ================= */}
          <div
            className="flex items-center gap-3"
            onMouseEnter={() => closeToolsMenu(0)}
          >
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

        {/* ================= MEGA DROPDOWN MENU ================= */}
        <AnimatePresence>
          {showToolsMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              className="hidden lg:block absolute left-0 right-0 top-full"
            >
              {/*
                This wrapper is the actual hover zone.
                Leaving it (side / bottom / anywhere) => close after a small delay.
                Re-entering it (or the nav item) => cancel the pending close.
              */}
              <div
                className="max-w-[1400px] mx-auto px-8 pt-4"
                onMouseEnter={clearCloseTimer}
                onMouseLeave={() => closeToolsMenu(120)}
                onClick={() => closeToolsMenu(0)}
              >
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
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">{groupLabel}</div>
                      </motion.div>

                      {visibleCategories.map((cat, i) => {
                        const isActive = activeCat.slug === cat.slug;
                        return (
                          <motion.div
                            key={`${activeMenuGroup}-${cat.slug}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{
                              delay: 0.08 + i * 0.04,
                              duration: 0.4,
                              ease: [0.22, 1, 0.36, 1] as const,
                            }}
                            onMouseEnter={() => setActiveToolsCategory(cat.slug)}
                            className={`relative px-6 py-3 cursor-pointer transition-all duration-300 ${isActive ? "bg-[#f4f1ea]" : "hover:bg-black/[0.02]"}`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId={`activeCategoryBar-${activeMenuGroup}`}
                                className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#ff6a00]"
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 30,
                                }}
                              />
                            )}

                            <div className="flex items-start gap-3">
                              <motion.div
                                animate={{
                                  scale: isActive ? 1.6 : 1,
                                  boxShadow: isActive ? `0 0 0 4px ${cat.color}20, 0 0 12px ${cat.color}60` : "0 0 0 0px transparent, 0 0 0px transparent",
                                }}
                                transition={{
                                  duration: 0.35,
                                  ease: [0.22, 1, 0.36, 1] as const,
                                }}
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
                                    style={{
                                      fontFamily: isActive ? "Georgia, serif" : "inherit",
                                    }}
                                  >
                                    {cat.name}
                                  </motion.span>

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
                      <motion.div
                        key={`aura-${activeCat.slug}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.4, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.6,
                          ease: [0.22, 1, 0.36, 1] as const,
                        }}
                        className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none"
                        style={{ backgroundColor: activeCat.color }}
                      />

                      {/* Header */}
                      <motion.div
                        key={`header-${activeCat.slug}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          ease: [0.22, 1, 0.36, 1] as const,
                        }}
                        className="relative flex items-center justify-between mb-5 pb-4 border-b border-black/[0.06]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div
                              className="w-2 h-2 rounded-full relative z-10"
                              style={{ backgroundColor: activeCat.color }}
                            />
                            <motion.div
                              key={`ping-${activeCat.slug}`}
                              initial={{ scale: 0.8, opacity: 0.8 }}
                              animate={{ scale: 2.5, opacity: 0 }}
                              transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeOut",
                              }}
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
                          href={getCategoryHref(activeCat)}
                          className="group inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-[#ff6a00] transition-colors"
                        >
                          View all
                          <ArrowUpRight
                            size={11}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </Link>
                      </motion.div>

                      {/* Tools grid */}
                      <div className="relative">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeCat.slug}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: {
                                  staggerChildren: 0.03,
                                  delayChildren: 0.05,
                                },
                              },
                              exit: { opacity: 0 },
                            }}
                            className={`grid gap-1 pr-1 ${isMediaGroup ? "grid-cols-1 md:grid-cols-2 max-h-[58vh] overflow-y-auto image-tools-scroll" : "grid-cols-2"}`}
                          >
                            {activeCat.tools.map((tool) => {
                              const Icon = tool.icon;
                              const hasDesc = "desc" in tool && tool.desc;
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
                                        duration: 0.35,
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
                                    href={getToolHref(tool, activeCat)}
                                    title={hasDesc ? tool.desc : tool.title}
                                    className={`group/tool flex ${hasDesc ? "items-start" : "items-center"} gap-3 p-3 rounded-[12px] hover:bg-white transition-all duration-300 relative overflow-hidden`}
                                  >
                                    <motion.div
                                      initial={false}
                                      className="absolute inset-0 rounded-[12px] opacity-0 group-hover/tool:opacity-100 transition-opacity duration-300 pointer-events-none"
                                      style={{
                                        background: `linear-gradient(90deg, ${activeCat.color}08 0%, transparent 60%)`,
                                      }}
                                    />

                                    <motion.div
                                      whileHover={{ rotate: -6, scale: 1.05 }}
                                      transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 20,
                                      }}
                                      className="relative z-10 w-9 h-9 rounded-[10px] bg-white group-hover/tool:bg-[#ff6a00] flex items-center justify-center transition-all duration-300 shrink-0"
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
                                        {"isNew" in tool && tool.isNew && (
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
                                      {hasDesc && <p className="text-[10.5px] leading-tight text-black/45 group-hover/tool:text-black/65 transition-colors mt-0.5 line-clamp-2">{tool.desc}</p>}
                                    </div>

                                    <motion.div
                                      initial={{ opacity: 0, x: -4 }}
                                      whileHover={{ opacity: 1, x: 0 }}
                                      className={`relative z-10 opacity-0 group-hover/tool:opacity-100 transition-opacity duration-300 shrink-0 ${hasDesc ? "mt-1" : ""}`}
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

                      {/* Progress indicator */}
                      <motion.div
                        key={`progress-${activeCat.slug}`}
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{
                          duration: 0.6,
                          ease: [0.22, 1, 0.36, 1] as const,
                        }}
                        className="relative mt-4 pt-4 border-t border-black/[0.06] flex items-center justify-between"
                      >
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          {activeCat.tools.length} tools in {activeCat.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {visibleCategories.map((cat) => (
                            <motion.div
                              key={cat.slug}
                              animate={{
                                width: cat.slug === activeCat.slug ? 16 : 6,
                                backgroundColor: cat.slug === activeCat.slug ? activeCat.color : "rgba(0,0,0,0.15)",
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
                        animate={{ rotate: [0, 360] }}
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
                        <span className="font-medium text-black">New:</span> {activeMenuGroup === "image" ? "Image Tools ab 5 categories me organized hain" : "PDF to JPG and AI Summarizer now available"}
                      </span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45, duration: 0.5 }}
                    >
                      <Link
                        href={activeMenuGroup === "image" ? "/image-tools" : "/pdf-tools"}
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
      </motion.header>

      {/* Custom scrollbar for media tools list */}
      <style
        jsx
        global
      >{`
        .image-tools-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .image-tools-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .image-tools-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.12);
          border-radius: 999px;
        }
        .image-tools-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 106, 0, 0.4);
        }
      `}</style>

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
                    transition={{
                      delay: 0.1 + index * 0.06,
                      ease: [0.22, 1, 0.36, 1] as const,
                    }}
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
                  href="mailto:info@idcardtools.com"
                  className="block text-lg tracking-tight text-black hover:text-[#ff6a00] transition-colors"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  info@idcardtools.com
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
