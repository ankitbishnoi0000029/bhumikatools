"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  ImageDown,
  X,
  Download,
  ArrowUpRight,
  Shield,
  Zap,
  Infinity as InfinityIcon,
  Lock,
  Check,
  RotateCcw,
  FileImage,
  Loader2,
  AlertCircle,
  Sparkles,
  Wand2,
  HardDriveDownload,
  Info,
  Layers,
  Palette,
  Cpu,
  Code2,
  FileCheck2,
  Maximize2,
  Minimize2,
  HelpCircle,
  ChevronDown,
  Film,
  Repeat,
  Gauge,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Converted = {
  url: string;
  size: number;
  name: string;
  paletteSize: number;
};

type Stage = "idle" | "loading-lib" | "quantizing" | "encoding" | "done";

const MAX_SIZE_MB = 50;
const MAX_COLORS = 256; // GIF spec hard limit

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

const isJpgFile = (f: File) => {
  const type = f.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg") return true;
  return /\.(jpg|jpeg|jpe)$/i.test(f.name);
};

// ============================================================
// VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ============================================================
// COMPONENT
// ============================================================
export const JpgToGif = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [colors, setColors] = useState(256);
  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

    if (!isJpgFile(f)) {
      setError(
        "This tool only accepts JPG or JPEG files. For other formats, use the matching converter."
      );
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }

    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setFile(f);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const convert = async () => {
    if (!file || !previewUrl) return;
    setError(null);
    setStage("loading-lib");

    try {
      // 1) Load the GIF encoder lazily (only when the user clicks Convert)
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

      // 2) Decode the JPG into raw RGBA pixels
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Couldn't read the JPG file."));
        image.src = previewUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      // GIF has no alpha — flatten JPG over white just in case
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 3) Quantize to a limited palette (GIF supports max 256 colors)
      setStage("quantizing");
      const palette = quantize(data, colors, { format: "rgb565" });

      // Wait a frame so the UI can paint the "Quantizing" state before
      // the synchronous applyPalette blocks the main thread.
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const index = applyPalette(data, palette, "rgb565");

      // 4) Encode the indexed pixels into a GIF byte stream
      setStage("encoding");
      const gif = GIFEncoder();
      gif.writeFrame(index, canvas.width, canvas.height, {
        palette,
        delay: 0, // static image — no animation timing
      });
      gif.finish();

      const bytes: Uint8Array = gif.bytes();
      // Copy into a fresh Uint8Array so the underlying buffer is stable
      const gifBlob = new Blob([new Uint8Array(bytes)], { type: "image/gif" });

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const gifUrl = URL.createObjectURL(gifBlob);
      convertedUrlRef.current = gifUrl;

      setConverted({
        url: gifUrl,
        size: gifBlob.size,
        name: `${stripExt(file.name)}.gif`,
        paletteSize: palette.length,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStage("idle");
    }
  };

  const busy =
    stage === "loading-lib" || stage === "quantizing" || stage === "encoding";

  const sizeDelta =
    file && converted
      ? Math.round(((converted.size - file.size) / file.size) * 100)
      : 0;

  const stageLabel: Record<Stage, string> = {
    idle: "",
    "loading-lib": "Loading encoder…",
    quantizing: "Reducing to 256 colors…",
    encoding: "Writing GIF…",
    done: "",
  };

  const stageStep: Record<Stage, string> = {
    idle: "",
    "loading-lib": "step 1 of 3",
    quantizing: "step 2 of 3",
    encoding: "step 3 of 3",
    done: "",
  };

  const progressWidth =
    stage === "loading-lib"
      ? "25%"
      : stage === "quantizing"
      ? "65%"
      : stage === "encoding"
      ? "90%"
      : "0%";

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

        {/* ===================== BREADCRUMB ===================== */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-black/40 mb-10"
        >
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <span className="text-black/25">/</span>
          <Link href="/image-tools" className="hover:text-black transition-colors">Image Tools</Link>
          <span className="text-black/25">/</span>
          <span className="text-black/70">JPG to GIF</span>
        </motion.nav>

        {/* ===================== HEADER ===================== */}
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
              <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">
                256-color palette · Client-side · No uploads
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              JPG in.
              <br />
              <span className="italic text-[#ff6a00]">Retro GIF</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              GIF is a 1987 format with a hard limit of 256 colors. This tool converts any JPG
              into a single-frame GIF using a modern palette quantizer — <strong className="text-black/80 font-medium">right in
              your browser</strong>, no upload, no cloud.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Instant" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* ===================== 256-COLOR WARNING ===================== */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-14 flex items-start gap-4 p-5 rounded-2xl bg-[#ff6a00]/[0.05] border border-[#ff6a00]/15"
        >
          <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/15 flex items-center justify-center shrink-0">
            <Info size={16} className="text-[#ff6a00]" />
          </div>
          <div className="text-[13px] leading-relaxed text-black/70">
            <strong className="text-black font-medium">The 256-color reality.</strong>{" "}
            JPG holds millions of colors. GIF holds just 256. Converting means picking the
            closest 256 shades — photos with smooth gradients (sunsets, skin, sky) will show
            visible <em>banding</em>. That's not a bug, it's the GIF spec. If you need photo
            fidelity, keep the JPG or use PNG.
          </div>
        </motion.div>

        {/* ===================== 3-STEP EXPLAINER ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              How this tool works
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExplainerCard
              n="01"
              icon={<FileImage size={18} />}
              title="Drop a JPG"
              desc="Any .jpg or .jpeg up to 50 MB. Your browser shows it instantly — no decoding tricks needed."
            />
            <ExplainerCard
              n="02"
              icon={<Palette size={18} />}
              title="We quantize to 256 colors"
              desc="A median-cut algorithm finds the 256 best colors to represent your image, then maps every pixel to the nearest one."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the GIF"
              desc="A single-frame GIF that works everywhere — old forums, chat apps, documents, email signatures."
            />
          </div>
        </motion.section>

        {/* ===================== WORKSPACE ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ---------- LEFT: Upload / Preview ---------- */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="lg:col-span-7"
          >
            <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-8">
              <AnimatePresence mode="wait">

                {/* ---------- DROPZONE ---------- */}
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
                    className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[360px] px-6 ${
                      dragging
                        ? "border-[#ff6a00] bg-[#ff6a00]/[0.04] scale-[1.01]"
                        : "border-black/[0.12] hover:border-black/30 hover:bg-black/[0.015]"
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".jpg,.jpeg,.jpe,image/jpeg"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) acceptFile(f);
                      }}
                    />

                    <motion.div
                      animate={
                        dragging
                          ? { scale: 1.1, rotate: -4 }
                          : { scale: 1, rotate: 0, y: [0, -6, 0] }
                      }
                      transition={
                        dragging
                          ? { type: "spring", stiffness: 300, damping: 20 }
                          : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                      }
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${
                        dragging ? "bg-[#ff6a00]" : "bg-[#f4f1ea]"
                      }`}
                    >
                      <FileImage
                        size={26}
                        strokeWidth={1.6}
                        className={dragging ? "text-white" : "text-black/70"}
                      />
                    </motion.div>

                    <h3
                      className="text-[22px] mb-2 tracking-tight"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {dragging ? "Drop your JPG here" : "Drop a JPG file here"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                      or click to browse. Accepts .jpg and .jpeg files — up to {MAX_SIZE_MB} MB.
                    </p>

                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[12.5px] font-medium"
                    >
                      Choose JPG file
                      <ArrowUpRight size={13} />
                    </motion.span>
                  </motion.label>
                )}

                {/* ---------- PREVIEW ---------- */}
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
                          <FileImage size={18} className="text-black/70" strokeWidth={1.75} />
                        </motion.div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium text-black truncate">
                            {file.name}
                          </div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            {formatBytes(file.size)} · JPG
                          </div>
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

                    {/* preview area */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-6 min-h-[240px] flex items-center justify-center">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #e5e0d5 25%, transparent 25%), linear-gradient(-45deg, #e5e0d5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e0d5 75%), linear-gradient(-45deg, transparent 75%, #e5e0d5 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                        }}
                      />

                      {previewUrl && (
                        <motion.img
                          key={previewUrl}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          src={previewUrl}
                          alt="JPG preview"
                          className="relative z-10 max-w-full max-h-[420px] object-contain"
                        />
                      )}

                      {/* busy overlay */}
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
                                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                                className="block w-12 h-12 rounded-full border-2 border-white/15 border-t-[#ff6a00]"
                              />
                              <motion.span
                                animate={{ rotate: -360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
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
                              <div className="text-[13px] font-medium text-white">
                                {stageLabel[stage]}
                              </div>
                              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50 mt-1">
                                {stageStep[stage]}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* progress bar */}
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

                    {/* action buttons */}
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
                            <Loader2 size={15} className="animate-spin" />
                            {stage === "loading-lib"
                              ? "Loading…"
                              : stage === "quantizing"
                              ? "Quantizing…"
                              : "Encoding…"}
                          </>
                        ) : (
                          <>
                            <ImageDown size={15} />
                            Convert to GIF
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
                            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[13px] text-red-700/90 leading-relaxed">{error}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* dropzone-level error */}
              <AnimatePresence>
                {!file && error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/15"
                  >
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[13px] text-red-700/90 leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ---------- RIGHT: Settings + Result + Info ---------- */}
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
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Output settings
                </span>
              </div>

              <div className="mb-7">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Output format
                </div>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-black bg-black text-white"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                    <Film size={15} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-medium">GIF</div>
                    <div className="text-[11px] text-white/50">Single frame · 256 colors max</div>
                  </div>
                  <Check size={14} className="text-[#ff6a00]" />
                </motion.div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Palette size
                  </div>
                  <motion.div
                    key={colors}
                    initial={{ scale: 1.15, color: "#ff6a00" }}
                    animate={{ scale: 1, color: "#00000099" }}
                    transition={{ duration: 0.25 }}
                    className="text-[11px] font-mono"
                  >
                    {colors} colors
                  </motion.div>
                </div>
                <input
                  type="range"
                  min={2}
                  max={256}
                  value={colors}
                  onChange={(e) => setColors(Number(e.target.value))}
                  className="w-full accent-[#ff6a00]"
                />
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                  <span>Retro / tiny</span>
                  <span>Full 256</span>
                </div>
                <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">
                  Fewer colors = smaller file + a deliberate retro look. 256 is the GIF
                  maximum. Anything below 64 gets a strong "80s pixel art" vibe.
                </p>
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
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles size={11} className="text-[#ff6a00]" />
                      </motion.span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">
                        GIF ready · {converted.paletteSize} colors
                      </span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-[22px] leading-tight mb-1 break-all"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {converted.name}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.28 }}
                      className="text-[13px] text-white/50 mb-6"
                    >
                      {formatBytes(converted.size)}
                      {sizeDelta !== 0 && (
                        <>
                          {" · "}
                          <span className={sizeDelta < 0 ? "text-emerald-400" : "text-amber-400"}>
                            {sizeDelta < 0
                              ? `${Math.abs(sizeDelta)}% smaller`
                              : `${sizeDelta}% larger`}
                          </span>
                        </>
                      )}
                    </motion.p>

                    <motion.a
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.34 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      href={converted.url}
                      download={converted.name}
                      className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[13.5px] font-medium hover:bg-[#ff6a00] hover:text-white transition-colors"
                    >
                      <Download size={15} />
                      Download GIF
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
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  What this tool does
                </span>
              </div>

              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>
                  <strong className="text-black">Input: JPG or JPEG only.</strong> Other formats are
                  politely rejected so you know you're in the right place.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Output: a single-frame GIF.</strong> Not an
                  animation — one still image, 256 colors max.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Adjustable palette (2–256 colors).</strong> Fewer
                  colors = smaller file, or a deliberate retro look.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs in Chrome, Firefox, Edge, Safari.</strong> Uses
                  the HTML5 Canvas API + a WebAssembly-free JS encoder (gifenc).
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Files stay on your device.</strong> No upload, no
                  server, no tracking.
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
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Your file never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                JPG decoding, palette quantization, and GIF encoding all run inside your browser.
                Open DevTools → Network and you'll see zero requests for the image itself.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ===================== DEEP DIVE ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              Deep dive
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-4 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            How a 16-million-color photo becomes a 256-color GIF
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12">
            Three steps happen under the hood. They take a few hundred milliseconds and run
            entirely on your device.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <DeepDiveCard
              className="lg:col-span-4"
              n="01"
              icon={<Cpu size={18} />}
              title="Decode JPG → pixels"
              body="The browser unpacks the JPG into raw RGBA values using its built-in JPEG decoder. This is the same step your screen already does — nothing extra happens here."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="02"
              icon={<Palette size={18} />}
              title="Quantize → 256 colors"
              body="A median-cut algorithm scans millions of pixels and picks the 256 colors that best represent the image. Every original pixel then snaps to the nearest chosen color. This is where banding comes from."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="03"
              icon={<Code2 size={18} />}
              title="Encode → GIF bytes"
              body="Each pixel becomes a single byte (0–255) indexing into the palette. That byte stream is then LZW-compressed — a lossless scheme — and wrapped in the GIF file format."
            />
          </div>

          {/* Comparison table */}
          <motion.div variants={fadeUp} className="mt-14">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-5 h-px bg-black/30" />
              <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
                JPG vs GIF — side by side
              </span>
            </div>

            <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
              <div className="grid grid-cols-3 text-[12px] font-mono uppercase tracking-[0.14em] text-black/45 border-b border-black/[0.06] bg-black/[0.015]">
                <div className="p-4">Property</div>
                <div className="p-4 border-l border-black/[0.06]">JPG</div>
                <div className="p-4 border-l border-black/[0.06] text-[#ff6a00]">GIF</div>
              </div>
              {[
                ["Color depth", "24-bit (16.7 M colors)", "8-bit (256 colors)"],
                ["Compression", "Lossy (DCT)", "Lossless (LZW)"],
                ["Animation", "No", "Yes (this tool: still only)"],
                ["Transparency", "No", "Yes (1-bit, hard edges)"],
                ["Best for", "Photos, web", "Icons, logos, memes, chat"],
                ["Year invented", "1992", "1987"],
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 text-[13px] border-b last:border-b-0 border-black/[0.06]"
                >
                  <div className="p-4 text-black/50">{row[0]}</div>
                  <div className="p-4 border-l border-black/[0.06]">{row[1]}</div>
                  <div className="p-4 border-l border-black/[0.06] font-medium">{row[2]}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ===================== WHEN TO USE ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              When to use this
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            GIF still makes sense when…
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCaseCard
              icon={<Film size={18} />}
              title="You want a strong retro / lo-fi look"
              desc="GIF's 256-color limit is a feature, not a bug. Drop the palette to 32 or 64 colors and you get an instant 80s pixel-art aesthetic."
            />
            <UseCaseCard
              icon={<Gauge size={18} />}
              title="You're targeting an old or constrained platform"
              desc="Some industrial systems, embedded devices, and legacy CMSes only accept GIF. This gets you a compatible file in one click."
            />
            <UseCaseCard
              icon={<Repeat size={18} />}
              title="You're building a still frame for a GIF animation"
              desc="If you're hand-building an animated GIF frame-by-frame, this is the fastest way to get a single-frame source to composite into your timeline."
            />
            <UseCaseCard
              icon={<Palette size={18} />}
              title="You want the smallest possible file for flat graphics"
              desc="For logos, icons, or illustrations with solid colors, GIF's LZW compression + small palette can beat PNG for size."
            />
            <UseCaseCard
              icon={<Maximize2 size={18} />}
              title="You need email-safe inline images"
              desc="GIF has been supported in email clients since the 90s. When in doubt, GIF always works — even in Outlook."
            />
            <UseCaseCard
              icon={<Minimize2 size={18} />}
              title="You want to ship a tiny preview thumbnail"
              desc="A heavily quantized GIF (16–32 colors) makes a great lightweight placeholder that loads instantly."
            />
          </div>
        </motion.section>

        {/* ===================== FAQ ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              Common questions
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Frequently asked
          </motion.h2>

          <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden divide-y divide-black/[0.06]">
            {FAQS.map((item, i) => (
              <FaqRow
                key={i}
                q={item.q}
                a={item.a}
                open={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

// ============================================================
// DATA
// ============================================================
const FAQS = [
  {
    q: "Why do my colors look wrong after conversion?",
    a: "GIF can only hold 256 colors; your JPG probably had thousands or millions. The quantizer picks the 256 that best represent the image, but smooth gradients (sky, skin, sunsets) will show visible 'banding' — stripey transitions between similar shades. That's the format's hard limit, not a bug. If you need full color, use PNG instead.",
  },
  {
    q: "Can I animate the GIF?",
    a: "Not with this tool — this converts a single JPG into a single-frame GIF. To make an animation you'd need a series of frames plus a dedicated animation tool. Search for 'JPG to animated GIF' if that's what you need.",
  },
  {
    q: "What does the palette slider actually do?",
    a: "It controls how many colors the GIF is allowed to use, from 2 up to 256. Fewer colors = smaller file and a stronger retro look. 256 gives the best fidelity GIF can offer. Try 32 or 64 for a fun pixel-art effect.",
  },
  {
    q: "Will the GIF be smaller than my JPG?",
    a: "It depends. For flat graphics (logos, icons, illustrations) with few colors, the GIF is often smaller. For photos, the GIF is usually larger — LZW compression on a quantized palette can't beat JPEG's lossy compression on rich gradients.",
  },
  {
    q: "Is my image uploaded anywhere?",
    a: "No. Decoding, quantization, and GIF encoding all happen in your browser. Open DevTools → Network and you'll see zero outgoing requests for the image.",
  },
  {
    q: "Does the tool resize or crop my image?",
    a: "No. The GIF comes out at exactly the same width and height as the input JPG. The only thing that changes is the color palette.",
  },
  {
    q: "What's the maximum file size?",
    a: `Up to ${MAX_SIZE_MB} MB per file. Very large images may be slow — the encoder has to hold the entire RGBA buffer plus the palette in memory. Phones handle typical photos fine.`,
  },
  {
    q: "Which library does the tool use to write the GIF?",
    a: "gifenc — a modern, tiny, dependency-free GIF encoder written in plain JavaScript. It's loaded lazily, only when you click Convert, so the page stays fast.",
  },
];

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

function ExplainerCard({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
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
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
          {n}
        </span>
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

function DeepDiveCard({
  n,
  icon,
  title,
  body,
  className = "",
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative p-6 rounded-[20px] bg-white border border-black/[0.06] ${className}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center text-black/70">
          {icon}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
          {n}
        </span>
      </div>
      <h4
        className="text-[17px] font-medium text-black mb-2 leading-tight"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {title}
      </h4>
      <p className="text-[13px] leading-relaxed text-black/60">{body}</p>
    </motion.div>
  );
}

function UseCaseCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-start gap-4 p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center text-[#ff6a00] shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-[15px] font-medium text-black mb-1.5 leading-tight">
          {title}
        </h4>
        <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
      </div>
    </motion.div>
  );
}

function FaqRow({
  q,
  a,
  open,
  onClick,
}: {
  q: string;
  a: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-6 p-6 text-left hover:bg-black/[0.015] transition-colors"
      >
        <span className="text-[14.5px] font-medium text-black flex items-start gap-3">
          <HelpCircle size={16} className="text-[#ff6a00] shrink-0 mt-0.5" />
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown size={16} className="text-black/40" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pl-[58px] text-[13px] leading-relaxed text-black/60">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
        <Check size={10} className="text-[#ff6a00]" strokeWidth={2.5} />
      </motion.span>
      <span>{children}</span>
    </motion.li>
  );
}