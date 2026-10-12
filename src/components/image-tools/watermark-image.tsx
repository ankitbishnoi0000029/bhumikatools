"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, Type as TypeIcon,
  Image as ImageIcon, UploadCloud, Grid3x3, Layers, Stamp,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type WatermarkType = "text" | "image";
type Position =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";
type OutputFormat = "image/jpeg" | "image/png";
type Stage = "idle" | "rendering" | "done";

type Converted = { url: string; size: number; name: string };

const MAX_SIZE_MB = 25;

const POSITIONS: Position[] = [
  "top-left", "top-center", "top-right",
  "middle-left", "center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

const FONTS = [
  { value: "system-ui, -apple-system, sans-serif", label: "Sans" },
  { value: "Georgia, serif", label: "Serif" },
  { value: "ui-monospace, monospace", label: "Mono" },
];

const isImageFile = (f: File) => {
  if (f.type.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|webp|gif|bmp|tiff|svg|heic|heif|avif)$/i.test(f.name);
};

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
// DRAW CORE
// ============================================================
type DrawOptions = {
  watermarkType: WatermarkType;
  text: string;
  fontFamily: string;
  fontSizePct: number;
  textColor: string;
  logoSizePct: number;
  opacity: number;
  rotation: number;
  position: Position;
  tiled: boolean;
};

function drawWatermark(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  logoImg: HTMLImageElement | null,
  opts: DrawOptions
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = img.naturalWidth;
  const H = img.naturalHeight;
  canvas.width = W;
  canvas.height = H;

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0);

  const isText = opts.watermarkType === "text";
  const hasContent = isText ? opts.text.trim().length > 0 : logoImg !== null;
  if (!hasContent) return;

  // ----- compute watermark bounding box -----
  let wmW = 0;
  let wmH = 0;

  if (isText) {
    const fontPx = Math.max(8, Math.round((W * opts.fontSizePct) / 100));
    ctx.font = `600 ${fontPx}px ${opts.fontFamily}`;
    const m = ctx.measureText(opts.text);
    wmW = m.width;
    wmH = fontPx * 1.1;
  } else if (logoImg) {
    const scale = (W * opts.logoSizePct) / 100 / logoImg.naturalWidth;
    wmW = logoImg.naturalWidth * scale;
    wmH = logoImg.naturalHeight * scale;
  }

  const pad = Math.round(Math.min(W, H) * 0.04);
  const angle = (opts.rotation * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opts.opacity / 100));

  // ----- draw single watermark helper -----
  const drawOne = (cx: number, cy: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    if (isText) {
      const fontPx = Math.max(8, Math.round((W * opts.fontSizePct) / 100));
      ctx.font = `600 ${fontPx}px ${opts.fontFamily}`;
      ctx.fillStyle = opts.textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opts.text, 0, 0);
    } else if (logoImg) {
      ctx.drawImage(logoImg, -wmW / 2, -wmH / 2, wmW, wmH);
    }
    ctx.restore();
  };

  if (opts.tiled) {
    const stepX = Math.max(wmW * 2.2, W / 5);
    const stepY = Math.max(wmH * 3.5, H / 6);
    for (let y = -wmH; y < H + wmH; y += stepY) {
      for (let x = -wmW; x < W + wmW; x += stepX) {
        drawOne(x + stepX / 2, y + stepY / 2);
      }
    }
  } else {
    const halfW = wmW / 2;
    const halfH = wmH / 2;
    const [vy, vx] = opts.position.split("-");

    let cx = W / 2;
    let cy = H / 2;

    if (vx === "left") cx = pad + halfW;
    else if (vx === "right") cx = W - pad - halfW;
    else if (vx === "center") cx = W / 2;

    if (vy === "top") cy = pad + halfH;
    else if (vy === "bottom") cy = H - pad - halfH;
    else if (vy === "middle") cy = H / 2;

    drawOne(cx, cy);
  }

  ctx.restore();
}

// ============================================================
// COMPONENT
// ============================================================
export const WatermarkImage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [text, setText] = useState("© Your Name");
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const [fontSizePct, setFontSizePct] = useState(6);
  const [textColor, setTextColor] = useState("#ffffff");
  const [logoSizePct, setLogoSizePct] = useState(20);

  const [opacity, setOpacity] = useState(70);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [tiled, setTiled] = useState(false);

  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(92);

  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [logoDragging, setLogoDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  const sourceUrlRef = useRef<string | null>(null);
  const logoUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  // redraw preview whenever anything changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = sourceImgRef.current;
    if (!canvas || !img) return;
    drawWatermark(canvas, img, logoImgRef.current, {
      watermarkType, text, fontFamily, fontSizePct, textColor,
      logoSizePct, opacity, rotation, position, tiled,
    });
  }, [watermarkType, text, fontFamily, fontSizePct, textColor, logoSizePct, opacity, rotation, position, tiled]);

  // load source image
  useEffect(() => {
    if (!sourceUrl) {
      sourceImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      sourceImgRef.current = img;
      redraw();
    };
    img.src = sourceUrl;
  }, [sourceUrl, redraw]);

  // load logo image
  useEffect(() => {
    if (!logoUrl) {
      logoImgRef.current = null;
      redraw();
      return;
    }
    const img = new Image();
    img.onload = () => {
      logoImgRef.current = img;
      redraw();
    };
    img.src = logoUrl;
  }, [logoUrl, redraw]);

  // redraw on any setting change
  useEffect(() => { redraw(); }, [redraw]);

  const reset = () => {
    if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }
    if (logoUrlRef.current) { URL.revokeObjectURL(logoUrlRef.current); logoUrlRef.current = null; }
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }
    setFile(null); setSourceUrl(null);
    setLogoFile(null); setLogoUrl(null);
    setConverted(null); setError(null); setStage("idle");
    sourceImgRef.current = null;
    logoImgRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null); setConverted(null); setStage("idle");
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }

    if (!isImageFile(f)) {
      setError("That doesn't look like an image. Please choose a JPG, PNG, WebP, GIF, BMP, TIFF, or SVG file.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    const url = URL.createObjectURL(f);
    sourceUrlRef.current = url;
    setFile(f); setSourceUrl(url);
  }, []);

  const acceptLogo = useCallback((f: File) => {
    setError(null); setConverted(null);
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }

    if (!isImageFile(f)) {
      setError("The watermark logo must be an image file (PNG with transparency works best).");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Logo is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }
    if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    const url = URL.createObjectURL(f);
    logoUrlRef.current = url;
    setLogoFile(f); setLogoUrl(url);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const onLogoDrop = (e: React.DragEvent) => {
    e.preventDefault(); setLogoDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptLogo(f);
  };

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    setError(null); setStage("rendering");

    try {
      await new Promise((r) => setTimeout(r, 250));

      const mime = format;
      const q = format === "image/jpeg" ? quality / 100 : undefined;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, q)
      );
      if (!blob) throw new Error("Couldn't export the image. Please try again.");

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      const ext = format === "image/jpeg" ? "jpg" : "png";
      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file.name)}-watermarked.${ext}`,
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  const busy = stage === "rendering";

  const stageLabel: Record<Stage, string> = {
    idle: "", rendering: "Rendering watermark…", done: "",
  };
  const stageStep: Record<Stage, string> = {
    idle: "", rendering: "please wait", done: "",
  };
  const progressWidth = stage === "rendering" ? "90%" : "0%";

  const canDownload =
    !!file && (
      (watermarkType === "text" && text.trim().length > 0) ||
      (watermarkType === "image" && logoImgRef.current !== null)
    );

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
          <span className="text-black/70">Watermark Image</span>
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
                Text + Logo · Live preview · No signup
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Stamp your images.
              <br />
              <span className="italic text-[#ff6a00]">Live preview.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Add text or a logo watermark to any image. Position it anywhere, control size,
              opacity, rotation, or tile it across the whole picture. Everything updates
              instantly and runs <strong className="text-black/80 font-medium">entirely in your browser</strong>.
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
              title="Upload your image"
              desc="Drop a JPG, PNG, WebP, or any other image. Up to 25 MB."
            />
            <ExplainerCard
              n="02"
              icon={<TypeIcon size={18} />}
              title="Add text or logo"
              desc="Type your watermark, or upload a logo. Tweak size, color, opacity, position."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download it"
              desc="Save as JPG or PNG — watermark baked in, ready to share anywhere."
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
                      <Stamp size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your image here" : "Drop an image to watermark"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                      or click to browse. JPG, PNG, WebP, GIF, BMP, TIFF, SVG — up to {MAX_SIZE_MB} MB.
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
                            {formatBytes(file.size)} · live preview
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

                    {/* live canvas preview */}
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
                        ref={canvasRef}
                        className="relative z-10 max-w-full max-h-[480px] object-contain"
                      />

                      {/* busy overlay */}
                      <AnimatePresence>
                        {busy && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
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
                        whileHover={{ scale: busy || !canDownload ? 1 : 1.03 }}
                        whileTap={{ scale: busy || !canDownload ? 1 : 0.97 }}
                        onClick={download}
                        disabled={busy || !canDownload}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Rendering…
                          </>
                        ) : (
                          <>
                            <Download size={15} />
                            Download watermarked
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

            {/* ---------- Watermark type ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Watermark type" />

              <div className="grid grid-cols-2 gap-2 mb-6">
                <TypePill
                  icon={<TypeIcon size={15} />}
                  label="Text"
                  active={watermarkType === "text"}
                  onClick={() => { setWatermarkType("text"); setConverted(null); }}
                />
                <TypePill
                  icon={<ImageIcon size={15} />}
                  label="Logo / Image"
                  active={watermarkType === "image"}
                  onClick={() => { setWatermarkType("image"); setConverted(null); }}
                />
              </div>

              {/* Text options */}
              <AnimatePresence mode="wait">
                {watermarkType === "text" ? (
                  <motion.div
                    key="text-opts"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <div>
                      <Label>Watermark text</Label>
                      <input
                        type="text"
                        value={text}
                        onChange={(e) => { setText(e.target.value); setConverted(null); }}
                        placeholder="© Your Name 2025"
                        maxLength={120}
                        className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-black/[0.10] bg-white text-[13.5px] outline-none focus:border-[#ff6a00] transition-colors"
                      />
                    </div>

                    <div>
                      <Label>Font</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {FONTS.map((f) => {
                          const active = fontFamily === f.value;
                          return (
                            <button
                              key={f.value}
                              onClick={() => { setFontFamily(f.value); setConverted(null); }}
                              className={`relative py-2 rounded-xl border text-[12.5px] font-medium transition-all ${
                                active
                                  ? "border-black bg-black text-white"
                                  : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
                              }`}
                              style={{ fontFamily: f.value }}
                            >
                              {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Color</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="color"
                            value={textColor}
                            onChange={(e) => { setTextColor(e.target.value); setConverted(null); }}
                            className="w-10 h-10 rounded-lg border border-black/[0.10] cursor-pointer bg-white"
                          />
                          <span className="text-[11px] font-mono uppercase tracking-wider text-black/50">
                            {textColor.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <Label>Size</Label>
                        <SliderRow value={fontSizePct} onChange={(v) => { setFontSizePct(v); setConverted(null); }} min={2} max={20} unit="%" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="image-opts"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <div>
                      <Label>Logo image</Label>

                      {!logoFile ? (
                        <label
                          onDragOver={(e) => { e.preventDefault(); setLogoDragging(true); }}
                          onDragLeave={() => setLogoDragging(false)}
                          onDrop={onLogoDrop}
                          className={`mt-2 flex flex-col items-center justify-center text-center cursor-pointer rounded-xl border-2 border-dashed py-8 px-4 transition-all ${
                            logoDragging
                              ? "border-[#ff6a00] bg-[#ff6a00]/[0.04]"
                              : "border-black/[0.12] hover:border-black/30 hover:bg-black/[0.015]"
                          }`}
                        >
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptLogo(f); }}
                          />
                          <UploadCloud size={20} className="text-black/40 mb-3" strokeWidth={1.75} />
                          <div className="text-[12.5px] text-black/60 leading-relaxed max-w-[220px]">
                            Drop a logo here, or <span className="text-[#ff6a00] font-medium">click to browse</span>
                          </div>
                          <div className="text-[11px] text-black/40 mt-2">
                            PNG with transparency works best
                          </div>
                        </label>
                      ) : (
                        <div className="mt-2 flex items-center gap-3 p-3 rounded-xl border border-black/[0.10] bg-[#f4f1ea]/50">
                          <div
                            className="w-12 h-12 rounded-lg border border-black/[0.08] shrink-0"
                            style={{
                              backgroundImage:
                                "linear-gradient(45deg, #ddd8cd 25%, transparent 25%), linear-gradient(-45deg, #ddd8cd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd8cd 75%), linear-gradient(-45deg, transparent 75%, #ddd8cd 75%)",
                              backgroundSize: "10px 10px",
                              backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
                            }}
                          >
                            {logoUrl && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] font-medium text-black truncate">{logoFile.name}</div>
                            <div className="text-[10.5px] font-mono uppercase tracking-[0.15em] text-black/40">
                              {formatBytes(logoFile.size)}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
                              logoUrlRef.current = null;
                              setLogoFile(null); setLogoUrl(null);
                              setConverted(null);
                            }}
                            className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors shrink-0"
                            aria-label="Remove logo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Logo size</Label>
                      <SliderRow value={logoSizePct} onChange={(v) => { setLogoSizePct(v); setConverted(null); }} min={5} max={60} unit="%" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---------- Placement ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Placement" />

              {/* 3x3 grid */}
              <div className="mb-5">
                <Label>Position</Label>
                <div className="mt-3 grid grid-cols-3 gap-1.5 max-w-[220px]">
                  {POSITIONS.map((p) => {
                    const active = position === p && !tiled;
                    return (
                      <button
                        key={p}
                        onClick={() => { setPosition(p); setTiled(false); setConverted(null); }}
                        className={`aspect-square rounded-lg border transition-all flex items-center justify-center ${
                          active
                            ? "border-[#ff6a00] bg-[#ff6a00]/10"
                            : "border-black/[0.10] hover:border-black/30"
                        }`}
                        aria-label={p}
                      >
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tile toggle */}
              <button
                onClick={() => { setTiled((v) => !v); setConverted(null); }}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  tiled
                    ? "border-black bg-black text-white"
                    : "border-black/[0.10] bg-white text-black/75 hover:border-black/30"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tiled ? "bg-white/10" : "bg-[#f4f1ea]"}`}>
                  <Grid3x3 size={15} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[13px] font-medium">Tile across image</div>
                  <div className={`text-[11px] ${tiled ? "text-white/50" : "text-black/45"}`}>
                    Repeats the watermark in a grid pattern
                  </div>
                </div>
                {tiled && <Check size={14} className="text-[#ff6a00]" />}
              </button>

              {/* Opacity + Rotation */}
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div>
                  <Label>Opacity</Label>
                  <SliderRow value={opacity} onChange={(v) => { setOpacity(v); setConverted(null); }} min={5} max={100} unit="%" />
                </div>
                <div>
                  <Label>Rotation</Label>
                  <SliderRow value={rotation} onChange={(v) => { setRotation(v); setConverted(null); }} min={-90} max={90} unit="°" />
                </div>
              </div>
            </motion.div>

            {/* ---------- Output format ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Output" />

              <div className="grid grid-cols-2 gap-2 mb-5">
                <TypePill
                  icon={<ImageIcon size={15} />}
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
                  PNG is lossless and preserves transparency — ideal when your source image
                  has transparent areas.
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
                        Watermark applied
                      </span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-[20px] leading-tight mb-1 break-all"
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
                  <strong className="text-black">Adds a text or image watermark</strong> to any photo — perfect for copyright, branding, or drafts.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Live preview</strong> — every tweak (size, color, opacity, position) updates the image instantly.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Nine placements</strong> across the image, plus a tile mode that repeats it everywhere.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs entirely in your browser.</strong> No upload, no server, no queue.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">No signup, no watermark on the tool, no limits.</strong> Use it as much as you want.
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
                Rendering happens locally on an HTML5 Canvas. There is no backend, no upload,
                and no tracking — open DevTools and you'll see zero network requests when you
                download.
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
function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
        {label}
      </span>
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

function SliderRow({
  value, onChange, min, max, unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1.5">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[#ff6a00]"
        />
        <motion.span
          key={value}
          initial={{ scale: 1.15, color: "#ff6a00" }}
          animate={{ scale: 1, color: "#00000099" }}
          transition={{ duration: 0.2 }}
          className="ml-3 text-[11px] font-mono min-w-[36px] text-right"
        >
          {value}{unit}
        </motion.span>
      </div>
    </div>
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

export default WatermarkImage;