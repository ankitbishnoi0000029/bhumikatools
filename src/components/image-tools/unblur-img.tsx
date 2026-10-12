"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, Focus,
  Sparkle, Layers, Eye, Filter,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type OutputFormat = "image/jpeg" | "image/png";
type Stage = "idle" | "blurring" | "sharpening" | "clarity" | "encoding" | "done";
type Converted = { url: string; size: number; name: string };

const MAX_SIZE_MB = 25;
const PREVIEW_MAX = 900; // longest side of the live preview canvas

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
// IMAGE PIPELINE
// ============================================================

/**
 * Unsharp mask using GPU-accelerated blur.
 * sharp = original + amount * (original - blurred)
 */
function unsharpMask(
  src: HTMLCanvasElement,
  amount: number,
  radiusPx: number
): HTMLCanvasElement {
  if (amount <= 0 || radiusPx <= 0) return src;

  const w = src.width;
  const h = src.height;

  // 1) blurred copy via ctx.filter (GPU-accelerated)
  const blurred = document.createElement("canvas");
  blurred.width = w;
  blurred.height = h;
  const bctx = blurred.getContext("2d");
  if (!bctx) return src;
  bctx.filter = `blur(${radiusPx}px)`;
  bctx.drawImage(src, 0, 0);
  bctx.filter = "none";

  // 2) pixel math
  const sctx = src.getContext("2d");
  if (!sctx) return src;

  const sImg = sctx.getImageData(0, 0, w, h);
  const bImg = bctx.getImageData(0, 0, w, h);
  const s = sImg.data;
  const b = bImg.data;

  const out = sctx.createImageData(w, h);
  const o = out.data;

  for (let i = 0; i < s.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = s[i + c];
      const blur = b[i + c];
      const v = orig + amount * (orig - blur);
      o[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
    o[i + 3] = s[i + 3];
  }

  const result = document.createElement("canvas");
  result.width = w;
  result.height = h;
  const rctx = result.getContext("2d");
  if (!rctx) return src;
  rctx.putImageData(out, 0, 0);
  return result;
}

/**
 * Global contrast boost around 128.
 * amount: 0 = no-op, 1 = strong.
 */
function boostContrast(src: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  if (amount <= 0) return src;
  const w = src.width, h = src.height;
  const sctx = src.getContext("2d");
  if (!sctx) return src;

  const img = sctx.getImageData(0, 0, w, h);
  const d = img.data;

  // pivot at 128, scale around it
  const factor = 1 + amount;

  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = (d[i + c] - 128) * factor + 128;
      d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }

  const result = document.createElement("canvas");
  result.width = w;
  result.height = h;
  const rctx = result.getContext("2d");
  if (!rctx) return src;
  rctx.putImageData(img, 0, 0);
  return result;
}

/**
 * Full pipeline: sharpen → clarity → contrast.
 * Returns a new canvas.
 */
function processImage(
  src: HTMLCanvasElement,
  opts: {
    sharpenAmount: number;
    sharpenRadius: number;
    clarityAmount: number;
    clarityRadius: number;
    contrast: number;
  }
): HTMLCanvasElement {
  let out = src;

  // 1) Fine sharpening — recovers edge detail
  if (opts.sharpenAmount > 0) {
    out = unsharpMask(out, opts.sharpenAmount, opts.sharpenRadius);
  }

  // 2) Clarity — larger radius, adds mid-tone local contrast
  if (opts.clarityAmount > 0) {
    out = unsharpMask(out, opts.clarityAmount, opts.clarityRadius);
  }

  // 3) Global contrast
  if (opts.contrast > 0) {
    out = boostContrast(out, opts.contrast);
  }

  return out;
}

// ============================================================
// COMPONENT
// ============================================================
export const UnblurImage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // sharpen / deblur controls
  const [sharpenAmount, setSharpenAmount] = useState(0.8);
  const [sharpenRadius, setSharpenRadius] = useState(1.2);
  const [clarityAmount, setClarityAmount] = useState(0.25);
  const [clarityRadius, setClarityRadius] = useState(14);
  const [contrast, setContrast] = useState(0.05);

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

  // downscaled source, kept in a ref for fast preview reprocessing
  const previewSourceRef = useRef<HTMLCanvasElement | null>(null);
  const fullSourceRef = useRef<HTMLCanvasElement | null>(null);

  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  const reset = () => {
    if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }
    setFile(null); setSourceUrl(null);
    setSrcW(0); setSrcH(0);
    setConverted(null); setError(null); setStage("idle");
    setShowOriginal(false);
    setPreviewReady(false);
    previewSourceRef.current = null;
    fullSourceRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null); setConverted(null); setStage("idle");
    setShowOriginal(false);
    setPreviewReady(false);
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
      const w = probe.naturalWidth;
      const h = probe.naturalHeight;
      setSrcW(w); setSrcH(h);

      // Full-res source canvas for final export
      const full = document.createElement("canvas");
      full.width = w; full.height = h;
      const fctx = full.getContext("2d");
      if (fctx) fctx.drawImage(probe, 0, 0);
      fullSourceRef.current = full;

      // Preview-sized source canvas for fast iteration
      const ratio = Math.min(1, PREVIEW_MAX / Math.max(w, h));
      const pw = Math.max(1, Math.round(w * ratio));
      const ph = Math.max(1, Math.round(h * ratio));
      const prev = document.createElement("canvas");
      prev.width = pw; prev.height = ph;
      const pctx = prev.getContext("2d");
      if (pctx) {
        pctx.imageSmoothingEnabled = true;
        pctx.imageSmoothingQuality = "high";
        pctx.drawImage(probe, 0, 0, pw, ph);
      }
      previewSourceRef.current = prev;

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

  // ---------- live preview ----------
  useEffect(() => {
    if (!previewReady) return;
    const src = previewSourceRef.current;
    const dst = previewCanvasRef.current;
    if (!src || !dst) return;

    let cancelled = false;

    // debounce heavy pixel work
    const t = window.setTimeout(() => {
      if (cancelled) return;

      // Original / processed toggle
      const base = src;

      if (showOriginal) {
        dst.width = base.width;
        dst.height = base.height;
        const dctx = dst.getContext("2d");
        if (dctx) {
          dctx.clearRect(0, 0, dst.width, dst.height);
          dctx.drawImage(base, 0, 0);
        }
        return;
      }

      // scale radius to preview size
      const prevRatio = base.width / Math.max(1, srcW);
      const rSmall = Math.max(0.4, sharpenRadius * prevRatio);
      const rLarge = Math.max(2, clarityRadius * prevRatio);

      const processed = processImage(base, {
        sharpenAmount,
        sharpenRadius: rSmall,
        clarityAmount,
        clarityRadius: rLarge,
        contrast,
      });

      dst.width = processed.width;
      dst.height = processed.height;
      const dctx = dst.getContext("2d");
      if (dctx) {
        dctx.clearRect(0, 0, dst.width, dst.height);
        dctx.drawImage(processed, 0, 0);
      }
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [previewReady, sharpenAmount, sharpenRadius, clarityAmount, clarityRadius, contrast, showOriginal, srcW]);

  const convert = async () => {
    if (!file || !fullSourceRef.current) return;
    setError(null);
    setStage("blurring");

    try {
      const full = fullSourceRef.current;

      await new Promise((r) => setTimeout(r, 120));
      setStage("sharpening");

      // Full-res: apply fine sharpen
      let out = full;
      if (sharpenAmount > 0) {
        out = unsharpMask(out, sharpenAmount, sharpenRadius);
      }

      await new Promise((r) => setTimeout(r, 80));
      setStage("clarity");

      if (clarityAmount > 0) {
        out = unsharpMask(out, clarityAmount, clarityRadius);
      }

      if (contrast > 0) {
        out = boostContrast(out, contrast);
      }

      await new Promise((r) => setTimeout(r, 120));
      setStage("encoding");

      // JPG needs a white base
      let finalCanvas = out;
      if (format === "image/jpeg") {
        const white = document.createElement("canvas");
        white.width = out.width;
        white.height = out.height;
        const wctx = white.getContext("2d");
        if (wctx) {
          wctx.fillStyle = "#ffffff";
          wctx.fillRect(0, 0, white.width, white.height);
          wctx.drawImage(out, 0, 0);
          finalCanvas = white;
        }
      }

      const q = format === "image/jpeg" ? quality / 100 : undefined;
      const blob = await new Promise<Blob | null>((resolve) =>
        finalCanvas.toBlob(resolve, format, q)
      );
      if (!blob) throw new Error("Encoding failed. Please try again.");

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      const ext = format === "image/jpeg" ? "jpg" : "png";
      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file.name)}-unblurred.${ext}`,
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  const busy =
    stage === "blurring" ||
    stage === "sharpening" ||
    stage === "clarity" ||
    stage === "encoding";

  const stageLabel: Record<Stage, string> = {
    idle: "",
    blurring: "Analysing blur…",
    sharpening: "Sharpening edges…",
    clarity: "Boosting clarity…",
    encoding: "Encoding file…",
    done: "",
  };
  const stageStep: Record<Stage, string> = {
    idle: "",
    blurring: "step 1 of 4",
    sharpening: "step 2 of 4",
    clarity: "step 3 of 4",
    encoding: "step 4 of 4",
    done: "",
  };
  const progressWidth =
    stage === "blurring" ? "22%" :
    stage === "sharpening" ? "48%" :
    stage === "clarity" ? "72%" :
    stage === "encoding" ? "92%" : "0%";

  const previewScale = useMemo(() => {
    if (!srcW) return 1;
    return previewSourceRef.current
      ? previewSourceRef.current.width / srcW
      : 1;
  }, [srcW, previewReady]);

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
          <span className="text-black/70">Unblur Image</span>
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
                Live preview · Multi-pass · No signup
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Blurry photos.
              <br />
              <span className="italic text-[#ff6a00]">Sharpened up.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Recover edge definition with a multi-scale unsharp mask — fine sharpening for
              detail, a wider clarity pass for mid-tone structure, plus optional contrast.
              Everything runs <strong className="text-black/80 font-medium">locally in your browser</strong>, with live preview.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Live preview" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
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
            <Info size={16} className="text-[#ff6a00]" />
          </div>
          <div className="text-[13px] leading-relaxed text-black/70">
            <strong className="text-black font-medium">What this tool can and can't do.</strong>{" "}
            It significantly sharpens soft or slightly blurry photos by amplifying edge contrast
            at multiple scales. It will <em>not</em> fully restore a badly motion-blurred or
            out-of-focus shot — that requires AI hallucination. Push the sliders gently: too
            much sharpening introduces halos and grain.
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
              How this works
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExplainerCard
              n="01"
              icon={<MousePointerClick size={18} />}
              title="Upload a soft photo"
              desc="Any JPG, PNG, WebP, or other image up to 25 MB. Blurry phone shots work great."
            />
            <ExplainerCard
              n="02"
              icon={<Wand2 size={18} />}
              title="Tune the sliders"
              desc="Sharpen, clarity, and contrast update the live preview instantly — no waiting."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the sharpened image"
              desc="Get the full-resolution result as JPG or PNG. Your file never leaves the browser."
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
                      <Focus size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your photo here" : "Drop a blurry photo here"}
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

                    {/* live preview canvas */}
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
                      <canvas
                        ref={previewCanvasRef}
                        className="relative z-10 max-w-full max-h-[500px] object-contain"
                      />

                      {/* original / processed toggle */}
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
                        <Eye size={12} />
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
                            Processing…
                          </>
                        ) : (
                          <>
                            <Sparkle size={15} />
                            Apply & download
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

            {/* ---------- Sharpen ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Sharpen" icon={<Sparkle size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                Recovers fine edge detail. Too much creates halos.
              </p>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <Label>Amount</Label>
                  <motion.div
                    key={sharpenAmount}
                    initial={{ scale: 1.15, color: "#ff6a00" }}
                    animate={{ scale: 1, color: "#00000099" }}
                    transition={{ duration: 0.2 }}
                    className="text-[11px] font-mono"
                  >
                    {Math.round(sharpenAmount * 100)}%
                  </motion.div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={sharpenAmount}
                  onChange={(e) => { setSharpenAmount(Number(e.target.value)); setConverted(null); }}
                  className="w-full accent-[#ff6a00]"
                />
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                  <span>None</span>
                  <span>Strong</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Radius</Label>
                  <motion.div
                    key={sharpenRadius}
                    initial={{ scale: 1.15, color: "#ff6a00" }}
                    animate={{ scale: 1, color: "#00000099" }}
                    transition={{ duration: 0.2 }}
                    className="text-[11px] font-mono"
                  >
                    {sharpenRadius.toFixed(1)}px
                  </motion.div>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={4}
                  step={0.1}
                  value={sharpenRadius}
                  onChange={(e) => { setSharpenRadius(Number(e.target.value)); setConverted(null); }}
                  className="w-full accent-[#ff6a00]"
                />
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                  <span>Fine detail</span>
                  <span>Broad edges</span>
                </div>
              </div>
            </motion.div>

            {/* ---------- Clarity ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Clarity" icon={<Filter size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                Adds mid-tone local contrast — makes the whole image feel crisper.
              </p>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <Label>Amount</Label>
                  <motion.div
                    key={clarityAmount}
                    initial={{ scale: 1.15, color: "#ff6a00" }}
                    animate={{ scale: 1, color: "#00000099" }}
                    transition={{ duration: 0.2 }}
                    className="text-[11px] font-mono"
                  >
                    {Math.round(clarityAmount * 100)}%
                  </motion.div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.05}
                  value={clarityAmount}
                  onChange={(e) => { setClarityAmount(Number(e.target.value)); setConverted(null); }}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Radius</Label>
                  <motion.div
                    key={clarityRadius}
                    initial={{ scale: 1.15, color: "#ff6a00" }}
                    animate={{ scale: 1, color: "#00000099" }}
                    transition={{ duration: 0.2 }}
                    className="text-[11px] font-mono"
                  >
                    {clarityRadius}px
                  </motion.div>
                </div>
                <input
                  type="range"
                  min={4}
                  max={40}
                  step={1}
                  value={clarityRadius}
                  onChange={(e) => { setClarityRadius(Number(e.target.value)); setConverted(null); }}
                  className="w-full accent-[#ff6a00]"
                />
                <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                  <span>Tight</span>
                  <span>Broad</span>
                </div>
              </div>
            </motion.div>

            {/* ---------- Contrast ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Contrast" icon={<Layers size={11} />} />

              <div className="flex items-center justify-between mb-2">
                <Label>Boost</Label>
                <motion.div
                  key={contrast}
                  initial={{ scale: 1.15, color: "#ff6a00" }}
                  animate={{ scale: 1, color: "#00000099" }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] font-mono"
                >
                  +{Math.round(contrast * 100)}%
                </motion.div>
              </div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={contrast}
                onChange={(e) => { setContrast(Number(e.target.value)); setConverted(null); }}
                className="w-full accent-[#ff6a00]"
              />
              <p className="mt-3 text-[11.5px] leading-relaxed text-black/40">
                A small boost (5–15%) enhances the perceived sharpness. Go too far and shadows crush.
              </p>
            </motion.div>

            {/* ---------- Presets ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Quick presets" />

              <div className="grid grid-cols-3 gap-2">
                <PresetButton
                  label="Subtle"
                  onClick={() => {
                    setSharpenAmount(0.4);
                    setSharpenRadius(1.0);
                    setClarityAmount(0.15);
                    setClarityRadius(12);
                    setContrast(0.03);
                    setConverted(null);
                  }}
                />
                <PresetButton
                  label="Balanced"
                  onClick={() => {
                    setSharpenAmount(0.8);
                    setSharpenRadius(1.2);
                    setClarityAmount(0.25);
                    setClarityRadius(14);
                    setContrast(0.05);
                    setConverted(null);
                  }}
                />
                <PresetButton
                  label="Strong"
                  onClick={() => {
                    setSharpenAmount(1.3);
                    setSharpenRadius(1.6);
                    setClarityAmount(0.4);
                    setClarityRadius(18);
                    setContrast(0.1);
                    setConverted(null);
                  }}
                />
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-black/40">
                Start with a preset, then fine-tune the sliders above.
              </p>
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
                        Sharpened & ready
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
                      {formatBytes(converted.size)}
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
                      Download sharpened
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
                  <strong className="text-black">Multi-scale unsharp mask</strong> — sharpens fine detail with one pass and mid-tone structure with a second, wider clarity pass.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Live, debounced preview</strong> — every slider change updates the preview in ~150 ms. The full-resolution version is computed only when you click Apply.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Hold-to-compare</strong> — press the "Hold to compare" button in the corner of the preview to flash the original image.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs 100% in your browser.</strong> No upload, no server — the entire pipeline is on-device.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Honest about limits</strong> — this makes images look crisper. It won't fully restore a badly motion-blurred photo. That requires AI hallucination.
                </FeatureRow>
              </ul>
            </motion.div>

            {/* ---------- Tips ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Getting good results
                </span>
              </div>
              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>Start with the <strong className="text-black">Balanced</strong> preset, then push sliders gently.</FeatureRow>
                <FeatureRow>If edges look "glowing," lower <strong className="text-black">Amount</strong> or increase <strong className="text-black">Radius</strong>.</FeatureRow>
                <FeatureRow>If grain appears in flat areas, reduce <strong className="text-black">Amount</strong> and dial <strong className="text-black">Clarity</strong> down.</FeatureRow>
                <FeatureRow>The <strong className="text-black">Clarity</strong> slider fixes "hazy" images; the <strong className="text-black">Sharpen</strong> slider fixes "soft" ones.</FeatureRow>
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
                All sharpening and contrast work happens on HTML5 Canvases in your browser. There
                is no backend, no upload, and no tracking — open DevTools and you'll see zero
                network requests while you work.
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

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="py-2.5 rounded-xl border border-black/[0.10] bg-white text-[12px] font-medium text-black/70 hover:border-[#ff6a00]/40 hover:text-black transition-all"
    >
      {label}
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

export default UnblurImage;