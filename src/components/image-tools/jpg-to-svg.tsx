"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon, Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles, Wand2, Image as ImageIcon, Info, Palette, FileCode2, PenTool } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Converted = {
  url: string;
  size: number;
  name: string;
  svgText: string;
};

type Stage = "idle" | "loading-lib" | "reading" | "tracing" | "done";

type Preset = "logo" | "illustration" | "poster" | "photo";
type Detail = "simple" | "balanced" | "detailed";

const MAX_SIZE_MB = 20;
const MAX_DIMENSION = 2400; // auto-downscale cap for safety

// ============================================================
// HELPERS
// ============================================================
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const stripExt = (name: string) => name.replace(/\.[^/.]+$/, "");

const isRasterImage = (f: File) => {
  const type = f.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp") {
    return true;
  }
  return /\.(jpe?g|png|webp)$/i.test(f.name);
};

// ============================================================
// PRESET CONFIG
// ============================================================
const PRESET_OPTIONS: Record<Preset, Record<string, number>> = {
  logo: { pathomit: 8, blurradius: 0, blurdelta: 20 },
  illustration: { pathomit: 4, blurradius: 1, blurdelta: 24 },
  poster: { pathomit: 16, blurradius: 4, blurdelta: 40 },
  photo: { pathomit: 2, blurradius: 2, blurdelta: 20 },
};

const DETAIL_OPTIONS: Record<Detail, { ltres: number; qtres: number; roundcoords: number }> = {
  simple: { ltres: 2, qtres: 2, roundcoords: 1 },
  balanced: { ltres: 1, qtres: 1, roundcoords: 2 },
  detailed: { ltres: 0.5, qtres: 0.5, roundcoords: 3 },
};

// ============================================================
// VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export const JpgToSvg = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [preset, setPreset] = useState<Preset>("logo");
  const [colors, setColors] = useState(16);
  const [detail, setDetail] = useState<Detail>("balanced");

  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  const reset = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    setFile(null);
    setPreviewUrl(null);
    setConverted(null);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null);
    setConverted(null);
    setStage("idle");

    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!isRasterImage(f)) {
      setError("This tool accepts JPG, PNG, and WebP files. Other formats won't work.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }

    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setFile(f);
    setPreviewUrl(url);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setError(null);
    setStage("loading-lib");

    try {
      // 1) Load the tracer lazily
      const mod = await import("imagetracerjs");
      const ImageTracer: any = (mod as any).default ?? mod;

      setStage("reading");

      // 2) Decode raster → ImageData (downscale if huge)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Couldn't read that image."));
        image.src = previewUrl!;
      });

      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      const longest = Math.max(w, h);
      if (longest > MAX_DIMENSION) {
        const k = MAX_DIMENSION / longest;
        w = Math.round(w * k);
        h = Math.round(h * k);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas is not supported in this browser.");
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);

      setStage("tracing");

      // 3) Trace to SVG string
      const options = {
        colorsampling: 2,
        numberofcolors: colors,
        ...PRESET_OPTIONS[preset],
        ...DETAIL_OPTIONS[detail],
        strokewidth: 1,
        viewbox: true,
        desc: true,
      };

      let svgText: string;
      try {
        svgText = ImageTracer.imagedataToSVG(imageData, options);
      } catch {
        throw new Error("Tracing failed — this image may be too complex to vectorize cleanly.");
      }

      if (!svgText || !svgText.startsWith("<svg")) {
        throw new Error("The tracer didn't produce a valid SVG.");
      }

      // 4) Blob + object URL
      const blob = new Blob([svgText], {
        type: "image/svg+xml;charset=utf-8",
      });

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const svgUrl = URL.createObjectURL(blob);
      convertedUrlRef.current = svgUrl;

      setConverted({
        url: svgUrl,
        size: blob.size,
        name: `${stripExt(file.name)}.svg`,
        svgText,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStage("idle");
    }
  };

  const busy = stage === "loading-lib" || stage === "reading" || stage === "tracing";

  const sizeDelta = file && converted && file.size > 0 ? Math.round(((converted.size - file.size) / file.size) * 100) : 0;

  const stageLabel: Record<Stage, string> = {
    idle: "",
    "loading-lib": "Loading tracer…",
    reading: "Reading pixels…",
    tracing: "Tracing paths…",
    done: "",
  };

  const stageStep: Record<Stage, string> = {
    idle: "",
    "loading-lib": "step 1 of 3",
    reading: "step 2 of 3",
    tracing: "step 3 of 3",
    done: "",
  };

  const progressWidth = stage === "loading-lib" ? "25%" : stage === "reading" ? "55%" : stage === "tracing" ? "90%" : "0%";

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen bg-[#f4f1ea] text-[#0a0a0a] overflow-hidden">
      {/* vertical rules */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      <div className="relative container mx-auto px-6 md:px-8 max-w-[1400px] py-12 md:py-16">
        {/* BREADCRUMB */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-black/40 mb-10"
        >
          <Link
            href="/"
            className="hover:text-black transition-colors"
          >
            Home
          </Link>
          <span className="text-black/25">/</span>
          <Link
            href="/image-tools"
            className="hover:text-black transition-colors"
          >
            Image Tools
          </Link>
          <span className="text-black/25">/</span>
          <span className="text-black/70">JPG to SVG</span>
        </motion.nav>

        {/* HEADER */}
        <motion.header
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end mb-12 pb-8 border-b border-black/[0.12]"
        >
          <div className="lg:col-span-7">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white/60 backdrop-blur-md mb-6"
            >
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]"
              />
              <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">Runs 100% in your browser</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Pixels in.
              <br />
              <span className="italic text-[#ff6a00]">Infinite paths</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              JPGs are grids of pixels — scale them up and they turn to mush. SVG is a set of mathematical paths that stays razor-sharp at any size. This tool <strong className="text-black/80 font-medium">traces</strong> your raster image into clean vector paths, right here in the browser. No upload, no account.
            </motion.p>
          </div>

          <motion.div
            variants={fadeUp}
            className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3"
          >
            <TrustBadge
              icon={<Zap size={12} />}
              label="On-device"
            />
            <TrustBadge
              icon={<Shield size={12} />}
              label="100% private"
            />
            <TrustBadge
              icon={<InfinityIcon size={12} />}
              label="Free"
            />
          </motion.div>
        </motion.header>

        {/* HONEST NOTE */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-14 flex items-start gap-4 p-5 rounded-2xl bg-[#ff6a00]/[0.05] border border-[#ff6a00]/15"
        >
          <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/15 flex items-center justify-center shrink-0">
            <Info
              size={16}
              className="text-[#ff6a00]"
            />
          </div>
          <div className="text-[13px] leading-relaxed text-black/70">
            <strong className="text-black font-medium">Vectorization isn&apos;t magic.</strong> SVG is ideal for logos, icons, and flat illustrations. Photographs traced to SVG become <em>large</em> files with thousands of color regions — they look posterized, not photographic. If you want a photo to look like a photo, keep it as JPG or WebP.
          </div>
        </motion.div>

        {/* 3-STEP EXPLAINER */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14"
        >
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">How this works</span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExplainerCard
              n="01"
              icon={<ImageIcon size={18} />}
              title="Pick a JPG, PNG, or WebP"
              desc="Any raster image works. Logos and icons trace best — photos become heavier SVGs."
            />
            <ExplainerCard
              n="02"
              icon={<PenTool size={18} />}
              title="We trace the edges"
              desc="A vectorization engine runs locally, grouping similar colors into paths."
            />
            <ExplainerCard
              n="03"
              icon={<FileCode2 size={18} />}
              title="Download the SVG"
              desc="A real vector file — infinitely scalable, editable in Figma, Illustrator, or code."
            />
          </div>
        </motion.section>

        {/* WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT: Upload / Preview */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="lg:col-span-7"
          >
            <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-8">
              <AnimatePresence mode="wait">
                {!file && (
                  <motion.label
                    key="dropzone"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[360px] px-6 ${dragging ? "border-[#ff6a00] bg-[#ff6a00]/[0.04] scale-[1.01]" : "border-black/[0.12] hover:border-black/30 hover:bg-black/[0.015]"}`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) acceptFile(f);
                      }}
                    />

                    <motion.div
                      animate={dragging ? { scale: 1.1, rotate: -4 } : { scale: 1, rotate: 0, y: [0, -6, 0] }}
                      transition={dragging ? { type: "spring", stiffness: 300, damping: 20 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${dragging ? "bg-[#ff6a00]" : "bg-[#f4f1ea]"}`}
                    >
                      <ImageIcon
                        size={26}
                        strokeWidth={1.6}
                        className={dragging ? "text-white" : "text-black/70"}
                      />
                    </motion.div>

                    <h3
                      className="text-[22px] mb-2 tracking-tight"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {dragging ? "Drop your image here" : "Drop a JPG or PNG here"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">or click to browse. Accepts .jpg, .jpeg, .png, .webp — up to {MAX_SIZE_MB} MB. Logos &amp; icons produce the cleanest SVGs.</p>

                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[12.5px] font-medium"
                    >
                      Choose image
                      <ArrowUpRight size={13} />
                    </motion.span>
                  </motion.label>
                )}

                {file && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <motion.div
                          initial={{ scale: 0.8, rotate: -6 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 18 }}
                          className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center shrink-0"
                        >
                          <FileImage
                            size={18}
                            className="text-black/70"
                            strokeWidth={1.75}
                          />
                        </motion.div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium text-black truncate">{file.name}</div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">{formatBytes(file.size)} · RASTER</div>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.08, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={reset}
                        disabled={busy}
                        className="w-9 h-9 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
                        aria-label="Remove file"
                      >
                        <X size={14} />
                      </motion.button>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-6 min-h-[240px] flex items-center justify-center">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: "linear-gradient(45deg, #e5e0d5 25%, transparent 25%), linear-gradient(-45deg, #e5e0d5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e0d5 75%), linear-gradient(-45deg, transparent 75%, #e5e0d5 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                        }}
                      />

                      <motion.img
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        src={previewUrl ?? undefined}
                        alt="Raster preview"
                        className="relative z-10 max-w-full max-h-[420px] object-contain"
                      />

                      <AnimatePresence>
                        {busy && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 z-20 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
                          >
                            <div className="relative">
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1.4,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="block w-12 h-12 rounded-full border-2 border-white/15 border-t-[#ff6a00]"
                              />
                              <motion.span
                                animate={{ rotate: -360 }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="absolute inset-1.5 rounded-full border-2 border-white/10 border-b-[#ff6a00]/60"
                              />
                            </div>
                            <motion.div
                              key={stage}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="text-center"
                            >
                              <div className="text-[13px] font-medium text-white">{stageLabel[stage]}</div>
                              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50 mt-1">{stageStep[stage]}</div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {busy && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mb-4"
                        >
                          <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                            <motion.div
                              initial={{ width: "0%" }}
                              animate={{ width: progressWidth }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-[#ff6a00] to-[#ff8c40]"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-wrap items-center gap-3">
                      <motion.button
                        whileHover={{ scale: busy ? 1 : 1.03 }}
                        whileTap={{ scale: busy ? 1 : 0.97 }}
                        onClick={convert}
                        disabled={busy}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                            {stage === "loading-lib" ? "Loading…" : stage === "reading" ? "Reading…" : "Tracing…"}
                          </>
                        ) : (
                          <>
                            <Wand2 size={15} />
                            Convert to SVG
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={reset}
                        disabled={busy}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-black/15 text-[13px] font-medium text-black/70 hover:border-black/40 hover:text-black transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        Start over
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/15">
                            <AlertCircle
                              size={16}
                              className="text-red-500 shrink-0 mt-0.5"
                            />
                            <p className="text-[13px] text-red-700/90 leading-relaxed">{error}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {!file && error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/15"
                  >
                    <AlertCircle
                      size={16}
                      className="text-red-500 shrink-0 mt-0.5"
                    />
                    <p className="text-[13px] text-red-700/90 leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RIGHT: Settings + Result + Info */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="lg:col-span-5 space-y-6"
          >
            {/* Settings */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Vectorization settings</span>
              </div>

              {/* Preset */}
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">Content type</div>
                  <Palette
                    size={12}
                    className="text-black/35"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "logo", label: "Logo", hint: "Flat shapes" },
                      { id: "illustration", label: "Illustration", hint: "Line art" },
                      { id: "poster", label: "Poster", hint: "Bold colors" },
                      { id: "photo", label: "Photo", hint: "Best-effort" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`text-left p-3 rounded-xl border transition-all ${preset === p.id ? "border-black bg-black text-white" : "border-black/10 hover:border-black/30"}`}
                    >
                      <div className="text-[12.5px] font-medium">{p.label}</div>
                      <div className={`text-[10.5px] mt-0.5 ${preset === p.id ? "text-white/55" : "text-black/45"}`}>{p.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">Color regions</div>
                  <motion.div
                    key={colors}
                    initial={{ scale: 1.15, color: "#ff6a00" }}
                    animate={{ scale: 1, color: "#00000099" }}
                    transition={{ duration: 0.25 }}
                    className="text-[11px] font-mono"
                  >
                    {colors}
                  </motion.div>
                </div>
                <input
                  type="range"
                  min={2}
                  max={64}
                  value={colors}
                  onChange={(e) => setColors(Number(e.target.value))}
                  className="w-full accent-[#ff6a00]"
                />
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                  <span>Fewer colors</span>
                  <span>More fidelity</span>
                </div>
                <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">Fewer colors = simpler SVG. More colors = closer to the original photo, but bigger file.</p>
              </div>

              {/* Detail */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">Path detail</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["simple", "balanced", "detailed"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDetail(d)}
                      className={`py-2.5 px-3 rounded-lg text-[11.5px] font-medium transition-all border ${detail === d ? "border-black bg-black text-white" : "border-black/10 hover:border-black/30 text-black/70"}`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Result */}
            <AnimatePresence>
              {converted && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[22px] bg-[#0b0b0c] text-white border border-black/10 p-6 md:p-7 overflow-hidden relative"
                >
                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute -top-20 -right-16 w-[260px] h-[260px] rounded-full bg-[#ff6a00]/20 blur-[80px]"
                  />

                  <div className="relative">
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-md mb-5"
                    >
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Sparkles
                          size={11}
                          className="text-[#ff6a00]"
                        />
                      </motion.span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">SVG ready</span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="rounded-xl overflow-hidden mb-5 bg-white/[0.04] border border-white/10"
                    >
                      <div
                        className="flex items-center justify-center p-3 min-h-[160px]"
                        style={{
                          backgroundImage: "linear-gradient(45deg, #1a1a1c 25%, transparent 25%), linear-gradient(-45deg, #1a1a1c 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1c 75%), linear-gradient(-45deg, transparent 75%, #1a1a1c 75%)",
                          backgroundSize: "16px 16px",
                          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                        }}
                      >
                        <img
                          src={converted.url}
                          alt="Vector result"
                          className="max-w-full max-h-[220px] object-contain"
                        />
                      </div>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.26 }}
                      className="text-[20px] leading-tight mb-1 break-all"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {converted.name}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.32 }}
                      className="text-[13px] text-white/50 mb-6"
                    >
                      {formatBytes(converted.size)}
                      {sizeDelta !== 0 && (
                        <>
                          {" · "}
                          <span className={sizeDelta > 0 ? "text-amber-400" : "text-emerald-400"}>{sizeDelta > 0 ? `${sizeDelta}% larger than JPG` : `${Math.abs(sizeDelta)}% smaller`}</span>
                        </>
                      )}
                    </motion.p>

                    <motion.a
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.38 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      href={converted.url}
                      download={converted.name}
                      className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[13.5px] font-medium hover:bg-[#ff6a00] hover:text-white transition-colors"
                    >
                      <Download size={15} />
                      Download SVG
                      <ArrowUpRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </motion.a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* What this tool does */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">What this tool does</span>
              </div>

              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>
                  <strong className="text-black">Input: JPG, PNG, or WebP.</strong> Any raster image. Logos, icons, and flat illustrations produce the cleanest vectors.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Output: real SVG paths</strong> — not just a wrapped bitmap. Editable in Figma, Illustrator, Inkscape, or by hand.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Infinitely scalable.</strong> Print it on a business card or a billboard — the file never changes.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Tune the output</strong> with color count, path detail, and content-type presets.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Files stay on your device.</strong> The tracer runs locally — nothing is uploaded.
                </FeatureRow>
              </ul>
            </motion.div>

            {/* Privacy */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock
                    size={13}
                    className="text-white"
                  />
                </div>
                <span className="text-[13px] font-medium text-black">Your image never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">Decoding, tracing, and SVG generation all happen inside your browser using JavaScript and the HTML5 Canvas API. No upload, no server, no tracking — open DevTools and you&apos;ll see zero network requests after the page loads.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SUB COMPONENTS
// ============================================================
function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.span
      variants={fadeUp}
      className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/55"
    >
      <motion.span
        whileHover={{ scale: 1.15, rotate: 8 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-5 h-5 rounded-full bg-black/[0.05] flex items-center justify-center text-black/70"
      >
        {icon}
      </motion.span>
      {label}
    </motion.span>
  );
}

function ExplainerCard({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, borderColor: "rgba(0,0,0,0.2)" }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="flex items-start justify-between mb-5">
        <motion.div
          whileHover={{ scale: 1.08, rotate: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center text-black/70"
        >
          {icon}
        </motion.div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">{n}</span>
      </div>
      <h4
        className="text-[16px] font-medium text-black mb-2 leading-tight"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {title}
      </h4>
      <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
    </motion.div>
  );
}

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex items-start gap-3"
    >
      <motion.span
        whileHover={{ scale: 1.15, rotate: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-4 h-4 rounded-full bg-[#ff6a00]/10 flex items-center justify-center shrink-0 mt-1"
      >
        <Check
          size={10}
          className="text-[#ff6a00]"
          strokeWidth={2.5}
        />
      </motion.span>
      <span>{children}</span>
    </motion.li>
  );
}
