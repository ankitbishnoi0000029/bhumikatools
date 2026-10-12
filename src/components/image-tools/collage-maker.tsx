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
  HardDriveDownload,
  Info,
  Layers,
  Cpu,
  Code2,
  FileCheck2,
  HelpCircle,
  ChevronDown,
  Plus,
  Trash2,
  Grid2x2,
  Grid3x3,
  Columns3,
  Rows3,
  LayoutTemplate,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Palette,
  Move,
  Image as ImageIcon,
  Maximize2,
  Camera,
  X,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type ImageItem = {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
  size: number;
};

type CellRect = { x: number; y: number; w: number; h: number };
type Template = { id: string; name: string; icon: React.ReactNode; cells: CellRect[] };
type CellState = { imageId: string | null; posX: number; posY: number };

type Result = {
  url: string;
  size: number;
  name: string;
  width: number;
  height: number;
};

type Stage = "idle" | "rendering" | "done";
type Format = "png" | "jpg" | "webp";
type AspectKey = "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2";
type Resolution = "standard" | "high" | "ultra";

const MAX_SIZE_MB = 25;
const MAX_IMAGES = 20;

// ============================================================
// LAYOUT TEMPLATES
// ============================================================
const TEMPLATES: Template[] = [
  {
    id: "2x2",
    name: "2×2",
    icon: <Grid2x2 size={14} />,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: "3x3",
    name: "3×3",
    icon: <Grid3x3 size={14} />,
    cells: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 3,
      w: 1 / 3,
      h: 1 / 3,
    })),
  },
  {
    id: "hero",
    name: "Hero",
    icon: <LayoutTemplate size={14} />,
    cells: [
      { x: 0, y: 0, w: 0.66, h: 1 },
      { x: 0.66, y: 0, w: 0.34, h: 1 / 3 },
      { x: 0.66, y: 1 / 3, w: 0.34, h: 1 / 3 },
      { x: 0.66, y: 2 / 3, w: 0.34, h: 1 / 3 },
    ],
  },
  {
    id: "filmstrip",
    name: "Strip",
    icon: <Columns3 size={14} />,
    cells: Array.from({ length: 4 }, (_, i) => ({
      x: i / 4,
      y: 0,
      w: 1 / 4,
      h: 1,
    })),
  },
  {
    id: "mosaic",
    name: "Mosaic",
    icon: <Layers size={14} />,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.6 },
      { x: 0.5, y: 0, w: 0.25, h: 0.6 },
      { x: 0.75, y: 0, w: 0.25, h: 0.6 },
      { x: 0, y: 0.6, w: 0.33, h: 0.4 },
      { x: 0.33, y: 0.6, w: 0.34, h: 0.4 },
      { x: 0.67, y: 0.6, w: 0.33, h: 0.4 },
    ],
  },
  {
    id: "duo",
    name: "Duo",
    icon: <Rows3 size={14} />,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: "polaroid",
    name: "Polaroid",
    icon: <Square size={14} />,
    cells: [{ x: 0.12, y: 0.12, w: 0.76, h: 0.76 }],
  },
];

const ASPECTS: { key: AspectKey; value: number; icon: React.ReactNode }[] = [
  { key: "1:1", value: 1, icon: <Square size={12} /> },
  { key: "4:3", value: 4 / 3, icon: <RectangleHorizontal size={12} /> },
  { key: "3:4", value: 3 / 4, icon: <RectangleVertical size={12} /> },
  { key: "16:9", value: 16 / 9, icon: <RectangleHorizontal size={12} /> },
  { key: "9:16", value: 9 / 16, icon: <RectangleVertical size={12} /> },
  { key: "3:2", value: 3 / 2, icon: <RectangleHorizontal size={12} /> },
];

const RESOLUTIONS: { key: Resolution; label: string; longSide: number }[] = [
  { key: "standard", label: "Standard", longSide: 1400 },
  { key: "high", label: "High", longSide: 2200 },
  { key: "ultra", label: "Ultra", longSide: 3200 },
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
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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
export const CollageMaker = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [templateId, setTemplateId] = useState<string>("2x2");
  const [cells, setCells] = useState<CellState[]>([]);
  const [activeCell, setActiveCell] = useState<number>(0);
  const [draggingImageFromTray, setDraggingImageFromTray] = useState(false);

  const [aspectKey, setAspectKey] = useState<AspectKey>("1:1");
  const [padding, setPadding] = useState(24);
  const [gap, setGap] = useState(8);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [borderRadius, setBorderRadius] = useState(8);
  const [fit, setFit] = useState<"cover" | "contain">("cover");

  const [resolution, setResolution] = useState<Resolution>("high");
  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(92);

  const [result, setResult] = useState<Result | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultUrlRef = useRef<string | null>(null);
  const imageUrlsRef = useRef<string[]>([]);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragPanRef = useRef<{
    cellIndex: number;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    extraW: number;
    extraH: number;
  } | null>(null);

  // Active template
  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId]
  );

  // Initialize / resize cells array when template changes
  useEffect(() => {
    setCells((prev) => {
      const next: CellState[] = template.cells.map((_, i) => {
        const existing = prev[i];
        return existing ?? { imageId: null, posX: 0.5, posY: 0.5 };
      });
      return next;
    });
    setActiveCell(0);
    setResult(null);
  }, [templateId, template.cells]);

  useEffect(() => {
    return () => {
      imageUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const clearResult = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setResult(null);
  };

  const reset = () => {
    imageUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    imageUrlsRef.current = [];
    clearResult();
    setImages([]);
    setCells(template.cells.map(() => ({ imageId: null, posX: 0.5, posY: 0.5 })));
    setActiveCell(0);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------------- FILES ----------------
  const addFiles = useCallback(async (files: File[]) => {
    setError(null);
    clearResult();

    const available = MAX_IMAGES - images.length;
    if (available <= 0) {
      setError(`Maximum ${MAX_IMAGES} images reached.`);
      return;
    }

    const toAdd = files.slice(0, available);
    const valid: ImageItem[] = [];

    for (const f of toAdd) {
      if (!isSupportedImage(f)) {
        setError(`"${f.name}" is not a supported image (JPG, PNG, WebP).`);
        continue;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${f.name}" is too large (max ${MAX_SIZE_MB} MB).`);
        continue;
      }
      try {
        const url = URL.createObjectURL(f);
        imageUrlsRef.current.push(url);
        const img = await loadImage(url);
        valid.push({
          id: uid(),
          url,
          name: f.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: f.size,
        });
      } catch {
        setError(`Couldn't read "${f.name}".`);
      }
    }

    if (valid.length === 0) return;

    // Assign new images into empty cells sequentially
    setImages((prev) => [...prev, ...valid]);
    setCells((prev) => {
      const next = [...prev];
      let cursor = 0;
      for (const img of valid) {
        while (cursor < next.length && next[cursor].imageId !== null) cursor++;
        if (cursor >= next.length) break;
        next[cursor] = { imageId: img.id, posX: 0.5, posY: 0.5 };
        cursor++;
      }
      return next;
    });
  }, [images.length]);

  const onDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) addFiles(files);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
        imageUrlsRef.current = imageUrlsRef.current.filter((u) => u !== removed.url);
      }
      return prev.filter((i) => i.id !== id);
    });
    setCells((prev) =>
      prev.map((c) => (c.imageId === id ? { imageId: null, posX: 0.5, posY: 0.5 } : c))
    );
    clearResult();
  };

  const assignToActiveCell = (imageId: string) => {
    setCells((prev) => {
      const next = [...prev];
      next[activeCell] = { imageId, posX: 0.5, posY: 0.5 };
      return next;
    });
    clearResult();
    // Auto-advance to next empty cell
    setCells((prev) => {
      for (let i = activeCell + 1; i < prev.length; i++) {
        if (prev[i].imageId === null) {
          setActiveCell(i);
          break;
        }
      }
      return prev;
    });
  };

  const clearCell = (index: number) => {
    setCells((prev) => {
      const next = [...prev];
      next[index] = { imageId: null, posX: 0.5, posY: 0.5 };
      return next;
    });
    clearResult();
  };

  // ---------------- PAN INTERACTION ----------------
  const startPan = (cellIndex: number) => (e: React.PointerEvent) => {
    const cell = cells[cellIndex];
    if (!cell.imageId) return;
    const img = images.find((i) => i.id === cell.imageId);
    if (!img) return;

    // Find cell element's rendered size (the inner image container)
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const scale = Math.max(rect.width / img.width, rect.height / img.height);
    const extraW = img.width * scale - rect.width;
    const extraH = img.height * scale - rect.height;

    dragPanRef.current = {
      cellIndex,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: cell.posX,
      startPosY: cell.posY,
      extraW,
      extraH,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveCell(cellIndex);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragPanRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const newPosX = d.extraW > 0.5 ? clamp(d.startPosX - dx / d.extraW, 0, 1) : 0.5;
      const newPosY = d.extraH > 0.5 ? clamp(d.startPosY - dy / d.extraH, 0, 1) : 0.5;

      setCells((prev) => {
        const next = [...prev];
        if (!next[d.cellIndex]) return prev;
        next[d.cellIndex] = { ...next[d.cellIndex], posX: newPosX, posY: newPosY };
        return next;
      });
      clearResult();
    };
    const onUp = () => {
      dragPanRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // ---------------- EXPORT ----------------
  const exportCollage = async () => {
    if (images.length === 0) {
      setError("Add at least one image first.");
      return;
    }

    setError(null);
    clearResult();
    setStage("rendering");

    try {
      const aspect = ASPECTS.find((a) => a.key === aspectKey)?.value ?? 1;
      const longSide = RESOLUTIONS.find((r) => r.key === resolution)?.longSide ?? 2200;

      let cw: number, ch: number;
      if (aspect >= 1) {
        cw = longSide;
        ch = Math.round(longSide / aspect);
      } else {
        ch = longSide;
        cw = Math.round(longSide * aspect);
      }

      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      // Background
      if (format === "jpg" || bgColor !== "transparent") {
        ctx.fillStyle = bgColor === "transparent" ? "#ffffff" : bgColor;
        ctx.fillRect(0, 0, cw, ch);
      }

      // Preload images
      const imgMap = new Map<string, HTMLImageElement>();
      await Promise.all(
        images.map(async (i) => {
          const im = await loadImage(i.url);
          imgMap.set(i.id, im);
        })
      );

      // Inner content area after padding
      const contentX = padding;
      const contentY = padding;
      const contentW = cw - padding * 2;
      const contentH = ch - padding * 2;
      const halfGap = gap / 2;

      for (let i = 0; i < template.cells.length; i++) {
        const rect = template.cells[i];
        const cell = cells[i];
        if (!cell || !cell.imageId) continue;
        const img = imgMap.get(cell.imageId);
        if (!img) continue;

        // Cell rect in px, with gap inset
        const cx = contentX + rect.x * contentW + halfGap;
        const cy = contentY + rect.y * contentH + halfGap;
        const cwCell = Math.max(1, rect.w * contentW - gap);
        const chCell = Math.max(1, rect.h * contentH - gap);

        const radius = Math.min(borderRadius, cwCell / 2, chCell / 2);

        ctx.save();
        // Clip rounded rect
        ctx.beginPath();
        const r = Math.max(0, radius);
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + cwCell - r, cy);
        ctx.quadraticCurveTo(cx + cwCell, cy, cx + cwCell, cy + r);
        ctx.lineTo(cx + cwCell, cy + chCell - r);
        ctx.quadraticCurveTo(cx + cwCell, cy + chCell, cx + cwCell - r, cy + chCell);
        ctx.lineTo(cx + r, cy + chCell);
        ctx.quadraticCurveTo(cx, cy + chCell, cx, cy + chCell - r);
        ctx.lineTo(cx, cy + r);
        ctx.quadraticCurveTo(cx, cy, cx + r, cy);
        ctx.closePath();
        ctx.clip();

        // Contain: fit with letterbox; Cover: fill with pan
        if (fit === "contain") {
          const s = Math.min(cwCell / img.naturalWidth, chCell / img.naturalHeight);
          const dw = img.naturalWidth * s;
          const dh = img.naturalHeight * s;
          const dx = cx + (cwCell - dw) / 2;
          const dy = cy + (chCell - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
        } else {
          const s = Math.max(cwCell / img.naturalWidth, chCell / img.naturalHeight);
          const srcW = cwCell / s;
          const srcH = chCell / s;
          const sx = (img.naturalWidth - srcW) * cell.posX;
          const sy = (img.naturalHeight - srcH) * cell.posY;
          ctx.drawImage(img, sx, sy, srcW, srcH, cx, cy, cwCell, chCell);
        }

        ctx.restore();
      }

      const mime =
        format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, mime, format === "png" ? undefined : quality / 100)
      );
      if (!blob) throw new Error("Couldn't encode the collage.");

      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        size: blob.size,
        name: `collage_${templateId}_${aspectKey.replace(":", "x")}.${format}`,
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

  const busy = stage === "rendering";
  const aspectValue = ASPECTS.find((a) => a.key === aspectKey)?.value ?? 1;

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
          <span className="text-black/70">Collage Maker</span>
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
                7 templates · Drag to pan · Client-side
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Many photos in.
              <br />
              <span className="italic text-[#ff6a00]">One collage</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Pick a layout, drop your photos into cells, and drag to fine-tune each
              crop — just like a design tool, but nothing to install. Perfect for
              scrapbooks, mood boards, portfolios, and social carousels. All{" "}
              <strong className="text-black/80 font-medium">in your browser</strong>.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Instant" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* ===================== TIP NOTE ===================== */}
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
            <strong className="text-black font-medium">Drag inside a cell to reposition.</strong>{" "}
            Click a cell to make it active, then click an image from the tray to fill it.
            Once placed, drag on the cell to pan the photo — this is how you fix crops
            without cutting anything off.
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
              How this tool works
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExplainerCard
              n="01"
              icon={<Plus size={18} />}
              title="Add your photos"
              desc="Drop up to 20 images. They auto-fill empty cells in order — rearrange anytime."
            />
            <ExplainerCard
              n="02"
              icon={<LayoutTemplate size={18} />}
              title="Pick a template & refine"
              desc="7 layouts from 2×2 to mosaic. Tune padding, gap, corners, background, and pan each cell."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the collage"
              desc="One merged image at standard, high, or ultra resolution — PNG, JPG, or WebP."
            />
          </div>
        </motion.section>

        {/* ===================== WORKSPACE ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ---------- LEFT: Canvas + tray ---------- */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-7 space-y-6">

            {/* Collage preview */}
            <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                    Collage · {template.name} · {aspectKey}
                  </span>
                </div>
                <div className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-black/35">
                  {cells.filter((c) => c.imageId).length}/{template.cells.length} filled
                </div>
              </div>

              {/* Preview canvas */}
              <div
                className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-4 flex items-center justify-center p-4"
              >
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
                  ref={previewContainerRef}
                  className="relative z-10 w-full max-w-[560px] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                  style={{
                    aspectRatio: `${aspectValue}`,
                    background: bgColor === "transparent" ? "transparent" : bgColor,
                    padding: `${padding * (560 / 1200)}px`,
                    borderRadius: 2,
                  }}
                >
                  {template.cells.map((rect, i) => {
                    const cell = cells[i];
                    const img = cell?.imageId ? images.find((im) => im.id === cell.imageId) : null;
                    const isActive = activeCell === i;
                    return (
                      <div
                        key={i}
                        onClick={() => setActiveCell(i)}
                        className="absolute transition-shadow"
                        style={{
                          left: `calc(${rect.x * 100}% + ${(gap / 2) * (560 / 1200)}px)`,
                          top: `calc(${rect.y * 100}% + ${(gap / 2) * (560 / 1200)}px)`,
                          width: `calc(${rect.w * 100}% - ${gap * (560 / 1200)}px)`,
                          height: `calc(${rect.h * 100}% - ${gap * (560 / 1200)}px)`,
                          borderRadius: borderRadius * (560 / 1200),
                          overflow: "hidden",
                          background: img ? "#e5e0d5" : "rgba(0,0,0,0.04)",
                          boxShadow: isActive
                            ? "inset 0 0 0 2px #ff6a00"
                            : img
                            ? "inset 0 0 0 1px rgba(0,0,0,0.06)"
                            : "inset 0 0 0 1.5px rgba(0,0,0,0.12)",
                          cursor: img ? "grab" : "pointer",
                          touchAction: "none",
                        }}
                      >
                        {img ? (
                          <>
                            <img
                              src={img.url}
                              alt={img.name}
                              draggable={false}
                              onPointerDown={startPan(i)}
                              className="absolute inset-0 w-full h-full select-none"
                              style={{
                                objectFit: fit,
                                objectPosition: `${cell!.posX * 100}% ${cell!.posY * 100}%`,
                              }}
                            />
                            {/* Clear button */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                clearCell(i);
                              }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                              aria-label="Clear cell"
                            >
                              <X size={11} />
                            </motion.button>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-black/40">
                            <Plus size={16} />
                            <span className="text-[9.5px] font-mono uppercase tracking-[0.14em]">
                              Empty
                            </span>
                          </div>
                        )}
                        {/* Cell index badge */}
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur-sm text-white text-[9px] font-mono">
                          {i + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ scale: busy ? 1 : 1.03 }}
                  whileTap={{ scale: busy ? 1 : 0.97 }}
                  onClick={exportCollage}
                  disabled={busy || images.length === 0}
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Rendering…
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Export collage
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
            </div>

            {/* Image tray */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
              onDragLeave={() => setDropActive(false)}
              onDrop={onDropFiles}
              className={`rounded-[22px] bg-white border p-6 md:p-7 transition-colors ${
                dropActive ? "border-[#ff6a00] bg-[#ff6a00]/[0.03]" : "border-black/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                    Image tray · {images.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.label
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-[12px] font-medium text-black/70 hover:border-black/40 hover:text-black transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    Add
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) addFiles(files);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                    />
                  </motion.label>
                  {images.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        images.forEach((i) => {
                          URL.revokeObjectURL(i.url);
                          imageUrlsRef.current = imageUrlsRef.current.filter((u) => u !== i.url);
                        });
                        setImages([]);
                        setCells((prev) => prev.map(() => ({ imageId: null, posX: 0.5, posY: 0.5 })));
                        clearResult();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-[12px] font-medium text-black/70 hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                      Clear
                    </motion.button>
                  )}
                </div>
              </div>

              {images.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-3">
                    <ImageIcon size={20} className="text-black/50" />
                  </div>
                  <p className="text-[13px] text-black/55 max-w-[340px] mx-auto leading-relaxed">
                    Drop images here or click <strong className="text-black">Add</strong>.
                    Up to {MAX_IMAGES} images, {MAX_SIZE_MB} MB each.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {images.map((img) => {
                    const usedInCell = cells.findIndex((c) => c.imageId === img.id);
                    const isUsed = usedInCell !== -1;
                    return (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -2 }}
                        className="relative group"
                      >
                        <button
                          onClick={() => assignToActiveCell(img.id)}
                          className={`relative aspect-square w-full rounded-xl overflow-hidden border-2 transition-colors ${
                            isUsed
                              ? "border-[#ff6a00]/50"
                              : "border-transparent hover:border-black/30"
                          }`}
                          title={`Click to place in cell ${activeCell + 1}`}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                          {isUsed && (
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#ff6a00] text-white text-[9px] font-mono leading-none">
                              {usedInCell + 1}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Plus
                              size={16}
                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </div>
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-black/15 shadow-sm opacity-0 group-hover:opacity-100 flex items-center justify-center text-black/60 hover:text-red-500 hover:border-red-400 transition-all"
                          aria-label="Remove image"
                        >
                          <X size={10} />
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {images.length > 0 && (
                <p className="mt-4 text-[11.5px] text-black/45 leading-relaxed">
                  Click an image to place it in cell <strong className="text-black">{activeCell + 1}</strong>.
                  Drag the image inside a cell to reposition the crop.
                </p>
              )}
            </div>
          </motion.div>

          {/* ---------- RIGHT: Settings ---------- */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="lg:col-span-5 space-y-6">

            {/* Templates */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Layout template
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map((t) => (
                  <TemplateButton
                    key={t.id}
                    active={templateId === t.id}
                    onClick={() => setTemplateId(t.id)}
                    icon={t.icon}
                    name={t.name}
                    cellCount={t.cells.length}
                  />
                ))}
              </div>
            </motion.div>

            {/* Canvas style */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Canvas & style
                </span>
              </div>

              {/* Aspect */}
              <div className="mb-6">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Aspect ratio
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {ASPECTS.map((a) => (
                    <motion.button
                      key={a.key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setAspectKey(a.key); clearResult(); }}
                      className={`py-2 rounded-lg text-[10px] font-mono border transition-colors flex flex-col items-center gap-0.5 ${
                        aspectKey === a.key
                          ? "bg-black text-white border-black"
                          : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
                      }`}
                    >
                      {a.icon}
                      {a.key}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Padding */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Outer padding
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{padding} px</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={120}
                  value={padding}
                  onChange={(e) => { setPadding(Number(e.target.value)); clearResult(); }}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              {/* Gap */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Gap between cells
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{gap} px</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={gap}
                  onChange={(e) => { setGap(Number(e.target.value)); clearResult(); }}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              {/* Radius */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Corner radius
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{borderRadius} px</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={borderRadius}
                  onChange={(e) => { setBorderRadius(Number(e.target.value)); clearResult(); }}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              {/* Fit */}
              <div className="mb-6">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Image fit
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FitButton
                    active={fit === "cover"}
                    onClick={() => { setFit("cover"); clearResult(); }}
                    title="Cover"
                    sub="Fill & pan"
                  />
                  <FitButton
                    active={fit === "contain"}
                    onClick={() => { setFit("contain"); clearResult(); }}
                    title="Contain"
                    sub="Letterbox"
                  />
                </div>
              </div>

              {/* Background */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Background
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative w-9 h-9 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                    <input
                      type="color"
                      value={bgColor === "transparent" ? "#ffffff" : bgColor}
                      onChange={(e) => { setBgColor(e.target.value); clearResult(); }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          bgColor === "transparent"
                            ? "repeating-conic-gradient(#e5e0d5 0% 25%, #ffffff 0% 50%) 50% / 12px 12px"
                            : bgColor,
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => { setBgColor(e.target.value); clearResult(); }}
                    className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                  />
                  {format !== "jpg" && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setBgColor("transparent"); clearResult(); }}
                      className={`px-3 py-2 rounded-xl text-[11.5px] font-medium border transition-colors shrink-0 ${
                        bgColor === "transparent"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
                      }`}
                    >
                      None
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Export */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Export
                </span>
              </div>

              {/* Resolution */}
              <div className="mb-6">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Resolution
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {RESOLUTIONS.map((r) => (
                    <motion.button
                      key={r.key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setResolution(r.key); clearResult(); }}
                      className={`py-2.5 rounded-xl text-center border transition-colors ${
                        resolution === r.key
                          ? "bg-black text-white border-black"
                          : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
                      }`}
                    >
                      <div className="text-[12px] font-medium">{r.label}</div>
                      <div className={`text-[9.5px] mt-0.5 ${resolution === r.key ? "text-white/50" : "text-black/40"}`}>
                        {r.longSide}px
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="mb-6">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Format
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FormatButton active={format === "png"} onClick={() => { setFormat("png"); clearResult(); }} title="PNG" subtitle="Lossless" />
                  <FormatButton active={format === "jpg"} onClick={() => { setFormat("jpg"); clearResult(); }} title="JPG" subtitle="Small" />
                  <FormatButton active={format === "webp"} onClick={() => { setFormat("webp"); clearResult(); }} title="WebP" subtitle="Modern" />
                </div>
              </div>

              {format !== "png" && (
                <div>
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
                        Collage ready
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
                      Download collage
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
                <FeatureRow><strong className="text-black">7 layout templates</strong> — 2×2, 3×3, Hero, Strip, Mosaic, Duo, Polaroid.</FeatureRow>
                <FeatureRow><strong className="text-black">Drag to pan</strong> each image inside its cell — no need to crop first.</FeatureRow>
                <FeatureRow><strong className="text-black">6 aspect ratios</strong> — square for Instagram, 16:9 for YouTube, 9:16 for Reels.</FeatureRow>
                <FeatureRow><strong className="text-black">Fine-grained style</strong> — padding, gap, corner radius, background.</FeatureRow>
                <FeatureRow><strong className="text-black">3 output sizes</strong> — Standard, High, and Ultra up to 3200px.</FeatureRow>
              </ul>
            </motion.div>

            {/* Privacy */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Your photos never leave your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Loading, panning, layout, and export all run inside your browser via the
                HTML5 Canvas API. Open DevTools → Network — zero requests for your image files.
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
            How does the drag-to-pan trick actually work?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12">
            Same math as CSS <code className="font-mono text-[13px] bg-black/[0.05] px-1.5 py-0.5 rounded">object-position</code>,
            mirrored on the canvas. Here's the flow.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <DeepDiveCard
              n="01"
              icon={<Cpu size={18} />}
              title="Cells as normalized rects"
              body="Each template is just an array of rectangles in 0..1 space. Position and size are percentages of the content area, so any aspect ratio or resolution scales cleanly — no per-pixel math."
            />
            <DeepDiveCard
              n="02"
              icon={<Move size={18} />}
              title="Cover + object-position"
              body="For cover fit, the image is scaled so it fully fills the cell. The extra (overflow) is what you pan through. posX/posY, 0..1, controls which part of the overflow is visible — a percentage offset from the left/top."
            />
            <DeepDiveCard
              n="03"
              icon={<FileCheck2 size={18} />}
              title="Same formula on canvas"
              body="At export we compute sx = (imgW - cellW/scale) * posX and draw a matching source rectangle. Preview and export agree pixel-for-pixel because they use identical math."
            />
          </div>

          <motion.div variants={fadeUp} className="mt-10 p-6 rounded-[20px] bg-white border border-black/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                <Info size={16} className="text-[#ff6a00]" />
              </div>
              <div className="text-[13px] leading-relaxed text-black/65">
                <strong className="text-black">Why "cover" is the default:</strong> collage cells
                come in all shapes — vertical, wide, square. "Cover" guarantees every cell
                looks fully filled, which is what makes a collage look tight. Use "contain" only
                for polaroid-style layouts or when cutting off any part of the image is not
                acceptable.
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
            Make a collage when…
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCaseCard icon={<Grid2x2 size={18} />} title="Instagram carousels" desc="Build a 2×2 or 3×3 grid that reads as one image when scrolled, or as a carousel of adjacent tiles." />
            <UseCaseCard icon={<Camera size={18} />} title="Travel & scrapbook pages" desc="Combine several shots from the same day into one clean, print-ready page — no scrapbooking software needed." />
            <UseCaseCard icon={<Palette size={18} />} title="Mood boards & references" desc="Arrange 6–9 images into a mosaic for design inspiration, brand boards, or creative pitches." />
            <UseCaseCard icon={<Layers size={18} />} title="Portfolio thumbnails" desc="Show 3–4 projects side by side in one image — great for a portfolio landing page or a Behance cover." />
            <UseCaseCard icon={<Maximize2 size={18} />} title="Real-estate & product listings" desc="Combine hero, detail, and lifestyle shots into a single hero image for listings and marketplaces." />
            <UseCaseCard icon={<RectangleHorizontal size={18} />} title="OG / social previews" desc="Compose a landscape OG image from a logo, a hero photo, and a small accent — one file for the whole thing." />
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
    q: "How do I put an image into a specific cell?",
    a: "Click the cell in the preview (it lights up orange), then click the image in the tray below. It drops into that cell. You can also click an image first — it goes to the currently active cell, then auto-advances to the next empty one.",
  },
  {
    q: "Why does my image look cropped inside a cell?",
    a: "Because the default fit is 'Cover' — it fills the cell fully and hides the overflow. This is what makes collages look tight. To fix a specific crop, click the cell and drag inside it — you're panning through the hidden overflow. If you want the whole image visible with letterboxing, switch to 'Contain'.",
  },
  {
    q: "How do I remove an image from a cell but keep it in the tray?",
    a: "Click the small × button at the top-right of the cell. The image stays in the tray so you can re-place it elsewhere. To delete an image entirely, hover its thumbnail in the tray and click the × that appears — this removes it from all cells too.",
  },
  {
    q: "What's the difference between the templates?",
    a: "2×2 and 3×3 are even grids. Hero has one large panel + three small stacked ones — great for a lead photo. Strip is 4 equal columns for a sequence. Mosaic mixes sizes for a magazine feel. Duo is 2 stacked (perfect for before/after). Polaroid places a single image with a border-like margin inside a larger canvas.",
  },
  {
    q: "Why is my collage smaller than expected?",
    a: "The preview is a scaled-down view of the layout — it's not the output resolution. The actual file is rendered at the chosen resolution (Standard = 1400px, High = 2200px, Ultra = 3200px on the long side). The visible collage in the preview is capped at 560px just for responsiveness.",
  },
  {
    q: "Can I use transparent backgrounds?",
    a: "Yes, with PNG or WebP. Choose 'None' as the background — the outer padding and cell gaps become transparent. JPG can't store alpha, so it always forces a solid background (white if you picked 'None' with JPG).",
  },
  {
    q: "Does panning or cropping reduce quality?",
    a: "No, when exporting as PNG. The pan is just selecting which pixels to draw — every visible pixel is copied verbatim. JPG and WebP re-encode with their own compression, but at quality 92% it's visually indistinguishable for most content.",
  },
  {
    q: "Are my photos uploaded anywhere?",
    a: "No. Adding, panning, layout, and export all run inside your browser using the HTML5 Canvas API. Open DevTools → Network and you'll see zero requests for your image files.",
  },
];

// ============================================================
// SUB COMPONENTS
// ============================================================
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

function TemplateButton({
  active, onClick, icon, name, cellCount,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; name: string; cellCount: number }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`p-2 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
        active ? "bg-black text-white border-black" : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
      }`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? "bg-white/10" : "bg-black/[0.05]"}`}>
        {icon}
      </span>
      <div className="text-[10px] font-medium">{name}</div>
      <div className={`text-[9px] font-mono ${active ? "text-white/45" : "text-black/35"}`}>{cellCount}</div>
    </motion.button>
  );
}

function FitButton({
  active, onClick, title, sub,
}: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 rounded-xl border transition-colors text-center ${
        active ? "bg-black text-white border-black" : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
      }`}
    >
      <div className="text-[12.5px] font-medium">{title}</div>
      <div className={`text-[10px] ${active ? "text-white/50" : "text-black/40"}`}>{sub}</div>
    </motion.button>
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