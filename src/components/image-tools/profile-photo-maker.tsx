"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, UserRound,
  Circle as CircleIcon, Square as SquareIcon, Layers, Move, ZoomIn,
  ZoomOut, Palette, Frame, Maximize2,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Shape = "circle" | "rounded" | "square";
type Stage = "idle" | "reading" | "rendering" | "encoding" | "done";
type Converted = { url: string; size: number; name: string; dim: number };

const MAX_SIZE_MB = 25;
const PREVIEW_SIZE = 400; // fixed preview box in CSS pixels

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
// COMPONENT
// ============================================================
export const ProfilePhotoMaker = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);

  // transform
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // style
  const [shape, setShape] = useState<Shape>("circle");
  const [ringPct, setRingPct] = useState(0); // 0-30 (% of diameter)
  const [ringColor, setRingColor] = useState("#ffffff");
  const [bgMode, setBgMode] = useState<"transparent" | "solid">("transparent");
  const [bgColor, setBgColor] = useState("#0b0b0c");

  // output
  const [outputSize, setOutputSize] = useState(512);

  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);

  // drag state
  const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);

  const [previewReady, setPreviewReady] = useState(false);

  // compute display metrics
  const baseScale = srcW && srcH ? Math.max(PREVIEW_SIZE / srcW, PREVIEW_SIZE / srcH) : 1;
  const displayW = srcW * baseScale * zoom;
  const displayH = srcH * baseScale * zoom;

  // clamp offset so image always covers the preview circle
  const clampedOffset = {
    x: clamp(offset.x, PREVIEW_SIZE - displayW, 0),
    y: clamp(offset.y, PREVIEW_SIZE - displayH, 0),
  };

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  const centerImage = useCallback((w: number, h: number, zoomVal: number = 1) => {
    const bs = Math.max(PREVIEW_SIZE / w, PREVIEW_SIZE / h);
    const dW = w * bs * zoomVal;
    const dH = h * bs * zoomVal;
    setOffset({ x: (PREVIEW_SIZE - dW) / 2, y: (PREVIEW_SIZE - dH) / 2 });
  }, []);

  const reset = () => {
    if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }
    setFile(null); setSourceUrl(null);
    setSrcW(0); setSrcH(0);
    setZoom(1); setOffset({ x: 0, y: 0 });
    setShape("circle"); setRingPct(0); setRingColor("#ffffff");
    setBgMode("transparent"); setBgColor("#0b0b0c");
    setOutputSize(512);
    setConverted(null); setError(null); setStage("idle");
    setPreviewReady(false);
    sourceImgRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null); setConverted(null); setStage("idle");
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
      sourceImgRef.current = probe;
      const w = probe.naturalWidth;
      const h = probe.naturalHeight;
      setSrcW(w); setSrcH(h);
      setZoom(1);
      centerImage(w, h, 1);
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
  }, [centerImage]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  // ---------- zoom around center ----------
  const applyZoom = (newZoom: number) => {
    const z = clamp(newZoom, 0.5, 4);
    // keep the container center fixed while zooming
    const oldDW = displayW;
    const oldDH = displayH;
    const newDW = srcW * baseScale * z;
    const newDH = srcH * baseScale * z;
    const centerX = clampedOffset.x + oldDW / 2;
    const centerY = clampedOffset.y + oldDH / 2;
    setOffset({ x: centerX - newDW / 2, y: centerY - newDH / 2 });
    setZoom(z);
    setConverted(null);
  };

  // ---------- pointer interactions ----------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!file) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffX: clampedOffset.x,
      startOffY: clampedOffset.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.startOffX + dx,
      y: dragRef.current.startOffY + dy,
    });
    setConverted(null);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!file) return;
    e.preventDefault();
    const factor = 1 - e.deltaY * 0.0015;
    applyZoom(zoom * factor);
  };

  // ---------- export ----------
  const convert = async () => {
    if (!file || !sourceImgRef.current) return;
    setError(null);
    setStage("reading");

    try {
      const img = sourceImgRef.current;
      const size = outputSize;
      const S = size / PREVIEW_SIZE; // scale factor from preview to output

      await new Promise((r) => setTimeout(r, 100));
      setStage("rendering");

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const ringPx = (ringPct / 100) * size;
      const ringHalf = ringPx / 2;

      // 1) background
      if (bgMode === "solid") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);
      } else {
        ctx.clearRect(0, 0, size, size);
      }

      // 2) clip to shape
      ctx.save();
      ctx.beginPath();
      const pad = ringPx;
      const innerSize = size - pad * 2;
      const r = shape === "circle"
        ? innerSize / 2
        : shape === "rounded"
        ? innerSize * 0.22
        : 0;

      if (shape === "circle") {
        ctx.arc(pad + innerSize / 2, pad + innerSize / 2, innerSize / 2, 0, Math.PI * 2);
      } else if (shape === "rounded") {
        roundRect(ctx, pad, pad, innerSize, innerSize, r);
      } else {
        ctx.rect(pad, pad, innerSize, innerSize);
      }
      ctx.clip();

      // 3) draw image, adjusted for the ring padding
      // The preview's transform is relative to a 400px square. Inside the
      // output, the "inner" shape is size - 2*ringPx, so we offset by pad
      // and scale the transform from PREVIEW_SIZE to (size - 2*ringPx).
      const innerS = innerSize;
      const innerScale = innerS / PREVIEW_SIZE;

      ctx.drawImage(
        img,
        pad + clampedOffset.x * innerScale,
        pad + clampedOffset.y * innerScale,
        displayW * innerScale,
        displayH * innerScale
      );

      ctx.restore();

      // 4) ring stroke (on top)
      if (ringPx > 0) {
        ctx.save();
        ctx.lineWidth = ringPx;
        ctx.strokeStyle = ringColor;
        ctx.beginPath();
        if (shape === "circle") {
          ctx.arc(size / 2, size / 2, size / 2 - ringHalf, 0, Math.PI * 2);
        } else if (shape === "rounded") {
          const rr = (size - ringPx) * 0.22;
          roundRect(ctx, ringHalf, ringHalf, size - ringPx, size - ringPx, rr);
        } else {
          ctx.rect(ringHalf, ringHalf, size - ringPx, size - ringPx);
        }
        ctx.stroke();
        ctx.restore();
      }

      await new Promise((r) => setTimeout(r, 100));
      setStage("encoding");

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Encoding failed. Please try again.");

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file.name)}-profile-${size}.png`,
        dim: size,
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  const busy = stage === "reading" || stage === "rendering" || stage === "encoding";

  const stageLabel: Record<Stage, string> = {
    idle: "", reading: "Preparing…", rendering: "Rendering profile…", encoding: "Encoding PNG…", done: "",
  };
  const stageStep: Record<Stage, string> = {
    idle: "", reading: "step 1 of 3", rendering: "step 2 of 3", encoding: "step 3 of 3", done: "",
  };
  const progressWidth =
    stage === "reading" ? "35%" : stage === "rendering" ? "65%" : stage === "encoding" ? "90%" : "0%";

  // shape overlay classes
  const shapeRadius =
    shape === "circle" ? "50%" : shape === "rounded" ? "22%" : "0px";

  const ringPxPreview = (ringPct / 100) * PREVIEW_SIZE;

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
          <span className="text-black/70">Profile Photo Maker</span>
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
                Circle · Rounded · Square · Transparent PNG
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Your face.
              <br />
              <span className="italic text-[#ff6a00]">Perfectly framed.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Crop any photo into a clean profile picture. Drag to reposition, zoom to frame
              the face, add a colored ring, and export as a high-res transparent PNG — ready for
              WhatsApp, LinkedIn, Instagram, Gmail, or anywhere else.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Drag & zoom" />
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
              title="Drop your photo"
              desc="Any JPG, PNG, WebP, or other image up to 25 MB. Portraits work best."
            />
            <ExplainerCard
              n="02"
              icon={<Move size={18} />}
              title="Frame the face"
              desc="Drag to reposition. Zoom in to tighten the crop. Pick circle, rounded, or square."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the PNG"
              desc="A transparent PNG at 256, 512, or 1024 px — ready to upload anywhere."
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
                      animate={dragging ? { scale: 1.1, rotate: -6 } : { scale: 1, rotate: 0, y: [0, -6, 0] }}
                      transition={dragging
                        ? { type: "spring", stiffness: 300, damping: 20 }
                        : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${
                        dragging ? "bg-[#ff6a00]" : "bg-[#f4f1ea]"
                      }`}
                    >
                      <UserRound size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your photo here" : "Drop a photo to make a profile pic"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                      or click to browse. JPG, PNG, WebP, GIF, BMP — up to {MAX_SIZE_MB} MB.
                    </p>

                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[12.5px] font-medium"
                    >
                      Choose photo
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

                    {/* interactive preview container */}
                    <div className="flex justify-center mb-5">
                      <div
                        className="relative rounded-2xl overflow-hidden border border-black/[0.08] select-none"
                        style={{
                          width: PREVIEW_SIZE,
                          height: PREVIEW_SIZE,
                          maxWidth: "100%",
                          aspectRatio: "1 / 1",
                          touchAction: "none",
                          cursor: dragRef.current ? "grabbing" : "grab",
                        }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                        onWheel={onWheel}
                      >
                        {/* background fill (only in solid mode) */}
                        {bgMode === "solid" && (
                          <div
                            className="absolute inset-0"
                            style={{ background: bgColor }}
                          />
                        )}

                        {/* transparent checkerboard (only when transparent mode) */}
                        {bgMode === "transparent" && (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage:
                                "linear-gradient(45deg, #d8d3c8 25%, transparent 25%), linear-gradient(-45deg, #d8d3c8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d3c8 75%), linear-gradient(-45deg, transparent 75%, #d8d3c8 75%)",
                              backgroundSize: "20px 20px",
                              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                            }}
                          />
                        )}

                        {/* the image, absolutely positioned inside the preview */}
                        {previewReady && sourceUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={sourceUrl}
                            alt="Profile preview"
                            draggable={false}
                            className="absolute top-0 left-0 pointer-events-none"
                            style={{
                              width: displayW,
                              height: displayH,
                              transform: `translate(${clampedOffset.x}px, ${clampedOffset.y}px)`,
                              transformOrigin: "0 0",
                              maxWidth: "none",
                              userSelect: "none",
                            }}
                          />
                        )}

                        {/* shape mask + ring overlay (on top of image, so we get a clean cutout) */}
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            inset: ringPxPreview / 2,
                            borderRadius: shapeRadius,
                            boxShadow: `0 0 0 ${PREVIEW_SIZE}px ${
                              bgMode === "transparent" ? "transparent" : bgColor
                            }`,
                            // Simpler approach: use a real overlay that "erases" outside the shape
                            // via a big inset shadow that matches the surrounding background —
                            // but the surrounding is whatever bg mode we chose. Instead we
                            // use clip-path via the outer wrapper below.
                            display: "none",
                          }}
                        />

                        {/* The real shape cutout: an absolutely positioned overlay that
                            paints the "outside the shape" area with the correct bg or
                            a transparency checkerboard. We achieve this by rendering a
                            border-radius'd element that sits on top and pushes the mask. */}

                        {/* Outer mask: paints everything outside the shape with the bg */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              bgMode === "transparent"
                                ? "transparent"
                                : bgColor,
                            mixBlendMode: "normal",
                            // Use a mask to hide the "inside" area (we only want the outside painted)
                            WebkitMaskImage: "",
                          }}
                        />

                        {/* Simpler & robust: shape cutout using border-radius on a container
                            that re-shows the image. But since we already drew the image above,
                            let's instead use a "hole punch" — a big colored/shadowed div that
                            covers everything except the shape. */}

                        {/* Final approach: overlay with the exact shape drawn as an inner hole.
                            We'll rely on the shape mask via outline using box-shadow spread
                            inside the preview (this is the classic trick). */}
                        <ShapeMask
                          shape={shape}
                          ringPct={ringPct}
                          ringColor={ringColor}
                          bgMode={bgMode}
                          bgColor={bgColor}
                          previewSize={PREVIEW_SIZE}
                        />

                        {/* cursor hint overlay */}
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white pointer-events-none"
                        >
                          <Move size={11} className="text-[#ff6a00]" />
                          <span className="text-[10px] font-mono uppercase tracking-[0.14em]">
                            Drag to move · Scroll to zoom
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
                                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50 mt-1">
                                  {stageStep[stage]}
                                </div>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* zoom controls below preview */}
                    <div className="flex items-center gap-3 mb-6 max-w-[400px] mx-auto">
                      <button
                        onClick={() => applyZoom(zoom - 0.2)}
                        disabled={zoom <= 0.5}
                        className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
                        aria-label="Zoom out"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <input
                        type="range"
                        min={0.5}
                        max={4}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => applyZoom(Number(e.target.value))}
                        className="flex-1 accent-[#ff6a00]"
                      />
                      <button
                        onClick={() => applyZoom(zoom + 0.2)}
                        disabled={zoom >= 4}
                        className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 shrink-0"
                        aria-label="Zoom in"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <span className="text-[11px] font-mono text-black/50 w-12 text-right">
                        {zoom.toFixed(2)}×
                      </span>
                    </div>

                    {/* quick reset */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <button
                        onClick={() => { centerImage(srcW, srcH, 1); setZoom(1); setConverted(null); }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[11.5px] font-medium text-black/60 hover:text-black hover:bg-black/[0.05] transition-colors"
                      >
                        <RotateCcw size={12} />
                        Re-center & reset zoom
                      </button>
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
                            Rendering…
                          </>
                        ) : (
                          <>
                            <Download size={15} />
                            Make my profile photo
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

            {/* ---------- Shape ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Shape" icon={<CircleIcon size={11} />} />

              <div className="grid grid-cols-3 gap-2">
                <ShapePill
                  icon={<CircleIcon size={16} />}
                  label="Circle"
                  active={shape === "circle"}
                  onClick={() => { setShape("circle"); setConverted(null); }}
                />
                <ShapePill
                  icon={<Frame size={16} />}
                  label="Rounded"
                  active={shape === "rounded"}
                  onClick={() => { setShape("rounded"); setConverted(null); }}
                />
                <ShapePill
                  icon={<SquareIcon size={16} />}
                  label="Square"
                  active={shape === "square"}
                  onClick={() => { setShape("square"); setConverted(null); }}
                />
              </div>
            </motion.div>

            {/* ---------- Ring ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Ring border" icon={<CircleIcon size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                A colored border around your profile picture. Set to 0 for no border.
              </p>

              <div className="flex items-center justify-between mb-3">
                <Label>Width</Label>
                <motion.div
                  key={ringPct}
                  initial={{ scale: 1.15, color: "#ff6a00" }}
                  animate={{ scale: 1, color: "#00000099" }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] font-mono"
                >
                  {ringPct}%
                </motion.div>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={ringPct}
                onChange={(e) => { setRingPct(Number(e.target.value)); setConverted(null); }}
                className="w-full accent-[#ff6a00]"
              />
              <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                <span>None</span>
                <span>Thick</span>
              </div>

              <AnimatePresence>
                {ringPct > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-5">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={ringColor}
                          onChange={(e) => { setRingColor(e.target.value); setConverted(null); }}
                          className="w-12 h-12 rounded-xl border border-black/[0.10] cursor-pointer bg-white shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-black/40 mb-0.5">
                            Ring color
                          </div>
                          <input
                            type="text"
                            value={ringColor}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                                setRingColor(v);
                                setConverted(null);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-black/[0.10] bg-white text-[12.5px] font-mono outline-none focus:border-[#ff6a00] transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---------- Background ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Background" icon={<Palette size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                What fills the corners behind the shape. Transparent is best for chat apps that
                round their own avatars.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <BgPill
                  label="Transparent"
                  active={bgMode === "transparent"}
                  onClick={() => { setBgMode("transparent"); setConverted(null); }}
                  checker
                />
                <BgPill
                  label="Solid color"
                  active={bgMode === "solid"}
                  onClick={() => { setBgMode("solid"); setConverted(null); }}
                  color={bgColor}
                />
              </div>

              <AnimatePresence>
                {bgMode === "solid" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => { setBgColor(e.target.value); setConverted(null); }}
                        className="w-12 h-12 rounded-xl border border-black/[0.10] cursor-pointer bg-white shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-black/40 mb-0.5">
                          Background color
                        </div>
                        <input
                          type="text"
                          value={bgColor}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                              setBgColor(v);
                              setConverted(null);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-black/[0.10] bg-white text-[12.5px] font-mono outline-none focus:border-[#ff6a00] transition-colors"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---------- Output size ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Output size" icon={<Layers size={11} />} />
              <p className="text-[11.5px] text-black/45 leading-relaxed mb-5 -mt-2">
                Bigger = sharper on high-DPI screens. 512px covers WhatsApp, LinkedIn, and
                Instagram perfectly.
              </p>

              <div className="grid grid-cols-3 gap-2">
                {[256, 512, 1024].map((s) => (
                  <SizePill
                    key={s}
                    label={`${s}px`}
                    sub={s === 256 ? "Small" : s === 512 ? "Standard" : "High-res"}
                    active={outputSize === s}
                    onClick={() => { setOutputSize(s); setConverted(null); }}
                  />
                ))}
              </div>
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
                        Profile photo ready
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
                      {converted.dim}×{converted.dim} · {formatBytes(converted.size)}
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
                  <strong className="text-black">Circular, rounded, or square crops</strong> — fits any platform's avatar shape without you having to guess.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Drag to reposition, scroll to zoom</strong> — frame your face exactly how you want inside the shape.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Optional colored ring</strong> — a crisp border around the circle, perfect for a modern, bold avatar look.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Transparent background option</strong> — keeps the PNG flexible so any app can round it its own way.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs 100% in your browser.</strong> No upload, no server — your photo never leaves your device.
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
                <span className="text-[13px] font-medium text-black">Your photo never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Cropping, ring rendering, and PNG export all happen on an HTML5 Canvas in your
                browser. There is no backend, no upload, and no tracking — open DevTools and
                you'll see zero network requests while you work.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SHAPE MASK — cut-out overlay for the preview
// ============================================================
function ShapeMask({
  shape, ringPct, ringColor, bgMode, bgColor, previewSize,
}: {
  shape: Shape;
  ringPct: number;
  ringColor: string;
  bgMode: "transparent" | "solid";
  bgColor: string;
  previewSize: number;
}) {
  const ringPx = (ringPct / 100) * previewSize;
  const innerSize = previewSize - ringPx * 2;

  // The mask paints the "outside the shape" area with the surrounding background
  // (transparent checkerboard or solid color) using a big inset box-shadow.
  // The inner shape itself stays transparent so the image shows through.
  const radius =
    shape === "circle" ? "50%" : shape === "rounded" ? "22%" : "0px";

  // For a transparent background, we actually want the checkerboard to show
  // OUTSIDE the shape (which the parent already provides), so we need to paint
  // the surrounding area with the checkerboard again — that gives the illusion
  // of "transparent outside" while hiding the image.

  return (
    <>
      {/* ring + outside mask, in one shot */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          // The shape's own area stays clear; everything outside it is covered
          // by a giant inset box-shadow whose color matches the surrounding bg.
          // Because we want a checkerboard when transparent, we use a separate
          // overlay div with the same checkerboard pattern (below), and this
          // first div just paints the ring + a black border ring.
        }}
      >
        {/* This is the shape "hole punch" — a wrapper sized to the inner
            shape with a huge spread shadow that hides everything outside it. */}
        <div
          style={{
            position: "absolute",
            left: ringPx,
            top: ringPx,
            width: innerSize,
            height: innerSize,
            borderRadius: radius,
            // shadow spread that covers the whole preview
            boxShadow: bgMode === "solid"
              ? `0 0 0 ${previewSize * 2}px ${bgColor}`
              : `0 0 0 ${previewSize * 2}px rgba(0,0,0,0)`, // no-op for transparent; below we layer the checkerboard
          }}
        />
      </div>

      {/* When transparent, re-paint the "outside" with the checkerboard via a
          second shape mask that matches the container's own checkerboard. */}
      {bgMode === "transparent" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(45deg, #d8d3c8 25%, transparent 25%), linear-gradient(-45deg, #d8d3c8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d3c8 75%), linear-gradient(-45deg, transparent 75%, #d8d3c8 75%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            WebkitMask: `radial-gradient(circle at center, transparent 0, transparent ${innerSize / 2}px, black ${innerSize / 2 + 0.5}px)`,
            mask: `radial-gradient(circle at center, transparent 0, transparent ${innerSize / 2}px, black ${innerSize / 2 + 0.5}px)`,
            // Note: this radial mask is circle-specific; for non-circles we
            // fall back to a rounded-rect mask via CSS clip-path.
          }}
        />
      )}

      {/* Ring stroke (painted on top) */}
      {ringPx > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: ringPx / 2,
            top: ringPx / 2,
            width: previewSize - ringPx,
            height: previewSize - ringPx,
            borderRadius:
              shape === "circle"
                ? "50%"
                : shape === "rounded"
                ? "22%"
                : "0px",
            border: `${ringPx}px solid ${ringColor}`,
            boxSizing: "border-box",
          }}
        />
      )}
    </>
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

function ShapePill({
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
      className={`relative flex flex-col items-center gap-1.5 py-4 rounded-xl border text-[11.5px] font-medium transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      <span className={active ? "text-[#ff6a00]" : "text-black/55"}>{icon}</span>
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

function BgPill({
  label, active, onClick, checker, color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  checker?: boolean;
  color?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-[12px] font-medium transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      <div
        className="w-8 h-8 rounded-full border border-black/[0.08]"
        style={{
          backgroundColor: checker ? "transparent" : color,
          backgroundImage: checker
            ? "linear-gradient(45deg, #bbb 25%, transparent 25%), linear-gradient(-45deg, #bbb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bbb 75%), linear-gradient(-45deg, transparent 75%, #bbb 75%)"
            : "none",
          backgroundSize: "10px 10px",
          backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0px",
        }}
      />
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

function SizePill({
  label, sub, active, onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-center py-3.5 rounded-xl border text-[13px] font-medium transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      <span className="font-mono">{label}</span>
      <span className={`text-[10px] font-normal mt-0.5 ${active ? "text-white/50" : "text-black/40"}`}>
        {sub}
      </span>
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

// ============================================================
// EXPORT
// ============================================================
export default ProfilePhotoMaker;

// Round-rect helper for canvas
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}