"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, Grid3x3, Layers,
  MousePointer2, Move, Square, Maximize2, Eye, Trash2,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type OutputFormat = "image/jpeg" | "image/png";
type Stage = "idle" | "reading" | "rendering" | "encoding" | "done";
type PixelMode = "full" | "region";
type SampleMode = "average" | "center";
type Converted = { url: string; size: number; name: string; w: number; h: number };
type Rect = { x: number; y: number; w: number; h: number };

const MAX_SIZE_MB = 25;
const MAX_DIM = 8000;
const PREVIEW_MAX = 900;

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

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

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
// PIXELATION MATH
// ============================================================
function pixelateRegion(
  srcCtx: CanvasRenderingContext2D,
  dstCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  blockSize: number,
  sampleMode: SampleMode,
  region: Rect
) {
  const bw = Math.max(1, Math.round(w / blockSize));
  const bh = Math.max(1, Math.round(h / blockSize));

  // 1) downscale source into a small offscreen canvas
  const small = document.createElement("canvas");
  small.width = bw;
  small.height = bh;
  const sctx = small.getContext("2d");
  if (!sctx) return;

  sctx.imageSmoothingEnabled = sampleMode === "average";
  sctx.imageSmoothingQuality = "high";

  // Read just the region we want to pixelate, at block resolution
  const srcData = srcCtx.getImageData(
    Math.round(region.x),
    Math.round(region.y),
    Math.round(region.w),
    Math.round(region.h)
  );

  // Put the region into an offscreen canvas so we can downscale it cleanly
  const regionCanvas = document.createElement("canvas");
  regionCanvas.width = srcData.width;
  regionCanvas.height = srcData.height;
  const rctx = regionCanvas.getContext("2d");
  if (!rctx) return;
  rctx.putImageData(srcData, 0, 0);

  // Downscale (sample)
  const bWidth = Math.max(1, Math.round(region.w / blockSize));
  const bHeight = Math.max(1, Math.round(region.h / blockSize));
  small.width = bWidth;
  small.height = bHeight;
  const sctx2 = small.getContext("2d");
  if (!sctx2) return;
  sctx2.imageSmoothingEnabled = sampleMode === "average";
  sctx2.imageSmoothingQuality = "high";
  sctx2.drawImage(regionCanvas, 0, 0, bWidth, bHeight);

  // 2) upscale back with nearest-neighbor for a hard pixelated look
  dstCtx.save();
  dstCtx.imageSmoothingEnabled = false;
  dstCtx.drawImage(small, region.x, region.y, region.w, region.h);
  dstCtx.restore();
}

// ============================================================
// COMPONENT
// ============================================================
export const PixelateImage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // pixelation options
  const [mode, setMode] = useState<PixelMode>("full");
  const [blockSize, setBlockSize] = useState(12);
  const [sampleMode, setSampleMode] = useState<SampleMode>("average");

  // region selection (in preview pixels)
  const [selection, setSelection] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);

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
  const previewWrapRef = useRef<HTMLDivElement>(null);

  const sourceUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const previewSourceRef = useRef<HTMLCanvasElement | null>(null);

  const [previewReady, setPreviewReady] = useState(false);
  const [previewSize, setPreviewSize] = useState({ w: 0, h: 0 });

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
    setBlockSize(12); setSampleMode("average"); setMode("full");
    setSelection({ x: 0, y: 0, w: 0, h: 0 });
    setConverted(null); setError(null); setStage("idle");
    setShowOriginal(false); setPreviewReady(false);
    sourceImgRef.current = null;
    previewSourceRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

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
      const w = probe.naturalWidth;
      const h = probe.naturalHeight;

      sourceImgRef.current = probe;
      setSrcW(w); setSrcH(h);

      // preview-sized source canvas for fast iteration
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
      setPreviewSize({ w: pw, h: ph });

      setFile(f);
      setSourceUrl(url);
      setPreviewReady(true);
      // default region = whole image
      setSelection({ x: 0, y: 0, w: pw, h: ph });
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

  // ---------- preview ----------
  useEffect(() => {
    if (!previewReady) return;
    const src = previewSourceRef.current;
    const dst = previewCanvasRef.current;
    if (!src || !dst) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;

      dst.width = src.width;
      dst.height = src.height;
      const dctx = dst.getContext("2d");
      if (!dctx) return;

      // original view
      if (showOriginal) {
        dctx.clearRect(0, 0, dst.width, dst.height);
        dctx.drawImage(src, 0, 0);
        return;
      }

      // background for JPG
      if (format === "image/jpeg") {
        dctx.fillStyle = "#ffffff";
        dctx.fillRect(0, 0, dst.width, dst.height);
      } else {
        dctx.clearRect(0, 0, dst.width, dst.height);
      }

      dctx.imageSmoothingEnabled = true;
      dctx.imageSmoothingQuality = "high";
      dctx.drawImage(src, 0, 0);

      // pixelate the chosen region (scaled to preview size)
      const ratio = src.width / srcW;
      const previewBlock = Math.max(2, Math.round(blockSize * ratio));
      const region: Rect = mode === "full"
        ? { x: 0, y: 0, w: src.width, h: src.height }
        : {
            x: selection.x * ratio,
            y: selection.y * ratio,
            w: selection.w * ratio,
            h: selection.h * ratio,
          };

      if (region.w > 0 && region.h > 0) {
        // temporarily draw the source into a scratch canvas so we can sample it
        const scratch = document.createElement("canvas");
        scratch.width = src.width;
        scratch.height = src.height;
        const sctx = scratch.getContext("2d");
        if (sctx) {
          sctx.drawImage(src, 0, 0);
          pixelateRegion(sctx, dctx, src.width, src.height, previewBlock, sampleMode, region);
        }
      }
    }, 60);

    return () => { cancelled = true; window.clearTimeout(t); };
  }, [previewReady, blockSize, sampleMode, mode, selection, format, showOriginal, srcW, srcH]);

  // ---------- region selection (mouse) ----------
  const getPreviewCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    // convert to source-image coords
    const ratio = srcW / canvas.width;
    return { x: px * ratio, y: py * ratio, canvasRatio: ratio };
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "region") return;
    const coords = getPreviewCoords(e);
    if (!coords) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    selectionStartRef.current = { x: coords.x, y: coords.y };
    setIsSelecting(true);
    setSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
    setConverted(null);
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStartRef.current) return;
    const coords = getPreviewCoords(e);
    if (!coords) return;
    const start = selectionStartRef.current;
    const x = Math.min(start.x, coords.x);
    const y = Math.min(start.y, coords.y);
    const w = Math.abs(coords.x - start.x);
    const h = Math.abs(coords.y - start.y);
    setSelection({ x, y, w, h });
  };

  const onCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return;
    setIsSelecting(false);
    selectionStartRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    // if the region is tiny, reset to full
    setSelection((s) => (s.w < 8 || s.h < 8 ? { x: 0, y: 0, w: srcW, h: srcH } : s));
  };

  // ---------- export ----------
  const convert = async () => {
    if (!file) return;
    setError(null);
    setStage("reading");

    try {
      const img = sourceImgRef.current;
      if (!img) throw new Error("Source image isn't ready. Please re-upload.");

      if (img.naturalWidth > MAX_DIM || img.naturalHeight > MAX_DIM) {
        throw new Error(`Image exceeds the ${MAX_DIM}px safe limit.`);
      }

      await new Promise((r) => setTimeout(r, 100));
      setStage("rendering");

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      // pixelate at full resolution
      const region: Rect = mode === "full"
        ? { x: 0, y: 0, w: canvas.width, h: canvas.height }
        : {
            x: clamp(selection.x, 0, canvas.width),
            y: clamp(selection.y, 0, canvas.height),
            w: clamp(selection.w, 0, canvas.width - clamp(selection.x, 0, canvas.width)),
            h: clamp(selection.h, 0, canvas.height - clamp(selection.y, 0, canvas.height)),
          };

      if (region.w > 0 && region.h > 0) {
        // snapshot the current canvas into a scratch buffer to sample from
        const scratch = document.createElement("canvas");
        scratch.width = canvas.width;
        scratch.height = canvas.height;
        const sctx = scratch.getContext("2d");
        if (!sctx) throw new Error("Canvas is not supported in this browser.");
        sctx.drawImage(canvas, 0, 0);
        pixelateRegion(sctx, ctx, canvas.width, canvas.height, blockSize, sampleMode, region);
      }

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
        name: `${stripExt(file.name)}-pixelated.${ext}`,
        w: canvas.width,
        h: canvas.height,
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  const busy = stage === "reading" || stage === "rendering" || stage === "encoding";

  const stageLabel: Record<Stage, string> = {
    idle: "", reading: "Reading image…", rendering: "Pixelating…", encoding: "Encoding file…", done: "",
  };
  const stageStep: Record<Stage, string> = {
    idle: "", reading: "step 1 of 3", rendering: "step 2 of 3", encoding: "step 3 of 3", done: "",
  };
  const progressWidth =
    stage === "reading" ? "35%" : stage === "rendering" ? "65%" : stage === "encoding" ? "90%" : "0%";

  // number of blocks at current settings
  const blockCount = useMemo(() => {
    const region = mode === "full"
      ? { w: srcW, h: srcH }
      : { w: selection.w, h: selection.h };
    if (!region.w || !region.h) return 0;
    return Math.round(region.w / blockSize) * Math.round(region.h / blockSize);
  }, [mode, selection, srcW, srcH, blockSize]);

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
          <span className="text-black/70">Pixelate Image</span>
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
                Full image or selected region · Live preview
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Mosaic it.
              <br />
              <span className="italic text-[#ff6a00]">Block by block.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Pixelate the entire image, or draw a selection to blur only specific areas — perfect
              for hiding faces, license plates, and sensitive info. Choose block size, sampling,
              and output format. Runs <strong className="text-black/80 font-medium">entirely in your browser</strong>.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Grid3x3 size={12} />} label="Full or region" />
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
            <strong className="text-black font-medium">When to pixelate vs. blur.</strong>{" "}
            Pixelation is great for a deliberate mosaic effect or for fast privacy covering.
            For a smoother redaction, the same region-based selection also works with a Gaussian
            blur — pixelation is what this tool provides. If you need to cover text in a document,
            also consider the PDF redaction tools.
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
              title="Drop an image"
              desc="Any JPG, PNG, WebP, or other image up to 25 MB. Faces and plates work great."
            />
            <ExplainerCard
              n="02"
              icon={<MousePointer2 size={18} />}
              title="Full or pick a region"
              desc="Pixelate everything, or switch to Region mode and drag a rectangle over what to hide."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download it"
              desc="Export as JPG or PNG — block size controls how coarse the mosaic looks."
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
                      <Grid3x3 size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your image here" : "Drop an image to pixelate"}
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

                    {/* preview canvas with checkerboard */}
                    <div
                      ref={previewWrapRef}
                      className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-6 min-h-[320px] flex items-center justify-center p-3"
                    >
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
                        onPointerDown={onCanvasPointerDown}
                        onPointerMove={onCanvasPointerMove}
                        onPointerUp={onCanvasPointerUp}
                        onPointerCancel={onCanvasPointerUp}
                        className="relative z-10 max-w-full max-h-[520px] object-contain"
                        style={{
                          cursor: mode === "region" ? "crosshair" : "default",
                          touchAction: "none",
                        }}
                      />

                      {/* live region overlay */}
                      {mode === "region" && previewReady && previewSize.w > 0 && (
                        <RegionOverlay
                          selection={selection}
                          srcW={srcW}
                          srcH={srcH}
                          previewW={previewSize.w}
                          previewH={previewSize.h}
                          canvasEl={previewCanvasRef.current}
                        />
                      )}

                      {/* hold-to-compare */}
                      {!isSelecting && (
                        <motion.button
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onMouseDown={() => setShowOriginal(true)}
                          onMouseUp={() => setShowOriginal(false)}
                          onMouseLeave={() => setShowOriginal(false)}
                          onTouchStart={() => setShowOriginal(true)}
                          onTouchEnd={() => setShowOriginal(false)}
                          className="absolute top-3 right-3 z-30 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/75 backdrop-blur-md text-white hover:bg-black transition-colors"
                        >
                          <Eye size={12} />
                          <span className="text-[10.5px] font-mono uppercase tracking-[0.16em]">
                            {showOriginal ? "Showing original" : "Hold to compare"}
                          </span>
                        </motion.button>
                      )}

                      {/* region-mode hint */}
                      {mode === "region" && !isSelecting && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white pointer-events-none"
                        >
                          <MousePointer2 size={11} className="text-[#ff6a00]" />
                          <span className="text-[10px] font-mono uppercase tracking-[0.14em]">
                            Drag to select a region
                          </span>
                        </motion.div>
                      )}

                      {/* busy overlay */}
                      <AnimatePresence>
                        {busy && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
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
                            <Grid3x3 size={15} />
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

            {/* ---------- Mode ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="What to pixelate" icon={<Maximize2 size={11} />} />

              <div className="grid grid-cols-2 gap-2 mb-5">
                <ModePill
                  icon={<Square size={15} />}
                  label="Full image"
                  subtitle="Everything"
                  active={mode === "full"}
                  onClick={() => { setMode("full"); setConverted(null); }}
                />
                <ModePill
                  icon={<MousePointer2 size={15} />}
                  label="Region"
                  subtitle="Drag a box"
                  active={mode === "region"}
                  onClick={() => {
                    setMode("region");
                    // default region = middle 50% of image
                    setSelection({
                      x: Math.round(srcW * 0.25),
                      y: Math.round(srcH * 0.25),
                      w: Math.round(srcW * 0.5),
                      h: Math.round(srcH * 0.5),
                    });
                    setConverted(null);
                  }}
                />
              </div>

              <AnimatePresence mode="wait">
                {mode === "full" ? (
                  <motion.p
                    key="full-desc"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-[12.5px] leading-relaxed text-black/55"
                  >
                    Pixelates the entire image with a uniform mosaic. Great for a deliberate
                    artistic effect.
                  </motion.p>
                ) : (
                  <motion.div
                    key="region-desc"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <p className="text-[12.5px] leading-relaxed text-black/55 mb-4">
                      Drag a rectangle directly on the preview to choose the region to pixelate.
                      Everything outside stays untouched.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.14em] text-black/45">
                      <span>Region:</span>
                      <span className="text-black/75">
                        {Math.round(selection.w)}×{Math.round(selection.h)}
                      </span>
                      <button
                        onClick={() => {
                          setSelection({
                            x: Math.round(srcW * 0.25),
                            y: Math.round(srcH * 0.25),
                            w: Math.round(srcW * 0.5),
                            h: Math.round(srcH * 0.5),
                          });
                          setConverted(null);
                        }}
                        className="ml-auto inline-flex items-center gap-1.5 text-[#ff6a00] hover:underline"
                      >
                        <Trash2 size={10} />
                        Reset
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---------- Block size ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Block size" icon={<Grid3x3 size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                Bigger blocks = more privacy (and a coarser mosaic). 8–20px is a good range.
              </p>

              <div className="flex items-center justify-between mb-3">
                <Label>Block size</Label>
                <motion.div
                  key={blockSize}
                  initial={{ scale: 1.15, color: "#ff6a00" }}
                  animate={{ scale: 1, color: "#00000099" }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] font-mono"
                >
                  {blockSize}px
                </motion.div>
              </div>
              <input
                type="range"
                min={2}
                max={80}
                value={blockSize}
                onChange={(e) => { setBlockSize(Number(e.target.value)); setConverted(null); }}
                className="w-full accent-[#ff6a00]"
              />
              <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                <span>Fine</span>
                <span>Coarse</span>
              </div>

              {/* quick presets */}
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[4, 10, 20, 40].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setBlockSize(s); setConverted(null); }}
                    className={`py-2 rounded-lg border text-[11px] font-mono transition-all ${
                      blockSize === s
                        ? "border-[#ff6a00] bg-[#ff6a00]/10 text-[#ff6a00]"
                        : "border-black/[0.10] bg-white text-black/55 hover:border-black/30"
                    }`}
                  >
                    {s}px
                  </button>
                ))}
              </div>

              {blockCount > 0 && (
                <div className="mt-4 text-[11px] font-mono uppercase tracking-[0.14em] text-black/45">
                  ≈ {blockCount.toLocaleString()} blocks
                </div>
              )}
            </motion.div>

            {/* ---------- Sampling ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Sampling" icon={<Layers size={11} />} />

              <div className="grid grid-cols-2 gap-2">
                <ModePill
                  icon={<Layers size={15} />}
                  label="Average"
                  subtitle="Smooth mosaic"
                  active={sampleMode === "average"}
                  onClick={() => { setSampleMode("average"); setConverted(null); }}
                />
                <ModePill
                  icon={<Square size={15} />}
                  label="Center"
                  subtitle="Crisp look"
                  active={sampleMode === "center"}
                  onClick={() => { setSampleMode("center"); setConverted(null); }}
                />
              </div>

              <p className="mt-4 text-[11.5px] leading-relaxed text-black/45">
                <strong className="text-black/70">Average</strong> uses every pixel in the block for a
                natural mosaic. <strong className="text-black/70">Center</strong> samples a single
                point per block — crisper, more "digital" look, but less privacy.
              </p>
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
                        Pixelated & ready
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
                      Download image
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
                  <strong className="text-black">Pixelates the full image or a region</strong> — switch to Region mode and drag a rectangle to pixelate only what you need.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Adjustable block size</strong> from 2px (very subtle) to 80px (barely recognizable) — with quick presets.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Two sampling modes</strong> — Average for smoothness, Center for a bolder, digital look.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Live preview</strong> — every slider change updates the canvas in ~60ms.
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
                Pixelation happens on an HTML5 Canvas in your browser. There is no backend, no
                upload, and no tracking — open DevTools and you'll see zero network requests while
                you work.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// REGION OVERLAY
// ============================================================
function RegionOverlay({
  selection, srcW, srcH, previewW, previewH, canvasEl,
}: {
  selection: Rect;
  srcW: number;
  srcH: number;
  previewW: number;
  previewH: number;
  canvasEl: HTMLCanvasElement | null;
}) {
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!canvasEl) { setBox(null); return; }
    const update = () => {
      const rect = canvasEl.getBoundingClientRect();
      const parentRect = canvasEl.parentElement?.getBoundingClientRect();
      if (!parentRect) return;
      const scaleX = rect.width / srcW;
      const scaleY = rect.height / srcH;
      // offset of canvas within the parent (preview container)
      const offsetX = rect.left - parentRect.left;
      const offsetY = rect.top - parentRect.top;
      setBox({
        left: offsetX + selection.x * scaleX,
        top: offsetY + selection.y * scaleY,
        width: Math.max(0, selection.w * scaleX),
        height: Math.max(0, selection.h * scaleY),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(canvasEl);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [canvasEl, selection, srcW, srcH, previewW, previewH]);

  if (!box || box.width < 1 || box.height < 1) return null;

  return (
    <div
      className="absolute z-20 pointer-events-none"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        border: "2px dashed #ff6a00",
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
      }}
    >
      {/* corner handles */}
      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#ff6a00]" />
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#ff6a00]" />
      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#ff6a00]" />
      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#ff6a00]" />

      {/* size label */}
      <div className="absolute -top-7 left-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#ff6a00] text-white">
        <Move size={9} />
        <span className="text-[9.5px] font-mono tracking-wider">
          {Math.round(selection.w)}×{Math.round(selection.h)}
        </span>
      </div>
    </div>
  );
}

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
  icon, label, subtitle, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 py-4 px-3 rounded-xl border text-[12.5px] font-medium transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      <div className={active ? "text-[#ff6a00]" : "text-black/50"}>{icon}</div>
      <div>{label}</div>
      <div className={`text-[10px] font-normal ${active ? "text-white/50" : "text-black/40"}`}>
        {subtitle}
      </div>
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

export default PixelateImage;