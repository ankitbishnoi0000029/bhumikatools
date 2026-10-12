"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon, Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles, Wand2, HardDriveDownload, Info, Layers, Cpu, Code2, FileCheck2, HelpCircle, ChevronDown, Crop, RotateCw, FlipHorizontal, FlipVertical, Grid3x3, RectangleHorizontal, RectangleVertical, Square, Maximize2, Smartphone, Monitor, Image as ImageIcon, Palette, Move, Eye, EyeOff } from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type CropRect = { x: number; y: number; w: number; h: number }; // normalized 0..1
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";
type Format = "png" | "jpg" | "webp";
type Stage = "idle" | "processing" | "done";
type AspectKey = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2" | "2:3";

type Result = {
  url: string;
  size: number;
  name: string;
  width: number;
  height: number;
};

const MAX_SIZE_MB = 50;
const MIN_CROP = 0.04; // 4% minimum crop size

const ASPECTS: { key: AspectKey; label: string; value: number | null; icon: React.ReactNode }[] = [
  { key: "free", label: "Free", value: null, icon: <Crop size={13} /> },
  { key: "1:1", label: "1:1", value: 1, icon: <Square size={13} /> },
  { key: "4:3", label: "4:3", value: 4 / 3, icon: <RectangleHorizontal size={13} /> },
  { key: "3:4", label: "3:4", value: 3 / 4, icon: <RectangleVertical size={13} /> },
  { key: "16:9", label: "16:9", value: 16 / 9, icon: <RectangleHorizontal size={13} /> },
  { key: "9:16", label: "9:16", value: 9 / 16, icon: <RectangleVertical size={13} /> },
  { key: "3:2", label: "3:2", value: 3 / 2, icon: <RectangleHorizontal size={13} /> },
  { key: "2:3", label: "2:3", value: 2 / 3, icon: <RectangleVertical size={13} /> },
];

// ============================================================
// HELPERS
// ============================================================
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const stripExt = (name: string) => name.replace(/\.[^/.]+$/, "");

const isSupportedImage = (f: File) => {
  const t = f.type.toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg" || t === "image/png" || t === "image/webp") return true;
  return /\.(jpg|jpeg|png|webp)$/i.test(f.name);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read the image."));
    img.src = src;
  });

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
export const CropImage = () => {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [effectiveDims, setEffectiveDims] = useState<{ w: number; h: number } | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);

  const [crop, setCrop] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [aspectKey, setAspectKey] = useState<AspectKey>("free");
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(92);

  const [result, setResult] = useState<Result | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isCropDragging, setIsCropDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const originalUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const imgWrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; startCrop: CropRect } | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  // Bake rotation + flip into a new preview whenever they change
  const regenPreview = useCallback(async (srcUrl: string, srcDims: { w: number; h: number }, rot: number, fh: boolean, fv: boolean) => {
    const img = await loadImage(srcUrl);
    const swap = rot === 90 || rot === 270;
    const canvas = document.createElement("canvas");
    canvas.width = swap ? srcDims.h : srcDims.w;
    canvas.height = swap ? srcDims.w : srcDims.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(fh ? -1 : 1, fv ? -1 : 1);
    ctx.drawImage(img, -srcDims.w / 2, -srcDims.h / 2);
    ctx.restore();

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setEffectiveDims({ w: canvas.width, h: canvas.height });
  }, []);

  const resetCropForAspect = useCallback((aspectVal: number | null, effDims: { w: number; h: number } | null) => {
    if (!aspectVal || !effDims) {
      setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
      return;
    }
    // Fit the largest rectangle with the given aspect inside [0,1]x[0,1] in pixel space
    const imgAspect = effDims.w / effDims.h;
    let w = 0.8,
      h = 0.8;
    if (aspectVal > imgAspect) {
      // wider than image: fit width
      w = 0.8;
      h = (w * effDims.w) / aspectVal / effDims.h;
    } else {
      h = 0.8;
      w = (h * effDims.h * aspectVal) / effDims.w;
    }
    w = Math.min(w, 0.9);
    h = Math.min(h, 0.9);
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
  }, []);

  // When aspect changes, reshape the crop box
  useEffect(() => {
    const aspectVal = ASPECTS.find((a) => a.key === aspectKey)?.value ?? null;
    if (!aspectVal || !effectiveDims) return;
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    const imgAspect = effectiveDims.w / effectiveDims.h;
    // Keep the current area similar; derive new w/h from aspect
    let w = crop.w;
    let h = (w * effectiveDims.w) / aspectVal / effectiveDims.h;
    if (h > 0.9) {
      h = 0.9;
      w = (h * effectiveDims.h * aspectVal) / effectiveDims.w;
    }
    if (w > 0.9) {
      w = 0.9;
      h = (w * effectiveDims.w) / aspectVal / effectiveDims.h;
    }
    const nx = clamp(cx - w / 2, 0, 1 - w);
    const ny = clamp(cy - h / 2, 0, 1 - h);
    setCrop({ x: nx, y: ny, w, h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectKey]);

  const acceptFile = useCallback(
    async (f: File) => {
      setError(null);
      setResult(null);
      setStage("idle");
      if (resultUrlRef.current) {
        URL.revokeObjectURL(resultUrlRef.current);
        resultUrlRef.current = null;
      }

      if (!isSupportedImage(f)) {
        setError("Please upload a JPG, PNG, or WebP image.");
        return;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
        return;
      }

      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      const url = URL.createObjectURL(f);
      originalUrlRef.current = url;
      setOriginalUrl(url);
      setFileName(f.name);
      setFileSize(f.size);

      const img = await loadImage(url);
      const dims = { w: img.naturalWidth, h: img.naturalHeight };
      setImageDims(dims);

      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });

      await regenPreview(url, dims, 0, false, false);
    },
    [regenPreview],
  );

  // Regen preview whenever rotation/flip changes (only if we have an original)
  useEffect(() => {
    if (!originalUrl || !imageDims) return;
    regenPreview(originalUrl, imageDims, rotation, flipH, flipV);
  }, [rotation, flipH, flipV, originalUrl, imageDims, regenPreview]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const reset = () => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    originalUrlRef.current = null;
    previewUrlRef.current = null;
    resultUrlRef.current = null;
    setOriginalUrl(null);
    setPreviewUrl(null);
    setImageDims(null);
    setEffectiveDims(null);
    setResult(null);
    setError(null);
    setStage("idle");
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------------- CROP INTERACTION ----------------
  const startCropDrag = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
    setIsCropDragging(true);
  };

  useEffect(() => {
    if (!isCropDragging) return;

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      const wrapper = imgWrapperRef.current;
      if (!d || !wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const dx = (e.clientX - d.startX) / rect.width;
      const dy = (e.clientY - d.startY) / rect.height;
      const sc = d.startCrop;
      const aspectVal = ASPECTS.find((a) => a.key === aspectKey)?.value ?? null;

      if (d.handle === "move") {
        setCrop({
          x: clamp(sc.x + dx, 0, 1 - sc.w),
          y: clamp(sc.y + dy, 0, 1 - sc.h),
          w: sc.w,
          h: sc.h,
        });
        return;
      }

      let L = sc.x;
      let T = sc.y;
      let R = sc.x + sc.w;
      let B = sc.y + sc.h;

      // Apply delta to the moving edge(s)
      if (d.handle.includes("w")) L = clamp(sc.x + dx, 0, R - MIN_CROP);
      if (d.handle.includes("e")) R = clamp(sc.x + sc.w + dx, L + MIN_CROP, 1);
      if (d.handle.includes("n")) T = clamp(sc.y + dy, 0, B - MIN_CROP);
      if (d.handle.includes("s")) B = clamp(sc.y + sc.h + dy, T + MIN_CROP, 1);

      let newW = R - L;
      let newH = B - T;

      // Aspect ratio: only adjust in fixed modes
      if (aspectVal) {
        // Determine which axis was driven more by the gesture
        const dw = Math.abs(newW - sc.w);
        const dh = Math.abs(newH - sc.h);
        const isCorner = d.handle.length === 2;

        if (isCorner) {
          if (dw > dh) {
            newH = (newW * (effectiveDims?.w ?? 1)) / aspectVal / (effectiveDims?.h ?? 1);
          } else {
            newW = (newH * (effectiveDims?.h ?? 1) * aspectVal) / (effectiveDims?.w ?? 1);
          }
        } else if (d.handle === "e" || d.handle === "w") {
          newH = (newW * (effectiveDims?.w ?? 1)) / aspectVal / (effectiveDims?.h ?? 1);
        } else {
          newW = (newH * (effectiveDims?.h ?? 1) * aspectVal) / (effectiveDims?.w ?? 1);
        }

        // Anchor the fixed edge/corner and clamp inside bounds
        const anchorR = d.handle.includes("w") ? R : null;
        const anchorL = d.handle.includes("e") ? L : null;
        const anchorB = d.handle.includes("n") ? B : null;
        const anchorT = d.handle.includes("s") ? T : null;

        if (anchorL !== null) L = anchorL;
        if (anchorR !== null) R = anchorR;
        if (anchorT !== null) T = anchorT;
        if (anchorB !== null) B = anchorB;

        // For corners where both edges move, we anchor the opposite corner
        if (isCorner) {
          L = d.handle.includes("w") ? R - newW : L;
          R = d.handle.includes("e") ? L + newW : R;
          T = d.handle.includes("n") ? B - newH : T;
          B = d.handle.includes("s") ? T + newH : B;
          // Recompute L/R/T/B based on corners
          if (d.handle === "nw") {
            R = sc.x + sc.w;
            B = sc.y + sc.h;
            L = R - newW;
            T = B - newH;
          } else if (d.handle === "ne") {
            L = sc.x;
            B = sc.y + sc.h;
            R = L + newW;
            T = B - newH;
          } else if (d.handle === "sw") {
            R = sc.x + sc.w;
            T = sc.y;
            L = R - newW;
            B = T + newH;
          } else if (d.handle === "se") {
            L = sc.x;
            T = sc.y;
            R = L + newW;
            B = T + newH;
          }
        }

        // Clamp to bounds
        if (L < 0) {
          L = 0;
          if (d.handle === "w") R = L + newW;
        }
        if (T < 0) {
          T = 0;
          if (d.handle === "n") B = T + newH;
        }
        if (R > 1) {
          R = 1;
          if (d.handle === "e") L = R - newW;
        }
        if (B > 1) {
          B = 1;
          if (d.handle === "s") T = B - newH;
        }
      }

      const nw = Math.max(MIN_CROP, R - L);
      const nh = Math.max(MIN_CROP, B - T);
      const nx = clamp(L, 0, 1 - nw);
      const ny = clamp(T, 0, 1 - nh);
      setCrop({ x: nx, y: ny, w: nw, h: nh });
    };

    const onUp = () => {
      dragRef.current = null;
      setIsCropDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isCropDragging, aspectKey, effectiveDims]);

  // ---------------- EXPORT ----------------
  const exportCropped = async () => {
    if (!originalUrl || !imageDims || !effectiveDims) return;
    setError(null);
    setResult(null);
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setStage("processing");

    try {
      const img = await loadImage(originalUrl);

      // Bake rotation + flip
      const swap = rotation === 90 || rotation === 270;
      const baked = document.createElement("canvas");
      baked.width = swap ? imageDims.h : imageDims.w;
      baked.height = swap ? imageDims.w : imageDims.h;
      const bctx = baked.getContext("2d");
      if (!bctx) throw new Error("Canvas is not supported in this browser.");
      bctx.save();
      bctx.translate(baked.width / 2, baked.height / 2);
      bctx.rotate((rotation * Math.PI) / 180);
      bctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      bctx.drawImage(img, -imageDims.w / 2, -imageDims.h / 2);
      bctx.restore();

      // Compute pixel crop
      const cx = Math.round(crop.x * baked.width);
      const cy = Math.round(crop.y * baked.height);
      const cw = Math.max(1, Math.round(crop.w * baked.width));
      const ch = Math.max(1, Math.round(crop.h * baked.height));

      const out = document.createElement("canvas");
      out.width = cw;
      out.height = ch;
      const octx = out.getContext("2d");
      if (!octx) throw new Error("Canvas is not supported in this browser.");

      if (format === "jpg") {
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, cw, ch);
      }
      octx.drawImage(baked, cx, cy, cw, ch, 0, 0, cw, ch);

      const mime = format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
      const blob = await new Promise<Blob | null>((r) => out.toBlob(r, mime, format === "png" ? undefined : quality / 100));
      if (!blob) throw new Error("Couldn't encode the image. Please try again.");

      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      setResult({
        url,
        size: blob.size,
        name: `${stripExt(fileName)}_crop.${format}`,
        width: cw,
        height: ch,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStage("idle");
    }
  };

  const busy = stage === "processing";

  // Live pixel dimensions of the crop
  const cropPixels = useMemo(() => {
    if (!effectiveDims) return null;
    return {
      w: Math.round(crop.w * effectiveDims.w),
      h: Math.round(crop.h * effectiveDims.h),
    };
  }, [crop, effectiveDims]);

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
          <span className="text-black/70">Crop Image</span>
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
              <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">Drag · Resize · Rotate · Flip · Export</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Frame it.
              <br />
              <span className="italic text-[#ff6a00]">Perfectly</span> cropped.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Drag the box, lock an aspect ratio, rotate, flip — then export a crisp crop in PNG, JPG, or WebP. Aspect presets for Instagram, YouTube, Twitter, and more. Everything <strong className="text-black/80 font-medium">in your browser</strong>, no upload.
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

        {/* ===================== NON-DESTRUCTIVE NOTE ===================== */}
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
            <strong className="text-black font-medium">Non-destructive by design.</strong> Your original file never changes. Crop, rotate, flip, and re-crop as many times as you like — the tool always works from the original pixels. Only the final download applies your changes.
          </div>
        </motion.div>

        {/* ===================== 4-STEP EXPLAINER ===================== */}
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
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">How this tool works</span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <ExplainerCard
              n="01"
              icon={<FileImage size={18} />}
              title="Upload an image"
              desc="JPG, PNG, or WebP up to 50 MB. It renders instantly — no decoding tricks, no waiting."
            />
            <ExplainerCard
              n="02"
              icon={<Crop size={18} />}
              title="Drag the crop box"
              desc="Eight handles + free move. Lock an aspect ratio or stay free-form. Live grid overlay helps you align."
            />
            <ExplainerCard
              n="03"
              icon={<RotateCw size={18} />}
              title="Rotate, flip, adjust"
              desc="Rotate in 90° steps and flip horizontally or vertically. Everything is previewed live."
            />
            <ExplainerCard
              n="04"
              icon={<HardDriveDownload size={18} />}
              title="Download"
              desc="Export as PNG, JPG, or WebP — exactly the pixels you framed, at full resolution."
            />
          </div>
        </motion.section>

        {/* ===================== WORKSPACE ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* ---------- LEFT: Dropzone / Crop canvas ---------- */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="lg:col-span-7"
          >
            <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-8">
              <AnimatePresence mode="wait">
                {/* ---------- DROPZONE ---------- */}
                {!originalUrl && (
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
                    className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[420px] px-6 ${dragging ? "border-[#ff6a00] bg-[#ff6a00]/[0.04] scale-[1.01]" : "border-black/[0.12] hover:border-black/30 hover:bg-black/[0.015]"}`}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
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
                      <Crop
                        size={26}
                        strokeWidth={1.6}
                        className={dragging ? "text-white" : "text-black/70"}
                      />
                    </motion.div>

                    <h3
                      className="text-[22px] mb-2 tracking-tight"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {dragging ? "Drop your image here" : "Drop an image to crop"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">or click to browse. Accepts .jpg, .png, and .webp — up to {MAX_SIZE_MB} MB.</p>

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

                {/* ---------- CROP UI ---------- */}
                {originalUrl && previewUrl && (
                  <motion.div
                    key="cropper"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                  >
                    {/* Top bar */}
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
                          <div className="text-[13.5px] font-medium text-black truncate">{fileName}</div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            {imageDims ? `${imageDims.w} × ${imageDims.h} px · ` : ""}
                            {formatBytes(fileSize)}
                          </div>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.08, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={reset}
                        disabled={busy}
                        className="w-9 h-9 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
                        aria-label="Remove image"
                      >
                        <X size={14} />
                      </motion.button>
                    </div>

                    {/* Crop canvas */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-6 min-h-[300px] flex items-center justify-center p-4">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: "linear-gradient(45deg, #e5e0d5 25%, transparent 25%), linear-gradient(-45deg, #e5e0d5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e0d5 75%), linear-gradient(-45deg, transparent 75%, #e5e0d5 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                        }}
                      />

                      <div
                        ref={imgWrapperRef}
                        className="relative z-10 inline-block select-none touch-none"
                        style={{ lineHeight: 0 }}
                      >
                        <img
                          src={previewUrl}
                          alt="Crop preview"
                          className="block max-w-full max-h-[520px] pointer-events-none select-none"
                          draggable={false}
                        />

                        {/* Dark overlay (4 rects) */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div
                            className="absolute bg-black/55"
                            style={{ top: 0, left: 0, right: 0, height: `${crop.y * 100}%` }}
                          />
                          <div
                            className="absolute bg-black/55"
                            style={{ top: `${(crop.y + crop.h) * 100}%`, left: 0, right: 0, bottom: 0 }}
                          />
                          <div
                            className="absolute bg-black/55"
                            style={{
                              top: `${crop.y * 100}%`,
                              left: 0,
                              width: `${crop.x * 100}%`,
                              height: `${crop.h * 100}%`,
                            }}
                          />
                          <div
                            className="absolute bg-black/55"
                            style={{
                              top: `${crop.y * 100}%`,
                              right: 0,
                              width: `${(1 - crop.x - crop.w) * 100}%`,
                              height: `${crop.h * 100}%`,
                            }}
                          />
                        </div>

                        {/* Crop box */}
                        <div
                          className="absolute cursor-move"
                          style={{
                            left: `${crop.x * 100}%`,
                            top: `${crop.y * 100}%`,
                            width: `${crop.w * 100}%`,
                            height: `${crop.h * 100}%`,
                            border: "1.5px solid rgba(255,255,255,0.95)",
                            boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                          }}
                          onPointerDown={startCropDrag("move")}
                        >
                          {/* Rule-of-thirds grid */}
                          {showGrid && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div
                                className="absolute top-0 bottom-0"
                                style={{ left: "33.333%", width: "1px", background: "rgba(255,255,255,0.35)" }}
                              />
                              <div
                                className="absolute top-0 bottom-0"
                                style={{ left: "66.666%", width: "1px", background: "rgba(255,255,255,0.35)" }}
                              />
                              <div
                                className="absolute left-0 right-0"
                                style={{ top: "33.333%", height: "1px", background: "rgba(255,255,255,0.35)" }}
                              />
                              <div
                                className="absolute left-0 right-0"
                                style={{ top: "66.666%", height: "1px", background: "rgba(255,255,255,0.35)" }}
                              />
                            </div>
                          )}

                          {/* Handles — always corners; edges only in free mode */}
                          <Handle
                            pos="nw"
                            onPointerDown={startCropDrag("nw")}
                          />
                          <Handle
                            pos="ne"
                            onPointerDown={startCropDrag("ne")}
                          />
                          <Handle
                            pos="sw"
                            onPointerDown={startCropDrag("sw")}
                          />
                          <Handle
                            pos="se"
                            onPointerDown={startCropDrag("se")}
                          />
                          {aspectKey === "free" && (
                            <>
                              <Handle
                                pos="n"
                                onPointerDown={startCropDrag("n")}
                              />
                              <Handle
                                pos="e"
                                onPointerDown={startCropDrag("e")}
                              />
                              <Handle
                                pos="s"
                                onPointerDown={startCropDrag("s")}
                              />
                              <Handle
                                pos="w"
                                onPointerDown={startCropDrag("w")}
                              />
                            </>
                          )}

                          {/* Size badge */}
                          {cropPixels && (
                            <div className="absolute -top-7 left-0 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono whitespace-nowrap">
                              {cropPixels.w} × {cropPixels.h}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Help hint */}
                      <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1.5">
                        <Move size={10} />
                        Drag to move · corners to resize
                      </div>

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
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                              className="block w-12 h-12 rounded-full border-2 border-white/15 border-t-[#ff6a00]"
                            />
                            <div className="text-[13px] font-medium text-white">Exporting crop…</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <motion.button
                        whileHover={{ scale: busy ? 1 : 1.03 }}
                        whileTap={{ scale: busy ? 1 : 0.97 }}
                        onClick={exportCropped}
                        disabled={busy}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                            Exporting…
                          </>
                        ) : (
                          <>
                            <Crop size={15} />
                            Crop & Download
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setAspectKey("free");
                          resetCropForAspect(null, effectiveDims);
                          setResult(null);
                        }}
                        disabled={busy}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-black/15 text-[13px] font-medium text-black/70 hover:border-black/40 hover:text-black transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        Reset crop
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
                {!originalUrl && error && (
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

          {/* ---------- RIGHT: Settings + Result ---------- */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="lg:col-span-5 space-y-6"
          >
            {/* Aspect ratios */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Aspect ratio</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {ASPECTS.map((a) => (
                  <motion.button
                    key={a.key}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setAspectKey(a.key);
                      resetCropForAspect(a.value, effectiveDims);
                      setResult(null);
                    }}
                    className={`py-2.5 rounded-xl text-[11.5px] font-medium border transition-colors flex flex-col items-center justify-center gap-1 ${aspectKey === a.key ? "bg-black text-white border-black" : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"}`}
                  >
                    {a.icon}
                    {a.label}
                  </motion.button>
                ))}
              </div>
              <p className="mt-4 text-[11.5px] text-black/45 leading-relaxed">Presets cover Instagram (1:1, 4:5), YouTube thumbnails (16:9), TikTok/Reels (9:16), and print (3:2).</p>
            </motion.div>

            {/* Transform + output */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Transform & output</span>
              </div>

              {/* Rotation + flip */}
              <div className="mb-6">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">Rotate & flip</div>
                <div className="grid grid-cols-3 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96, rotate: -8 }}
                    onClick={() => {
                      setRotation((r) => (r + 270) % 360);
                      setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
                      setResult(null);
                    }}
                    className="py-2.5 rounded-xl text-[12px] font-medium border border-black/[0.1] hover:border-black/30 bg-white text-black/70 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCw
                      size={13}
                      className="-scale-x-100"
                    />
                    90° CCW
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96, rotate: 8 }}
                    onClick={() => {
                      setRotation((r) => (r + 90) % 360);
                      setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
                      setResult(null);
                    }}
                    className="py-2.5 rounded-xl text-[12px] font-medium border border-black/[0.1] hover:border-black/30 bg-white text-black/70 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCw size={13} />
                    90° CW
                  </motion.button>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setFlipH((v) => !v);
                        setResult(null);
                      }}
                      className={`flex-1 rounded-xl border transition-colors flex items-center justify-center ${flipH ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"}`}
                      title="Flip horizontally"
                    >
                      <FlipHorizontal size={13} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setFlipV((v) => !v);
                        setResult(null);
                      }}
                      className={`flex-1 rounded-xl border transition-colors flex items-center justify-center ${flipV ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"}`}
                      title="Flip vertically"
                    >
                      <FlipVertical size={13} />
                    </motion.button>
                  </div>
                </div>
                <div className="mt-2 text-[10.5px] font-mono uppercase tracking-[0.14em] text-black/35">Rotation: {rotation}°</div>
              </div>

              {/* Grid toggle */}
              <div className="mb-6 flex items-center justify-between p-3.5 rounded-xl bg-black/[0.02] border border-black/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Grid3x3
                    size={14}
                    className="text-black/55"
                  />
                  <span className="text-[12.5px] text-black/70">Rule-of-thirds grid</span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGrid((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${showGrid ? "bg-[#ff6a00]" : "bg-black/15"}`}
                >
                  <motion.span
                    animate={{ x: showGrid ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
                  />
                </motion.button>
              </div>

              {/* Format */}
              <div className="mb-6">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">Output format</div>
                <div className="grid grid-cols-3 gap-2">
                  <FormatButton
                    active={format === "png"}
                    onClick={() => setFormat("png")}
                    title="PNG"
                    subtitle="Lossless"
                  />
                  <FormatButton
                    active={format === "jpg"}
                    onClick={() => setFormat("jpg")}
                    title="JPG"
                    subtitle="Small"
                  />
                  <FormatButton
                    active={format === "webp"}
                    onClick={() => setFormat("webp")}
                    title="WebP"
                    subtitle="Modern"
                  />
                </div>
              </div>

              {/* Quality */}
              {format !== "png" && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">Quality</div>
                    <div className="text-[11px] font-mono text-black/60">{quality}%</div>
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
              )}
            </motion.div>

            {/* Result */}
            <AnimatePresence>
              {result && (
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
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">Crop ready</span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-[22px] leading-tight mb-1 break-all"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {result.name}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.28 }}
                      className="text-[13px] text-white/50 mb-6"
                    >
                      {result.width} × {result.height} px · {formatBytes(result.size)}
                    </motion.p>

                    <motion.a
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.34 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      href={result.url}
                      download={result.name}
                      className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[13.5px] font-medium hover:bg-[#ff6a00] hover:text-white transition-colors"
                    >
                      <Download size={15} />
                      Download crop
                      <ArrowUpRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </motion.a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feature list */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Features</span>
              </div>
              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>
                  <strong className="text-black">8-handle crop box</strong> with live pixel readout — drag to move, corners to resize.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">8 aspect presets</strong> — free, 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Rotate in 90° steps</strong> and flip horizontally or vertically — previewed live.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Rule-of-thirds grid</strong> to help compose your crop.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">PNG, JPG, or WebP</strong> export with adjustable quality for lossy formats.
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
                <span className="text-[13px] font-medium text-black">Your image never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">Rotation, flipping, cropping, and encoding all run inside your browser using the HTML5 Canvas API. Open DevTools → Network — you'll see zero requests for your image.</p>
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
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 mb-4"
          >
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">Deep dive</span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-4 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            How does non-destructive cropping actually work?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12"
          >
            Your original pixels never change until you click download. Here's what happens under the hood at export time.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:grid-cols-3">
            <DeepDiveCard
              className="lg:col-span-4"
              n="01"
              icon={<Cpu size={18} />}
              title="Bake the transform"
              body="Rotation and flips are applied to a temporary canvas the size of the effective image. The source image is drawn centered with rotate() and scale(-1, 1) for flips — no resampling, no quality loss."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="02"
              icon={<Code2 size={18} />}
              title="Map normalized → pixels"
              body="Your crop box is stored in normalized coordinates (0..1). At export, crop.x * width gives the pixel offset. This is why the crop survives window resizes — it scales with the display."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="03"
              icon={<FileCheck2 size={18} />}
              title="Single drawImage cut"
              body="The final crop is one drawImage(baked, cx, cy, cw, ch, 0, 0, cw, ch) call — a pixel-exact rectangle copy. No intermediate quality loss; PNG is bit-perfect."
            />
          </div>

          <motion.div
            variants={fadeUp}
            className="mt-10 p-6 rounded-[20px] bg-white border border-black/[0.06]"
          >
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                <Info
                  size={16}
                  className="text-[#ff6a00]"
                />
              </div>
              <div className="text-[13px] leading-relaxed text-black/65">
                <strong className="text-black">Why we bake rotation first:</strong> if we rotated at the very end, the crop coordinates would need to be re-rotated too, which makes the math error-prone. Baking rotation into a temp canvas first means the crop always operates in the same coordinate space the user sees — simpler, and pixel-exact.
              </div>
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
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 mb-4"
          >
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">When to use this</span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Crop it when…
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCaseCard
              icon={<Smartphone size={18} />}
              title="You're posting to a specific platform"
              desc="Instagram square, YouTube thumbnail 16:9, TikTok 9:16 — pick the preset and frame your shot perfectly."
            />
            <UseCaseCard
              icon={<Palette size={18} />}
              title="You want a tighter composition"
              desc="Trim distracting edges to focus on your subject. The rule-of-thirds grid helps you compose without installing Photoshop."
            />
            <UseCaseCard
              icon={<ImageIcon size={18} />}
              title="You need to fix an accidental rotation"
              desc="Phone cameras sometimes save sideways. Rotate in 90° steps and crop — done in two clicks."
            />
            <UseCaseCard
              icon={<Monitor size={18} />}
              title="You're prepping a website asset"
              desc="Crop a banner, hero image, or product shot to exactly the aspect ratio your design needs."
            />
            <UseCaseCard
              icon={<Maximize2 size={18} />}
              title="You want to isolate a detail"
              desc="Zoom into a photo and crop out a specific region — a face, a sign, a texture — without resizing anything else."
            />
            <UseCaseCard
              icon={<Layers size={18} />}
              title="You're building a series"
              desc="Use the same aspect preset for every image in a carousel, thread, or gallery for a consistent grid."
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
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 mb-4"
          >
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">Common questions</span>
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
    q: "Does cropping reduce the image quality?",
    a: "No. When you export as PNG or WebP (lossless mode), the crop is a bit-for-bit copy of the pixels you framed. Even JPG export at 92% quality is visually indistinguishable from the original for most content. Cropping never resamples or blurs.",
  },
  {
    q: "Does rotation lose quality?",
    a: "No. We only rotate in 90° increments, which is a pure pixel rearrangement — no interpolation, no blur. Free-angle rotation (like 15°) would require resampling, but this tool doesn't do that.",
  },
  {
    q: "Can I crop the same image multiple times?",
    a: "Yes, and each crop starts from the original. The tool is non-destructive: your source file is never modified, and the crop preview is regenerated fresh from the original pixels every time you rotate, flip, or re-crop.",
  },
  {
    q: "What's the difference between the aspect presets?",
    a: "1:1 is a square (Instagram feed), 4:5 is portrait (Instagram optimal), 16:9 is widescreen (YouTube, TV), 9:16 is vertical (TikTok, Reels, Shorts), 3:2 is classic photo print, and 4:3 / 3:4 are older screen and print formats. Free mode lets you drag any rectangle.",
  },
  {
    q: "Why do the edge handles disappear when I pick an aspect ratio?",
    a: "Because dragging an edge would violate the locked aspect — you'd need to adjust the perpendicular dimension at the same time, which feels unintuitive. In fixed-aspect mode you can only drag corners (both dimensions move together) or the whole box (move only).",
  },
  {
    q: "What format should I pick — PNG, JPG, or WebP?",
    a: "PNG for lossless + transparency (larger files). JPG for photos where size matters (smaller files, no transparency). WebP for modern browsers — often smaller than both PNG and JPG at equivalent quality, with alpha support.",
  },
  {
    q: "Does the crop box scale when I resize the browser window?",
    a: "Yes. Crop coordinates are stored as normalized values (0..1), not pixels. Resizing the window re-renders the display image at a different size but the crop stays exactly where you placed it relative to the image content.",
  },
  {
    q: "Is my image uploaded anywhere?",
    a: "No. Upload, preview, rotation, flipping, cropping, and encoding all happen inside your browser using the HTML5 Canvas API. Open DevTools → Network and you'll see zero outgoing requests for the image.",
  },
];

// ============================================================
// SUB COMPONENTS
// ============================================================
function Handle({ pos, onPointerDown }: { pos: Handle; onPointerDown: (e: React.PointerEvent) => void }) {
  const size = 12;
  const half = size / 2;
  const styles: Record<string, React.CSSProperties> = {
    nw: { top: -half, left: -half, cursor: "nwse-resize" },
    n: { top: -half, left: `calc(50% - ${half}px)`, cursor: "ns-resize" },
    ne: { top: -half, right: -half, cursor: "nesw-resize" },
    e: { top: `calc(50% - ${half}px)`, right: -half, cursor: "ew-resize" },
    se: { bottom: -half, right: -half, cursor: "nwse-resize" },
    s: { bottom: -half, left: `calc(50% - ${half}px)`, cursor: "ns-resize" },
    sw: { bottom: -half, left: -half, cursor: "nesw-resize" },
    w: { top: `calc(50% - ${half}px)`, left: -half, cursor: "ew-resize" },
  };
  if (pos === "move") return null;
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute rounded-full bg-white border border-black/30 shadow-sm z-10"
      style={{ width: size, height: size, ...styles[pos] }}
    />
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

function DeepDiveCard({ n, icon, title, body, className = "" }: { n: string; icon: React.ReactNode; title: string; body: string; className?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative p-6 rounded-[20px] bg-white border border-black/[0.06] ${className}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center text-black/70">{icon}</div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">{n}</span>
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

function UseCaseCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-start gap-4 p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center text-[#ff6a00] shrink-0">{icon}</div>
      <div>
        <h4 className="text-[15px] font-medium text-black mb-1.5 leading-tight">{title}</h4>
        <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
      </div>
    </motion.div>
  );
}

function FormatButton({ active, onClick, title, subtitle }: { active: boolean; onClick: () => void; title: string; subtitle: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`p-3 rounded-xl border transition-colors text-center ${active ? "bg-black text-white border-black" : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"}`}
    >
      <div className="text-[13px] font-medium">{title}</div>
      <div className={`text-[10px] ${active ? "text-white/50" : "text-black/40"}`}>{subtitle}</div>
    </motion.button>
  );
}

function FaqRow({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-6 p-6 text-left hover:bg-black/[0.015] transition-colors"
      >
        <span className="text-[14.5px] font-medium text-black flex items-start gap-3">
          <HelpCircle
            size={16}
            className="text-[#ff6a00] shrink-0 mt-0.5"
          />
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown
            size={16}
            className="text-black/40"
          />
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
            <div className="px-6 pb-6 pl-[58px] text-[13px] leading-relaxed text-black/60">{a}</div>
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
