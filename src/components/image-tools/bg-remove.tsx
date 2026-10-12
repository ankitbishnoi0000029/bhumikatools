"use client";

/**
 * BGRemover — on-device AI background remover + full editor.
 *
 * SETUP (optional — for fully offline use):
 *   npm install @imgly/background-removal
 *   mkdir -p public/bg-model
 *   cp -r node_modules/@imgly/background-removal-data/dist/* public/bg-model/
 *
 * If /public/bg-model exists, the model loads from your own server.
 * Otherwise the library falls back to its CDN automatically (cached
 * by the browser after the first use).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Download, Undo2, Redo2, X, Check, Loader2, Image as ImageIcon,
  Sparkles, Wand2, Brush, Eraser, Layers, Lock, ShieldCheck, ArrowUpRight,
  Eye, Copy, RefreshCw, Scissors, Droplet, Cpu, Zap, Circle as CircleIcon,
  Feather, Aperture, MousePointer2, Sparkles as SparklesIcon, Paintbrush,
  Palette, Sun, Contrast, Type as TypeIcon, Square, Move, Droplets, Cloud,
  Moon, Flame, Wind, Maximize2, RotateCw, Grid3x3, Smile,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Mode = "auto" | "wand" | "erase" | "restore";
type Step = "remove" | "edit";
type ExportFormat = "png" | "jpg" | "webp";
type BgStyle = "transparent" | "solid" | "gradient" | "blur" | "pattern" | "image";
type PatternType = "dots" | "grid" | "diagonal" | "checker" | "noise";

type Snapshot = { url: string; label: string };

type Adjust = {
  brightness: number; contrast: number; saturate: number;
  hue: number; blur: number; grayscale: number; sepia: number;
  temperature: number; vignette: number; grain: number;
};

type TextItem = {
  id: string; value: string; x: number; y: number;
  size: number; color: string; weight: number; font: string;
  shadow: number; outline: number; outlineColor: string;
  bgColor: string; rotation: number;
};

type Sticker = {
  id: string; emoji: string; x: number; y: number; size: number; rotation: number;
};

// ============================================================
// CONSTANTS
// ============================================================
const MAX_W = 820;
const MAX_H = 580;
const MAX_FILE_MB = 30;
const MAX_HISTORY = 15;

const DEFAULT_ADJUST: Adjust = {
  brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0,
  grayscale: 0, sepia: 0, temperature: 0, vignette: 0, grain: 0,
};

const FONTS = [
  { label: "Sans", value: "system-ui, -apple-system, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
  { label: "Impact", value: "Impact, sans-serif" },
  { label: "Script", value: "'Brush Script MT', cursive" },
];

const BG_PRESETS: { label: string; style: BgStyle; c1: string; c2: string }[] = [
  { label: "None", style: "transparent", c1: "#ffffff", c2: "#ffffff" },
  { label: "White", style: "solid", c1: "#ffffff", c2: "#ffffff" },
  { label: "Black", style: "solid", c1: "#0a0a0a", c2: "#0a0a0a" },
  { label: "Cream", style: "solid", c1: "#f4f1ea", c2: "#f4f1ea" },
  { label: "Sunset", style: "gradient", c1: "#ff6a00", c2: "#ff2d55" },
  { label: "Ocean", style: "gradient", c1: "#0ea5e9", c2: "#6366f1" },
  { label: "Forest", style: "gradient", c1: "#22c55e", c2: "#065f46" },
  { label: "Candy", style: "gradient", c1: "#ec4899", c2: "#8b5cf6" },
  { label: "Peach", style: "gradient", c1: "#fed7aa", c2: "#fb923c" },
  { label: "Blur", style: "blur", c1: "#ffffff", c2: "#ffffff" },
  { label: "Dots", style: "pattern", c1: "#ff6a00", c2: "#ffffff" },
  { label: "Grid", style: "pattern", c1: "#0a0a0a", c2: "#f4f1ea" },
];

const PATTERNS: { label: string; type: PatternType }[] = [
  { label: "Dots", type: "dots" },
  { label: "Grid", type: "grid" },
  { label: "Diagonal", type: "diagonal" },
  { label: "Checker", type: "checker" },
  { label: "Noise", type: "noise" },
];

const ASPECTS: { label: string; w: number; h: number }[] = [
  { label: "Free", w: 0, h: 0 },
  { label: "1:1", w: 1, h: 1 },
  { label: "4:5", w: 4, h: 5 },
  { label: "5:4", w: 5, h: 4 },
  { label: "4:3", w: 4, h: 3 },
  { label: "3:4", w: 3, h: 4 },
  { label: "16:9", w: 16, h: 9 },
  { label: "9:16", w: 9, h: 16 },
];

const LOOKS: { label: string; emoji: string; adj: Partial<Adjust> }[] = [
  { label: "Original", emoji: "◯", adj: {} },
  { label: "Vivid", emoji: "✦", adj: { saturate: 150, contrast: 115 } },
  { label: "Mono", emoji: "◑", adj: { saturate: 0, contrast: 115 } },
  { label: "Warm", emoji: "☀", adj: { saturate: 120, brightness: 105, temperature: 30 } },
  { label: "Cool", emoji: "❄", adj: { saturate: 110, temperature: -30 } },
  { label: "Fade", emoji: "░", adj: { contrast: 88, saturate: 80, brightness: 110 } },
  { label: "Noir", emoji: "◆", adj: { saturate: 0, contrast: 145, brightness: 92, vignette: 30 } },
  { label: "Cinema", emoji: "▣", adj: { saturate: 110, contrast: 128, brightness: 96, vignette: 35 } },
];

const STICKERS = [
  "⭐","✨","💫","🔥","💥","⚡","❤️","🧡","💛","💚","💙","💜","🖤","🤍",
  "🌈","🌸","🌺","🌻","🌹","🍀","🌿","🌙","☀️","☁️","❄️","🌊",
  "🎉","🎊","🎈","🎁","🏆","🥇","👑","💎","🎯","🎨","📷","🎸",
];

// ============================================================
// HELPERS
// ============================================================
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const formatBytes = (b: number) => {
  if (!b) return "0 B";
  const k = 1024, s = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${s[i]}`;
};

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Could not read file."));
    r.readAsDataURL(f);
  });

const loadImageEl = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("Could not decode image."));
    im.src = src;
  });

const uid = () => Math.random().toString(36).slice(2, 10);

const magicWandErase = (
  data: Uint8ClampedArray, w: number, h: number,
  sx: number, sy: number, tol: number, contig: boolean
) => {
  const si = (sy * w + sx) * 4;
  const tr = data[si], tg = data[si+1], tb = data[si+2];
  const tol2 = tol * tol * 3;
  if (!contig) {
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i]-tr, dg = data[i+1]-tg, db = data[i+2]-tb;
      if (dr*dr + dg*dg + db*db <= tol2) data[i+3] = 0;
    }
    return;
  }
  const vis = new Uint8Array(w * h);
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const y = stack.pop()!, x = stack.pop()!;
    if (x<0 || y<0 || x>=w || y>=h) continue;
    const pi = y*w + x;
    if (vis[pi]) continue;
    vis[pi] = 1;
    const p = pi*4;
    const dr = data[p]-tr, dg = data[p+1]-tg, db = data[p+2]-tb;
    if (dr*dr + dg*dg + db*db <= tol2) {
      data[p+3] = 0;
      stack.push(x+1, y, x-1, y, x, y+1, x, y-1);
    }
  }
};

const softErase = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hardness: number) => {
  const inner = clamp(1 - hardness, 0, 0.98);
  const g = ctx.createRadialGradient(x, y, r * inner, x, y, r);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const softRestore = (ctx: CanvasRenderingContext2D, orig: HTMLImageElement, x: number, y: number, r: number, hardness: number) => {
  const size = Math.max(2, Math.round(r * 2));
  const temp = document.createElement("canvas");
  temp.width = size;
  temp.height = size;
  const t = temp.getContext("2d");
  if (!t) return;
  t.drawImage(orig, x - r, y - r, size, size, 0, 0, size, size);
  const inner = clamp(1 - hardness, 0, 0.98);
  const g = t.createRadialGradient(r, r, r * inner, r, r, r);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  t.globalCompositeOperation = "destination-in";
  t.fillStyle = g;
  t.fillRect(0, 0, size, size);
  ctx.drawImage(temp, x - r, y - r);
};

const featherAlpha = (data: Uint8ClampedArray, w: number, h: number, amt: number) => {
  if (amt <= 0) return;
  const r = Math.max(1, Math.round(amt));
  const src = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x+dx, ny = y+dy;
          if (nx<0 || ny<0 || nx>=w || ny>=h) continue;
          sum += src[(ny*w+nx)*4 + 3];
          count++;
        }
      }
      data[(y*w+x)*4 + 3] = sum / count;
    }
  }
};

const buildFilterStr = (a: Adjust) => {
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturate}%)`,
    `hue-rotate(${a.hue}deg)`,
    `blur(${a.blur}px)`,
    `grayscale(${a.grayscale}%)`,
    `sepia(${a.sepia}%)`,
  ].join(" ");
};

const drawPattern = (ctx: CanvasRenderingContext2D, w: number, h: number, type: PatternType, c1: string, c2: string) => {
  ctx.save();
  ctx.fillStyle = c2;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c1;
  const unit = Math.max(12, Math.round(Math.min(w, h) / 32));
  if (type === "dots") {
    for (let y = 0; y < h; y += unit) {
      for (let x = 0; x < w; x += unit) {
        ctx.beginPath();
        ctx.arc(x + unit/2, y + unit/2, unit * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (type === "grid") {
    ctx.strokeStyle = c1;
    ctx.lineWidth = Math.max(1, unit * 0.05);
    for (let x = 0; x <= w; x += unit) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += unit) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else if (type === "diagonal") {
    ctx.strokeStyle = c1;
    ctx.lineWidth = Math.max(1, unit * 0.08);
    for (let i = -h; i < w + h; i += unit) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
    }
  } else if (type === "checker") {
    for (let y = 0; y < h; y += unit) {
      for (let x = 0; x < w; x += unit) {
        if (((x/unit) + (y/unit)) % 2 === 0) ctx.fillRect(x, y, unit, unit);
      }
    }
  } else if (type === "noise") {
    const id = ctx.createImageData(w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 40;
    }
    ctx.putImageData(id, 0, 0);
  }
  ctx.restore();
};

// ============================================================
// VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

// ============================================================
// MAIN
// ============================================================
export const BGRemover = () => {
  // ---- core ----
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [step, setStep] = useState<Step>("remove");

  // ---- removal ----
  const [mode, setMode] = useState<Mode>("auto");
  const [tolerance, setTolerance] = useState(32);
  const [contiguous, setContiguous] = useState(true);
  const [brushSize, setBrushSize] = useState(40);
  const [brushHardness, setBrushHardness] = useState(0.5);
  const [feather, setFeather] = useState(0);

  // ---- AI ----
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState("");

  // ---- canvas composition ----
  const [aspectIdx, setAspectIdx] = useState(0);
  const [padding, setPadding] = useState(8);
  const [subjX, setSubjX] = useState(0);
  const [subjY, setSubjY] = useState(0);
  const [subjScale, setSubjScale] = useState(100);
  const [subjRotation, setSubjRotation] = useState(0);
  const [reflection, setReflection] = useState(0);

  // ---- background ----
  const [bgStyle, setBgStyle] = useState<BgStyle>("transparent");
  const [bgColor1, setBgColor1] = useState("#ffffff");
  const [bgColor2, setBgColor2] = useState("#ff6a00");
  const [bgAngle, setBgAngle] = useState(135);
  const [bgBlur, setBgBlur] = useState(24);
  const [bgScale, setBgScale] = useState(120);
  const [bgPattern, setBgPattern] = useState<PatternType>("dots");
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // ---- adjustments ----
  const [adjust, setAdjust] = useState<Adjust>({ ...DEFAULT_ADJUST });

  // ---- effects ----
  const [shadow, setShadow] = useState(0);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowBlur, setShadowBlur] = useState(20);
  const [shadowY, setShadowY] = useState(12);
  const [outline, setOutline] = useState(0);
  const [outlineColor, setOutlineColor] = useState("#ffffff");
  const [frame, setFrame] = useState<"none" | "thin" | "thick" | "polaroid">("none");
  const [frameColor, setFrameColor] = useState("#ffffff");

  // ---- text + stickers ----
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // ---- UI ----
  const [editTab, setEditTab] = useState<"bg" | "adjust" | "effects" | "text" | "stickers">("bg");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(0.95);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<{
    url: string; name: string; size: number; width: number; height: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  // ---- refs ----
  const cutoutRef = useRef<HTMLCanvasElement>(null);
  const compositeRef = useRef<HTMLCanvasElement>(null);
  const subjectRef = useRef<HTMLImageElement | null>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const paintingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const exportUrlRef = useRef<string | null>(null);
  const histIndexRef = useRef(-1);
  const textDragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const stickerDragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => { histIndexRef.current = histIndex; }, [histIndex]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  // ============================================================
  // fit display size
  // ============================================================
  useEffect(() => {
    if (!natW || !natH) { setDisplaySize({ w: 0, h: 0 }); return; }
    const fit = Math.min(MAX_W / natW, MAX_H / natH, 1);
    setDisplaySize({ w: Math.round(natW * fit), h: Math.round(natH * fit) });
  }, [natW, natH]);

  // ============================================================
  // history
  // ============================================================
  const commit = useCallback((label: string) => {
    const c = cutoutRef.current;
    if (!c || !c.width || !c.height) return;
    const url = c.toDataURL("image/png");
    setHistory((prev) => {
      const trimmed = prev.slice(0, histIndexRef.current + 1);
      const next = [...trimmed, { url, label }];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
    setHistIndex((i) => Math.min(i + 1, MAX_HISTORY - 1));
  }, []);

  const redrawFromSnapshot = useCallback(async (url: string) => {
    const c = cutoutRef.current;
    if (!c) return;
    const im = await loadImageEl(url);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(im, 0, 0, c.width, c.height);
  }, []);

  // ============================================================
  // load file
  // ============================================================
  const loadFile = useCallback(async (file: File) => {
    const looksLikeImage = file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp|avif|tiff?|svg)$/i.test(file.name);
    if (!looksLikeImage) return notify("That doesn't look like an image.");
    if (file.size > MAX_FILE_MB * 1024 * 1024) return notify(`Image too large (max ${MAX_FILE_MB} MB).`);

    try {
      const dataUrl = await fileToDataUrl(file);
      const im = await loadImageEl(dataUrl);
      const c = cutoutRef.current;
      if (!c) return notify("Editor not ready — try again.");

      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return notify("Canvas not supported.");
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(im, 0, 0);

      originalImgRef.current = im;
      subjectRef.current = im;

      setImg(im);
      setNatW(im.naturalWidth);
      setNatH(im.naturalHeight);
      setFileName(file.name);
      setFileSize(file.size);
      setLoaded(true);
      setStep("remove");

      const initial: Snapshot = { url: c.toDataURL("image/png"), label: "Original" };
      setHistory([initial]);
      setHistIndex(0);
      histIndexRef.current = 0;

      setExported(null);
      setMode("auto");
      setTexts([]);
      setStickers([]);
      setBgStyle("transparent");
      setBgImage(null);
      setAdjust({ ...DEFAULT_ADJUST });
      setShadow(0);
      setOutline(0);
      setFrame("none");
      setSubjX(0); setSubjY(0); setSubjScale(100); setSubjRotation(0);
      setReflection(0);
      setPadding(8);
      setAspectIdx(0);

      notify("Image loaded.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not read file.");
    }
  }, [notify]);

  // ============================================================
  // paste
  // ============================================================
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) { e.preventDefault(); await loadFile(f); return; }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  // ============================================================
  // undo / redo
  // ============================================================
  const undo = useCallback(async () => {
    if (histIndexRef.current <= 0) return;
    const ni = histIndexRef.current - 1;
    setHistIndex(ni);
    await redrawFromSnapshot(history[ni].url);
  }, [history, redrawFromSnapshot]);

  const redo = useCallback(async () => {
    if (histIndexRef.current >= history.length - 1) return;
    const ni = histIndexRef.current + 1;
    setHistIndex(ni);
    await redrawFromSnapshot(history[ni].url);
  }, [history, redrawFromSnapshot]);

  const doExportRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const t = e.target as HTMLElement;
      const isInput = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
      if (mod && e.key.toLowerCase() === "z" && !isInput) {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (mod && e.key.toLowerCase() === "s" && !isInput) {
        e.preventDefault(); doExportRef.current();
      }
      if (e.key === "Delete" && !isInput) {
        if (selectedTextId) { setTexts((ts) => ts.filter((t) => t.id !== selectedTextId)); setSelectedTextId(null); }
        else if (selectedStickerId) { setStickers((ss) => ss.filter((s) => s.id !== selectedStickerId)); setSelectedStickerId(null); }
      }
      if (e.key === "Escape") { setSelectedTextId(null); setSelectedStickerId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedTextId, selectedStickerId]);

  // ============================================================
  // AI removal — tries local /public/bg-model first, then CDN
  // ============================================================
  const runAiRemove = async () => {
    if (!img) return notify("Load an image first.");
    setAiBusy(true);
    setAiProgress("Loading AI…");
    try {
      const mod: any = await import("@imgly/background-removal").catch(() => null);
      if (!mod || typeof mod.removeBackground !== "function") {
        throw new Error("Run: npm install @imgly/background-removal");
      }

      const c = cutoutRef.current;
      if (!c) throw new Error("Canvas not ready.");
      const dataUrl = c.toDataURL("image/png");

      const onProgress = (key: string, cur: number, tot: number) => {
        if (tot > 0) {
          const pct = Math.round((cur / tot) * 100);
          setAiProgress(key.startsWith("fetch") ? `Loading model… ${pct}%` : `Processing… ${pct}%`);
        }
      };

      // First attempt: use the bundled model at /public/bg-model/
      let blob: Blob | null = null;
      try {
        blob = await mod.removeBackground(dataUrl, {
          publicPath: "/bg-model/",
          progress: onProgress,
        });
      } catch {
        // Local assets missing — fall back to the library's default (CDN).
        setAiProgress("Loading model…");
        blob = await mod.removeBackground(dataUrl, { progress: onProgress });
      }

      if (!blob) throw new Error("Removal failed.");
      const url = URL.createObjectURL(blob);
      const out = await loadImageEl(url);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(out, 0, 0, c.width, c.height);
      subjectRef.current = out;
      URL.revokeObjectURL(url);
      commit("Removed");
      notify("Background removed!");
      setStep("edit");
    } catch (e) {
      notify(e instanceof Error ? e.message : "AI removal failed — try Magic Wand.");
    } finally {
      setAiBusy(false);
      setAiProgress("");
    }
  };

  // ============================================================
  // canvas coords
  // ============================================================
  const toCoords = (e: React.PointerEvent) => {
    const c = cutoutRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / Math.max(1, r.width)) * c.width,
      y: ((e.clientY - r.top) / Math.max(1, r.height)) * c.height,
    };
  };

  // ============================================================
  // magic wand
  // ============================================================
  const doWand = (x: number, y: number) => {
    const c = cutoutRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const px = clamp(Math.round(x), 0, c.width - 1);
    const py = clamp(Math.round(y), 0, c.height - 1);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    magicWandErase(id.data, c.width, c.height, px, py, tolerance, contiguous);
    if (feather > 0) featherAlpha(id.data, c.width, c.height, feather);
    ctx.putImageData(id, 0, 0);
    commit("Wand");
  };

  // ============================================================
  // brush
  // ============================================================
  const paintAt = (x: number, y: number, from?: { x: number; y: number }) => {
    const c = cutoutRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const r = brushSize / 2;
    const steps = from ? Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / Math.max(1, r * 0.35))) : 1;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = from ? from.x + (x - from.x) * t : x;
      const py = from ? from.y + (y - from.y) * t : y;
      if (mode === "erase") softErase(ctx, px, py, r, brushHardness);
      else if (mode === "restore" && originalImgRef.current) softRestore(ctx, originalImgRef.current, px, py, r, brushHardness);
    }
  };

  const onCanvasDown = (e: React.PointerEvent) => {
    if (!loaded || step !== "remove") return;
    if (mode === "wand") { const p = toCoords(e); doWand(p.x, p.y); return; }
    if (mode === "erase" || mode === "restore") {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      paintingRef.current = true;
      const p = toCoords(e);
      lastPointRef.current = p;
      paintAt(p.x, p.y);
    }
  };
  const onCanvasMove = (e: React.PointerEvent) => {
    if (!paintingRef.current) return;
    const p = toCoords(e);
    paintAt(p.x, p.y, lastPointRef.current ?? undefined);
    lastPointRef.current = p;
  };
  const onCanvasUp = () => {
    if (paintingRef.current) {
      paintingRef.current = false;
      lastPointRef.current = null;
      commit(mode === "erase" ? "Erased" : "Restored");
    }
  };

  // ============================================================
  // composite dimensions
  // ============================================================
  const compositeDims = (() => {
    if (!natW || !natH) return { w: 1, h: 1, padPx: 0 };
    const padPx = Math.round(Math.min(natW, natH) * padding / 100);
    let cw = natW + padPx * 2;
    let ch = natH + padPx * 2;
    const asp = ASPECTS[aspectIdx];
    if (asp.w && asp.h) {
      const target = asp.w / asp.h;
      if (cw / ch < target) cw = Math.round(ch * target);
      else ch = Math.round(cw / target);
    }
    return { w: cw, h: ch, padPx };
  })();

  // ============================================================
  // composite render
  // ============================================================
  const renderComposite = useCallback(() => {
    const c = compositeRef.current;
    const subj = subjectRef.current;
    if (!c || !subj || !natW || !natH) return;
    const { w, h } = compositeDims;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    // 1. background
    if (bgStyle === "solid") {
      ctx.fillStyle = bgColor1;
      ctx.fillRect(0, 0, w, h);
    } else if (bgStyle === "gradient") {
      const a = (bgAngle * Math.PI) / 180;
      const x1 = w/2 - Math.cos(a) * w;
      const y1 = h/2 - Math.sin(a) * h;
      const x2 = w/2 + Math.cos(a) * w;
      const y2 = h/2 + Math.sin(a) * h;
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, bgColor1);
      g.addColorStop(1, bgColor2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (bgStyle === "blur" && originalImgRef.current) {
      ctx.save();
      ctx.filter = `blur(${bgBlur}px) saturate(1.15) brightness(1.05)`;
      const s = bgScale / 100;
      const bw = w * s, bh = h * s;
      ctx.drawImage(originalImgRef.current, (w - bw) / 2, (h - bh) / 2, bw, bh);
      ctx.restore();
      ctx.filter = "none";
    } else if (bgStyle === "pattern") {
      drawPattern(ctx, w, h, bgPattern, bgColor1, bgColor2);
    } else if (bgStyle === "image" && bgImage) {
      const s = Math.max(w / bgImage.naturalWidth, h / bgImage.naturalHeight);
      const iw = bgImage.naturalWidth * s;
      const ih = bgImage.naturalHeight * s;
      ctx.drawImage(bgImage, (w - iw) / 2, (h - ih) / 2, iw, ih);
    }

    // 2. subject transform
    const cx = w / 2 + subjX;
    const cy = h / 2 + subjY;
    const sc = subjScale / 100;
    const rot = (subjRotation * Math.PI) / 180;
    const filterStr = buildFilterStr(adjust);

    const applyTemp = () => {
      if (adjust.temperature !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        const t = adjust.temperature / 100;
        ctx.fillStyle = t > 0
          ? `rgba(255,170,80,${Math.abs(t) * 0.35})`
          : `rgba(80,150,255,${Math.abs(t) * 0.35})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    };

    // 3. reflection
    if (reflection > 0) {
      ctx.save();
      ctx.globalAlpha = reflection / 100;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      ctx.translate(0, natH);
      ctx.scale(1, -1);
      ctx.filter = filterStr;
      const temp = document.createElement("canvas");
      temp.width = natW;
      temp.height = natH;
      const tctx = temp.getContext("2d");
      if (tctx) {
        tctx.drawImage(subj, 0, 0);
        tctx.globalCompositeOperation = "destination-in";
        const g = tctx.createLinearGradient(0, 0, 0, natH);
        g.addColorStop(0, "rgba(0,0,0,0.55)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        tctx.fillStyle = g;
        tctx.fillRect(0, 0, natW, natH);
        ctx.drawImage(temp, 0, 0, natW, natH);
      }
      ctx.restore();
      ctx.filter = "none";
    }

    // 4. shadow
    if (shadow > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(shadow / 100, 0, 1);
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetY = shadowY;
      ctx.filter = filterStr;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      ctx.drawImage(subj, -natW/2, -natH/2, natW, natH);
      ctx.restore();
      ctx.filter = "none";
    }

    // 5. outline
    if (outline > 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      const offs = 24;
      for (let i = 0; i < offs; i++) {
        const a = (i / offs) * Math.PI * 2;
        const dx = Math.cos(a) * outline;
        const dy = Math.sin(a) * outline;
        ctx.save();
        ctx.drawImage(subj, -natW/2 + dx, -natH/2 + dy, natW, natH);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = outlineColor;
        ctx.fillRect(-natW, -natH, natW * 3, natH * 3);
        ctx.restore();
      }
      ctx.restore();
    }

    // 6. subject
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.filter = filterStr;
    ctx.drawImage(subj, -natW/2, -natH/2, natW, natH);
    ctx.restore();
    ctx.filter = "none";

    // 7. temperature + vignette + grain
    applyTemp();

    if (adjust.vignette > 0) {
      const g = ctx.createRadialGradient(w/2, h/2, Math.min(w, h) * 0.25, w/2, h/2, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${adjust.vignette / 100})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    if (adjust.grain > 0) {
      const grain = document.createElement("canvas");
      grain.width = w; grain.height = h;
      const gctx = grain.getContext("2d");
      if (gctx) {
        const id = gctx.createImageData(w, h);
        const d = id.data;
        const amt = adjust.grain / 100;
        for (let i = 0; i < d.length; i += 4) {
          const v = 128 + (Math.random() - 0.5) * 255 * amt;
          d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 255;
        }
        gctx.putImageData(id, 0, 0);
      }
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.35;
      ctx.drawImage(grain, 0, 0);
      ctx.restore();
    }

    // 8. text
    texts.forEach((t) => {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate((t.rotation * Math.PI) / 180);
      const fs = t.size;
      ctx.font = `${t.weight} ${fs}px ${t.font}`;
      ctx.textBaseline = "top";

      const metrics = ctx.measureText(t.value);
      const tw = metrics.width;
      const th = fs * 1.1;

      if (t.bgColor !== "transparent") {
        ctx.fillStyle = t.bgColor;
        const p = fs * 0.2;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(-p, -p / 2, tw + p * 2, th + p, fs * 0.12);
        } else {
          ctx.rect(-p, -p / 2, tw + p * 2, th + p);
        }
        ctx.fill();
      }

      if (t.shadow > 0) {
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = t.shadow;
        ctx.shadowOffsetY = t.shadow * 0.15;
      }
      if (t.outline > 0) {
        ctx.strokeStyle = t.outlineColor;
        ctx.lineWidth = t.outline * 2;
        ctx.lineJoin = "round";
        ctx.strokeText(t.value, 0, 0);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, 0, 0);
      ctx.restore();
    });

    // 9. stickers
    stickers.forEach((s) => {
      ctx.save();
      ctx.translate(s.x + s.size / 2, s.y + s.size / 2);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.font = `${s.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.emoji, 0, 0);
      ctx.restore();
    });

    // 10. frame
    if (frame !== "none") {
      const fw = Math.max(8, Math.round(Math.min(w, h) * 0.025));
      ctx.save();
      if (frame === "thin") {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = fw * 0.5;
        ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, w - ctx.lineWidth, h - ctx.lineWidth);
      } else if (frame === "thick") {
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = fw * 2;
        ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, w - ctx.lineWidth, h - ctx.lineWidth);
      } else if (frame === "polaroid") {
        ctx.fillStyle = frameColor;
        const side = fw * 1.5;
        const top = fw * 1.5;
        const bottom = fw * 4;
        ctx.fillRect(0, 0, w, top);
        ctx.fillRect(0, h - bottom, w, bottom);
        ctx.fillRect(0, 0, side, h);
        ctx.fillRect(w - side, 0, side, h);
      }
      ctx.restore();
    }
  }, [compositeDims, natW, natH, bgStyle, bgColor1, bgColor2, bgAngle, bgBlur, bgScale, bgPattern, bgImage,
      adjust, shadow, shadowColor, shadowBlur, shadowY, outline, outlineColor,
      texts, stickers, subjX, subjY, subjScale, subjRotation, reflection, frame, frameColor]);

  useEffect(() => { renderComposite(); }, [renderComposite]);
  useEffect(() => { renderComposite(); }, [img, step, renderComposite]);

  // ============================================================
  // reset / clear
  // ============================================================
  const resetToOriginal = async () => {
    const c = cutoutRef.current;
    const orig = originalImgRef.current;
    if (!c || !orig) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(orig, 0, 0);
    subjectRef.current = orig;
    commit("Reset");
    notify("Reset to original.");
  };

  const clearImage = () => {
    setImg(null); setLoaded(false);
    setHistory([]); setHistIndex(-1); histIndexRef.current = -1;
    setExported(null);
    setNatW(0); setNatH(0);
    setFileName(""); setFileSize(0);
    originalImgRef.current = null; subjectRef.current = null;
    setTexts([]); setStickers([]);
    const c = cutoutRef.current;
    if (c) { c.width = 1; c.height = 1; }
  };

  const goToEdit = () => {
    const c = cutoutRef.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    loadImageEl(url).then((im) => {
      subjectRef.current = im;
      setStep("edit");
    });
  };

  // ============================================================
  // export
  // ============================================================
  const doExport = async () => {
    const c = step === "edit" ? compositeRef.current : cutoutRef.current;
    if (!c || !loaded || !c.width) return notify("Load an image first.");
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 20));
      const out = document.createElement("canvas");
      out.width = c.width;
      out.height = c.height;
      const octx = out.getContext("2d");
      if (!octx) throw new Error("Export failed.");
      if (exportFormat === "jpg" && (step !== "edit" || bgStyle === "transparent")) {
        octx.fillStyle = "#ffffff";
        octx.fillRect(0, 0, out.width, out.height);
      }
      octx.drawImage(c, 0, 0);

      const mime = exportFormat === "png" ? "image/png" : exportFormat === "jpg" ? "image/jpeg" : "image/webp";
      const blob: Blob | null = await new Promise((res) =>
        out.toBlob((b) => res(b), mime, exportFormat === "png" ? undefined : quality)
      );
      if (!blob) throw new Error("Export failed.");
      if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
      const url = URL.createObjectURL(blob);
      exportUrlRef.current = url;
      const base = fileName.replace(/\.[^.]+$/, "") || "image";
      setExported({
        url, name: `${base}-no-bg.${exportFormat}`,
        size: blob.size, width: out.width, height: out.height,
      });
      notify("Ready to download!");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };
  useEffect(() => { doExportRef.current = doExport; });

  const copyToClipboard = async () => {
    if (!exported) return;
    try {
      const res = await fetch(exported.url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      notify("Copied!");
    } catch { notify("Copy failed — try download."); }
  };

  useEffect(() => () => {
    if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
  }, []);

  // ============================================================
  // text/sticker drag
  // ============================================================
  const onTextDown = (e: React.PointerEvent, t: TextItem) => {
    if (step !== "edit") return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedTextId(t.id);
    setSelectedStickerId(null);
    textDragRef.current = { id: t.id, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y };
  };
  const onTextMove = (e: React.PointerEvent) => {
    const d = textDragRef.current;
    if (!d) return;
    const scale = compositeDims.w / Math.max(1, displaySize.w);
    const nx = d.ox + (e.clientX - d.sx) * scale;
    const ny = d.oy + (e.clientY - d.sy) * scale;
    setTexts((ts) => ts.map((t) => t.id === d.id ? { ...t, x: nx, y: ny } : t));
  };
  const onTextUp = () => { textDragRef.current = null; };

  const onStickerDown = (e: React.PointerEvent, s: Sticker) => {
    if (step !== "edit") return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedStickerId(s.id);
    setSelectedTextId(null);
    stickerDragRef.current = { id: s.id, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y };
  };
  const onStickerMove = (e: React.PointerEvent) => {
    const d = stickerDragRef.current;
    if (!d) return;
    const scale = compositeDims.w / Math.max(1, displaySize.w);
    const nx = d.ox + (e.clientX - d.sx) * scale;
    const ny = d.oy + (e.clientY - d.sy) * scale;
    setStickers((ss) => ss.map((s) => s.id === d.id ? { ...s, x: nx, y: ny } : s));
  };
  const onStickerUp = () => { stickerDragRef.current = null; };

  const addText = () => {
    const t: TextItem = {
      id: uid(), value: "Your text",
      x: compositeDims.w / 2 - 100, y: compositeDims.h - 150,
      size: Math.max(48, Math.round(compositeDims.w / 12)),
      color: "#ffffff", weight: 700, font: FONTS[0].value,
      shadow: 8, outline: 0, outlineColor: "#000000",
      bgColor: "transparent", rotation: 0,
    };
    setTexts((ts) => [...ts, t]);
    setSelectedTextId(t.id);
    setEditTab("text");
  };

  const updateText = (patch: Partial<TextItem>) => {
    if (!selectedTextId) return;
    setTexts((ts) => ts.map((t) => t.id === selectedTextId ? { ...t, ...patch } : t));
  };

  const addSticker = (emoji: string) => {
    const size = Math.round(compositeDims.w * 0.15);
    const s: Sticker = {
      id: uid(), emoji,
      x: compositeDims.w / 2 - size / 2,
      y: compositeDims.h / 2 - size / 2,
      size, rotation: 0,
    };
    setStickers((ss) => [...ss, s]);
    setSelectedStickerId(s.id);
    setEditTab("stickers");
  };

  const selectedText = texts.find((t) => t.id === selectedTextId) || null;
  const selectedSticker = stickers.find((s) => s.id === selectedStickerId) || null;

  // ============================================================
  // derived
  // ============================================================
  const canUndo = histIndex > 0;
  const canRedo = histIndex < history.length - 1;
  const lastSnapshot = history[histIndex];
  const cursor = step === "edit" ? "default" :
    mode === "wand" ? "crosshair" :
    (mode === "erase" || mode === "restore") ? "crosshair" : "default";

  const previewW = step === "edit"
    ? Math.round((compositeDims.w / Math.max(1, natW)) * displaySize.w)
    : displaySize.w;
  const previewH = step === "edit"
    ? Math.round((compositeDims.h / Math.max(1, natH)) * displaySize.h)
    : displaySize.h;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen bg-[#f4f1ea] text-[#0a0a0a] overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-black text-white text-[13px] font-medium shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)] max-w-[90vw] text-center"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative container mx-auto px-6 md:px-8 max-w-[1400px] py-12 md:py-16">
        {/* breadcrumb */}
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
          <span className="text-black/70">Background Remover</span>
        </motion.nav>

        {/* header */}
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
                Remove · Edit · Export
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[64px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Cut it out.
              <br />
              <span className="italic text-[#ff6a00]">Then style it</span>.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              AI background removal, then a full editor: reposition, reflect,
              recolor, add gradients, patterns, stickers and text. All live,
              all in your browser. No uploads, no accounts, no watermarks.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 space-y-3">
            <div className="flex flex-wrap gap-x-7 gap-y-3">
              <TrustBadge icon={<ShieldCheck size={12} />} label="Private" />
              <TrustBadge icon={<Zap size={12} />} label="Instant" />
              <TrustBadge icon={<Sparkles size={12} />} label="On-device AI" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white/60 backdrop-blur-md">
              <Cpu size={11} className="text-[#ff6a00]" />
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/60">
                Runs locally · first use caches the model
              </span>
            </div>
          </motion.div>
        </motion.header>

        {/* editor grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT: canvas */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-8">
            <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden shadow-[0_18px_50px_-24px_rgba(0,0,0,0.2)]">
              {/* toolbar */}
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-black/[0.06] bg-black/[0.012] flex-wrap">
                <div className="flex items-center gap-1.5">
                  <ToolbarBtn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"><Undo2 size={14} /></ToolbarBtn>
                  <ToolbarBtn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={14} /></ToolbarBtn>
                  <span className="w-px h-4 bg-black/[0.08] mx-1" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium text-white bg-black hover:bg-[#ff6a00] transition-colors"
                  >
                    <Upload size={12} />
                    {loaded ? "Replace" : "Upload"}
                  </button>
                  {loaded && (
                    <>
                      <span className="w-px h-4 bg-black/[0.08] mx-1" />
                      <div className="inline-flex rounded-full border border-black/[0.08] overflow-hidden text-[11.5px]">
                        <button
                          onClick={() => setStep("remove")}
                          className={`px-3 py-1.5 font-medium transition-colors ${step === "remove" ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
                        >
                          1 · Remove
                        </button>
                        <button
                          onClick={goToEdit}
                          className={`px-3 py-1.5 font-medium transition-colors ${step === "edit" ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
                        >
                          2 · Edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {loaded && (
                    <>
                      <span className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-black/45 hidden sm:inline mr-1">
                        {step === "edit" ? `${compositeDims.w} × ${compositeDims.h}` : `${natW} × ${natH}`}
                      </span>
                      <ToolbarBtn onClick={resetToOriginal} title="Reset to original"><RefreshCw size={13} /></ToolbarBtn>
                      <ToolbarBtn onClick={clearImage} title="Close"><X size={14} /></ToolbarBtn>
                    </>
                  )}
                </div>
              </div>

              {/* stage */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={async (e) => {
                  e.preventDefault(); setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) await loadFile(f);
                }}
                className={`relative flex items-center justify-center min-h-[560px] p-6 transition-colors ${dragging ? "bg-[#ff6a00]/10" : "bg-[#fafaf6]"}`}
              >
                {!loaded && <EmptyState onPick={() => fileInputRef.current?.click()} />}

                <div
                  className="relative"
                  style={{
                    maxWidth: "100%",
                    visibility: loaded ? "visible" : "hidden",
                    position: loaded ? "relative" : "absolute",
                    pointerEvents: loaded ? "auto" : "none",
                  }}
                >
                  <div
                    className="rounded-[4px] overflow-hidden shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] relative"
                    style={{
                      width: step === "edit" ? previewW : displaySize.w || 1,
                      height: step === "edit" ? previewH : displaySize.h || 1,
                      backgroundImage: `linear-gradient(45deg, #dcd6cd 25%, transparent 25%), linear-gradient(-45deg, #dcd6cd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #dcd6cd 75%), linear-gradient(-45deg, transparent 75%, #dcd6cd 75%)`,
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                      backgroundColor: "#f4f1ea",
                    }}
                  >
                    <canvas
                      ref={cutoutRef}
                      onPointerDown={onCanvasDown}
                      onPointerMove={onCanvasMove}
                      onPointerUp={onCanvasUp}
                      onPointerCancel={onCanvasUp}
                      onPointerLeave={onCanvasUp}
                      className="absolute inset-0 w-full h-full"
                      style={{
                        cursor,
                        touchAction: "none",
                        opacity: step === "remove" ? 1 : 0,
                        pointerEvents: step === "remove" ? "auto" : "none",
                        transition: "opacity 0.2s",
                      }}
                    />
                    <canvas
                      ref={compositeRef}
                      className="absolute inset-0 w-full h-full"
                      style={{
                        opacity: step === "edit" ? 1 : 0,
                        pointerEvents: step === "edit" ? "auto" : "none",
                        transition: "opacity 0.2s",
                      }}
                    />

                    {step === "edit" && texts.map((t) => (
                      <div
                        key={t.id}
                        onPointerDown={(e) => onTextDown(e, t)}
                        onPointerMove={onTextMove}
                        onPointerUp={onTextUp}
                        className={`absolute cursor-move select-none ${selectedTextId === t.id ? "ring-2 ring-[#ff6a00] ring-offset-2 ring-offset-transparent rounded-[3px]" : ""}`}
                        style={{
                          left: `${(t.x / Math.max(1, compositeDims.w)) * 100}%`,
                          top: `${(t.y / Math.max(1, compositeDims.h)) * 100}%`,
                          width: 0, height: 0,
                          touchAction: "none",
                        }}
                      />
                    ))}

                    {step === "edit" && stickers.map((s) => (
                      <div
                        key={s.id}
                        onPointerDown={(e) => onStickerDown(e, s)}
                        onPointerMove={onStickerMove}
                        onPointerUp={onStickerUp}
                        className={`absolute cursor-move select-none ${selectedStickerId === s.id ? "ring-2 ring-[#ff6a00] ring-offset-2 ring-offset-transparent rounded" : ""}`}
                        style={{
                          left: `${(s.x / Math.max(1, compositeDims.w)) * 100}%`,
                          top: `${(s.y / Math.max(1, compositeDims.h)) * 100}%`,
                          width: `${(s.size / Math.max(1, compositeDims.w)) * previewW}px`,
                          height: `${(s.size / Math.max(1, compositeDims.h)) * previewH}px`,
                          touchAction: "none",
                        }}
                      />
                    ))}
                  </div>

                  {loaded && step === "remove" && (mode === "erase" || mode === "restore") && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10.5px] font-mono uppercase tracking-[0.16em] pointer-events-none">
                      {mode === "erase" ? "Erase" : "Restore"} · {brushSize}px
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {dragging && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-4 rounded-2xl border-2 border-dashed border-[#ff6a00] flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none z-10"
                    >
                      <div className="text-center">
                        <Upload size={28} className="mx-auto text-[#ff6a00] mb-2" />
                        <p className="text-[13px] font-medium text-[#ff6a00]">Drop to load</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* bottom bar */}
              {loaded && (
                <div className="border-t border-black/[0.06] px-5 py-2.5 bg-black/[0.012] flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-black/45">
                    {step === "remove" ? (lastSnapshot?.label || "Ready") : "Live editor"}
                  </span>
                  {step === "remove" && (
                    <button
                      onClick={goToEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff6a00] text-white text-[11px] font-medium hover:bg-[#e85f00] transition-colors"
                    >
                      <Check size={12} />
                      Done removing → Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* mode tabs */}
            {loaded && step === "remove" && (
              <div className="mt-5 flex flex-wrap gap-2">
                <ModeTab active={mode === "auto"} onClick={() => setMode("auto")} icon={<Sparkles size={14} />} label="AI Auto" />
                <ModeTab active={mode === "wand"} onClick={() => setMode("wand")} icon={<Wand2 size={14} />} label="Magic Wand" />
                <ModeTab active={mode === "erase"} onClick={() => setMode("erase")} icon={<Eraser size={14} />} label="Erase" />
                <ModeTab active={mode === "restore"} onClick={() => setMode("restore")} icon={<Brush size={14} />} label="Restore" />
              </div>
            )}
          </motion.div>

          {/* RIGHT: settings */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="lg:col-span-4 space-y-6">
            {(!loaded || step === "remove") && (
              <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
                <PanelHeader label={
                  mode === "auto" ? "AI removal" :
                  mode === "wand" ? "Magic wand" :
                  mode === "erase" ? "Erase brush" : "Restore brush"
                } />

                {mode === "auto" && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-[#ff6a00]/[0.06] border border-[#ff6a00]/15 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#ff6a00]/15 flex items-center justify-center shrink-0">
                        <Cpu size={14} className="text-[#ff6a00]" />
                      </div>
                      <div className="text-[12.5px] leading-relaxed text-black/65">
                        <strong className="text-black font-medium">On-device AI.</strong>{" "}
                        The model is downloaded once (about 40 MB) and cached by
                        your browser. After that, every removal is instant and
                        works offline.
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: aiBusy ? 1 : 1.02 }}
                      whileTap={{ scale: aiBusy ? 1 : 0.97 }}
                      onClick={runAiRemove}
                      disabled={!loaded || aiBusy}
                      className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiBusy ? (
                        <><Loader2 size={15} className="animate-spin" />{aiProgress || "Working…"}</>
                      ) : (
                        <><Sparkles size={15} />Remove background</>
                      )}
                    </motion.button>
                  </div>
                )}

                {mode === "wand" && (
                  <div className="space-y-5">
                    <RangeRow icon={<Droplet size={13} />} label="Tolerance" value={tolerance} min={0} max={150} onChange={setTolerance} />
                    <RangeRow icon={<Feather size={13} />} label="Feather" value={feather} min={0} max={6} onChange={setFeather} unit="px" />
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton icon={<MousePointer2 size={14} />} label="Contiguous" active={contiguous} onClick={() => setContiguous(true)} />
                      <ActionButton icon={<Layers size={14} />} label="Global" active={!contiguous} onClick={() => setContiguous(false)} />
                    </div>
                  </div>
                )}

                {(mode === "erase" || mode === "restore") && (
                  <div className="space-y-5">
                    <RangeRow icon={<CircleIcon size={13} />} label="Brush size" value={brushSize} min={5} max={200} onChange={setBrushSize} unit="px" />
                    <RangeRow icon={<Aperture size={13} />} label="Hardness" value={brushHardness} min={0} max={1} step={0.05} onChange={setBrushHardness} />
                  </div>
                )}
              </motion.div>
            )}

            {loaded && step === "edit" && (
              <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
                <PanelHeader label="Edit cut-out" />

                <div className="grid grid-cols-5 gap-1 mb-5 p-1 rounded-xl bg-black/[0.04]">
                  <EditTabBtn active={editTab === "bg"} onClick={() => setEditTab("bg")} icon={<ImageIcon size={12} />} label="Bg" />
                  <EditTabBtn active={editTab === "adjust"} onClick={() => setEditTab("adjust")} icon={<Sun size={12} />} label="Adj" />
                  <EditTabBtn active={editTab === "effects"} onClick={() => setEditTab("effects")} icon={<Sparkles size={12} />} label="Fx" />
                  <EditTabBtn active={editTab === "text"} onClick={() => setEditTab("text")} icon={<TypeIcon size={12} />} label="Text" />
                  <EditTabBtn active={editTab === "stickers"} onClick={() => setEditTab("stickers")} icon={<Smile size={12} />} label="Fun" />
                </div>

                {editTab === "bg" && (
                  <div className="space-y-5">
                    <div>
                      <SubLabel>Presets</SubLabel>
                      <div className="grid grid-cols-4 gap-2">
                        {BG_PRESETS.map((p) => {
                          const active = bgStyle === p.style && bgColor1 === p.c1;
                          return (
                            <button
                              key={p.label}
                              onClick={() => { setBgStyle(p.style); setBgColor1(p.c1); setBgColor2(p.c2); }}
                              className={`aspect-square rounded-xl border-2 transition-all overflow-hidden relative ${
                                active ? "border-[#ff6a00] ring-2 ring-[#ff6a00]/30" : "border-black/[0.08] hover:border-black/30"
                              }`}
                              style={{
                                background:
                                  p.style === "transparent" ? "repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 50% / 12px 12px" :
                                  p.style === "solid" ? p.c1 :
                                  `linear-gradient(135deg, ${p.c1}, ${p.c2})`,
                              }}
                            >
                              <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[8.5px] font-mono uppercase tracking-wider py-0.5 text-center">
                                {p.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <SubLabel>Custom image</SubLabel>
                      <button
                        onClick={() => bgFileRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.1] text-black/70 text-[12px] font-medium hover:border-[#ff6a00] hover:text-[#ff6a00] transition-colors"
                      >
                        <Upload size={12} />
                        {bgImage ? "Change background image" : "Upload background image"}
                      </button>
                    </div>

                    {bgStyle === "solid" && <ColorRow label="Color" value={bgColor1} onChange={setBgColor1} />}
                    {bgStyle === "gradient" && (
                      <>
                        <ColorRow label="Color 1" value={bgColor1} onChange={setBgColor1} />
                        <ColorRow label="Color 2" value={bgColor2} onChange={setBgColor2} />
                        <RangeRow icon={<Move size={13} />} label="Angle" value={bgAngle} min={0} max={360} onChange={setBgAngle} unit="°" />
                      </>
                    )}
                    {bgStyle === "blur" && (
                      <>
                        <RangeRow icon={<Cloud size={13} />} label="Blur" value={bgBlur} min={0} max={60} onChange={setBgBlur} unit="px" />
                        <RangeRow icon={<Layers size={13} />} label="Zoom" value={bgScale} min={100} max={200} onChange={setBgScale} unit="%" />
                      </>
                    )}
                    {bgStyle === "pattern" && (
                      <>
                        <div>
                          <SubLabel>Pattern</SubLabel>
                          <div className="grid grid-cols-5 gap-1.5">
                            {PATTERNS.map((p) => (
                              <button
                                key={p.type}
                                onClick={() => setBgPattern(p.type)}
                                className={`py-2 rounded-lg text-[10.5px] border transition-colors ${
                                  bgPattern === p.type ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-[#ff6a00]"
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <ColorRow label="Dot / line color" value={bgColor1} onChange={setBgColor1} />
                        <ColorRow label="Base color" value={bgColor2} onChange={setBgColor2} />
                      </>
                    )}

                    <div className="pt-4 border-t border-black/[0.06] space-y-4">
                      <SubLabel>Canvas layout</SubLabel>
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">Aspect ratio</div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {ASPECTS.map((a, i) => (
                            <button
                              key={a.label}
                              onClick={() => setAspectIdx(i)}
                              className={`py-2 rounded-lg text-[10.5px] border transition-colors ${
                                aspectIdx === i ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-[#ff6a00]"
                              }`}
                            >
                              {a.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <RangeRow icon={<Maximize2 size={13} />} label="Padding" value={padding} min={0} max={40} onChange={setPadding} unit="%" />

                      <SubLabel>Subject position</SubLabel>
                      <RangeRow icon={<Move size={13} />} label="X offset" value={subjX} min={-400} max={400} onChange={setSubjX} unit="px" />
                      <RangeRow icon={<Move size={13} />} label="Y offset" value={subjY} min={-400} max={400} onChange={setSubjY} unit="px" />
                      <RangeRow icon={<Maximize2 size={13} />} label="Scale" value={subjScale} min={30} max={200} onChange={setSubjScale} unit="%" />
                      <RangeRow icon={<RotateCw size={13} />} label="Rotation" value={subjRotation} min={-45} max={45} onChange={setSubjRotation} unit="°" />
                      <RangeRow icon={<Layers size={13} />} label="Reflection" value={reflection} min={0} max={100} onChange={setReflection} unit="%" />
                    </div>
                  </div>
                )}

                {editTab === "adjust" && (
                  <div className="space-y-4">
                    <RangeRow icon={<Sun size={13} />} label="Brightness" value={adjust.brightness} min={0} max={200} onChange={(v) => setAdjust({ ...adjust, brightness: v })} unit="%" />
                    <RangeRow icon={<Contrast size={13} />} label="Contrast" value={adjust.contrast} min={0} max={200} onChange={(v) => setAdjust({ ...adjust, contrast: v })} unit="%" />
                    <RangeRow icon={<Droplets size={13} />} label="Saturation" value={adjust.saturate} min={0} max={300} onChange={(v) => setAdjust({ ...adjust, saturate: v })} unit="%" />
                    <RangeRow icon={<Palette size={13} />} label="Hue" value={adjust.hue} min={-180} max={180} onChange={(v) => setAdjust({ ...adjust, hue: v })} unit="°" />
                    <RangeRow icon={<Flame size={13} />} label="Temperature" value={adjust.temperature} min={-100} max={100} onChange={(v) => setAdjust({ ...adjust, temperature: v })} />
                    <RangeRow icon={<Eye size={13} />} label="Blur" value={adjust.blur} min={0} max={10} step={0.5} onChange={(v) => setAdjust({ ...adjust, blur: v })} unit="px" />
                    <RangeRow icon={<Moon size={13} />} label="Grayscale" value={adjust.grayscale} min={0} max={100} onChange={(v) => setAdjust({ ...adjust, grayscale: v })} unit="%" />
                    <RangeRow icon={<Sparkles size={13} />} label="Sepia" value={adjust.sepia} min={0} max={100} onChange={(v) => setAdjust({ ...adjust, sepia: v })} unit="%" />
                    <RangeRow icon={<Aperture size={13} />} label="Vignette" value={adjust.vignette} min={0} max={100} onChange={(v) => setAdjust({ ...adjust, vignette: v })} unit="%" />
                    <RangeRow icon={<Wind size={13} />} label="Grain" value={adjust.grain} min={0} max={100} onChange={(v) => setAdjust({ ...adjust, grain: v })} unit="%" />

                    <div className="pt-3 border-t border-black/[0.06]">
                      <SubLabel>Quick looks</SubLabel>
                      <div className="grid grid-cols-4 gap-1.5">
                        {LOOKS.map((l) => (
                          <button
                            key={l.label}
                            onClick={() => setAdjust({ ...DEFAULT_ADJUST, ...l.adj })}
                            className="py-2 rounded-lg text-[10.5px] font-medium border border-black/[0.08] hover:border-[#ff6a00] transition-colors"
                          >
                            {l.emoji} {l.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setAdjust({ ...DEFAULT_ADJUST })}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.1] text-black/70 text-[12px] font-medium hover:border-black/30 transition-colors"
                    >
                      <RefreshCw size={12} /> Reset
                    </button>
                  </div>
                )}

                {editTab === "effects" && (
                  <div className="space-y-5">
                    <div>
                      <RangeRow icon={<Wind size={13} />} label="Shadow" value={shadow} min={0} max={100} onChange={setShadow} unit="%" />
                      {shadow > 0 && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-[#ff6a00]/30">
                          <ColorRow label="Color" value={shadowColor} onChange={setShadowColor} />
                          <RangeRow icon={<Aperture size={13} />} label="Blur" value={shadowBlur} min={0} max={60} onChange={setShadowBlur} unit="px" />
                          <RangeRow icon={<Move size={13} />} label="Y offset" value={shadowY} min={-40} max={40} onChange={setShadowY} unit="px" />
                        </div>
                      )}
                    </div>

                    <div>
                      <RangeRow icon={<Square size={13} />} label="Outline" value={outline} min={0} max={20} onChange={setOutline} unit="px" />
                      {outline > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-[#ff6a00]/30">
                          <ColorRow label="Outline color" value={outlineColor} onChange={setOutlineColor} />
                        </div>
                      )}
                    </div>

                    <div>
                      <SubLabel>Frame</SubLabel>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["none", "thin", "thick", "polaroid"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setFrame(f)}
                            className={`py-2 rounded-lg text-[10.5px] border capitalize transition-colors ${
                              frame === f ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-[#ff6a00]"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      {frame !== "none" && (
                        <div className="mt-3">
                          <ColorRow label="Frame color" value={frameColor} onChange={setFrameColor} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editTab === "text" && (
                  <div className="space-y-4">
                    <button
                      onClick={addText}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                    >
                      <TypeIcon size={14} /> Add text
                    </button>

                    {!selectedText && (
                      <p className="text-[12px] text-black/45 leading-relaxed">
                        {texts.length ? "Tap a text on the canvas to edit." : "No text yet."}
                      </p>
                    )}

                    {selectedText && (
                      <div className="space-y-4 pt-2 border-t border-black/[0.06]">
                        <div>
                          <SubLabel>Content</SubLabel>
                          <input
                            type="text"
                            value={selectedText.value}
                            onChange={(e) => updateText({ value: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] text-[13px] bg-white outline-none focus:border-[#ff6a00] transition-colors"
                          />
                        </div>

                        <div>
                          <SubLabel>Font</SubLabel>
                          <div className="grid grid-cols-3 gap-1.5">
                            {FONTS.map((f) => (
                              <button
                                key={f.label}
                                onClick={() => updateText({ font: f.value })}
                                style={{ fontFamily: f.value }}
                                className={`px-2 py-2 rounded-lg text-[11px] border transition-colors ${
                                  selectedText.font === f.value ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-[#ff6a00]"
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <RangeRow icon={<TypeIcon size={13} />} label="Size" value={selectedText.size} min={20} max={400} onChange={(v) => updateText({ size: v })} unit="px" />
                        <RangeRow icon={<RotateCw size={13} />} label="Rotation" value={selectedText.rotation} min={-180} max={180} onChange={(v) => updateText({ rotation: v })} unit="°" />
                        <RangeRow icon={<Sparkles size={13} />} label="Shadow" value={selectedText.shadow} min={0} max={40} onChange={(v) => updateText({ shadow: v })} />
                        <RangeRow icon={<Square size={13} />} label="Outline" value={selectedText.outline} min={0} max={10} onChange={(v) => updateText({ outline: v })} />
                        <ColorRow label="Text color" value={selectedText.color} onChange={(v) => updateText({ color: v })} />
                        {selectedText.outline > 0 && (
                          <ColorRow label="Outline color" value={selectedText.outlineColor} onChange={(v) => updateText({ outlineColor: v })} />
                        )}
                        <div>
                          <SubLabel>Background pill</SubLabel>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateText({ bgColor: "transparent" })}
                              className={`px-3 py-2 rounded-lg text-[11px] border transition-colors ${
                                selectedText.bgColor === "transparent" ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1]"
                              }`}
                            >
                              None
                            </button>
                            <label className="relative w-9 h-9 rounded-lg overflow-hidden border border-black/[0.1] cursor-pointer">
                              <input
                                type="color"
                                value={selectedText.bgColor === "transparent" ? "#ffffff" : selectedText.bgColor}
                                onChange={(e) => updateText({ bgColor: e.target.value })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <span className="absolute inset-0" style={{ background: selectedText.bgColor === "transparent" ? "#ffffff" : selectedText.bgColor }} />
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={() => { setTexts((ts) => ts.filter((t) => t.id !== selectedText.id)); setSelectedTextId(null); }}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.15] text-black/70 text-[12.5px] font-medium hover:border-red-400 hover:text-red-500 transition-colors"
                        >
                          <X size={13} /> Remove text
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {editTab === "stickers" && (
                  <div className="space-y-4">
                    <SubLabel>Tap to add</SubLabel>
                    <div className="grid grid-cols-8 gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {STICKERS.map((e) => (
                        <button
                          key={e}
                          onClick={() => addSticker(e)}
                          className="aspect-square rounded-lg hover:bg-[#ff6a00]/10 transition-colors text-[22px] leading-none flex items-center justify-center"
                        >
                          {e}
                        </button>
                      ))}
                    </div>

                    {selectedSticker && (
                      <div className="pt-3 border-t border-black/[0.06] space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="text-[36px] leading-none">{selectedSticker.emoji}</div>
                          <div className="text-[12px] text-black/50">Selected</div>
                        </div>
                        <RangeRow icon={<Maximize2 size={13} />} label="Size" value={selectedSticker.size} min={24} max={400} onChange={(v) => setStickers((ss) => ss.map((s) => s.id === selectedSticker.id ? { ...s, size: v } : s))} unit="px" />
                        <RangeRow icon={<RotateCw size={13} />} label="Rotation" value={selectedSticker.rotation} min={-180} max={180} onChange={(v) => setStickers((ss) => ss.map((s) => s.id === selectedSticker.id ? { ...s, rotation: v } : s))} unit="°" />
                        <button
                          onClick={() => { setStickers((ss) => ss.filter((s) => s.id !== selectedSticker.id)); setSelectedStickerId(null); }}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.15] text-black/70 text-[12.5px] font-medium hover:border-red-400 hover:text-red-500 transition-colors"
                        >
                          <X size={13} /> Remove sticker
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* EXPORT */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <PanelHeader label="Export" />

              <div className="mb-6">
                <SubLabel>Format</SubLabel>
                <div className="grid grid-cols-3 gap-2">
                  <FormatButton active={exportFormat === "png"} onClick={() => setExportFormat("png")} title="PNG" subtitle="Alpha" icon={<Layers size={14} />} />
                  <FormatButton active={exportFormat === "jpg"} onClick={() => setExportFormat("jpg")} title="JPG" subtitle="Solid bg" icon={<ImageIcon size={14} />} />
                  <FormatButton active={exportFormat === "webp"} onClick={() => setExportFormat("webp")} title="WebP" subtitle="Smaller" icon={<Wand2 size={14} />} />
                </div>
              </div>

              {exportFormat !== "png" && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <SubLabel>Quality</SubLabel>
                    <div className="text-[11px] font-mono text-black/60">{Math.round(quality * 100)}%</div>
                  </div>
                  <input type="range" min={0.5} max={1} step={0.01} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-[#ff6a00]" />
                </div>
              )}

              <motion.button
                whileHover={{ scale: exporting ? 1 : 1.02 }}
                whileTap={{ scale: exporting ? 1 : 0.97 }}
                onClick={doExport}
                disabled={!loaded || exporting}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? <><Loader2 size={15} className="animate-spin" />Rendering…</> : <><Download size={15} />Export {exportFormat.toUpperCase()}</>}
              </motion.button>
            </motion.div>

            {/* RESULT */}
            <AnimatePresence>
              {exported && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[22px] bg-[#0a0a0a] text-white border border-black/10 p-6 md:p-7 overflow-hidden relative"
                >
                  <div className="pointer-events-none absolute -top-20 -right-16 w-[260px] h-[260px] rounded-full bg-[#ff6a00]/30 blur-[80px]" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-md mb-5">
                      <SparklesIcon size={11} className="text-[#ff6a00]" />
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">
                        {exportFormat.toUpperCase()} ready
                      </span>
                    </div>
                    <h3 className="text-[19px] leading-tight mb-1 break-all" style={{ fontFamily: "Georgia, serif" }}>
                      {exported.name}
                    </h3>
                    <p className="text-[12.5px] text-white/50 mb-6">
                      {exported.width} × {exported.height} px · {formatBytes(exported.size)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a href={exported.url} download={exported.name}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[13px] font-medium hover:bg-[#ff6a00] hover:text-white transition-colors">
                        <Download size={15} /> Download
                        <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                      <button onClick={copyToClipboard}
                        className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/[0.07] border border-white/15 text-white text-[13px] font-medium hover:bg-white/[0.12] transition-colors">
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HISTORY */}
            {history.length > 1 && step === "remove" && (
              <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
                <PanelHeader label={`History · ${history.length}`} />
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {history.map((h, i) => (
                    <button key={i}
                      onClick={async () => { setHistIndex(i); histIndexRef.current = i; await redrawFromSnapshot(h.url); }}
                      title={h.label}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === histIndex ? "border-[#ff6a00]" : "border-black/[0.06] hover:border-black/30"
                      }`}
                      style={{
                        backgroundImage: `linear-gradient(45deg, #e6e1d8 25%, transparent 25%), linear-gradient(-45deg, #e6e1d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e6e1d8 75%), linear-gradient(-45deg, transparent 75%, #e6e1d8 75%)`,
                        backgroundSize: "8px 8px", backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                      }}
                    >
                      <img src={h.url} alt={h.label} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PRIVACY */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                The AI model, brushes, editor and export all run on an HTML5 canvas
                inside your browser. The model is cached after the first use — no
                uploads, no accounts, no watermarks.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* features */}
        <motion.section
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">Everything inside</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl" style={{ fontFamily: "Georgia, serif" }}>
            Remove. Edit. Ship.
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <FeatureCard icon={<Sparkles size={18} />} title="Auto-remove" desc="One-click subject detection runs on-device via WebAssembly." />
            <FeatureCard icon={<Wand2 size={18} />} title="Magic wand + brushes" desc="Flood-fill or soft erase / restore to clean up any leftover edges." />
            <FeatureCard icon={<Move size={18} />} title="Move, scale, rotate" desc="Reposition the subject inside the frame with slider or drag controls." />
            <FeatureCard icon={<Layers size={18} />} title="Reflection" desc="Mirror the subject below itself with a natural fade-out." />
            <FeatureCard icon={<Grid3x3 size={18} />} title="Aspect ratios" desc="1:1, 4:5, 4:3, 16:9, 9:16 and more — perfect for social." />
            <FeatureCard icon={<Paintbrush size={18} />} title="12 background styles" desc="Transparent, solid, gradient, blur, patterns, or upload your own image." />
            <FeatureCard icon={<Sun size={18} />} title="10 adjustments" desc="Brightness, contrast, saturation, hue, temperature, blur, grayscale, sepia, vignette and grain." />
            <FeatureCard icon={<TypeIcon size={18} />} title="Text + stickers" desc="Draggable text with fonts, shadow, outline, background pill. 36 emoji stickers." />
            <FeatureCard icon={<Aperture size={18} />} title="Shadow, outline, frames" desc="Pop-out effects plus thin, thick or polaroid frames." />
            <FeatureCard icon={<Download size={18} />} title="PNG · JPG · WebP" desc="Export with alpha, solid color, or compressed — your choice." />
            <FeatureCard icon={<Cpu size={18} />} title="Model caching" desc="Downloads once. Every removal after that is instant and offline." />
            <FeatureCard icon={<ShieldCheck size={18} />} title="100% private" desc="No uploads, no signup, no watermark. Your images never leave your browser." />
          </div>
        </motion.section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) await loadFile(f); e.target.value = ""; }}
      />
      <input
        ref={bgFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            try {
              const url = await fileToDataUrl(f);
              const im = await loadImageEl(url);
              setBgImage(im);
              setBgStyle("image");
              notify("Background set.");
            } catch { notify("Could not load background."); }
          }
          e.target.value = "";
        }}
      />
    </div>
  );
};

// ============================================================
// SUB COMPONENTS
// ============================================================
function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.span variants={fadeUp} className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/55">
      <span className="w-5 h-5 rounded-full bg-black/[0.05] flex items-center justify-center text-black/70">{icon}</span>
      {label}
    </motion.span>
  );
}

function ToolbarBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-black/60 hover:text-black hover:bg-black/[0.05] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[12.5px] font-medium border transition-colors ${
        active ? "bg-black text-white border-black shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]" : "bg-white text-black/70 border-black/[0.08] hover:border-black/25 hover:text-black"
      }`}>
      {icon} {label}
    </motion.button>
  );
}

function EditTabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9.5px] font-medium transition-colors ${
        active ? "bg-white text-[#ff6a00] shadow-sm" : "text-black/50 hover:text-black"
      }`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function ActionButton({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium border transition-colors ${
        active ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
      }`}>
      {icon} {label}
    </motion.button>
  );
}

function FormatButton({ active, onClick, title, subtitle, icon }: { active: boolean; onClick: () => void; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-colors ${
        active ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
      }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${active ? "bg-white/15" : "bg-black/[0.05]"}`}>{icon}</span>
        <span className="text-[12.5px] font-medium">{title}</span>
        {active && <Check size={12} className="ml-auto text-[#ff6a00]" />}
      </div>
      <div className={`text-[10px] ${active ? "text-white/55" : "text-black/40"}`}>{subtitle}</div>
    </motion.button>
  );
}

function PanelHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">{label}</span>
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
      {children}
    </div>
  );
}

function RangeRow({ icon, label, value, min, max, step = 1, unit = "", onChange }: {
  icon: React.ReactNode; label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
          <span className="text-[#ff6a00]">{icon}</span>{label}
        </div>
        <div className="text-[11px] font-mono text-black/60">{value}{unit}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#ff6a00]" />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10.5px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">{label}</div>
      <div className="flex items-center gap-3">
        <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <span className="absolute inset-0" style={{ background: value }} />
        </label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-[#ff6a00] transition-colors" />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-start gap-4 p-6 rounded-[20px] bg-white border border-black/[0.06]">
      <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center text-[#ff6a00] shrink-0">{icon}</div>
      <div>
        <h4 className="text-[15px] font-medium text-black mb-1.5 leading-tight">{title}</h4>
        <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
      </div>
    </motion.div>
  );
}

function EmptyState({ onPick }: { onPick: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
      <div className="w-16 h-16 rounded-2xl bg-[#ff6a00]/10 border border-[#ff6a00]/20 flex items-center justify-center mx-auto mb-5">
        <Scissors size={26} className="text-[#ff6a00]" />
      </div>
      <h3 className="text-[22px] leading-tight mb-2" style={{ fontFamily: "Georgia, serif" }}>
        Drop an image here
      </h3>
      <p className="text-[13px] text-black/50 leading-relaxed mb-6">
        Or click to browse. Paste from clipboard with{" "}
        <kbd className="font-mono text-[11px] bg-black/[0.06] px-1.5 py-0.5 rounded">Ctrl</kbd> +{" "}
        <kbd className="font-mono text-[11px] bg-black/[0.06] px-1.5 py-0.5 rounded">V</kbd>.
      </p>
      <button onClick={onPick}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors">
        <Upload size={14} /> Choose image
      </button>
      <p className="mt-4 text-[11px] font-mono uppercase tracking-[0.15em] text-black/35">
        PNG · JPG · WebP · GIF · BMP · AVIF
      </p>
    </motion.div>
  );
}