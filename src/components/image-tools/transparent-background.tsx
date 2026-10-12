"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, Eraser, Pipette,
  Sliders, Layers, Eye,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Mode = "ai" | "manual";
type AiStage = "idle" | "loading-model" | "processing" | "done";
type Converted = { url: string; size: number; name: string };

const MAX_SIZE_MB = 25;

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
// COLOR-KEY REMOVAL (manual mode)
// ============================================================
function colorKeyRemoval(
  src: HTMLImageElement,
  targetColor: { r: number; g: number; b: number },
  tolerance: number,   // 0-150
  feather: number      // 0-60
): HTMLCanvasElement {
  const w = src.naturalWidth;
  const h = src.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(src, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const { r: tr, g: tg, b: tb } = targetColor;
  const tolSq = tolerance * tolerance;
  const featherSq = (tolerance + feather) * (tolerance + feather);

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    // color distance in RGB space
    const dr = r - tr;
    const dg = g - tg;
    const db = b - tb;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      // fully transparent
      d[i + 3] = 0;
    } else if (distSq <= featherSq && feather > 0) {
      // soft edge: fade alpha based on how far we are from tolerance
      const t = (Math.sqrt(distSq) - tolerance) / feather;
      d[i + 3] = Math.round(d[i + 3] * t);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// ============================================================
// COMPONENT
// ============================================================
export const TransparentBackground = () => {
  const [mode, setMode] = useState<Mode>("ai");

  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // Manual mode
  const [pickedColor, setPickedColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [tolerance, setTolerance] = useState(30);
  const [feather, setFeather] = useState(12);
  const [eyedropperActive, setEyedropperActive] = useState(false);

  // AI mode progress
  const [aiStage, setAiStage] = useState<AiStage>("idle");
  const [aiProgress, setAiProgress] = useState(0); // 0-100
  const [aiStatusText, setAiStatusText] = useState("");

  const [converted, setConverted] = useState<Converted | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);

  // keep original image element for re-renders
  const sourceImgRef = useRef<HTMLImageElement | null>(null);

  // AI result canvas (for download)
  const aiResultRef = useRef<HTMLCanvasElement | null>(null);

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
    setPickedColor(null);
    setConverted(null); setError(null);
    setAiStage("idle"); setAiProgress(0); setAiStatusText("");
    setShowOriginal(false); setPreviewReady(false);
    setEyedropperActive(false);
    sourceImgRef.current = null;
    aiResultRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null); setConverted(null);
    setAiStage("idle"); setAiProgress(0); setAiStatusText("");
    setPickedColor(null); setShowOriginal(false); setPreviewReady(false);
    aiResultRef.current = null;

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

  // ---------- Preview ----------
  const drawPreview = useCallback((sourceCanvas: HTMLCanvasElement | HTMLImageElement) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const srcW =
      sourceCanvas instanceof HTMLImageElement
        ? sourceCanvas.naturalWidth
        : sourceCanvas.width;
    const srcH =
      sourceCanvas instanceof HTMLImageElement
        ? sourceCanvas.naturalHeight
        : sourceCanvas.height;

    if (!srcW || !srcH) return;

    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, srcW, srcH);
    ctx.drawImage(sourceCanvas, 0, 0);
  }, []);

  // redraw preview whenever relevant state changes
  useEffect(() => {
    if (!previewReady) return;
    const img = sourceImgRef.current;
    if (!img) return;

    // Show original if user is holding compare
    if (showOriginal) {
      drawPreview(img);
      return;
    }

    // AI result available — always show it
    if (aiResultRef.current) {
      drawPreview(aiResultRef.current);
      return;
    }

    // Manual mode with a picked color — show processed preview
    if (mode === "manual" && pickedColor) {
      const processed = colorKeyRemoval(img, pickedColor, tolerance, feather);
      drawPreview(processed);
      return;
    }

    // Default: original
    drawPreview(img);
  }, [previewReady, mode, pickedColor, tolerance, feather, showOriginal, drawPreview]);

  // ---------- Eyedropper click handler ----------
  const onPreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eyedropperActive) return;
    const canvas = previewCanvasRef.current;
    const img = sourceImgRef.current;
    if (!canvas || !img) return;

    // map click coords to canvas pixels
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // sample color from the ORIGINAL image, not the preview (avoids feedback)
    const tmp = document.createElement("canvas");
    tmp.width = img.naturalWidth;
    tmp.height = img.naturalHeight;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(img, 0, 0);
    const px = tctx.getImageData(x, y, 1, 1).data;
    setPickedColor({ r: px[0], g: px[1], b: px[2] });
    setEyedropperActive(false);
    setConverted(null);
    aiResultRef.current = null;
  };

  // ---------- AI removal ----------
  const runAiRemoval = async () => {
    if (!file) return;
    setError(null);
    setConverted(null);
    setAiStage("loading-model");
    setAiProgress(0);
    setAiStatusText("Preparing…");

    try {
      const { removeBackground } = await import("@imgly/background-removal");

      setAiStatusText("Downloading AI model…");

      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          if (!total) return;
          const pct = Math.round((current / total) * 100);
          setAiProgress(pct);
          if (key.includes("fetch")) {
            setAiStatusText(`Downloading model — ${pct}%`);
          } else if (key.includes("compute")) {
            setAiStatusText("Processing image…");
          }
        },
      });

      setAiStatusText("Finalising…");

      // Load the resulting PNG blob into a canvas so we can preview + download
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Couldn't read the AI result."));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      aiResultRef.current = canvas;

      URL.revokeObjectURL(url);

      // Force preview redraw
      setShowOriginal(false);
      setPreviewReady((v) => v); // triggers nothing, but forces re-render via other state
      // Directly draw:
      drawPreview(canvas);

      setAiStage("done");
      setAiProgress(100);
      setAiStatusText("Done");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Background removal failed. Try a different image or use Manual mode."
      );
      setAiStage("idle");
      setAiProgress(0);
      setAiStatusText("");
    }
  };

  // ---------- Download ----------
  const download = async () => {
    let canvas: HTMLCanvasElement | null = null;

    if (mode === "ai" && aiResultRef.current) {
      canvas = aiResultRef.current;
    } else if (mode === "manual" && pickedColor && sourceImgRef.current) {
      canvas = colorKeyRemoval(sourceImgRef.current, pickedColor, tolerance, feather);
    }

    if (!canvas || !file) {
      setError("Nothing to download yet. Run the background removal first.");
      return;
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas!.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Couldn't export the image. Please try again.");

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file.name)}-transparent.png`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  };

  const aiBusy = aiStage === "loading-model" || aiStage === "processing";
  const canDownload =
    !!file &&
    ((mode === "ai" && aiResultRef.current !== null) ||
      (mode === "manual" && pickedColor !== null));

  const stageLabel =
    aiStage === "loading-model" ? "Loading AI model…" :
    aiStage === "processing" ? "Removing background…" : "";

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
          <span className="text-black/70">Transparent Background</span>
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
                AI + Manual · 100% on-device · Free
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Cut the background.
              <br />
              <span className="italic text-[#ff6a00]">Keep the subject.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Two ways to make any background transparent: an{" "}
              <strong className="text-black/80 font-medium">AI auto mode</strong> that finds the
              subject for you, or a precise{" "}
              <strong className="text-black/80 font-medium">color picker</strong> for solid
              backgrounds. Output is always a PNG with full transparency, processed entirely in
              your browser.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="On-device AI" />
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
            <strong className="text-black font-medium">About the AI mode.</strong>{" "}
            The first time you use it, your browser downloads ~40 MB of AI models (they're cached
            after that — subsequent runs take 2–5 seconds). Everything runs on your device; your
            image is <em>never</em> uploaded. Manual color mode is instant and needs no download.
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
              title="Upload an image"
              desc="Any JPG, PNG, WebP, or other image up to 25 MB. Portraits and product shots work great."
            />
            <ExplainerCard
              n="02"
              icon={<Wand2 size={18} />}
              title="Run AI, or pick a color"
              desc="AI auto-detects the subject. Or click the background in Manual mode to make that exact color transparent."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the PNG"
              desc="Save a transparent PNG — perfect for logos, product pages, or social posts."
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
                      <Eraser size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your image here" : "Drop an image to cut out"}
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
                        disabled={aiBusy}
                        className="w-9 h-9 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
                        aria-label="Remove file"
                      >
                        <X size={14} />
                      </motion.button>
                    </div>

                    {/* preview canvas with checkerboard */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-6 min-h-[240px] flex items-center justify-center">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #d8d3c8 25%, transparent 25%), linear-gradient(-45deg, #d8d3c8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d3c8 75%), linear-gradient(-45deg, transparent 75%, #d8d3c8 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                        }}
                      />
                      <canvas
                        ref={previewCanvasRef}
                        onClick={onPreviewClick}
                        className={`relative z-10 max-w-full max-h-[500px] object-contain ${
                          eyedropperActive ? "cursor-crosshair" : ""
                        }`}
                      />

                      {/* eyedropper hint */}
                      <AnimatePresence>
                        {eyedropperActive && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/85 backdrop-blur-md text-white"
                          >
                            <Pipette size={12} className="text-[#ff6a00]" />
                            <span className="text-[10.5px] font-mono uppercase tracking-[0.16em]">
                              Click the background to sample
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* hold-to-compare */}
                      {!eyedropperActive && (
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
                      )}

                      {/* AI busy overlay */}
                      <AnimatePresence>
                        {aiBusy && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 px-6"
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
                            <div className="text-center max-w-[280px]">
                              <div className="text-[13px] font-medium text-white">
                                {stageLabel}
                              </div>
                              <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50 mt-1">
                                {aiStatusText || "please wait"}
                              </div>
                            </div>
                            {/* progress bar */}
                            <div className="w-full max-w-[260px]">
                              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                  initial={{ width: "0%" }}
                                  animate={{ width: `${aiProgress}%` }}
                                  transition={{ duration: 0.4, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-[#ff6a00] to-[#ff8c40]"
                                />
                              </div>
                              <div className="mt-2 text-center text-[10px] font-mono tracking-widest text-white/40">
                                {aiProgress}%
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      {mode === "ai" ? (
                        <motion.button
                          whileHover={{ scale: aiBusy ? 1 : 1.03 }}
                          whileTap={{ scale: aiBusy ? 1 : 0.97 }}
                          onClick={runAiRemoval}
                          disabled={aiBusy}
                          className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {aiBusy ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              Working…
                            </>
                          ) : aiResultRef.current ? (
                            <>
                              <RotateCcw size={15} />
                              Re-run AI
                            </>
                          ) : (
                            <>
                              <Sparkles size={15} />
                              Remove background
                            </>
                          )}
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setEyedropperActive((v) => !v)}
                          className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-[13.5px] font-medium transition-colors ${
                            eyedropperActive
                              ? "bg-[#ff6a00] text-white"
                              : "bg-black text-white hover:bg-[#ff6a00]"
                          }`}
                        >
                          <Pipette size={15} />
                          {eyedropperActive ? "Click image…" : pickedColor ? "Pick another color" : "Pick background color"}
                        </motion.button>
                      )}

                      <motion.button
                        whileHover={{ scale: canDownload ? 1.03 : 1 }}
                        whileTap={{ scale: canDownload ? 0.97 : 1 }}
                        onClick={download}
                        disabled={!canDownload}
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-black/15 text-[13.5px] font-medium text-black hover:border-black/40 hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download size={15} />
                        Download PNG
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={reset}
                        disabled={aiBusy}
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
              <SectionTitle label="Mode" icon={<Sliders size={11} />} />

              <div className="grid grid-cols-2 gap-2 mb-5">
                <ModePill
                  icon={<Sparkles size={15} />}
                  label="AI Auto"
                  subtitle="Best quality"
                  active={mode === "ai"}
                  onClick={() => {
                    setMode("ai");
                    setEyedropperActive(false);
                    setConverted(null);
                  }}
                />
                <ModePill
                  icon={<Pipette size={15} />}
                  label="Manual Color"
                  subtitle="Instant · no download"
                  active={mode === "manual"}
                  onClick={() => {
                    setMode("manual");
                    aiResultRef.current = null;
                    setConverted(null);
                  }}
                />
              </div>

              <AnimatePresence mode="wait">
                {mode === "ai" ? (
                  <motion.p
                    key="ai-desc"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-[12.5px] leading-relaxed text-black/55"
                  >
                    Runs an on-device neural network to detect the foreground subject. First use
                    downloads ~40 MB (cached afterward). Works on people, products, animals,
                    cars — nearly anything.
                  </motion.p>
                ) : (
                  <motion.p
                    key="manual-desc"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-[12.5px] leading-relaxed text-black/55"
                  >
                    Click the background in your image to sample its color, then adjust the
                    tolerance. Best for solid-color backgrounds (studio shots, green screens,
                    flat product photos).
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---------- Manual controls ---------- */}
            <AnimatePresence>
              {mode === "manual" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
                    <SectionTitle label="Color key" />

                    {/* sampled color chip */}
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-12 h-12 rounded-xl border border-black/[0.10] shrink-0"
                        style={{
                          backgroundColor: pickedColor
                            ? `rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})`
                            : "transparent",
                          backgroundImage: pickedColor
                            ? "none"
                            : "linear-gradient(45deg, #ddd8cd 25%, transparent 25%), linear-gradient(-45deg, #ddd8cd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd8cd 75%), linear-gradient(-45deg, transparent 75%, #ddd8cd 75%)",
                          backgroundSize: "12px 12px",
                          backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-mono uppercase tracking-[0.14em] text-black/40 mb-0.5">
                          Sampled color
                        </div>
                        <div className="text-[13px] font-mono text-black/75">
                          {pickedColor
                            ? `rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})`
                            : "None — click the image"}
                        </div>
                      </div>
                      <button
                        onClick={() => setEyedropperActive(true)}
                        className="w-9 h-9 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors shrink-0"
                        aria-label="Resample"
                      >
                        <Pipette size={14} />
                      </button>
                    </div>

                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Tolerance</Label>
                        <motion.div
                          key={tolerance}
                          initial={{ scale: 1.15, color: "#ff6a00" }}
                          animate={{ scale: 1, color: "#00000099" }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] font-mono"
                        >
                          {tolerance}
                        </motion.div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={120}
                        value={tolerance}
                        onChange={(e) => { setTolerance(Number(e.target.value)); setConverted(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                        <span>Exact</span>
                        <span>Loose</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Edge feather</Label>
                        <motion.div
                          key={feather}
                          initial={{ scale: 1.15, color: "#ff6a00" }}
                          animate={{ scale: 1, color: "#00000099" }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] font-mono"
                        >
                          {feather}
                        </motion.div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        value={feather}
                        onChange={(e) => { setFeather(Number(e.target.value)); setConverted(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <p className="mt-3 text-[11.5px] leading-relaxed text-black/40">
                        Softens the cut edge so it doesn't look jagged. 10–20 works well for most
                        photos.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                        Transparent PNG ready
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
                      Download PNG
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
                  <strong className="text-black">AI mode</strong> — a segmentation neural network runs on your device and detects the subject. Ideal for portraits, products, pets, and cars.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Manual mode</strong> — click any pixel in the image, then fine-tune tolerance. Perfect for solid-color backgrounds where AI would be overkill.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Output is always PNG</strong> — the only common format that keeps full transparency.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Hold-to-compare</strong> — press the button in the corner to flash the original.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">100% private.</strong> Both modes run entirely in your browser. Your image is never uploaded.
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
                The AI model and every pixel operation run locally — WebAssembly for the neural
                net, HTML5 Canvas for everything else. Open DevTools and you'll see zero image
                uploads.
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
          <Check size={11} className="text-[#ff6a00]" />
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

export default TransparentBackground;