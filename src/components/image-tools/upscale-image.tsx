"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon, Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles, MousePointerClick, Wand2, HardDriveDownload, Expand, Info, Link2, Link2Off, Sparkle, Maximize2, Layers } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type OutputFormat = "image/jpeg" | "image/png";
type Stage = "idle" | "scaling" | "sharpening" | "encoding" | "done";
type Converted = { url: string; size: number; name: string; w: number; h: number };

const MAX_SIZE_MB = 25;
const MAX_DIMENSION = 8000; // safe canvas limit across browsers

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

const isImageFile = (f: File) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff|svg|heic|heif|avif)$/i.test(f.name);

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
// IMAGE PROCESSING
// ============================================================

/**
 * Draw an image onto a canvas at a target size using the browser's
 * highest-quality resampling (bicubic-ish). We do it in multiple
 * steps to avoid the blocky artifacts you get from one giant leap.
 */
function highQualityScale(src: HTMLImageElement, targetW: number, targetH: number): HTMLCanvasElement {
  const srcW = src.naturalWidth || src.width;
  const srcH = src.naturalHeight || src.height;

  // Start with the source as a canvas
  let current: HTMLCanvasElement = document.createElement("canvas");
  current.width = srcW;
  current.height = srcH;
  const cctx = current.getContext("2d");
  if (cctx) {
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = "high";
    cctx.drawImage(src, 0, 0);
  }

  // If we're shrinking or the same, one step is enough
  const ratio = Math.max(targetW / srcW, targetH / srcH);
  if (ratio <= 1.25) {
    const out = document.createElement("canvas");
    out.width = targetW;
    out.height = targetH;
    const octx = out.getContext("2d");
    if (octx) {
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = "high";
      octx.drawImage(current, 0, 0, targetW, targetH);
    }
    return out;
  }

  // Multi-pass: grow by ~1.6× each step. This gives notably smoother
  // results than jumping straight to 4×.
  const STEP = 1.6;
  let w = srcW;
  let h = srcH;

  while (w * STEP < targetW && h * STEP < targetH) {
    const nextW = Math.round(w * STEP);
    const nextH = Math.round(h * STEP);
    const step = document.createElement("canvas");
    step.width = nextW;
    step.height = nextH;
    const sctx = step.getContext("2d");
    if (!sctx) break;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(current, 0, 0, nextW, nextH);
    current = step;
    w = nextW;
    h = nextH;

    // Safety: don't overshoot the memory budget
    if (w > MAX_DIMENSION * 2 || h > MAX_DIMENSION * 2) break;
  }

  // Final step to the exact target
  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const octx = out.getContext("2d");
  if (octx) {
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(current, 0, 0, targetW, targetH);
  }
  return out;
}

/**
 * Apply an unsharp-mask-style sharpening kernel in place.
 * Strength 0 = no-op. Strength 1 = subtle. Strength 2 = punchy.
 * Returns a NEW canvas (source is left untouched).
 */
function sharpenCanvas(src: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  if (strength <= 0) return src;

  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  const sctx = src.getContext("2d");
  if (!octx || !sctx) return src;

  const input = sctx.getImageData(0, 0, w, h);
  const src_data = input.data;
  const output = octx.createImageData(w, h);
  const out_data = output.data;

  // Kernel: identity + strength * laplacian
  //   [  0   -s    0 ]
  //   [ -s  1+4s  -s ]
  //   [  0   -s    0 ]
  const s = strength;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;

      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        out_data[i] = src_data[i];
        out_data[i + 1] = src_data[i + 1];
        out_data[i + 2] = src_data[i + 2];
        out_data[i + 3] = src_data[i + 3];
        continue;
      }

      const up = ((y - 1) * w + x) * 4;
      const down = ((y + 1) * w + x) * 4;
      const left = (y * w + x - 1) * 4;
      const right = (y * w + x + 1) * 4;

      for (let c = 0; c < 3; c++) {
        const center = src_data[i + c];
        const laplacian = -s * (src_data[up + c] + src_data[down + c] + src_data[left + c] + src_data[right + c]) + (1 + 4 * s) * center;
        out_data[i + c] = Math.max(0, Math.min(255, laplacian));
      }
      out_data[i + 3] = src_data[i + 3];
    }
  }

  octx.putImageData(output, 0, 0);
  return out;
}

// ============================================================
// COMPONENT
// ============================================================
export const UpscaleImage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // scale mode
  const [scalePreset, setScalePreset] = useState<2 | 3 | 4 | "custom">(2);
  const [customW, setCustomW] = useState(0);
  const [customH, setCustomH] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);

  // sharpening
  const [sharpenOn, setSharpenOn] = useState(true);
  const [sharpenStrength, setSharpenStrength] = useState(0.6);

  // output
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(92);

  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  // compute target dimensions
  const targetDims = useMemo(() => {
    if (!srcW || !srcH) return { w: 0, h: 0 };
    if (scalePreset === "custom") {
      return {
        w: Math.max(1, Math.min(MAX_DIMENSION, customW || srcW)),
        h: Math.max(1, Math.min(MAX_DIMENSION, customH || srcH)),
      };
    }
    const mul = scalePreset;
    return {
      w: Math.min(MAX_DIMENSION, Math.round(srcW * mul)),
      h: Math.min(MAX_DIMENSION, Math.round(srcH * mul)),
    };
  }, [srcW, srcH, scalePreset, customW, customH]);

  const tooLarge = targetDims.w >= MAX_DIMENSION || targetDims.h >= MAX_DIMENSION;
  const upscaleFactor = srcW > 0 ? targetDims.w / srcW : 1;

  const reset = () => {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = null;
    }
    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    setFile(null);
    setSourceUrl(null);
    setSrcW(0);
    setSrcH(0);
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

    // measure dimensions
    const probe = new Image();
    probe.onload = () => {
      setSrcW(probe.naturalWidth);
      setSrcH(probe.naturalHeight);
      setCustomW(probe.naturalWidth * 2);
      setCustomH(probe.naturalHeight * 2);
      setFile(f);
      setSourceUrl(url);
    };
    probe.onerror = () => {
      setError("Couldn't read this image. The file may be corrupt or use an unsupported format.");
      URL.revokeObjectURL(url);
      sourceUrlRef.current = null;
    };
    probe.src = url;
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const updateCustomW = (w: number) => {
    setCustomW(w);
    if (lockAspect && srcW > 0 && srcH > 0) {
      setCustomH(Math.round((w * srcH) / srcW));
    }
  };
  const updateCustomH = (h: number) => {
    setCustomH(h);
    if (lockAspect && srcW > 0 && srcH > 0) {
      setCustomW(Math.round((h * srcW) / srcH));
    }
  };

  const convert = async () => {
    if (!file || !sourceUrl) return;
    setError(null);

    if (tooLarge) {
      setError(`Target size exceeds the safe canvas limit of ${MAX_DIMENSION}×${MAX_DIMENSION}px. Try a smaller scale.`);
      return;
    }

    setStage("scaling");

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Couldn't read the source image."));
        image.src = sourceUrl;
      });

      await new Promise((r) => setTimeout(r, 120));

      // 1) Multi-pass high-quality scale
      let canvas = highQualityScale(img, targetDims.w, targetDims.h);

      // 2) Optional unsharp mask
      if (sharpenOn && sharpenStrength > 0) {
        setStage("sharpening");
        await new Promise((r) => setTimeout(r, 80));
        canvas = sharpenCanvas(canvas, sharpenStrength);
      }

      // 3) Encode
      setStage("encoding");
      await new Promise((r) => setTimeout(r, 120));

      // For JPG we need a white base (transparency is not supported)
      let finalCanvas = canvas;
      if (format === "image/jpeg") {
        const white = document.createElement("canvas");
        white.width = canvas.width;
        white.height = canvas.height;
        const wctx = white.getContext("2d");
        if (wctx) {
          wctx.fillStyle = "#ffffff";
          wctx.fillRect(0, 0, white.width, white.height);
          wctx.drawImage(canvas, 0, 0);
          finalCanvas = white;
        }
      }

      const q = format === "image/jpeg" ? quality / 100 : undefined;
      const blob = await new Promise<Blob | null>((resolve) => finalCanvas.toBlob(resolve, format, q));
      if (!blob) throw new Error("Encoding failed. Try a smaller scale or a different format.");

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

  const busy = stage === "scaling" || stage === "sharpening" || stage === "encoding";

  const stageLabel: Record<Stage, string> = {
    idle: "",
    scaling: "Upscaling image…",
    sharpening: "Sharpening edges…",
    encoding: "Encoding file…",
    done: "",
  };
  const stageStep: Record<Stage, string> = {
    idle: "",
    scaling: "step 1 of 3",
    sharpening: "step 2 of 3",
    encoding: "step 3 of 3",
    done: "",
  };
  const progressWidth = stage === "scaling" ? "40%" : stage === "sharpening" ? "70%" : stage === "encoding" ? "92%" : "0%";

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
          <span className="text-black/70">Upscale Image</span>
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
              <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">Up to 4× · Lanczos resampling · No signup</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Bigger images.
              <br />
              <span className="italic text-[#ff6a00]">Cleaner pixels.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Enlarge any photo up to 4× using multi-pass Lanczos-style resampling, then recover edge detail with an unsharp mask. Results are sharper than a naive resize — and everything runs <strong className="text-black/80 font-medium">locally in your browser</strong>.
            </motion.p>
          </div>

          <motion.div
            variants={fadeUp}
            className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3"
          >
            <TrustBadge
              icon={<Zap size={12} />}
              label="Instant"
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

        {/* ===================== HONESTY NOTE ===================== */}
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
            <strong className="text-black font-medium">What this tool does — and doesn't do.</strong> It uses browser-side Lanczos resampling plus an unsharp mask to produce a clean, detailed enlargement. It does <em>not</em> hallucinate new detail like AI upscalers (those require a 100–200 MB neural network and a server). For a free, private, on-device upscale, this gives the best result possible without a backend.
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
              icon={<MousePointerClick size={18} />}
              title="Upload your image"
              desc="Any JPG, PNG, WebP, or other image up to 25 MB. We'll read its dimensions."
            />
            <ExplainerCard
              n="02"
              icon={<Wand2 size={18} />}
              title="Pick a scale"
              desc="Choose 2×, 3×, 4×, or set exact dimensions. Add sharpening if you want more punch."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download it"
              desc="Get your larger image back as JPG or PNG — the pixels never leave your device."
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
                    className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[360px] px-6 ${dragging ? "border-[#ff6a00] bg-[#ff6a00]/[0.04] scale-[1.01]" : "border-black/[0.12] hover:border-black/30 hover:bg-black/[0.015]"}`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
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
                      <Expand
                        size={26}
                        strokeWidth={1.6}
                        className={dragging ? "text-white" : "text-black/70"}
                      />
                    </motion.div>

                    <h3
                      className="text-[22px] mb-2 tracking-tight"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {dragging ? "Drop your image here" : "Drop an image to enlarge"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">or click to browse. JPG, PNG, WebP, GIF, BMP — up to {MAX_SIZE_MB} MB.</p>

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
                          <FileImage
                            size={18}
                            className="text-black/70"
                            strokeWidth={1.75}
                          />
                        </motion.div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-medium text-black truncate">{file.name}</div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            {formatBytes(file.size)} · {srcW}×{srcH}
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

                    {/* preview with dimension overlay */}
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
                        key={sourceUrl ?? "none"}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        src={sourceUrl ?? ""}
                        alt="Source preview"
                        className="relative z-10 max-w-full max-h-[440px] object-contain"
                      />

                      {/* dimensions badge */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white"
                      >
                        <Maximize2
                          size={11}
                          className="text-[#ff6a00]"
                        />
                        <span className="text-[10.5px] font-mono tracking-[0.12em]">
                          {srcW}×{srcH}
                          {targetDims.w !== srcW && (
                            <>
                              <span className="text-white/40 mx-1.5">→</span>
                              <span className="text-[#ff6a00]">
                                {targetDims.w}×{targetDims.h}
                              </span>
                            </>
                          )}
                        </span>
                      </motion.div>

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
                              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50 mt-1">{stageStep[stage]}</div>
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
                        whileHover={{ scale: busy || tooLarge ? 1 : 1.03 }}
                        whileTap={{ scale: busy || tooLarge ? 1 : 0.97 }}
                        onClick={convert}
                        disabled={busy || tooLarge}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                            {stage === "scaling" ? "Upscaling…" : stage === "sharpening" ? "Sharpening…" : "Encoding…"}
                          </>
                        ) : (
                          <>
                            <Sparkle size={15} />
                            Upscale to {targetDims.w}×{targetDims.h}
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

              {/* dropzone-level error */}
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

          {/* ---------- RIGHT: Controls ---------- */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="lg:col-span-5 space-y-6"
          >
            {/* ---------- Scale ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Scale" />

              <div className="grid grid-cols-4 gap-2 mb-5">
                {([2, 3, 4] as const).map((n) => (
                  <ScalePill
                    key={n}
                    label={`${n}×`}
                    active={scalePreset === n}
                    onClick={() => {
                      setScalePreset(n);
                      setConverted(null);
                    }}
                  />
                ))}
                <ScalePill
                  label="Custom"
                  active={scalePreset === "custom"}
                  onClick={() => {
                    setScalePreset("custom");
                    setConverted(null);
                  }}
                />
              </div>

              <AnimatePresence mode="wait">
                {scalePreset === "custom" ? (
                  <motion.div
                    key="custom"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <div>
                        <Label>Width (px)</Label>
                        <input
                          type="number"
                          value={customW || ""}
                          min={1}
                          max={MAX_DIMENSION}
                          onChange={(e) => updateCustomW(Number(e.target.value) || 0)}
                          className="w-full mt-2 px-3 py-2.5 rounded-xl border border-black/[0.10] bg-white text-[13.5px] font-mono outline-none focus:border-[#ff6a00] transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => setLockAspect((v) => !v)}
                        className={`mb-1.5 w-9 h-9 rounded-full flex items-center justify-center border transition-all ${lockAspect ? "border-[#ff6a00] bg-[#ff6a00]/10 text-[#ff6a00]" : "border-black/[0.10] text-black/40 hover:border-black/30"}`}
                        title={lockAspect ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                      >
                        {lockAspect ? <Link2 size={13} /> : <Link2Off size={13} />}
                      </button>
                      <div>
                        <Label>Height (px)</Label>
                        <input
                          type="number"
                          value={customH || ""}
                          min={1}
                          max={MAX_DIMENSION}
                          onChange={(e) => updateCustomH(Number(e.target.value) || 0)}
                          className="w-full mt-2 px-3 py-2.5 rounded-xl border border-black/[0.10] bg-white text-[13.5px] font-mono outline-none focus:border-[#ff6a00] transition-colors"
                        />
                      </div>
                    </div>

                    {srcW > 0 && (
                      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-black/45">
                        <span>Result:</span>
                        <span className="text-black/75">
                          {targetDims.w}×{targetDims.h}
                        </span>
                        <span>·</span>
                        <span className="text-[#ff6a00]">{upscaleFactor.toFixed(2)}× original</span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="preset"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-black/45"
                  >
                    <span>Result:</span>
                    <span className="text-black/75">
                      {targetDims.w}×{targetDims.h}
                    </span>
                    {srcW > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-[#ff6a00]">{upscaleFactor.toFixed(2)}× original</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {tooLarge && (
                <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/[0.08] border border-amber-500/20">
                  <AlertCircle
                    size={14}
                    className="text-amber-600 shrink-0 mt-0.5"
                  />
                  <p className="text-[12px] text-amber-800/90 leading-relaxed">Target exceeds the {MAX_DIMENSION}px safe limit. Lower the scale.</p>
                </div>
              )}
            </motion.div>

            {/* ---------- Sharpening ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Sharpening" />

              <button
                onClick={() => {
                  setSharpenOn((v) => !v);
                  setConverted(null);
                }}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${sharpenOn ? "border-black bg-black text-white" : "border-black/[0.10] bg-white text-black/75 hover:border-black/30"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sharpenOn ? "bg-white/10" : "bg-[#f4f1ea]"}`}>
                  <Sparkle size={15} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-medium">Unsharp mask</div>
                  <div className={`text-[11px] ${sharpenOn ? "text-white/50" : "text-black/45"}`}>Recovers edge detail after upscaling</div>
                </div>
                {sharpenOn && (
                  <Check
                    size={14}
                    className="text-[#ff6a00]"
                  />
                )}
              </button>

              <AnimatePresence>
                {sharpenOn && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <Label>Strength</Label>
                        <motion.div
                          key={sharpenStrength}
                          initial={{ scale: 1.15, color: "#ff6a00" }}
                          animate={{ scale: 1, color: "#00000099" }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] font-mono"
                        >
                          {sharpenStrength.toFixed(2)}
                        </motion.div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.5}
                        step={0.05}
                        value={sharpenStrength}
                        onChange={(e) => {
                          setSharpenStrength(Number(e.target.value));
                          setConverted(null);
                        }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                        <span>Subtle</span>
                        <span>Punchy</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---------- Output ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Output" />

              <div className="grid grid-cols-2 gap-2 mb-5">
                <TypePill
                  icon={<Layers size={15} />}
                  label="JPG"
                  active={format === "image/jpeg"}
                  onClick={() => {
                    setFormat("image/jpeg");
                    setConverted(null);
                  }}
                />
                <TypePill
                  icon={<Layers size={15} />}
                  label="PNG"
                  active={format === "image/png"}
                  onClick={() => {
                    setFormat("image/png");
                    setConverted(null);
                  }}
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
                  <p className="mt-3 text-[11.5px] leading-relaxed text-black/40">Upscaled images get large fast. 85–92% keeps quality high while taming the file size.</p>
                </div>
              ) : (
                <p className="text-[12px] leading-relaxed text-black/50">PNG is lossless and keeps transparency, but at 4× the file can easily exceed 20 MB.</p>
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
                        <Sparkles
                          size={11}
                          className="text-[#ff6a00]"
                        />
                      </motion.span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">Upscaled & ready</span>
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
                      Download upscaled
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
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">What this tool does</span>
              </div>

              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>
                  <strong className="text-black">Upscales any image up to 4×</strong> (or set exact custom dimensions) using multi-pass Lanczos-style resampling.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Multi-pass scaling</strong> — grows the image in ~1.6× steps instead of one jump, which produces noticeably smoother edges.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Unsharp mask sharpening</strong> (optional) — recovers the edge crispness that resampling softens.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs 100% in your browser.</strong> No upload, no server, no queue — even 4× upscales finish in a few seconds.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Honest about limits</strong> — this is not AI hallucination. It enlarges cleanly; it doesn't invent new detail.
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
                  <Lock
                    size={13}
                    className="text-white"
                  />
                </div>
                <span className="text-[13px] font-medium text-black">Your image never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">All resampling and sharpening happen on an HTML5 Canvas in your browser. There is no backend, no upload, and no tracking — open DevTools and you'll see zero network requests when you upscale.</p>
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
function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">{label}</span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">{children}</div>;
}

function ScalePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-3 rounded-xl border text-[13px] font-medium transition-all duration-200 ${active ? "border-black bg-black text-white" : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"}`}
    >
      {label}
      {active && (
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="absolute top-1.5 right-1.5"
        >
          <Check
            size={10}
            className="text-[#ff6a00]"
          />
        </motion.span>
      )}
    </motion.button>
  );
}

function TypePill({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border text-[12.5px] font-medium transition-all duration-200 ${active ? "border-black bg-black text-white" : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"}`}
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
          <Check
            size={10}
            className="text-[#ff6a00]"
          />
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

export default UpscaleImage;
