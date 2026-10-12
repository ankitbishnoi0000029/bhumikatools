"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, RotateCw,
  RotateCcw as RotateCcwIcon, FlipHorizontal, FlipVertical, Layers,
  Maximize2, CircleDot, Move,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type OutputFormat = "image/jpeg" | "image/png";
type Stage = "idle" | "reading" | "rotating" | "encoding" | "done";
type Converted = { url: string; size: number; name: string; w: number; h: number };

const MAX_SIZE_MB = 25;
const MAX_DIM = 8000;

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

// Compute output canvas size after rotation. If angle is a multiple of 90,
// output stays "tight". Otherwise it uses the bounding box (with transparency).
function calcRotatedSize(w: number, h: number, angleDeg: number) {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a === 0) return { w, h };
  if (a === 90 || a === 270) return { w: h, h: w };
  if (a === 180) return { w, h };
  // arbitrary angle: bounding box
  const rad = (a * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    w: Math.ceil(w * cos + h * sin),
    h: Math.ceil(w * sin + h * cos),
  };
}

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
export const RotateImage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // rotation state — we keep a numeric angle so 90° snaps and the slider coexist
  const [angle, setAngle] = useState(0);       // -180 to 180
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

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

  const targetDims = calcRotatedSize(srcW, srcH, angle);
  const tooLarge = targetDims.w > MAX_DIM || targetDims.h > MAX_DIM;

  const reset = () => {
    if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }
    setFile(null); setSourceUrl(null);
    setSrcW(0); setSrcH(0);
    setAngle(0); setFlipH(false); setFlipV(false);
    setConverted(null); setError(null); setStage("idle");
    setShowOriginal(false); setPreviewReady(false);
    sourceImgRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null); setConverted(null); setStage("idle");
    setShowOriginal(false); setPreviewReady(false);
    setAngle(0); setFlipH(false); setFlipV(false);

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

  // ---------- draw helper (shared between preview & export) ----------
  const drawRotated = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      canvasW: number,
      canvasH: number,
      opts: { angle: number; flipH: boolean; flipV: boolean; fillBg?: string }
    ) => {
      if (opts.fillBg) {
        ctx.fillStyle = opts.fillBg;
        ctx.fillRect(0, 0, canvasW, canvasH);
      } else {
        ctx.clearRect(0, 0, canvasW, canvasH);
      }

      ctx.save();
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((opts.angle * Math.PI) / 180);
      ctx.scale(opts.flipH ? -1 : 1, opts.flipV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
    },
    []
  );

  // ---------- live preview ----------
  useEffect(() => {
    if (!previewReady) return;
    const img = sourceImgRef.current;
    const canvas = previewCanvasRef.current;
    if (!img || !canvas) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;

      // Show original if hold-to-compare is active
      if (showOriginal) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
        return;
      }

      // For JPG preview we show a white background so users see what they'll get.
      const bg = format === "image/jpeg" ? "#ffffff" : undefined;

      canvas.width = targetDims.w;
      canvas.height = targetDims.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      drawRotated(ctx, img, targetDims.w, targetDims.h, {
        angle, flipH, flipV, fillBg: bg,
      });
    }, 30);

    return () => { cancelled = true; window.clearTimeout(t); };
  }, [previewReady, angle, flipH, flipV, format, targetDims.w, targetDims.h, showOriginal, drawRotated]);

  // ---------- rotation controls ----------
  const rotateBy = (delta: number) => {
    setAngle((a) => {
      let next = a + delta;
      // normalize to -180..180
      if (next > 180) next -= 360;
      if (next < -180) next += 360;
      return next;
    });
    setConverted(null);
  };

  const resetTransform = () => {
    setAngle(0); setFlipH(false); setFlipV(false);
    setConverted(null);
  };

  // ---------- export ----------
  const convert = async () => {
    if (!file) return;
    setError(null);

    if (tooLarge) {
      setError(`Rotated size exceeds the ${MAX_DIM}px safe limit.`);
      return;
    }

    setStage("reading");
    try {
      const img = sourceImgRef.current;
      if (!img) throw new Error("Source image isn't ready. Please re-upload.");

      await new Promise((r) => setTimeout(r, 100));
      setStage("rotating");

      const canvas = document.createElement("canvas");
      canvas.width = targetDims.w;
      canvas.height = targetDims.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const bg = format === "image/jpeg" ? "#ffffff" : undefined;

      drawRotated(ctx, img, targetDims.w, targetDims.h, {
        angle, flipH, flipV, fillBg: bg,
      });

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
      const suffix = angle !== 0 ? `-rotated${angle > 0 ? "+" : ""}${angle}` : "";
      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file.name)}${suffix}.${ext}`,
        w: targetDims.w,
        h: targetDims.h,
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  const busy = stage === "reading" || stage === "rotating" || stage === "encoding";

  const stageLabel: Record<Stage, string> = {
    idle: "", reading: "Reading image…", rotating: "Rotating pixels…", encoding: "Encoding file…", done: "",
  };
  const stageStep: Record<Stage, string> = {
    idle: "", reading: "step 1 of 3", rotating: "step 2 of 3", encoding: "step 3 of 3", done: "",
  };
  const progressWidth =
    stage === "reading" ? "35%" : stage === "rotating" ? "65%" : stage === "encoding" ? "90%" : "0%";

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
          <span className="text-black/70">Rotate Image</span>
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
                Live preview · Flip · Any angle · No signup
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Straighten any image.
              <br />
              <span className="italic text-[#ff6a00]">Precisely.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Rotate by exact 90° steps or fine-tune the angle to straighten a crooked photo.
              Flip horizontally or vertically. Preview updates live and the canvas auto-resizes
              so nothing gets clipped. Runs <strong className="text-black/80 font-medium">entirely in your browser</strong>.
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
              desc="Any JPG, PNG, WebP, GIF, or BMP up to 25 MB. We read its dimensions."
            />
            <ExplainerCard
              n="02"
              icon={<RotateCw size={18} />}
              title="Rotate & flip"
              desc="Use the quick 90° buttons, fine-tune with the slider, or mirror the image."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download it"
              desc="Export as JPG or PNG at the exact rotation you chose. Nothing is uploaded."
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
                      animate={dragging ? { scale: 1.1, rotate: -12 } : { scale: 1, rotate: [0, 8, -8, 0], y: [0, -6, 0] }}
                      transition={dragging
                        ? { type: "spring", stiffness: 300, damping: 20 }
                        : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${
                        dragging ? "bg-[#ff6a00]" : "bg-[#f4f1ea]"
                      }`}
                    >
                      <RotateCw size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your image here" : "Drop an image to rotate"}
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
                          initial={{ scale: 0.8, rotate: -30 }}
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
                        style={{ transform: "translateZ(0)" }}
                      />

                      {/* live angle + dimensions badge */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white"
                      >
                        <RotateCw size={11} className="text-[#ff6a00]" />
                        <span className="text-[10.5px] font-mono tracking-[0.12em]">
                          {angle}°
                          <span className="text-white/40 mx-1.5">·</span>
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

                    {/* ---------- QUICK ROTATION CONTROLS ---------- */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="grid grid-cols-5 gap-2 mb-6"
                    >
                      <QuickBtn
                        icon={<RotateCcwIcon size={16} />}
                        label="−90°"
                        onClick={() => rotateBy(-90)}
                      />
                      <QuickBtn
                        icon={<RotateCw size={16} />}
                        label="+90°"
                        onClick={() => rotateBy(90)}
                      />
                      <QuickBtn
                        icon={<FlipHorizontal size={16} />}
                        label="Flip H"
                        active={flipH}
                        onClick={() => { setFlipH((v) => !v); setConverted(null); }}
                      />
                      <QuickBtn
                        icon={<FlipVertical size={16} />}
                        label="Flip V"
                        active={flipV}
                        onClick={() => { setFlipV((v) => !v); setConverted(null); }}
                      />
                      <QuickBtn
                        icon={<CircleDot size={16} />}
                        label="Reset"
                        onClick={resetTransform}
                      />
                    </motion.div>

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
                            Processing…
                          </>
                        ) : (
                          <>
                            <Download size={15} />
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

            {/* ---------- Fine angle ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Angle" icon={<Move size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                Fine-tune to straighten a crooked photo. Small angles auto-expand the canvas.
              </p>

              <div className="flex items-center justify-between mb-3">
                <Label>Rotation</Label>
                <motion.div
                  key={angle}
                  initial={{ scale: 1.15, color: "#ff6a00" }}
                  animate={{ scale: 1, color: "#00000099" }}
                  transition={{ duration: 0.2 }}
                  className="text-[12px] font-mono"
                >
                  {angle}°
                </motion.div>
              </div>

              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={angle}
                onChange={(e) => { setAngle(Number(e.target.value)); setConverted(null); }}
                className="w-full accent-[#ff6a00]"
              />

              {/* angle tick marks */}
              <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                <span>−180°</span>
                <button
                  onClick={() => { setAngle(0); setConverted(null); }}
                  className="hover:text-[#ff6a00] transition-colors font-medium"
                >
                  0°
                </button>
                <span>+180°</span>
              </div>

              {/* 0 / 90 / 180 / 270 shortcuts */}
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[0, 90, 180, 270].map((a) => {
                  const normalized = a > 180 ? a - 360 : a;
                  const active = angle === normalized;
                  return (
                    <button
                      key={a}
                      onClick={() => { setAngle(normalized); setConverted(null); }}
                      className={`py-2 rounded-lg border text-[11.5px] font-mono transition-all ${
                        active
                          ? "border-[#ff6a00] bg-[#ff6a00]/10 text-[#ff6a00]"
                          : "border-black/[0.10] bg-white text-black/55 hover:border-black/30"
                      }`}
                    >
                      {a}°
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* ---------- Flip ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Flip" icon={<FlipHorizontal size={11} />} />

              <div className="grid grid-cols-2 gap-2">
                <FlipToggle
                  icon={<FlipHorizontal size={15} />}
                  label="Horizontal"
                  active={flipH}
                  onClick={() => { setFlipH((v) => !v); setConverted(null); }}
                />
                <FlipToggle
                  icon={<FlipVertical size={15} />}
                  label="Vertical"
                  active={flipV}
                  onClick={() => { setFlipV((v) => !v); setConverted(null); }}
                />
              </div>

              <p className="mt-4 text-[11.5px] leading-relaxed text-black/45">
                Mirrors the image along the chosen axis. Useful for front-facing camera shots or
                creating symmetrical reflections.
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
                  <p className="mt-3 text-[11.5px] leading-relaxed text-black/40">
                    Fine angles expose the canvas background. JPG uses a white fill; PNG keeps it
                    transparent.
                  </p>
                </div>
              ) : (
                <p className="text-[12px] leading-relaxed text-black/50">
                  PNG keeps transparency — the corners exposed by a fine rotation stay
                  transparent instead of white.
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
                        Rotated image ready
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
                  <strong className="text-black">Rotate any angle</strong> — use the quick 90° buttons or dial in an exact number with the slider. Perfect for straightening crooked photos.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Flip horizontally or vertically</strong> — mirrors the image in one click. Great for front-camera selfies that came out reversed.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Smart canvas resizing</strong> — for 90°/180° rotations the canvas fits tightly; for fine angles it expands to a bounding box so nothing is clipped.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Hold-to-compare</strong> — press the button in the corner to flash the original.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs 100% in your browser.</strong> No upload, no server, no queue.
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
                Rotation is done on an HTML5 Canvas in your browser. There is no backend, no
                upload, and no tracking — open DevTools and you'll see zero network requests when
                you rotate.
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

function QuickBtn({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[10.5px] font-mono uppercase tracking-[0.12em] transition-all ${
        active
          ? "border-[#ff6a00] bg-[#ff6a00]/10 text-[#ff6a00]"
          : "border-black/[0.10] bg-white text-black/60 hover:border-black/30 hover:text-black"
      }`}
    >
      <span className={active ? "text-[#ff6a00]" : "text-black/50"}>{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}

function FlipToggle({
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

export default RotateImage;