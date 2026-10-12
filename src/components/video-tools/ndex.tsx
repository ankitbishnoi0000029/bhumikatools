"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ArrowUpRight,
  Sparkles,
  X,
  Wand2,
  Zap,
  Shield,
  Infinity as InfinityIcon,
  Minimize,
  Scaling,
  Crop,
  RotateCw,
  Grid3x3,
  FileCode2,
  Palette,
  Type,
  Square,
  Plus,
  Contrast,
  Layers,
  LayoutGrid,
  Circle,
  UserRound,
  Smile,
  Stamp,
  Eraser,
  Trash2,
  UserMinus,
  Expand,
  Focus,
  Languages,
  ScanFace,
  ImageDown,
  ImageUp,
  Film,
  Video,
  Scissors,
  Merge,
  Subtitles,
  Volume2,
  VolumeX,
  Music,
  Mic,
  Maximize,
  Gauge,
  Timer,
  Clapperboard,
  MonitorPlay,
  FastForward,
  Rewind,
  Captions,
  FileVideo,
  FileAudio,
  Play,
  Pause,
  type LucideIcon,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Tool = {
  id: string;
  title: string;
  icon: LucideIcon;
  desc?: string;
  isNew?: boolean;
};

type Category = {
  name: string;
  slug: string;
  desc: string;
  tools: Tool[];
};

// ============================================================
// DATA
// ============================================================
const videoCategories: Category[] = [
  {
    name: "AI Video",
    slug: "video-ai",
    desc: "Generate, enhance, and remove with AI",
    tools: [
      { id: "remove-video-background", title: "Remove Video Background", icon: Eraser, desc: "Instantly cut out backgrounds from video.", isNew: true },
      { id: "upscale-video", title: "Upscale Video", icon: Expand, desc: "Enlarge videos without quality loss.", isNew: true },
      { id: "stabilize-video", title: "Stabilize Video", icon: Focus, desc: "Smooth out shaky footage automatically." },
      { id: "colorize-video", title: "Colorize Video", icon: Palette, desc: "Add colour to black & white videos." },
      { id: "remove-objects-video", title: "Remove Objects from Video", icon: Trash2, desc: "Erase unwanted objects from video." },
      { id: "generate-video", title: "AI Video Generator", icon: Sparkles, desc: "Generate video from text prompts.", isNew: true },
    ],
  },
  {
    name: "Convert Video",
    slug: "video-convert",
    desc: "Convert to and from any video format",
    tools: [
      { id: "video-to-mp4", title: "Convert to MP4", icon: FileVideo, desc: "Convert any video format to MP4." },
      { id: "video-to-webm", title: "Convert to WebM", icon: FileVideo, desc: "Convert video to WebM for the web." },
      { id: "video-to-gif", title: "Video to GIF", icon: Film, desc: "Turn any video clip into an animated GIF." },
      { id: "video-to-mov", title: "Convert to MOV", icon: FileVideo, desc: "Convert videos to QuickTime MOV." },
      { id: "mp4-to-avi", title: "MP4 to AVI", icon: FileVideo, desc: "Convert MP4 videos to AVI format." },
      { id: "gif-to-video", title: "GIF to Video", icon: Film, desc: "Convert animated GIFs to video files." },
      { id: "extract-audio", title: "Extract Audio", icon: Music, desc: "Extract audio track from any video." },
      { id: "video-to-mp3", title: "Video to MP3", icon: FileAudio, desc: "Convert video to MP3 audio." },
    ],
  },
  {
    name: "Optimize Video",
    slug: "video-optimize",
    desc: "Compress, resize, crop, and rotate",
    tools: [
      { id: "compress-video", title: "Compress Video", icon: Minimize, desc: "Reduce video file size while keeping quality." },
      { id: "resize-video", title: "Resize Video", icon: Scaling, desc: "Resize video by percent or pixel." },
      { id: "crop-video", title: "Crop Video", icon: Crop, desc: "Crop video with pixel or visual editor." },
      { id: "rotate-video", title: "Rotate Video", icon: RotateCw, desc: "Rotate videos at once." },
      { id: "change-video-speed", title: "Change Video Speed", icon: Gauge, desc: "Speed up or slow down video." },
      { id: "trim-video", title: "Trim Video", icon: Scissors, desc: "Cut and trim video clips online." },
      { id: "merge-videos", title: "Merge Videos", icon: Merge, desc: "Combine multiple videos into one." },
    ],
  },
  {
    name: "Edit Video",
    slug: "video-edit",
    desc: "Edit, style, and compose videos",
    tools: [
      { id: "video-editor", title: "Video Editor", icon: Clapperboard, desc: "Add text, effects, filters or stickers." },
      { id: "add-subtitles", title: "Add Subtitles", icon: Subtitles, desc: "Add subtitles to your video easily." },
      { id: "add-text-video", title: "Add Text to Video", icon: Type, desc: "Easily add text to a video online." },
      { id: "add-watermark-video", title: "Watermark Video", icon: Stamp, desc: "Stamp text or image with position control." },
      { id: "video-loop", title: "Loop Video", icon: Rewind, desc: "Create seamless looping videos." },
      { id: "add-music-video", title: "Add Music to Video", icon: Music, desc: "Add background music to your video." },
      { id: "mute-video", title: "Mute Video", icon: VolumeX, desc: "Remove audio from video instantly." },
      { id: "change-volume", title: "Change Volume", icon: Volume2, desc: "Adjust the volume of your video." },
    ],
  },
  {
    name: "Extract and Read",
    slug: "video-extract",
    desc: "Read text and data from videos",
    tools: [
      { id: "video-to-text", title: "Video to Text", icon: Captions, desc: "Transcribe audio from video using AI.", isNew: true },
      { id: "extract-frames", title: "Extract Frames", icon: ImageUp, desc: "Extract frames from any video." },
      { id: "video-thumbnail", title: "Video Thumbnail", icon: ImageDown, desc: "Generate thumbnails from video." },
    ],
  },
];

const totalVideoTools = videoCategories.reduce((n, c) => n + c.tools.length, 0);

const FEATURED_IDS = [
  "video-to-mp4",
  "compress-video",
  "trim-video",
  "add-subtitles",
  "extract-audio",
  "video-to-text",
];

// ============================================================
// PAGE
// ============================================================
export default function VideoToolsPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [focused, setFocused] = useState(false);

  const isSearching = query.trim().length > 0;

  const filteredCategories = useMemo<Category[]>(() => {
    const q = query.trim().toLowerCase();
    return videoCategories
      .filter((cat) => (activeCategory === "all" ? true : cat.slug === activeCategory))
      .map((cat) => ({
        ...cat,
        tools: q
          ? cat.tools.filter((t) => {
              const title = t.title.toLowerCase();
              const desc = (t.desc ?? "").toLowerCase();
              return title.includes(q) || desc.includes(q);
            })
          : cat.tools,
      }))
      .filter((cat) => cat.tools.length > 0);
  }, [query, activeCategory]);

  const visibleCount = filteredCategories.reduce((n, c) => n + c.tools.length, 0);

  const featuredTools = useMemo(() => {
    const all = videoCategories.flatMap((c) =>
      c.tools.map((t) => ({ tool: t, category: c }))
    );
    return FEATURED_IDS.map((id) => all.find((x) => x.tool.id === id)).filter(
      (x): x is { tool: Tool; category: Category } => Boolean(x)
    );
  }, []);

  const activeCatObj =
    activeCategory === "all"
      ? null
      : videoCategories.find((c) => c.slug === activeCategory) ?? null;

  const headingText = isSearching
    ? `"${query}" - ${visibleCount} found`
    : activeCatObj
    ? `${activeCatObj.name} - ${activeCatObj.desc}`
    : `All video tools - ${totalVideoTools} in total`;

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-black">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-black/[0.03] blur-[110px]" />
        <div className="pointer-events-none absolute -top-20 -left-40 w-[520px] h-[520px] rounded-full bg-black/[0.03] blur-[110px]" />

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-10 pt-10">
          <nav className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-black/40 mb-10">
            <Link href="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <span className="text-black/25">/</span>
            <span className="text-black/70">Video Tools</span>
          </nav>

          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white/60 backdrop-blur-md mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
            <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">
              {totalVideoTools} tools · {videoCategories.length} categories
            </span>
          </div>

          <h1
            className="text-[46px] leading-[1.02] sm:text-[58px] md:text-[74px] md:leading-[0.98] tracking-[-0.02em] max-w-[900px]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Every video,
            <br />
            <span className="italic text-black/45">perfectly</span>{" "}
            <span className="relative inline-block">
              crafted.
              <span className="absolute left-0 right-0 -bottom-1 h-[3px] bg-[#ff6a00] rounded-full" />
            </span>
          </h1>

          <p className="mt-8 max-w-[520px] text-[15px] md:text-[16px] text-black/55 leading-relaxed">
            Compress, convert, trim, add subtitles, extract audio, generate. A
            complete studio for your videos, free and privacy-friendly.
          </p>

          {/* Search */}
          <div className="mt-10 max-w-[560px]">
            <div
              className={`relative flex items-center h-14 rounded-2xl bg-white transition-all duration-300 ${
                focused
                  ? "border-2 border-[#ff6a00] shadow-[0_20px_50px_-20px_rgba(255,106,0,0.35)]"
                  : "border border-black/[0.08] shadow-[0_8px_30px_-16px_rgba(0,0,0,0.15)]"
              }`}
            >
              <Search
                size={17}
                className={`ml-4 transition-colors ${
                  focused ? "text-[#ff6a00]" : "text-black/40"
                }`}
              />
              <input
                type="text"
                placeholder="Search tools - try compress or MP4"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="flex-1 h-full px-3 bg-transparent text-[14px] placeholder:text-black/35 outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mr-3 w-8 h-8 rounded-full bg-black/[0.06] hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Clear"
                >
                  <X size={13} />
                </button>
              ) : (
                <span className="mr-3 hidden sm:inline-flex items-center px-2 h-7 rounded-md bg-black/[0.04] border border-black/[0.06] text-[10px] font-mono text-black/50">
                  Ctrl K
                </span>
              )}
            </div>
          </div>

          {/* Trust */}
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
            <TrustStat icon={<Zap size={12} />} label="Fast" />
            <TrustStat icon={<Shield size={12} />} label="Privacy-first" />
            <TrustStat icon={<InfinityIcon size={12} />} label="Free forever" />
          </div>
        </div>
      </section>

      {/* ============================================================
          MOST USED / FEATURED
      ============================================================ */}
      {!isSearching && activeCategory === "all" && featuredTools.length > 0 && (
        <section className="relative px-6 md:px-10 pt-20 pb-20">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-end justify-between gap-6 mb-8 pb-5 border-b border-black/[0.08]">
              <div>
                <SectionLabel>Most used</SectionLabel>
                <h2
                  className="text-[28px] md:text-[36px] tracking-[-0.02em] mt-2"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  The tools people reach for first
                </h2>
              </div>
              <span className="hidden sm:block text-[11px] font-mono uppercase tracking-[0.18em] text-black/40 shrink-0">
                Updated weekly
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:grid-rows-2">
              {featuredTools.map(({ tool }, i) =>
                i === 0 ? (
                  <FeaturedHeroCard key={tool.id} tool={tool} />
                ) : (
                  <FeaturedMiniCard key={tool.id} tool={tool} rank={i + 1} />
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* FILTER BAR */}
      <section className="sticky top-[68px] z-30 border-y border-black/[0.06] bg-[#f4f1ea]/85 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-6 md:px-10">
          <div className="flex items-center gap-2 overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.22em] text-black/35 pr-3 border-r border-black/[0.08] mr-2">
              Filter
            </span>
            <FilterPill
              label="All"
              count={totalVideoTools}
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            {videoCategories.map((cat) => (
              <FilterPill
                key={cat.slug}
                label={cat.name}
                count={cat.tools.length}
                active={activeCategory === cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section className="px-6 md:px-10 py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
            <div>
              <SectionLabel>
                {isSearching ? "Search results" : activeCategory === "all" ? "Browse all" : "Category"}
              </SectionLabel>
              <h2
                className="text-[28px] md:text-[38px] tracking-[-0.015em] mt-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {headingText}
              </h2>
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-black/40">
              {visibleCount} / {totalVideoTools}
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border border-black/[0.08] mb-6">
                <Search size={22} className="text-black/35" />
              </div>
              <h3
                className="text-[24px] mb-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Nothing matches your search
              </h3>
              <p className="text-[14px] text-black/50 max-w-[400px] mx-auto mb-6">
                Try a different keyword, or browse the entire library.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveCategory("all");
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
              >
                Browse all tools
                <ArrowUpRight size={13} />
              </button>
            </div>
          ) : (
            <div className="space-y-20">
              {filteredCategories.map((cat) => (
                <CategorySection key={cat.slug} category={cat} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ============================================================
// FEATURED — HERO CARD
// ============================================================
function FeaturedHeroCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;

  return (
    <Link
      href={`/video-tools/${tool.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] bg-[#0b0b0c] text-white border border-black/10 p-6 md:p-8 min-h-[300px] lg:min-h-0 lg:col-span-2 lg:row-span-2 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_50px_90px_-45px_rgba(0,0,0,0.65)]"
    >
      <div className="pointer-events-none absolute -top-24 -right-20 w-[380px] h-[380px] rounded-full bg-[#ff6a00]/25 blur-[95px] opacity-70 transition-opacity duration-700 group-hover:opacity-100" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-80px] w-[300px] h-[300px] rounded-full bg-white/[0.06] blur-[90px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <Icon
        className="pointer-events-none absolute -bottom-12 -right-8 text-white/[0.05] transition-transform duration-700 group-hover:scale-[1.06] group-hover:rotate-[-4deg]"
        size={230}
        strokeWidth={0.7}
      />

      <div className="relative flex items-start justify-between">
        <span className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-md">
          <Sparkles size={11} className="text-[#ff6a00]" />
          <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">
            Most used
          </span>
        </span>

        <span className="text-[10px] font-mono tracking-[0.2em] text-white/25">
          01
        </span>
      </div>

      <div className="relative mt-auto pt-10">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-sm flex items-center justify-center mb-6 transition-all duration-500 group-hover:bg-[#ff6a00] group-hover:border-[#ff6a00] group-hover:scale-[1.04]">
          <Icon size={22} strokeWidth={1.6} className="text-white" />
        </div>

        <h3
          className="text-[28px] md:text-[36px] leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {tool.title}
        </h3>

        {tool.desc ? (
          <p className="mt-3 text-[13px] text-white/50 leading-relaxed max-w-[360px]">
            {tool.desc}
          </p>
        ) : null}

        <div className="mt-7 inline-flex items-center gap-2 text-[12.5px] font-medium text-white">
          <span className="relative">
            Open tool
            <span className="absolute left-0 -bottom-1 h-px w-full bg-white/25 transition-colors duration-300 group-hover:bg-[#ff6a00]" />
          </span>
          <ArrowUpRight
            size={14}
            className="text-[#ff6a00] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
          />
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// FEATURED — MINI CARD
// ============================================================
function FeaturedMiniCard({ tool, rank }: { tool: Tool; rank: number }) {
  const Icon = tool.icon;

  return (
    <Link
      href={`/video-tools/${tool.id}`}
      className="group relative flex flex-col h-full min-h-[150px] p-5 rounded-[22px] bg-white border border-black/[0.07] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_30px_55px_-32px_rgba(0,0,0,0.35)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-[#ff6a00] via-[#ff6a00]/50 to-transparent scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100" />
      <div className="pointer-events-none absolute -top-16 -right-16 w-[130px] h-[130px] rounded-full bg-[#ff6a00]/[0.07] blur-[40px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center transition-all duration-300 group-hover:bg-black group-hover:scale-[1.05]">
          <Icon
            size={17}
            strokeWidth={1.75}
            className="text-black/70 transition-colors duration-300 group-hover:text-white"
          />
        </div>

        <span className="text-[10px] font-mono tracking-[0.18em] text-black/20 transition-colors duration-300 group-hover:text-[#ff6a00]">
          {String(rank).padStart(2, "0")}
        </span>
      </div>

      <div className="relative mt-auto">
        <div className="flex items-center gap-1.5">
          <h4 className="text-[13.5px] font-medium tracking-tight text-black transition-colors duration-300 group-hover:text-[#ff6a00]">
            {tool.title}
          </h4>
          {tool.isNew ? (
            <span className="shrink-0 text-[8.5px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-[#ff6a00]/10 text-[#ff6a00]">
              New
            </span>
          ) : null}
        </div>

        {tool.desc ? (
          <p className="text-[11.5px] leading-snug mt-1.5 text-black/45 line-clamp-2 transition-colors duration-300 group-hover:text-black/60">
            {tool.desc}
          </p>
        ) : null}
      </div>

      <ArrowUpRight
        size={13}
        className="absolute bottom-5 right-5 text-[#ff6a00] opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
      />
    </Link>
  );
}

// ============================================================
// SUB COMPONENTS
// ============================================================
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 h-px bg-black/30" />
      <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
        {children}
      </span>
    </div>
  );
}

function TrustStat({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/55">
      <span className="w-5 h-5 rounded-full bg-black/[0.05] flex items-center justify-center text-black/70">
        {icon}
      </span>
      {label}
    </span>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative shrink-0 inline-flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full border text-[12px] font-medium transition-all duration-300 ${
        active
          ? "border-black bg-black text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)]"
          : "border-black/[0.08] text-black/70 hover:text-black hover:border-black/25 bg-white"
      }`}
    >
      {!active ? (
        <span className="w-1.5 h-1.5 rounded-full bg-black/30" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      )}
      <span>{label}</span>
      <span
        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
          active ? "bg-white/15" : "bg-black/[0.05] group-hover:bg-black/[0.08]"
        } transition-colors`}
      >
        {String(count).padStart(2, "0")}
      </span>
    </button>
  );
}

function CategorySection({ category }: { category: Category }) {
  return (
    <section id={category.slug}>
      <div className="flex items-end justify-between mb-8 pb-5 border-b border-black/[0.08] gap-6">
        <div className="flex items-start gap-4">
          <div className="mt-2 w-8 h-8 rounded-lg bg-black/[0.04] border border-black/[0.06] flex items-center justify-center">
            <span className="text-[10px] font-mono text-black/60">
              {String(category.tools.length).padStart(2, "0")}
            </span>
          </div>
          <div>
            <h3
              className="text-[26px] md:text-[32px] tracking-[-0.015em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {category.name}
            </h3>
            <p className="text-[12.5px] text-black/50 mt-1">{category.desc}</p>
          </div>
        </div>

        <Link
          href={`/video-tools?category=${category.slug}`}
          className="group hidden sm:inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-black/50 hover:text-[#ff6a00] transition-colors shrink-0"
        >
          View all
          <ArrowUpRight
            size={11}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {category.tools.map((tool, i) => (
          <ToolCard key={tool.id} tool={tool} index={i} />
        ))}
      </div>
    </section>
  );
}

// ============================================================
// TOOL CARD
// ============================================================
function ToolCard({
  tool,
  index,
}: {
  tool: Tool;
  index: number;
}) {
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.015, 0.25),
      }}
      className="h-full"
    >
      <Link
        href={`/video-tools/${tool.id}`}
        className="group relative flex flex-col h-full min-h-[170px] p-5 rounded-[22px] bg-white border border-black/[0.07] overflow-hidden transition-all duration-300 hover:-translate-y-[3px] hover:border-black/20 hover:shadow-[0_30px_55px_-30px_rgba(0,0,0,0.32)]"
      >
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-[2.5px] bg-[#ff6a00] scale-y-0 origin-top transition-transform duration-400 ease-out group-hover:scale-y-100" />
        <div className="pointer-events-none absolute -top-20 -right-20 w-[160px] h-[160px] rounded-full bg-[#ff6a00]/[0.06] blur-[45px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <span className="pointer-events-none absolute top-4 right-5 text-[10px] font-mono tracking-[0.18em] text-black/[0.18] transition-colors duration-300 group-hover:text-[#ff6a00]/70">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="relative mb-5">
          <div className="w-11 h-11 rounded-xl bg-[#f4f1ea] flex items-center justify-center transition-all duration-300 group-hover:bg-black group-hover:scale-[1.04] group-hover:shadow-[0_10px_20px_-12px_rgba(0,0,0,0.6)]">
            <Icon
              size={18}
              strokeWidth={1.75}
              className="text-black/70 transition-colors duration-300 group-hover:text-white"
            />
          </div>
        </div>

        <div className="relative flex items-center gap-2 mb-1.5">
          <h4 className="text-[14px] font-medium text-black tracking-tight transition-colors duration-300 group-hover:text-[#ff6a00]">
            {tool.title}
          </h4>
          {tool.isNew ? (
            <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-[#ff6a00]/10 text-[#ff6a00]">
              New
            </span>
          ) : null}
        </div>

        {tool.desc ? (
          <p className="relative text-[12px] leading-relaxed text-black/45 line-clamp-2 transition-colors duration-300 group-hover:text-black/65">
            {tool.desc}
          </p>
        ) : null}

        <div className="relative mt-auto pt-5 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/25 transition-colors duration-300 group-hover:text-black/45">
            Open
          </span>
          <span className="w-6 h-6 rounded-full bg-[#f4f1ea] flex items-center justify-center transition-all duration-300 group-hover:bg-[#ff6a00] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
            <ArrowUpRight
              size={12}
              className="text-black/40 transition-colors duration-300 group-hover:text-white"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}