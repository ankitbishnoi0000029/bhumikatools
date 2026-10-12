"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon, Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles, Info, Move, Palette, Frame, Layers, Image as ImageIcon, Circle as CircleIcon } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Converted = {
  url: string;
  size: number;
  name: string;
  w: number;
  h: number;
};

type Stage = "idle" | "rendering" | "done";
type OutputFormat = "png" | "jpg";
type BgMode = "transparent" | "solid";

const MAX_SIZE_MB = 30;
const SIZE_PRESETS = [128, 256, 512, 1024, 2048];

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

const isHeicFile = (f: File) => {
  const type = f.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.(heic|heif)$/i.test(f.name);
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

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
// COMPONENT
// ============================================================
export const MakeRoundImage = () => {
  // ---------- file / preview ----------
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgMeta, setImgMeta] = useState<{ w: number; h: number } | null>(null);
  const [previewSize, setPreviewSize] = useState(0);

  // ---------- crop controls ----------
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // ---------- output controls ----------
  const [outputSize, setOutputSize] = useState(512);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [bgMode, setBgMode] = useState<BgMode>("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [quality, setQuality] = useState(92);
  const [borderWidth, setBorderWidth] = useState(0);
  const [borderColor, setBorderColor] = useState("#ff6a00");

  // ---------- flow ----------
  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<{
    msg: string;
    href?: string;
    label?: string;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  // ---------- refs ----------
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  // ---------- cleanup on unmount ----------
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  // ---------- measure preview box (responsive) ----------
  useEffect(() => {
    if (!file) return;
    const el = previewBoxRef.current;
    if (!el) return;
    const update = () => setPreviewSize(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [file]);

  // ---------- crop math ----------
  const computeDraw = useCallback(
    (containerSize: number) => {
      if (!imgMeta || containerSize <= 0) return null;
      const baseScale = Math.max(containerSize / imgMeta.w, containerSize / imgMeta.h);
      const scale = baseScale * zoom;
      const drawW = imgMeta.w * scale;
      const drawH = imgMeta.h * scale;
      const maxOX = Math.max(0, (drawW - containerSize) / 2);
      const maxOY = Math.max(0, (drawH - containerSize) / 2);
      const ox = clamp(offsetX, -maxOX, maxOX);
      const oy = clamp(offsetY, -maxOY, maxOY);
      const x = (containerSize - drawW) / 2 + ox;
      const y = (containerSize - drawH) / 2 + oy;
      return { x, y, drawW, drawH };
    },
    [imgMeta, zoom, offsetX, offsetY],
  );

  const applyOffset = useCallback(
    (nx: number, ny: number) => {
      if (!imgMeta || previewSize <= 0) return;
      const baseScale = Math.max(previewSize / imgMeta.w, previewSize / imgMeta.h);
      const scale = baseScale * zoom;
      const drawW = imgMeta.w * scale;
      const drawH = imgMeta.h * scale;
      const maxOX = Math.max(0, (drawW - previewSize) / 2);
      const maxOY = Math.max(0, (drawH - previewSize) / 2);
      setOffsetX(clamp(nx, -maxOX, maxOX));
      setOffsetY(clamp(ny, -maxOY, maxOY));
    },
    [imgMeta, previewSize, zoom],
  );

  // re-clamp offsets when zoom or preview size changes
  useEffect(() => {
    if (!imgMeta || previewSize <= 0) return;
    applyOffset(offsetX, offsetY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, previewSize, imgMeta]);

  // ---------- reset ----------
  const reset = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    imgRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setImgMeta(null);
    setPreviewSize(0);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setConverted(null);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------- accept file ----------
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
    imgRef.current = null;

    // HEIC gets a friendly cross-link
    if (isHeicFile(f)) {
      setError({
        msg: "HEIC files can't be previewed in a browser. Convert it to JPG first — it takes two seconds.",
        href: "/image-tools/heic-to-jpg",
        label: "Open HEIC → JPG tool",
      });
      return;
    }

    if (!f.type.startsWith("image/")) {
      setError({
        msg: "Please choose an image file — JPG, PNG, WebP, GIF, or BMP all work.",
      });
      return;
    }

    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError({ msg: `File is too large. Maximum is ${MAX_SIZE_MB} MB.` });
      return;
    }

    setFile(f);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);

    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgMeta({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      setError({ msg: "Couldn't read this image. It may be corrupt." });
    };
    img.src = url;
  }, []);

  // ---------- drop ----------
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  // ---------- drag-to-reposition ----------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgMeta) return;
    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      ox: offsetX,
      oy: offsetY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    applyOffset(dragRef.current.ox + dx, dragRef.current.oy + dy);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // ---------- render final ----------
  const renderRound = async () => {
    const img = imgRef.current;
    if (!img || !imgMeta || previewSize <= 0) {
      setError({ msg: "The image is still loading. One moment…" });
      return;
    }

    setError(null);
    setStage("rendering");
    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    setConverted(null);

    try {
      // let the UI paint the loading state first
      await new Promise((r) => setTimeout(r, 80));

      const size = outputSize;
      const ratio = size / previewSize;
      const draw = computeDraw(previewSize);
      if (!draw) throw new Error("Couldn't compute the crop.");

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas isn't supported in this browser.");

      // 1) background (required for JPG, optional for PNG)
      const useSolidBg = format === "jpg" || bgMode === "solid";
      if (useSolidBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
      }

      // 2) clip to a circle and draw the image
      const r = size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, draw.x * ratio, draw.y * ratio, draw.drawW * ratio, draw.drawH * ratio);
      ctx.restore();

      // 3) optional border ring (drawn on the inside edge)
      if (borderWidth > 0) {
        ctx.beginPath();
        ctx.arc(r, r, r - borderWidth / 2, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format === "png" ? "image/png" : "image/jpeg", format === "jpg" ? quality / 100 : undefined));
      if (!blob) throw new Error("Couldn't create the image. Please try again.");

      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file?.name ?? "image")}-round-${size}.${format}`,
        w: size,
        h: size,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError({ msg });
      setStage("idle");
    }
  };

  // ---------- derived ----------
  const busy = stage === "rendering";
  const draw = previewSize > 0 ? computeDraw(previewSize) : null;

  // preview-space border thickness (canvas px → preview px)
  const previewBorder = borderWidth > 0 && outputSize > 0 ? Math.max(1, borderWidth * (previewSize / outputSize)) : 0;

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
          <span className="text-black/70">Make Round Image</span>
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
              <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">Works on any device · No signup</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Any photo in.
              <br />
              <span className="italic text-[#ff6a00]">Perfect circle</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Profile pictures, team avatars, Instagram highlights, WhatsApp contacts — everywhere you look, images are shown in circles. This tool crops any photo into a clean circular PNG or JPG <strong className="text-black/80 font-medium">right in your browser</strong>. Drag to reposition, zoom, add a border, download.
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

        {/* ===================== WHY-ROUND NOTE ===================== */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-14 flex items-start gap-4 p-5 rounded-2xl bg-[#ff6a00]/[0.05] border border-[#ff6a00]/15"
        >
          <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/15 flex items-center justify-center shrink-0">
            <CircleIcon
              size={16}
              className="text-[#ff6a00]"
            />
          </div>
          <div className="text-[13px] leading-relaxed text-black/70">
            <strong className="text-black font-medium">Why everyone wants round images.</strong> Circles feel friendlier than squares — that's why WhatsApp, Gmail, Slack, Instagram, and almost every profile picture on the internet is circular. A square image with a circle inside is also how stickers, badges, seals, and logo marks are usually printed. This tool gives you a pixel-perfect circular cutout with a transparent background (PNG) or solid background (JPG), ready to drop straight into any app.
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
              icon={<ImageIcon size={18} />}
              title="Pick any photo"
              desc="JPG, PNG, WebP, GIF, BMP — anything your browser can open. Drop it in or click to browse."
            />
            <ExplainerCard
              n="02"
              icon={<Move size={18} />}
              title="Frame it in the circle"
              desc="Drag to reposition, slide to zoom, choose output size, add a border if you want."
            />
            <ExplainerCard
              n="03"
              icon={<Download size={18} />}
              title="Download PNG or JPG"
              desc="PNG keeps the corners transparent. JPG fills them with a solid colour. Both are 1:1 square."
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
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) acceptFile(f);
                      }}
                    />

                    <motion.div
                      animate={dragging ? { scale: 1.1, rotate: -4 } : { scale: 1, rotate: 0, y: [0, -6, 0] }}
                      transition={
                        dragging
                          ? { type: "spring", stiffness: 300, damping: 20 }
                          : {
                              duration: 2.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                      }
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${dragging ? "bg-[#ff6a00]" : "bg-[#f4f1ea]"}`}
                    >
                      <CircleIcon
                        size={26}
                        strokeWidth={1.6}
                        className={dragging ? "text-white" : "text-black/70"}
                      />
                    </motion.div>

                    <h3
                      className="text-[22px] mb-2 tracking-tight"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {dragging ? "Drop your image here" : "Drop an image here"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">or click to browse. JPG, PNG, WebP, GIF, and BMP are all supported — up to {MAX_SIZE_MB} MB.</p>

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
                    {/* file bar */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <motion.div
                          initial={{ scale: 0.8, rotate: -6 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 18,
                          }}
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
                            {formatBytes(file.size)}
                            {imgMeta && ` · ${imgMeta.w} × ${imgMeta.h}`}
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

                    {/* circular preview */}
                    <div className="flex flex-col items-center">
                      <div
                        ref={previewBoxRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        className="relative w-full max-w-[360px] aspect-square rounded-full overflow-hidden bg-[#f4f1ea] cursor-grab active:cursor-grabbing select-none"
                        style={{
                          touchAction: "none",
                          boxShadow: ["0 0 0 1px rgba(0,0,0,0.06)", previewBorder > 0 ? `inset 0 0 0 ${previewBorder}px ${borderColor}` : null].filter(Boolean).join(", "),
                        }}
                      >
                        {/* checkerboard for transparency */}
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: "linear-gradient(45deg, #e5e0d5 25%, transparent 25%), linear-gradient(-45deg, #e5e0d5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e0d5 75%), linear-gradient(-45deg, transparent 75%, #e5e0d5 75%)",
                            backgroundSize: "20px 20px",
                            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                          }}
                        />

                        {/* solid bg preview */}
                        {(format === "jpg" || bgMode === "solid") && (
                          <div
                            className="absolute inset-0"
                            style={{ background: bgColor }}
                          />
                        )}

                        {/* image */}
                        {previewUrl && draw && (
                          <img
                            src={previewUrl}
                            alt="Crop preview"
                            draggable={false}
                            className="absolute pointer-events-none"
                            style={{
                              left: draw.x,
                              top: draw.y,
                              width: draw.drawW,
                              height: draw.drawH,
                              maxWidth: "none",
                            }}
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
                              className="absolute inset-0 z-20 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                            >
                              <motion.span
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1.4,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="block w-10 h-10 rounded-full border-2 border-white/15 border-t-[#ff6a00]"
                              />
                              <div className="text-[12px] font-mono uppercase tracking-[0.18em] text-white/70">Rendering {outputSize}px…</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* drag hint */}
                      {imgMeta && !busy && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40"
                        >
                          <Move size={11} />
                          Drag inside the circle to reposition
                        </motion.div>
                      )}
                    </div>

                    {/* zoom slider */}
                    {imgMeta && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">Zoom</div>
                          <motion.div
                            key={zoom}
                            initial={{ scale: 1.15, color: "#ff6a00" }}
                            animate={{ scale: 1, color: "#00000099" }}
                            transition={{ duration: 0.25 }}
                            className="text-[11px] font-mono"
                          >
                            {zoom.toFixed(2)}×
                          </motion.div>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.01}
                          value={zoom}
                          disabled={busy}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="w-full accent-[#ff6a00]"
                        />
                        <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                          <span>Fit</span>
                          <span>Close-up</span>
                        </div>
                      </div>
                    )}

                    {/* actions */}
                    <div className="flex flex-wrap items-center gap-3 mt-6">
                      <motion.button
                        whileHover={{ scale: busy ? 1 : 1.03 }}
                        whileTap={{ scale: busy ? 1 : 0.97 }}
                        onClick={renderRound}
                        disabled={busy || !imgMeta}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                            Rendering…
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} />
                            Create round image
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

                    {/* error */}
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
                            <div className="text-[13px] text-red-700/90 leading-relaxed">
                              {error.msg}
                              {error.href && error.label && (
                                <>
                                  {" "}
                                  <Link
                                    href={error.href}
                                    className="underline font-medium hover:text-red-900"
                                  >
                                    {error.label} →
                                  </Link>
                                </>
                              )}
                            </div>
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
                    <div className="text-[13px] text-red-700/90 leading-relaxed">
                      {error.msg}
                      {error.href && error.label && (
                        <>
                          {" "}
                          <Link
                            href={error.href}
                            className="underline font-medium hover:text-red-900"
                          >
                            {error.label} →
                          </Link>
                        </>
                      )}
                    </div>
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
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Output settings</span>
              </div>

              {/* Output size */}
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">Output size</div>
                  <div className="text-[11px] font-mono text-black/40">
                    {outputSize} × {outputSize}px
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SIZE_PRESETS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setOutputSize(s)}
                      className={`px-3.5 py-2 rounded-full text-[12px] font-medium transition-colors ${outputSize === s ? "bg-black text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"}`}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">Most apps resize avatars anyway. 512px is a safe middle ground; use 1024+ if you'll print or use it as a sticker.</p>
              </div>

              {/* Format */}
              <div className="mb-7">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">Format</div>
                <div className="grid grid-cols-2 gap-2">
                  <FormatButton
                    active={format === "png"}
                    onClick={() => setFormat("png")}
                    title="PNG"
                    subtitle="Transparent corners"
                    icon={<Layers size={14} />}
                  />
                  <FormatButton
                    active={format === "jpg"}
                    onClick={() => {
                      setFormat("jpg");
                      setBgMode("solid");
                    }}
                    title="JPG"
                    subtitle="Solid background"
                    icon={<ImageIcon size={14} />}
                  />
                </div>
              </div>

              {/* Background */}
              <div className="mb-7">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">Background</div>
                {format === "png" ? (
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setBgMode("transparent")}
                      className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium transition-colors ${bgMode === "transparent" ? "bg-black text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"}`}
                    >
                      Transparent
                    </button>
                    <button
                      onClick={() => setBgMode("solid")}
                      className={`flex-1 px-3 py-2 rounded-full text-[12px] font-medium transition-colors ${bgMode === "solid" ? "bg-black text-white" : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"}`}
                    >
                      Solid colour
                    </button>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-black/40 leading-relaxed mb-3">JPG has no transparency, so the corners get filled with a solid colour.</p>
                )}

                {(format === "jpg" || bgMode === "solid") && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3"
                  >
                    <ColorSwatch
                      value={bgColor}
                      onChange={setBgColor}
                      label="Background colour"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-black/[0.08] bg-white text-[12px] font-mono uppercase focus:outline-none focus:border-black/30"
                      maxLength={7}
                    />
                  </motion.div>
                )}
              </div>

              {/* JPG quality */}
              {format === "jpg" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-7 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">JPG quality</div>
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
                    min={40}
                    max={100}
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-[#ff6a00]"
                  />
                  <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">80–90% is plenty for avatars. Drop to 70% if you need a tiny file.</p>
                </motion.div>
              )}

              {/* Border */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Frame
                    size={13}
                    className="text-black/40"
                  />
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">Border ring</div>
                  <div className="ml-auto text-[11px] font-mono text-black/40">{borderWidth}px</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={borderWidth}
                  onChange={(e) => setBorderWidth(Number(e.target.value))}
                  className="w-full accent-[#ff6a00]"
                />
                {borderWidth > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 mt-3"
                  >
                    <ColorSwatch
                      value={borderColor}
                      onChange={setBorderColor}
                      label="Border colour"
                    />
                    <input
                      type="text"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-black/[0.08] bg-white text-[12px] font-mono uppercase focus:outline-none focus:border-black/30"
                      maxLength={7}
                    />
                  </motion.div>
                )}
                <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">A 4–8px ring gives avatars that polished "profile picture" look — great for team directories.</p>
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
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
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
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">Round image ready</span>
                    </motion.div>

                    {/* thumbnail */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mb-5 flex items-center gap-4"
                    >
                      <div
                        className="w-16 h-16 rounded-full overflow-hidden border border-white/10 shrink-0"
                        style={{
                          backgroundImage: "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
                          backgroundSize: "12px 12px",
                          backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                        }}
                      >
                        <img
                          src={converted.url}
                          alt="Round result"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <motion.h3
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.24 }}
                          className="text-[16px] leading-tight mb-1 break-all"
                          style={{ fontFamily: "Georgia, serif" }}
                        >
                          {converted.name}
                        </motion.h3>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.28 }}
                          className="text-[12px] text-white/50"
                        >
                          {formatBytes(converted.size)} · {converted.w}×{converted.h}
                        </motion.p>
                      </div>
                    </motion.div>

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
                      Download {format.toUpperCase()}
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
                  <strong className="text-black">Input: any common image.</strong> JPG, PNG, WebP, GIF, BMP — whatever your browser can open. HEIC users get a one-click shortcut to convert first.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Output: a square PNG or JPG</strong> with a perfect circular crop. PNG keeps the corners transparent; JPG fills them with your chosen colour.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Drag to reposition, zoom to reframe.</strong> The circle stays fixed — you move the photo behind it, just like Instagram's crop screen.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Optional border ring.</strong> A coloured outline turns a plain crop into a polished profile-picture look.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Everything stays on your device.</strong> The crop and export run on the HTML5 Canvas API — nothing is uploaded, ever.
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
                <span className="text-[13px] font-medium text-black">Your photo never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">Every pixel is read, cropped, and re-encoded inside your browser using the Canvas API. There's no upload, no server, no analytics on your image. Open DevTools' Network tab and you'll see zero image-related requests.</p>
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

function FormatButton({ active, onClick, title, subtitle, icon }: { active: boolean; onClick: () => void; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border transition-colors text-left ${active ? "bg-black text-white border-black" : "bg-white text-black border-black/[0.10] hover:border-black/30"}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center ${active ? "bg-white/10 text-white" : "bg-black/[0.05] text-black/70"}`}>{icon}</span>
        <span className="text-[13px] font-medium">{title}</span>
        {active && (
          <Check
            size={13}
            className="ml-auto text-[#ff6a00]"
          />
        )}
      </div>
      <span className={`text-[11px] leading-tight ${active ? "text-white/55" : "text-black/45"}`}>{subtitle}</span>
    </motion.button>
  );
}

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label
      className="relative w-10 h-10 rounded-xl border border-black/[0.10] overflow-hidden cursor-pointer shrink-0"
      style={{ background: value }}
      aria-label={label}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  );
}
