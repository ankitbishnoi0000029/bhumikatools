"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, Scaling, Link2,
  Link2Off, Layers, Maximize2, Percent, Ruler, Grid3x3, Crop,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type OutputFormat = "image/jpeg" | "image/png";
type Stage = "idle" | "reading" | "resizing" | "encoding" | "done";
type Mode = "pixels" | "percent";
type Converted = { url: string; size: number; name: string; w: number; h: number };

const MAX_SIZE_MB = 25;
const MAX_DIM = 8000;

// Common resize presets
const PRESETS: { label: string; w: number; h: number; group: string }[] = [
  { label: "Instagram Post", w: 1080, h: 1080, group: "Social" },
  { label: "Instagram Story", w: 1080, h: 1920, group: "Social" },
  { label: "Twitter / X Post", w: 1600, h: 900, group: "Social" },
  { label: "Facebook Cover", w: 820, h: 312, group: "Social" },
  { label: "LinkedIn Post", w: 1200, h: 627, group: "Social" },
  { label: "YouTube Thumbnail", w: 1280, h: 720, group: "Video" },
  { label: "Full HD 1080p", w: 1920, h: 1080, group: "Video" },
  { label: "4K UHD", w: 3840, h: 2160, group: "Video" },
  { label: "A4 @ 300 DPI", w: 2480, h: 3508, group: "Print" },
  { label: "Passport Photo", w: 600, h: 600, group: "Print" },
  { label: "Favicon", w: 512, h: 512, group: "Web" },
  { label: "Email Header", w: 600, h: 200, group: "Web" },
];

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
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const isImageFile = (f: File) =>
  f.type.startsWith("image/") ||
  /\.(jpg|jpeg|png|webp|gif|bmp|tiff|svg|heic|heif|avif)$/i.test(f.name);

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
export const ResizeImage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // resize state
  const [mode, setMode] = useState<Mode>("pixels");
  const [pixelsW, setPixelsW] = useState(0);
  const [pixelsH, setPixelsH] = useState(0);
  const [percent, setPercent] = useState(50);
  const [lockAspect, setLockAspect] = useState(true);

  // output
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(92);

  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);

  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  // ---------- target dimensions ----------
  const targetDims = useMemo(() => {
    if (!srcW || !srcH) return { w: 0, h: 0 };
    if (mode === "percent") {
      const ratio = percent / 100;
      return {
        w: Math.max(1, Math.round(srcW * ratio)),
        h: Math.max(1, Math.round(srcH * ratio)),
      };
    }
    return {
      w: Math.max(1, Math.min(MAX_DIM, pixelsW || srcW)),
      h: Math.max(1, Math.min(MAX_DIM, pixelsH || srcH)),
    };
  }, [mode, percent, pixelsW, pixelsH, srcW, srcH]);

  const tooLarge = targetDims.w > MAX_DIM || targetDims.h > MAX_DIM;
  const isUpscale = targetDims.w > srcW || targetDims.h > srcH;
  const aspectRatio = srcW && srcH ? gcd(srcW, srcH) : 1;
  const aspectLabel = srcW && srcH ? `${srcW / aspectRatio}:${srcH / aspectRatio}` : "";

  // ---------- reset ----------
  const reset = () => {
    if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }
    setFile(null); setSourceUrl(null);
    setSrcW(0); setSrcH(0);
    setPixelsW(0); setPixelsH(0); setPercent(50);
    setMode("pixels"); setLockAspect(true);
    setConverted(null); setError(null); setStage("idle");
    setShowOriginal(false); setPreviewReady(false);
    sourceImgRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------- accept file ----------
  const acceptFile = useCallback((f: File) => {
    setError(null); setConverted(null); setStage("idle");
    setShowOriginal(false); setPreviewReady(false);

    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }

    if (!isImageFile(f)) {
      setError("That doesn't look like an image. Please choose a JPG, PNG, WebP, or another image file.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }

    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    const url = URL.createObjectURL(f);
    sourceUrlRef.current = url;

    const probe = new Image();
    probe.onload = () => {
      sourceImgRef.current = probe;
      setSrcW(probe.naturalWidth);
      setSrcH(probe.naturalHeight);
      setPixelsW(probe.naturalWidth);
      setPixelsH(probe.naturalHeight);
      setFile(f);
      setSourceUrl(url);
      setPreviewReady(true);
    };
    probe.onerror = () => {
      setError("Couldn't read this image. The file may be corrupt or use an unsupported format.");
      URL.revokeObjectURL(url);
      sourceUrlRef.current = null;
    };
    probe.src = url;
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  // ---------- dimension setter with aspect lock ----------
  const updateW = (w: number) => {
    if (!srcW || !srcH) return;
    const clamped = Math.max(1, Math.min(MAX_DIM, w));
    setPixelsW(clamped);
    if (lockAspect) {
      setPixelsH(Math.max(1, Math.round((clamped * srcH) / srcW)));
    }
    setConverted(null);
  };

  const updateH = (h: number) => {
    if (!srcW || !srcH) return;
    const clamped = Math.max(1, Math.min(MAX_DIM, h));
    setPixelsH(clamped);
    if (lockAspect) {
      setPixelsW(Math.max(1, Math.round((clamped * srcW) / srcH)));
    }
    setConverted(null);
  };

  const applyPreset = (w: number, h: number) => {
    setMode("pixels");
    setPixelsW(w);
    setPixelsH(h);
    setLockAspect(false);
    setConverted(null);
  };

  // ---------- live preview ----------
  useEffect(() => {
    if (!previewReady) return;
    const img = sourceImgRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;

      if (showOriginal) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
        return;
      }

      canvas.width = targetDims.w;
      canvas.height = targetDims.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetDims.w, targetDims.h);
      } else {
        ctx.clearRect(0, 0, targetDims.w, targetDims.h);
      }

      ctx.drawImage(img, 0, 0, targetDims.w, targetDims.h);
    }, 40);

    return () => { cancelled = true; window.clearTimeout(t); };
  }, [previewReady, targetDims.w, targetDims.h, format, showOriginal]);

  // ---------- export ----------
  const convert = async () => {
    if (!file) return;
    setError(null);

    if (tooLarge) {
      setError(`Target size exceeds the ${MAX_DIM}px safe limit. Lower the dimensions.`);
      return;
    }

    setStage("reading");
    try {
      const img = sourceImgRef.current;
      if (!img) throw new Error("Source image isn't ready. Please re-upload.");

      await new Promise((r) => setTimeout(r, 100));
      setStage("resizing");

      const canvas = document.createElement("canvas");
      canvas.width = targetDims.w;
      canvas.height = targetDims.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetDims.w, targetDims.h);
      }

      ctx.drawImage(img, 0, 0, targetDims.w, targetDims.h);

      await new Promise((r) => setTimeout(r, 100));
      setStage("encoding");

      const q = format === "image/jpeg" ? quality / 100 : undefined;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, format, q)
      );
      if (!blob) throw new Error("Encoding failed. Please try again.");

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      const ext = format === "image/jpeg" ? "jpg" : "png";
      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file.name)}-${targetDims.w}x${targetDims.h}.${ext}`,
        w: targetDims.w,
        h: targetDims.h,
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  const busy = stage === "reading" || stage === "resizing" || stage === "encoding";

  const stageLabel: Record<Stage, string> = {
    idle: "", reading: "Reading image…", resizing: "Resampling pixels…", encoding: "Encoding file…", done: "",
  };
  const stageStep: Record<Stage, string> = {
    idle: "", reading: "step 1 of 3", resizing: "step 2 of 3", encoding: "step 3 of 3", done: "",
  };
  const progressWidth =
    stage === "reading" ? "35%" : stage === "resizing" ? "65%" : stage === "encoding" ? "90%" : "0%";

  // group presets
  const presetGroups = useMemo(() => {
    const groups: Record<string, typeof PRESETS> = {};
    PRESETS.forEach((p) => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });
    return groups;
  }, []);

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
          <span className="text-black/70">Resize Image</span>
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
                Pixels · Percent · Presets · No signup
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Exact dimensions.
              <br />
              <span className="italic text-[#ff6a00]">Every time.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Resize any image to exact pixels, scale it by a percentage, or pick from
              ready-made social and print presets. Lock the aspect ratio to avoid distortion,
              preview live, and download as JPG or PNG — all{" "}
              <strong className="text-black/80 font-medium">on your device</strong>.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Live preview" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

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
              How this works
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExplainerCard
              n="01"
              icon={<MousePointerClick size={18} />}
              title="Drop an image"
              desc="Any JPG, PNG, WebP, GIF, or BMP up to 25 MB. We read its exact dimensions."
            />
            <ExplainerCard
              n="02"
              icon={<Wand2 size={18} />}
              title="Set the target size"
              desc="Type pixels, drag a percentage, or click a social preset. Aspect ratio stays locked."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download it"
              desc="Get the resized image as JPG or PNG at the exact dimensions you chose."
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
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
                    />

                    <motion.div
                      animate={dragging ? { scale: 1.1, rotate: -4 } : { scale: 1, rotate: 0, y: [0, -6, 0] }}
                      transition={dragging
                        ? { type: "spring", stiffness: 300, damping: 20 }
                        : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${
                        dragging ? "bg-[#ff6a00]" : "bg-[#f4f1ea]"
                      }`}
                    >
                      <Scaling size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your image here" : "Drop an image to resize"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                      or click to browse. JPG, PNG, WebP, GIF, BMP — up to {MAX_SIZE_MB} MB.
                    </p>

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
                          <div className="text-[13.5px] font-medium text-black truncate">{file.name}</div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            {formatBytes(file.size)} · {srcW}×{srcH} · {aspectLabel}
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

                    {/* preview canvas */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-6 min-h-[280px] flex items-center justify-center p-3">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #d8d3c8 25%, transparent 25%), linear-gradient(-45deg, #d8d3c8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d3c8 75%), linear-gradient(-45deg, transparent 75%, #d8d3c8 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                        }}
                      />
                      <motion.canvas
                        ref={previewCanvasRef}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="relative z-10 max-w-full max-h-[480px] object-contain"
                      />

                      {/* dimensions badge */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white"
                      >
                        <Maximize2 size={11} className="text-[#ff6a00]" />
                        <span className="text-[10.5px] font-mono tracking-[0.12em]">
                          {srcW}×{srcH}
                          <span className="text-white/40 mx-1.5">→</span>
                          <span className="text-[#ff6a00]">
                            {targetDims.w}×{targetDims.h}
                          </span>
                        </span>
                      </motion.div>

                      {/* hold-to-compare */}
                      <motion.button
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        onMouseDown={() => setShowOriginal(true)}
                        onMouseUp={() => setShowOriginal(false)}
                        onMouseLeave={() => setShowOriginal(false)}
                        onTouchStart={() => setShowOriginal(true)}
                        onTouchEnd={() => setShowOriginal(false)}
                        className="absolute top-3 right-3 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/75 backdrop-blur-md text-white hover:bg-black transition-colors"
                      >
                        <Maximize2 size={12} />
                        <span className="text-[10.5px] font-mono uppercase tracking-[0.16em]">
                          {showOriginal ? "Showing original" : "Hold to compare"}
                        </span>
                      </motion.button>

                      {/* busy overlay */}
                      <AnimatePresence>
                        {busy && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 z-30 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
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
                              <div className="text-[13px] font-medium text-white">{stageLabel[stage]}</div>
                              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50 mt-1">
                                {stageStep[stage]}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* upscale warning */}
                    <AnimatePresence>
                      {isUpscale && !busy && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          className="overflow-hidden mb-4"
                        >
                          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
                            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-amber-800/90 leading-relaxed">
                              You're enlarging this image. Resizing can't add real detail —
                              for sharper upscaling, try the{" "}
                              <Link href="/image-tools/upscale-image" className="underline font-medium hover:text-amber-900">
                                Upscale Image
                              </Link>{" "}
                              tool instead.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                        whileHover={{ scale: busy || tooLarge ? 1 : 1.03 }}
                        whileTap={{ scale: busy || tooLarge ? 1 : 0.97 }}
                        onClick={convert}
                        disabled={busy || tooLarge}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Resizing…
                          </>
                        ) : (
                          <>
                            <Scaling size={15} />
                            Resize & download
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

          {/* ---------- RIGHT: Controls ---------- */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="lg:col-span-5 space-y-6"
          >

            {/* ---------- Mode ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Resize by" icon={<Ruler size={11} />} />

              <div className="grid grid-cols-2 gap-2 mb-6">
                <ModePill
                  icon={<Ruler size={15} />}
                  label="Pixels"
                  active={mode === "pixels"}
                  onClick={() => { setMode("pixels"); setConverted(null); }}
                />
                <ModePill
                  icon={<Percent size={15} />}
                  label="Percent"
                  active={mode === "percent"}
                  onClick={() => { setMode("percent"); setConverted(null); }}
                />
              </div>

              <AnimatePresence mode="wait">
                {mode === "pixels" ? (
                  <motion.div
                    key="pixels"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 mb-4">
                      <div>
                        <Label>Width (px)</Label>
                        <input
                          type="number"
                          value={pixelsW || ""}
                          min={1}
                          max={MAX_DIM}
                          onChange={(e) => updateW(Number(e.target.value) || 0)}
                          className="w-full mt-2 px-3 py-2.5 rounded-xl border border-black/[0.10] bg-white text-[13.5px] font-mono outline-none focus:border-[#ff6a00] transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => setLockAspect((v) => !v)}
                        className={`mb-1.5 w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                          lockAspect
                            ? "border-[#ff6a00] bg-[#ff6a00]/10 text-[#ff6a00]"
                            : "border-black/[0.10] text-black/40 hover:border-black/30"
                        }`}
                        title={lockAspect ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                      >
                        {lockAspect ? <Link2 size={13} /> : <Link2Off size={13} />}
                      </button>
                      <div>
                        <Label>Height (px)</Label>
                        <input
                          type="number"
                          value={pixelsH || ""}
                          min={1}
                          max={MAX_DIM}
                          onChange={(e) => updateH(Number(e.target.value) || 0)}
                          className="w-full mt-2 px-3 py-2.5 rounded-xl border border-black/[0.10] bg-white text-[13.5px] font-mono outline-none focus:border-[#ff6a00] transition-colors"
                        />
                      </div>
                    </div>

                    {srcW > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-black/45">
                        <span>Original: {srcW}×{srcH}</span>
                        <span className="text-black/25">·</span>
                        <span className="text-black/75">
                          Result: {targetDims.w}×{targetDims.h}
                        </span>
                        {aspectLabel && (
                          <>
                            <span className="text-black/25">·</span>
                            <span>{aspectLabel}</span>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="percent"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* percent quick buttons */}
                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {[25, 50, 75, 100].map((p) => (
                        <PercentPill
                          key={p}
                          value={p}
                          active={percent === p}
                          onClick={() => { setPercent(p); setConverted(null); }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <Label>Scale</Label>
                      <motion.div
                        key={percent}
                        initial={{ scale: 1.15, color: "#ff6a00" }}
                        animate={{ scale: 1, color: "#00000099" }}
                        transition={{ duration: 0.2 }}
                        className="text-[12px] font-mono"
                      >
                        {percent}%
                      </motion.div>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={200}
                      step={1}
                      value={percent}
                      onChange={(e) => { setPercent(Number(e.target.value)); setConverted(null); }}
                      className="w-full accent-[#ff6a00]"
                    />

                    {srcW > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-black/45">
                        <span>Result:</span>
                        <span className="text-black/75">
                          {targetDims.w}×{targetDims.h}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {tooLarge && (
                <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
                  <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-800/90 leading-relaxed">
                    Target exceeds the {MAX_DIM}px safe limit. Lower the dimensions.
                  </p>
                </div>
              )}
            </motion.div>

            {/* ---------- Presets ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Quick presets" icon={<Grid3x3 size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                Common social, video, and print sizes. Note: presets ignore aspect ratio — the
                image will be stretched to fit.
              </p>

              <div className="space-y-4">
                {Object.entries(presetGroups).map(([group, items]) => (
                  <div key={group}>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/35 mb-2">
                      {group}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((p) => {
                        const active = pixelsW === p.w && pixelsH === p.h && mode === "pixels";
                        return (
                          <button
                            key={p.label}
                            onClick={() => applyPreset(p.w, p.h)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${
                              active
                                ? "border-[#ff6a00] bg-[#ff6a00]/10 text-[#ff6a00]"
                                : "border-black/[0.10] bg-white text-black/65 hover:border-black/30"
                            }`}
                          >
                            {p.label}
                            <span className="ml-1.5 font-mono text-[9.5px] opacity-60">
                              {p.w}×{p.h}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ---------- Output ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Output" icon={<Layers size={11} />} />

              <div className="grid grid-cols-2 gap-2 mb-5">
                <TypePill
                  icon={<Layers size={15} />}
                  label="JPG"
                  active={format === "image/jpeg"}
                  onClick={() => { setFormat("image/jpeg"); setConverted(null); }}
                />
                <TypePill
                  icon={<Layers size={15} />}
                  label="PNG"
                  active={format === "image/png"}
                  onClick={() => { setFormat("image/png"); setConverted(null); }}
                />
              </div>

              {format === "image/jpeg" ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>JPG quality</Label>
                    <motion.div
                      key={quality}
                      initial={{ scale: 1.15, color: "#ff6a00" }}
                      animate={{ scale: 1, color: "#00000099" }}
                      transition={{ duration: 0.25 }}
                      className="text-[11px] font-mono"
                    >
                      {quality}%
                    </motion.div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-[#ff6a00]"
                  />
                </div>
              ) : (
                <p className="text-[12px] leading-relaxed text-black/50">
                  PNG is lossless and preserves transparency, at the cost of a larger file.
                </p>
              )}
            </motion.div>

            {/* ---------- Result ---------- */}
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
                        Resized & ready
                      </span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-[19px] leading-tight mb-1 break-all"
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
                      {converted.w}×{converted.h} · {formatBytes(converted.size)}
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
                      Download resized
                      <ArrowUpRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </motion.a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---------- What this tool does ---------- */}
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
                  <strong className="text-black">Three ways to resize:</strong> exact pixels, a percentage scale, or ready-made presets for social, video, and print.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Aspect ratio lock</strong> — edit either width or height and the other follows automatically. Unlock to stretch.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">High-quality resampling</strong> — uses the browser's best bicubic algorithm so downscales look clean.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Live preview</strong> — every change updates the canvas in real time. Dimensions appear inline so you always know what you'll get.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs entirely in your browser.</strong> No upload, no server, no queue.
                </FeatureRow>
              </ul>
            </motion.div>

            {/* ---------- Privacy ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Your image never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Resizing happens on an HTML5 Canvas in your browser. There is no backend, no
                upload, and no tracking — open DevTools and you'll see zero network requests when
                you resize.
              </p>
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
function SectionTitle({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-black/[0.06]">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
        {label}
      </span>
      {icon && <span className="text-[#ff6a00]/60 ml-auto">{icon}</span>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
      {children}
    </div>
  );
}

function ModePill({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 py-3.5 rounded-xl border text-[12.5px] font-medium transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      <span className={active ? "text-[#ff6a00]" : "text-black/50"}>{icon}</span>
      {label}
      {active && (
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="absolute top-1.5 right-1.5"
        >
          <Check size={10} className="text-[#ff6a00]" />
        </motion.span>
      )}
    </motion.button>
  );
}

function PercentPill({
  value, active, onClick,
}: {
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative py-2.5 rounded-xl border text-[12.5px] font-mono transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      {value}%
      {active && (
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="absolute top-1 right-1"
        >
          <Check size={9} className="text-[#ff6a00]" />
        </motion.span>
      )}
    </motion.button>
  );
}

function TypePill({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border text-[12.5px] font-medium transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      {icon}
      {label}
      {active && (
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="absolute top-1.5 right-1.5"
        >
          <Check size={10} className="text-[#ff6a00]" />
        </motion.span>
      )}
    </motion.button>
  );
}

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
  n, icon, title, desc,
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

export default ResizeImage;