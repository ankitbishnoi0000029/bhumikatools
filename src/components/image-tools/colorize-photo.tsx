"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Download,
  Shield,
  Zap,
  Infinity as InfinityIcon,
  Lock,
  Check,
  RotateCcw,
  FileImage,
  Loader2,
  AlertCircle,
  Sparkles,
  Wand2,
  HardDriveDownload,
  Info,
  Layers,
  Cpu,
  Code2,
  FileCheck2,
  HelpCircle,
  ChevronDown,
  Paintbrush,
  PaintBucket,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Droplet,
  Palette,
  Eye,
  Blend,
  Image as ImageIcon,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Tool = "brush" | "eraser";
type Format = "png" | "jpg" | "webp";
type BlendMode = "color" | "hue" | "soft-light" | "overlay" | "multiply" | "screen";
type Stage = "idle" | "processing" | "done";

type Result = {
  url: string;
  size: number;
  name: string;
  width: number;
  height: number;
};

const MAX_SIZE_MB = 30;
const MAX_DIM = 2400; // downscale source above this (keeps history memory sane)
const MAX_HISTORY = 8;

// ============================================================
// TINT PRESETS
// ============================================================
const TINTS: { name: string; color: string; strength: number }[] = [
  { name: "Original", color: "#ffffff", strength: 0 },
  { name: "Sepia", color: "#a67c52", strength: 75 },
  { name: "Cyanotype", color: "#1a5a8a", strength: 80 },
  { name: "Warm", color: "#ff8c40", strength: 55 },
  { name: "Cool", color: "#4a7bb8", strength: 55 },
  { name: "Vintage", color: "#c9a961", strength: 65 },
  { name: "Rose", color: "#d98282", strength: 60 },
  { name: "Forest", color: "#5a7a4a", strength: 55 },
];

const SWATCHES: { name: string; color: string }[] = [
  { name: "Light skin", color: "#f4c9a8" },
  { name: "Mid skin", color: "#d9a07c" },
  { name: "Deep skin", color: "#8a5a3a" },
  { name: "Sky", color: "#87ceeb" },
  { name: "Grass", color: "#5a9b48" },
  { name: "Olive", color: "#6b8e23" },
  { name: "Sand", color: "#c19a6b" },
  { name: "Wood", color: "#8b4513" },
  { name: "Brick", color: "#b04a3a" },
  { name: "Steel", color: "#7a8a94" },
  { name: "Rose", color: "#e07a8c" },
  { name: "Lavender", color: "#9a8cc7" },
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

const isSupportedImage = (f: File) => {
  const t = f.type.toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg" || t === "image/png" || t === "image/webp")
    return true;
  return /\.(jpg|jpeg|png|webp)$/i.test(f.name);
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read the image."));
    img.src = src;
  });

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Draw a single brush dot with soft edges
function drawBrushDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number,
  hardness: number,
  opacity: number
) {
  const r = Math.max(0.5, size / 2);
  ctx.save();
  ctx.globalAlpha = opacity;

  if (hardness >= 0.95) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const inner = Math.max(0, r * hardness);
    const grad = ctx.createRadialGradient(x, y, inner, x, y, r);
    grad.addColorStop(0, hexToRgba(color, 1));
    grad.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Interpolate brush dots between two points so strokes look smooth
function drawStrokeSegment(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  size: number,
  hardness: number,
  opacity: number
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(1, size / 6);
  if (dist === 0) {
    drawBrushDot(ctx, x0, y0, color, size, hardness, opacity);
    return;
  }
  for (let d = 0; d <= dist; d += step) {
    const t = d / dist;
    drawBrushDot(ctx, x0 + dx * t, y0 + dy * t, color, size, hardness, opacity);
  }
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
export const ColorizePhoto = () => {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number } | null>(null);

  const [tool, setTool] = useState<Tool>("brush");
  const [brushColor, setBrushColor] = useState("#f4c9a8");
  const [brushSize, setBrushSize] = useState(60);
  const [hardness, setHardness] = useState(0.6);
  const [opacity, setOpacity] = useState(0.7);
  const [blendMode, setBlendMode] = useState<BlendMode>("color");

  const [tintColor, setTintColor] = useState(TINTS[1].color);
  const [tintStrength, setTintStrength] = useState(TINTS[1].strength);

  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(92);

  const [result, setResult] = useState<Result | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [drawing, setDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [historySize, setHistorySize] = useState(1);
  const [historyIndex, setHistoryIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resultUrlRef = useRef<string | null>(null);
  const originalUrlRef = useRef<string | null>(null);
  const strokeRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(0);

  // Cleanup
  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    };
  }, []);

  const clearResult = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setResult(null);
  };

  // ---------------- HISTORY ----------------
  const pushHistory = useCallback(() => {
    const paint = paintCanvasRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, paint.width, paint.height);

    // Truncate redo stack
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snap);

    // Cap size — drop the oldest if we exceed
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
    setHistorySize(historyRef.current.length);
    setHistoryIndex(historyIndexRef.current);
  }, []);

  const restoreHistory = useCallback((index: number) => {
    const paint = paintCanvasRef.current;
    const snap = historyRef.current[index];
    if (!paint || !snap) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, paint.width, paint.height);
    ctx.putImageData(snap, 0, 0);
    ctx.restore();
    historyIndexRef.current = index;
    setHistoryIndex(index);
  }, []);

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    restoreHistory(historyIndexRef.current - 1);
    clearResult();
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    restoreHistory(historyIndexRef.current + 1);
    clearResult();
  };

  const clearPaint = () => {
    const paint = paintCanvasRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, paint.width, paint.height);
    ctx.restore();
    pushHistory();
    clearResult();
  };

  // ---------------- FILE LOADING ----------------
  const acceptFile = useCallback(async (f: File) => {
    setError(null);
    clearResult();
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }

    if (!isSupportedImage(f)) {
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }

    try {
      const url = URL.createObjectURL(f);
      originalUrlRef.current = url;
      setFileName(f.name);
      setFileSize(f.size);

      const img = await loadImage(url);

      // Downscale if needed
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (Math.max(w, h) > MAX_DIM) {
        const s = MAX_DIM / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }

      const base = baseCanvasRef.current;
      const paint = paintCanvasRef.current;
      if (!base || !paint) return;

      base.width = w;
      base.height = h;
      const bctx = base.getContext("2d");
      if (!bctx) throw new Error("Canvas is not supported in this browser.");
      bctx.fillStyle = "#ffffff";
      bctx.fillRect(0, 0, w, h);
      bctx.drawImage(img, 0, 0, w, h);

      paint.width = w;
      paint.height = h;
      const pctx = paint.getContext("2d");
      if (!pctx) throw new Error("Canvas is not supported in this browser.");
      pctx.clearRect(0, 0, w, h);

      setCanvasDims({ w, h });

      // Seed history with empty paint layer
      historyRef.current = [pctx.getImageData(0, 0, w, h)];
      historyIndexRef.current = 0;
      setHistorySize(1);
      setHistoryIndex(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't load the image.";
      setError(msg);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const reset = () => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    originalUrlRef.current = null;
    if (baseCanvasRef.current) {
      const c = baseCanvasRef.current;
      c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      c.width = 0;
      c.height = 0;
    }
    if (paintCanvasRef.current) {
      const c = paintCanvasRef.current;
      c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      c.width = 0;
      c.height = 0;
    }
    historyRef.current = [];
    historyIndexRef.current = 0;
    setHistorySize(1);
    setHistoryIndex(0);
    clearResult();
    setCanvasDims(null);
    setFileName("");
    setFileSize(0);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------------- POINTER INTERACTION ----------------
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const paint = paintCanvasRef.current;
    if (!paint) return null;
    const rect = paint.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * paint.width,
      y: ((clientY - rect.top) / rect.height) * paint.height,
    };
  };

  const startStroke = (e: React.PointerEvent) => {
    if (stage === "processing") return;
    const p = getCanvasCoords(e.clientX, e.clientY);
    const paint = paintCanvasRef.current;
    if (!p || !paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    ctx.save();
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      drawBrushDot(ctx, p.x, p.y, "#000000", brushSize, hardness, opacity);
    } else {
      ctx.globalCompositeOperation = "source-over";
      drawBrushDot(ctx, p.x, p.y, brushColor, brushSize, hardness, opacity);
    }
    ctx.restore();

    strokeRef.current = { lastX: p.x, lastY: p.y };
    setDrawing(true);
  };

  const moveStroke = (e: React.PointerEvent) => {
    // Update cursor position for the brush preview ring
    const paint = paintCanvasRef.current;
    if (paint) {
      const rect = paint.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!drawing || !strokeRef.current) return;
    const p = getCanvasCoords(e.clientX, e.clientY);
    const paintEl = paintCanvasRef.current;
    if (!p || !paintEl) return;
    const ctx = paintEl.getContext("2d");
    if (!ctx) return;

    ctx.save();
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      drawStrokeSegment(
        ctx,
        strokeRef.current.lastX,
        strokeRef.current.lastY,
        p.x,
        p.y,
        "#000000",
        brushSize,
        hardness,
        opacity
      );
    } else {
      ctx.globalCompositeOperation = "source-over";
      drawStrokeSegment(
        ctx,
        strokeRef.current.lastX,
        strokeRef.current.lastY,
        p.x,
        p.y,
        brushColor,
        brushSize,
        hardness,
        opacity
      );
    }
    ctx.restore();

    strokeRef.current = { lastX: p.x, lastY: p.y };
  };

  const endStroke = () => {
    if (!drawing) return;
    setDrawing(false);
    strokeRef.current = null;
    pushHistory();
    clearResult();
  };

  const onPointerLeave = () => {
    setCursorPos(null);
  };

  // ---------------- EXPORT ----------------
  const exportImage = async () => {
    const base = baseCanvasRef.current;
    const paint = paintCanvasRef.current;
    if (!base || !paint || !canvasDims) return;

    setError(null);
    clearResult();
    setStage("processing");

    try {
      const out = document.createElement("canvas");
      out.width = canvasDims.w;
      out.height = canvasDims.h;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      // 1) Base photo
      ctx.drawImage(base, 0, 0);

      // 2) Tint layer (global)
      if (tintStrength > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "color";
        ctx.globalAlpha = tintStrength / 100;
        ctx.fillStyle = tintColor;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.restore();
      }

      // 3) Paint layer with the chosen blend mode
      ctx.save();
      ctx.globalCompositeOperation = blendMode;
      ctx.drawImage(paint, 0, 0);
      ctx.restore();

      const mime =
        format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
      const blob = await new Promise<Blob | null>((r) =>
        out.toBlob(r, mime, format === "png" ? undefined : quality / 100)
      );
      if (!blob) throw new Error("Couldn't encode the image. Please try again.");

      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        size: blob.size,
        name: `${stripExt(fileName || "photo")}_colorized.${format}`,
        width: out.width,
        height: out.height,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStage("idle");
    }
  };

  const busy = stage === "processing";
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historySize - 1;

  // Tint swatch style helper
  const tintSwatchStyle = (t: { color: string; strength: number }) =>
    t.strength === 0
      ? {
          background:
            "repeating-conic-gradient(#e5e0d5 0% 25%, #ffffff 0% 50%) 50% / 8px 8px",
        }
      : { background: t.color };

  const activeTint = useMemo(
    () => TINTS.find((t) => t.color === tintColor && t.strength === tintStrength),
    [tintColor, tintStrength]
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
          <span className="text-black/70">Colorize Photo</span>
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
                Manual colorization · Blend modes · Client-side
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Black & white in.
              <br />
              <span className="italic text-[#ff6a00]">Color</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Paint color onto a black-and-white photo using the same technique
              professional colorists use — a <strong className="text-black/80 font-medium">color blend
              layer</strong> that preserves the original shading. Tint, brush, and refine
              <strong className="text-black/80 font-medium"> right in your browser</strong>.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Instant" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* ===================== TECHNIQUE NOTE ===================== */}
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
            <strong className="text-black font-medium">The colorist's technique.</strong>{" "}
            You paint on a transparent layer that sits above your photo. The layer uses a
            <em> Color blend mode</em>, so only the hue and saturation from your strokes are
            applied — the original light and shadow stay intact. This is exactly how
            professional photo colorization works (in Photoshop, Procreate, and elsewhere).
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
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              How this tool works
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <ExplainerCard
              n="01"
              icon={<FileImage size={18} />}
              title="Upload a B&W photo"
              desc="Any JPG, PNG, or WebP. The tool downscales to 2400px max for smooth brush performance."
            />
            <ExplainerCard
              n="02"
              icon={<Droplet size={18} />}
              title="Pick a tint"
              desc="One click applies sepia, cyanotype, warm, cool — or leave it neutral and color from scratch."
            />
            <ExplainerCard
              n="03"
              icon={<Paintbrush size={18} />}
              title="Paint with color"
              desc="Brush over skin, sky, grass, clothing. Blend modes keep the original shading."
            />
            <ExplainerCard
              n="04"
              icon={<HardDriveDownload size={18} />}
              title="Download"
              desc="Export as PNG, JPG, or WebP — the colorized result at full resolution."
            />
          </div>
        </motion.section>

        {/* ===================== WORKSPACE ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ---------- LEFT: Canvas editor ---------- */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-7">
            <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-8">

              {/* Empty state */}
              {!canvasDims && (
                <motion.label
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[460px] px-6 ${
                    dragging
                      ? "border-[#ff6a00] bg-[#ff6a00]/[0.04] scale-[1.01]"
                      : "border-black/[0.12] hover:border-black/30 hover:bg-black/[0.015]"
                  }`}
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
                    animate={
                      dragging
                        ? { scale: 1.1, rotate: -4 }
                        : { scale: 1, rotate: 0, y: [0, -6, 0] }
                    }
                    transition={
                      dragging
                        ? { type: "spring", stiffness: 300, damping: 20 }
                        : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                    }
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${
                      dragging ? "bg-[#ff6a00]" : "bg-[#f4f1ea]"
                    }`}
                  >
                    <Palette size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                  </motion.div>

                  <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                    {dragging ? "Drop your photo here" : "Drop a black & white photo"}
                  </h3>
                  <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                    or click to browse. Best results with high-contrast B&W images —
                    portraits, landscapes, old family photos.
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

              {/* Canvas editor */}
              {canvasDims && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center shrink-0">
                        <FileImage size={18} className="text-black/70" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-medium text-black truncate">{fileName}</div>
                        <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                          {canvasDims.w} × {canvasDims.h} · {formatBytes(fileSize)}
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.08, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={reset}
                      disabled={busy}
                      className="w-9 h-9 rounded-full bg-black/[0.05] hover:bg-black hover:text-white flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
                      aria-label="Remove photo"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center gap-1.5 mb-4 p-1.5 rounded-full bg-black/[0.03] border border-black/[0.06] w-fit">
                    <ToolChip
                      active={tool === "brush"}
                      onClick={() => setTool("brush")}
                      icon={<Paintbrush size={13} />}
                      label="Brush"
                    />
                    <ToolChip
                      active={tool === "eraser"}
                      onClick={() => setTool("eraser")}
                      icon={<Eraser size={13} />}
                      label="Eraser"
                    />
                    <div className="w-px h-5 bg-black/10 mx-1" />
                    <button
                      onClick={undo}
                      disabled={!canUndo}
                      className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center transition-colors text-black/70 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title="Undo"
                    >
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={redo}
                      disabled={!canRedo}
                      className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center transition-colors text-black/70 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      title="Redo"
                    >
                      <Redo2 size={14} />
                    </button>
                    <button
                      onClick={clearPaint}
                      className="w-8 h-8 rounded-full hover:bg-white flex items-center justify-center transition-colors text-black/60 hover:text-red-500"
                      title="Clear all paint"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Canvas stack */}
                  <div className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-5 flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg, #e5e0d5 25%, transparent 25%), linear-gradient(-45deg, #e5e0d5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e0d5 75%), linear-gradient(-45deg, transparent 75%, #e5e0d5 75%)",
                        backgroundSize: "20px 20px",
                        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                      }}
                    />

                    <div
                      ref={wrapperRef}
                      className="relative z-10 inline-block select-none touch-none"
                      style={{ isolation: "isolate" }}
                    >
                      <canvas
                        ref={baseCanvasRef}
                        className="block max-w-full max-h-[560px]"
                        style={{ width: "auto", height: "auto" }}
                      />

                      {/* Tint layer */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: tintColor,
                          mixBlendMode: "color",
                          opacity: tintStrength / 100,
                        }}
                      />

                      {/* Paint layer */}
                      <canvas
                        ref={paintCanvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{
                          mixBlendMode: blendMode,
                          cursor: "none",
                          touchAction: "none",
                        }}
                        onPointerDown={startStroke}
                        onPointerMove={moveStroke}
                        onPointerUp={endStroke}
                        onPointerCancel={endStroke}
                        onPointerLeave={onPointerLeave}
                      />

                      {/* Brush cursor ring */}
                      {cursorPos && !busy && (
                        <div
                          className="absolute pointer-events-none rounded-full border-2 border-white mix-blend-difference"
                          style={{
                            left: cursorPos.x,
                            top: cursorPos.y,
                            width: brushSize * ((paintCanvasRef.current?.getBoundingClientRect().width ?? 1) / (canvasDims.w || 1)),
                            height: brushSize * ((paintCanvasRef.current?.getBoundingClientRect().width ?? 1) / (canvasDims.w || 1)),
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      )}
                    </div>

                    {/* busy overlay */}
                    <AnimatePresence>
                      {busy && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-30 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
                        >
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                            className="block w-12 h-12 rounded-full border-2 border-white/15 border-t-[#ff6a00]"
                          />
                          <div className="text-[13px] font-medium text-white">Exporting colorized image…</div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* corner hint */}
                    <div className="absolute bottom-3 left-3 z-20 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono uppercase tracking-[0.14em] flex items-center gap-1.5 pointer-events-none">
                      <Paintbrush size={10} />
                      Paint color onto the photo
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.button
                      whileHover={{ scale: busy ? 1 : 1.03 }}
                      whileTap={{ scale: busy ? 1 : 0.97 }}
                      onClick={exportImage}
                      disabled={busy}
                      className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Exporting…
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          Export colorized
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

              {/* dropzone-level error */}
              <AnimatePresence>
                {!canvasDims && error && (
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

          {/* ---------- RIGHT: Settings ---------- */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="lg:col-span-5 space-y-6">

            {/* Tint presets */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Quick tints
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {TINTS.map((t) => (
                  <motion.button
                    key={t.name}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setTintColor(t.color);
                      setTintStrength(t.strength);
                      clearResult();
                    }}
                    className={`p-2 rounded-xl border transition-colors flex flex-col items-center gap-1.5 ${
                      activeTint?.name === t.name
                        ? "border-black bg-black/[0.03]"
                        : "border-black/[0.08] hover:border-black/25"
                    }`}
                  >
                    <span
                      className="w-full aspect-square rounded-lg border border-black/[0.08]"
                      style={tintSwatchStyle(t)}
                    />
                    <span className="text-[9.5px] font-mono uppercase tracking-[0.08em] text-black/60 truncate w-full text-center">
                      {t.name}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Custom tint */}
              <div className="mt-5 pt-5 border-t border-black/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Custom tint
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{tintStrength}%</div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="relative w-9 h-9 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                    <input
                      type="color"
                      value={tintColor}
                      onChange={(e) => { setTintColor(e.target.value); clearResult(); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="absolute inset-0" style={{ background: tintColor }} />
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={tintStrength}
                    onChange={(e) => { setTintStrength(Number(e.target.value)); clearResult(); }}
                    className="flex-1 accent-[#ff6a00]"
                  />
                </div>
                <p className="text-[11.5px] text-black/40 leading-relaxed">
                  Applies a full-image color wash. Set strength to 0 for a neutral start.
                </p>
              </div>
            </motion.div>

            {/* Brush settings */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Brush settings
                </span>
              </div>

              {/* Color + presets */}
              <div className="mb-6">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Brush color
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="relative w-11 h-11 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => setBrushColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span className="absolute inset-0" style={{ background: brushColor }} />
                  </label>
                  <input
                    type="text"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                    placeholder="#f4c9a8"
                  />
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {SWATCHES.map((s) => (
                    <motion.button
                      key={s.color}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setBrushColor(s.color)}
                      title={s.name}
                      className={`aspect-square rounded-lg border transition-all ${
                        brushColor === s.color
                          ? "border-black ring-2 ring-black/10"
                          : "border-black/[0.1] hover:border-black/30"
                      }`}
                      style={{ background: s.color }}
                    />
                  ))}
                </div>
              </div>

              {/* Size */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Brush size
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{brushSize} px</div>
                </div>
                <input
                  type="range"
                  min={4}
                  max={400}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              {/* Hardness */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Hardness
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{Math.round(hardness * 100)}%</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(hardness * 100)}
                  onChange={(e) => setHardness(Number(e.target.value) / 100)}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              {/* Opacity */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Opacity
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{Math.round(opacity * 100)}%</div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={Math.round(opacity * 100)}
                  onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                  className="w-full accent-[#ff6a00]"
                />
                <p className="mt-2 text-[11.5px] text-black/40 leading-relaxed">
                  Lower opacity = subtle, realistic color. Stack strokes to build intensity.
                </p>
              </div>

              {/* Blend mode */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Blend mode
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["color", "hue", "soft-light", "overlay", "multiply", "screen"] as BlendMode[]).map((m) => (
                    <motion.button
                      key={m}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setBlendMode(m); clearResult(); }}
                      className={`py-2 rounded-xl text-[11px] font-medium border transition-colors capitalize ${
                        blendMode === m
                          ? "bg-black text-white border-black"
                          : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
                      }`}
                    >
                      {m.replace("-", " ")}
                    </motion.button>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">
                  <strong className="text-black/60">Color</strong> is what colorists use —
                  it replaces hue + saturation but keeps the original brightness.
                </p>
              </div>
            </motion.div>

            {/* Format + Export */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Output format
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                <FormatButton active={format === "png"} onClick={() => { setFormat("png"); clearResult(); }} title="PNG" subtitle="Lossless" />
                <FormatButton active={format === "jpg"} onClick={() => { setFormat("jpg"); clearResult(); }} title="JPG" subtitle="Small" />
                <FormatButton active={format === "webp"} onClick={() => { setFormat("webp"); clearResult(); }} title="WebP" subtitle="Modern" />
              </div>

              {format !== "png" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                      Quality
                    </div>
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
                        <Sparkles size={11} className="text-[#ff6a00]" />
                      </motion.span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">
                        Colorized
                      </span>
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
                      Download colorized
                      <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </motion.a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Features */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Features
                </span>
              </div>
              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow><strong className="text-black">Soft-edge brush</strong> with size, hardness, and opacity control.</FeatureRow>
                <FeatureRow><strong className="text-black">Color blend mode</strong> — the professional colorization technique.</FeatureRow>
                <FeatureRow><strong className="text-black">8 quick tints</strong> for instant sepia, cyanotype, warm, cool, and more.</FeatureRow>
                <FeatureRow><strong className="text-black">12 skin / nature swatches</strong> to get you started fast.</FeatureRow>
                <FeatureRow><strong className="text-black">Undo & redo</strong> — paint freely, mistakes are recoverable.</FeatureRow>
                <FeatureRow><strong className="text-black">6 blend modes</strong> — hue, soft-light, overlay, multiply, screen, color.</FeatureRow>
              </ul>
            </motion.div>

            {/* Privacy */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Your photo never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Loading, tinting, painting, and export all run inside your browser via the
                HTML5 Canvas API. Open DevTools → Network — zero requests for your image.
              </p>
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
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              Deep dive
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-4 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Why does "Color" blend mode preserve shading?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12">
            It's not a trick — it's how human vision works. Here's why the paint layer
            interacts with your photo the way it does.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <DeepDiveCard
              n="01"
              icon={<Cpu size={18} />}
              title="Separate H-S-L"
              body="Every pixel can be described as Hue (what color), Saturation (how vivid), and Luminance (how bright). A B&W photo has all the H and S at zero — it's pure luminance data."
            />
            <DeepDiveCard
              n="02"
              icon={<Blend size={18} />}
              title="Borrow only H + S"
              body="The Color blend mode takes Hue and Saturation from your paint layer, and Luminance from the base photo. So a red stroke over a shadow produces a dark red, not bright red — the shadow is preserved."
            />
            <DeepDiveCard
              n="03"
              icon={<FileCheck2 size={18} />}
              title="One canvas op"
              body="In the browser, this is a single drawImage call with globalCompositeOperation = 'color'. The GPU handles millions of pixels per frame — instant even at full resolution."
            />
          </div>

          <motion.div variants={fadeUp} className="mt-10 p-6 rounded-[20px] bg-white border border-black/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                <Info size={16} className="text-[#ff6a00]" />
              </div>
              <div className="text-[13px] leading-relaxed text-black/65">
                <strong className="text-black">Why this beats auto-colorization:</strong>{" "}
                AI tools guess and hope — they often produce waxy skin, oversaturated skies,
                and weird greens. Painting by hand gives you exact control: you decide where
                skin ends and background begins. That's why every archival colorization you've
                ever admired was done this way.
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
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              When to use this
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            You'll want this when…
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCaseCard icon={<Palette size={18} />} title="Restoring family photos" desc="Old portraits, wedding photos, and ancestor pictures — bring them back to life by painting in the colors you remember." />
            <UseCaseCard icon={<Eye size={18} />} title="Adding artistic mood" desc="Apply a sepia, cyanotype, or vintage wash to any B&W image in one click — the fastest way to make old feel intentional." />
            <UseCaseCard icon={<Paintbrush size={18} />} title="Making color-accurate references" desc="Color a historical B&W reference to study how light and color interact — great for painters and illustrators." />
            <UseCaseCard icon={<ImageIcon size={18} />} title="Prepping archival material" desc="Colorize a scanned B&W document or a museum photo before publishing — no Photoshop subscription required." />
            <UseCaseCard icon={<Droplet size={18} />} title="Creating selective color" desc="Paint color into just one element — a red rose in a B&W garden, a subject's eyes, a single object — dramatic and simple." />
            <UseCaseCard icon={<Sparkles size={18} />} title="Building social content" desc="Colorized photos stop the scroll. Whether it's a throwback post or a creative interpretation, hand colorization stands out." />
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
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              Common questions
            </span>
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
    q: "Is this AI colorization?",
    a: "No. This is manual colorization — the same technique professional colorists use. You paint color onto a transparent layer, and the Color blend mode applies only hue and saturation while keeping the photo's original shading. AI colorization exists, but it's guesswork and often produces waxy skin and weird greens. Manual gives you exact control.",
  },
  {
    q: "Why does my color look too intense or washed out?",
    a: "Opacity is your main control. At 100% the paint fully replaces the underlying hue — that's very strong. Try 40–70% for realistic skin tones. The Color blend mode is also inherently subtle on dark areas — a red stroke over a shadow becomes deep burgundy, not bright red. That's the point: the photo's light and shadow are preserved.",
  },
  {
    q: "Which blend mode should I use?",
    a: "'Color' is the classic — you keep the photo's brightness and take the paint's hue/saturation. 'Hue' is even subtler and preserves the base saturation too. 'Soft-light' and 'Overlay' are more about adding light and mood than true colorization. 'Multiply' and 'Screen' are useful for tints (skin, sky) but darken/lighten the image as a side effect.",
  },
  {
    q: "How do I color skin without it looking like a mask?",
    a: "Three tips: (1) start with a mid-tone skin swatch like #d9a07c, not bright orange, (2) paint at 40–60% opacity instead of 100%, (3) use a soft brush. The blend mode does most of the work — you're just nudging hue.",
  },
  {
    q: "Can I undo mistakes?",
    a: "Yes. Every stroke is added to a history stack — click Undo (or press it from the toolbar). History keeps the last 8 states, which is plenty for a single editing session. If you need to start completely fresh, click Clear all paint.",
  },
  {
    q: "Why was my photo downscaled to 2400px?",
    a: "Because history snapshots are stored in memory as raw pixel data — for a huge image that adds up fast. We cap the working canvas at 2400px on the long side, which is larger than what most screens can display. The resolution is still plenty for a full-page photo or a social post.",
  },
  {
    q: "Does the tool work on very large images?",
    a: "Yes, they load — but they're downscaled to fit the 2400px working limit. If you need a >2400px export, use a professional desktop tool. For most colorization work the tradeoff is worth it because painting runs at 60fps on the smaller canvas.",
  },
  {
    q: "Is anything uploaded?",
    a: "No. Loading, painting, history, tinting, blending, and export all happen inside your browser using the HTML5 Canvas API. Open DevTools → Network — you'll see zero requests for your photo.",
  },
];

// ============================================================
// SUB COMPONENTS
// ============================================================
function ToolChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
        active ? "bg-black text-white" : "text-black/55 hover:text-black hover:bg-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.span variants={fadeUp} className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/55">
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
      <h4 className="text-[16px] font-medium text-black mb-2 leading-tight" style={{ fontFamily: "Georgia, serif" }}>{title}</h4>
      <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
    </motion.div>
  );
}

function DeepDiveCard({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center text-black/70">{icon}</div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">{n}</span>
      </div>
      <h4 className="text-[17px] font-medium text-black mb-2 leading-tight" style={{ fontFamily: "Georgia, serif" }}>{title}</h4>
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
      className={`p-3 rounded-xl border transition-colors text-center ${
        active ? "bg-black text-white border-black" : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
      }`}
    >
      <div className="text-[13px] font-medium">{title}</div>
      <div className={`text-[10px] ${active ? "text-white/50" : "text-black/40"}`}>{subtitle}</div>
    </motion.button>
  );
}

function FaqRow({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
  return (
    <div>
      <button onClick={onClick} className="w-full flex items-center justify-between gap-6 p-6 text-left hover:bg-black/[0.015] transition-colors">
        <span className="text-[14.5px] font-medium text-black flex items-start gap-3">
          <HelpCircle size={16} className="text-[#ff6a00] shrink-0 mt-0.5" />
          {q}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
          <ChevronDown size={16} className="text-black/40" />
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
        <Check size={10} className="text-[#ff6a00]" strokeWidth={2.5} />
      </motion.span>
      <span>{children}</span>
    </motion.li>
  );
}