"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  ArrowUpRight,
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
  Plus,
  Trash2,
  Grid3x3,
  Rows3,
  Columns3,
  LayoutGrid,
  MoveVertical,
  Image as ImageIcon,
  GripVertical,
  X,
  Hash,
  Maximize2,
  AlignCenter,
  Crop,
  Ratio,
  Download,
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

type Result = {
  url: string;
  size: number;
  name: string;
  width: number;
  height: number;
};

type Stage = "idle" | "rendering" | "done";
type Layout = "horizontal" | "vertical" | "grid";
type Fit = "contain" | "cover";
type Format = "png" | "jpg" | "webp";

const MAX_SIZE_MB = 30;
const MAX_IMAGES = 20;

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
  if (
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/png" ||
    t === "image/webp"
  )
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

const uid = () => Math.random().toString(36).slice(2, 10);

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
export const CombineImages = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [layout, setLayout] = useState<Layout>("horizontal");
  const [targetSize, setTargetSize] = useState(800);
  const [gridCols, setGridCols] = useState(3);
  const [fit, setFit] = useState<Fit>("contain");
  const [gap, setGap] = useState(16);
  const [padding, setPadding] = useState(24);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [format, setFormat] = useState<Format>("png");
  const [quality, setQuality] = useState(92);

  const [result, setResult] = useState<Result | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultUrlRef = useRef<string | null>(null);
  const imageUrlsRef = useRef<string[]>([]);

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
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  // ---------------- ADD FILES ----------------
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

    if (valid.length > 0) {
      setImages((prev) => [...prev, ...valid]);
    }
  }, [images.length]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
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
    clearResult();
  };

  // ---------------- LAYOUT MATH ----------------
  const computedDims = useMemo(() => {
    if (images.length === 0) return { w: 0, h: 0 };
    const pad = padding;
    const g = gap;

    if (layout === "horizontal") {
      const H = targetSize;
      let x = pad;
      for (const img of images) {
        const scale = H / img.height;
        const w = Math.round(img.width * scale);
        x += w + g;
      }
      return { w: x - g + pad, h: H + pad * 2 };
    }

    if (layout === "vertical") {
      const W = targetSize;
      let y = pad;
      for (const img of images) {
        const scale = W / img.width;
        const h = Math.round(img.height * scale);
        y += h + g;
      }
      return { w: W + pad * 2, h: y - g + pad };
    }

    // grid
    const cols = Math.max(1, Math.min(gridCols, images.length));
    const rows = Math.ceil(images.length / cols);
    const cell = targetSize;
    const w = pad * 2 + cols * cell + (cols - 1) * g;
    const h = pad * 2 + rows * cell + (rows - 1) * g;
    return { w, h };
  }, [images, layout, targetSize, gridCols, gap, padding]);

  // ---------------- RENDER ----------------
  const combine = async () => {
    if (images.length === 0) {
      setError("Add at least one image first.");
      return;
    }
    if (images.length === 1 && layout !== "grid") {
      setError("Add more images, or use a single-image export from another tool.");
      return;
    }

    setError(null);
    clearResult();
    setStage("rendering");

    try {
      const { w: canvasW, h: canvasH } = computedDims;

      // Guard against runaway canvas sizes
      if (canvasW > 16000 || canvasH > 16000) {
        throw new Error(
          `Output would be ${canvasW}×${canvasH}px, which exceeds browser canvas limits (16000px). Try a smaller target size or fewer images.`
        );
      }

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      // Background
      if (format === "jpg") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasW, canvasH);
      } else if (bgColor !== "transparent") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasW, canvasH);
      }

      // Preload all images (they're already in memory from add, but be safe)
      const imgs = await Promise.all(images.map((i) => loadImage(i.url)));

      const pad = padding;
      const g = gap;

      if (layout === "horizontal") {
        const H = targetSize;
        let x = pad;
        for (const img of imgs) {
          const scale = H / img.naturalHeight;
          const w = Math.round(img.naturalWidth * scale);
          ctx.drawImage(img, x, pad, w, H);
          x += w + g;
        }
      } else if (layout === "vertical") {
        const W = targetSize;
        let y = pad;
        for (const img of imgs) {
          const scale = W / img.naturalWidth;
          const h = Math.round(img.naturalHeight * scale);
          ctx.drawImage(img, pad, y, W, h);
          y += h + g;
        }
      } else {
        // grid
        const cols = Math.max(1, Math.min(gridCols, imgs.length));
        const cell = targetSize;
        for (let i = 0; i < imgs.length; i++) {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const x = pad + c * (cell + g);
          const y = pad + r * (cell + g);
          const img = imgs[i];

          if (fit === "contain") {
            const scale = Math.min(cell / img.naturalWidth, cell / img.naturalHeight);
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;
            const dx = x + (cell - w) / 2;
            const dy = y + (cell - h) / 2;
            ctx.drawImage(img, dx, dy, w, h);
          } else {
            // cover
            const scale = Math.max(cell / img.naturalWidth, cell / img.naturalHeight);
            const sw = cell / scale;
            const sh = cell / scale;
            const sx = (img.naturalWidth - sw) / 2;
            const sy = (img.naturalHeight - sh) / 2;
            ctx.drawImage(img, sx, sy, sw, sh, x, y, cell, cell);
          }
        }
      }

      const mime =
        format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, mime, format === "png" ? undefined : quality / 100)
      );
      if (!blob) throw new Error("Couldn't encode the combined image.");

      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      const base = images.length === 1 ? stripExt(images[0].name) : "combined";
      setResult({
        url,
        size: blob.size,
        name: `${base}_${layout}.${format}`,
        width: canvasW,
        height: canvasH,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStage("idle");
    }
  };

  const busy = stage === "rendering";

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
          <span className="text-black/70">Combine Images</span>
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
                Up to 20 images · Reorderable · 3 layouts
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Many images in.
              <br />
              <span className="italic text-[#ff6a00]">One canvas</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Stack images horizontally, vertically, or in a grid — with full control over
              spacing, background, and fit. Perfect for before/after shots, comics,
              photo strips, mood boards, and comparison charts. All <strong className="text-black/80 font-medium">in
              your browser</strong>.
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
            <strong className="text-black font-medium">Reorder by dragging.</strong>{" "}
            Grab any thumbnail in the list and drag it up or down to change its position in the
            final layout. Order matters — the first image is leftmost (horizontal), topmost
            (vertical), or top-left (grid).
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
              title="Add your images"
              desc="Drop one or many at once. Rearrange them in the list — order determines layout position."
            />
            <ExplainerCard
              n="02"
              icon={<LayoutGrid size={18} />}
              title="Pick a layout"
              desc="Horizontal strip, vertical stack, or a grid. Tune gap, padding, background, and fit as you go."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the composite"
              desc="One merged image at full resolution — PNG, JPG, or WebP. No watermark, no upload."
            />
          </div>
        </motion.section>

        {/* ===================== WORKSPACE ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ---------- LEFT: Image list / dropzone ---------- */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-7">
            <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-8">

              {/* Empty state */}
              {images.length === 0 && (
                <motion.label
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[420px] px-6 ${
                    dragging
                      ? "border-[#ff6a00] bg-[#ff6a00]/[0.04] scale-[1.01]"
                      : "border-black/[0.12] hover:border-black/30 hover:bg-black/[0.015]"
                  }`}
                >
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
                    <Layers size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                  </motion.div>

                  <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                    {dragging ? "Drop your images here" : "Drop images to combine"}
                  </h3>
                  <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                    or click to browse. Accepts multiple .jpg, .png, and .webp files — up to{" "}
                    {MAX_IMAGES} images, {MAX_SIZE_MB} MB each.
                  </p>

                  <motion.span
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[12.5px] font-medium"
                  >
                    Choose images
                    <ArrowUpRight size={13} />
                  </motion.span>
                </motion.label>
              )}

              {/* Image list */}
              {images.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  {/* Toolbar */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                        {images.length} image{images.length === 1 ? "" : "s"} · drag to reorder
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.label
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-[12px] font-medium text-black/70 hover:border-black/40 hover:text-black transition-colors cursor-pointer"
                      >
                        <Plus size={12} />
                        Add more
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length) addFiles(files);
                            if (e.currentTarget) e.currentTarget.value = "";
                          }}
                        />
                      </motion.label>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={reset}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/15 text-[12px] font-medium text-black/70 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                        Clear all
                      </motion.button>
                    </div>
                  </div>

                  {/* Reorderable list */}
                  <Reorder.Group
                    axis="y"
                    values={images}
                    onReorder={(v) => { setImages(v); clearResult(); }}
                    className="space-y-2 max-h-[560px] overflow-y-auto pr-1"
                  >
                    {images.map((img, idx) => (
                      <Reorder.Item
                        key={img.id}
                        value={img}
                        className="group"
                        whileDrag={{
                          scale: 1.02,
                          boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
                          zIndex: 50,
                        }}
                      >
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-black/[0.08] hover:border-black/20 transition-colors cursor-grab active:cursor-grabbing">
                          {/* Drag handle */}
                          <div className="shrink-0 text-black/25 group-hover:text-black/50 transition-colors">
                            <GripVertical size={16} />
                          </div>

                          {/* Index badge */}
                          <div className="w-7 h-7 rounded-lg bg-[#f4f1ea] flex items-center justify-center shrink-0 text-[11px] font-mono text-black/60">
                            {idx + 1}
                          </div>

                          {/* Thumbnail */}
                          <div className="w-14 h-14 rounded-lg bg-[#f4f1ea] overflow-hidden shrink-0 border border-black/[0.06]">
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>

                          {/* Meta */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-black truncate">
                              {img.name}
                            </div>
                            <div className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-black/40 mt-0.5">
                              {img.width} × {img.height} · {formatBytes(img.size)}
                            </div>
                          </div>

                          {/* Remove */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(img.id);
                            }}
                            className="w-8 h-8 rounded-full hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-black/40 shrink-0"
                            aria-label="Remove image"
                          >
                            <X size={14} />
                          </motion.button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  {/* Output preview info */}
                  <div className="mt-5 pt-5 border-t border-black/[0.06] flex items-start gap-3 text-[11.5px] leading-relaxed text-black/55">
                    <Hash size={13} className="text-[#ff6a00] shrink-0 mt-0.5" />
                    <span>
                      Output canvas will be{" "}
                      <strong className="text-black font-medium">
                        {computedDims.w} × {computedDims.h} px
                      </strong>{" "}
                      ({images.length} image{images.length === 1 ? "" : "s"}, {layout} layout).
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Errors */}
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
          </motion.div>

          {/* ---------- RIGHT: Layout + Settings + Result ---------- */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="lg:col-span-5 space-y-6">

            {/* Layout picker */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Layout
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <LayoutButton
                  active={layout === "horizontal"}
                  onClick={() => { setLayout("horizontal"); clearResult(); }}
                  icon={<Columns3 size={16} />}
                  label="Row"
                  sub="Side by side"
                />
                <LayoutButton
                  active={layout === "vertical"}
                  onClick={() => { setLayout("vertical"); clearResult(); }}
                  icon={<Rows3 size={16} />}
                  label="Stack"
                  sub="Top to bottom"
                />
                <LayoutButton
                  active={layout === "grid"}
                  onClick={() => { setLayout("grid"); clearResult(); }}
                  icon={<Grid3x3 size={16} />}
                  label="Grid"
                  sub="Rows & cols"
                />
              </div>

              {/* Target size — horizontal/vertical */}
              {layout !== "grid" && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                      {layout === "horizontal" ? "Row height" : "Column width"}
                    </div>
                    <div className="text-[11px] font-mono text-black/60">{targetSize} px</div>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={2000}
                    step={50}
                    value={targetSize}
                    onChange={(e) => { setTargetSize(Number(e.target.value)); clearResult(); }}
                    className="w-full accent-[#ff6a00]"
                  />
                  <p className="mt-2 text-[11.5px] text-black/40 leading-relaxed">
                    {layout === "horizontal"
                      ? "Every image is scaled to this height. Widths vary by aspect ratio."
                      : "Every image is scaled to this width. Heights vary by aspect ratio."}
                  </p>
                </div>
              )}

              {/* Grid settings */}
              {layout === "grid" && (
                <>
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Columns
                      </div>
                      <div className="text-[11px] font-mono text-black/60">
                        {Math.min(gridCols, images.length || gridCols)} ×{" "}
                        {Math.ceil((images.length || 1) / Math.min(gridCols, images.length || gridCols))}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, Math.min(6, images.length || 6))}
                      value={gridCols}
                      onChange={(e) => { setGridCols(Number(e.target.value)); clearResult(); }}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Cell size
                      </div>
                      <div className="text-[11px] font-mono text-black/60">{targetSize} px</div>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={1000}
                      step={25}
                      value={targetSize}
                      onChange={(e) => { setTargetSize(Number(e.target.value)); clearResult(); }}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  <div className="mt-6">
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Fit inside cell
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FitButton
                        active={fit === "contain"}
                        onClick={() => { setFit("contain"); clearResult(); }}
                        icon={<AlignCenter size={14} />}
                        title="Contain"
                        sub="Letterbox"
                      />
                      <FitButton
                        active={fit === "cover"}
                        onClick={() => { setFit("cover"); clearResult(); }}
                        icon={<Crop size={14} />}
                        title="Cover"
                        sub="Fill & crop"
                      />
                    </div>
                  </div>
                </>
              )}
            </motion.div>

            {/* Spacing + background */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Spacing & background
                </span>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Gap between images
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{gap} px</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={gap}
                  onChange={(e) => { setGap(Number(e.target.value)); clearResult(); }}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

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

              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Background color
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
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
                            ? "repeating-conic-gradient(#e5e0d5 0% 25%, #ffffff 0% 50%) 50% / 16px 16px"
                            : bgColor,
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => { setBgColor(e.target.value); clearResult(); }}
                    className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                    placeholder="#ffffff"
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
                <p className="mt-2 text-[11.5px] text-black/40 leading-relaxed">
                  {format === "jpg"
                    ? "JPG has no transparency — a solid color is required."
                    : "Use 'None' for a transparent background (PNG/WebP only)."}
                </p>
              </div>
            </motion.div>

            {/* Format + export */}
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
                <div className="mb-6">
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

              <motion.button
                whileHover={{ scale: busy ? 1 : 1.02 }}
                whileTap={{ scale: busy ? 1 : 0.97 }}
                onClick={combine}
                disabled={busy || images.length === 0}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Rendering…
                  </>
                ) : (
                  <>
                    <Layers size={15} />
                    Combine {images.length > 0 ? `${images.length} images` : "images"}
                  </>
                )}
              </motion.button>
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
                        Composite ready
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
                      {result.width} × {result.height} px · {formatBytes(result.size)} · {layout}
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
                      Download composite
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
                <FeatureRow><strong className="text-black">3 layouts</strong> — horizontal row, vertical stack, or grid.</FeatureRow>
                <FeatureRow><strong className="text-black">Drag to reorder</strong> — position in the final image is just a drag away.</FeatureRow>
                <FeatureRow><strong className="text-black">Fine-grained control</strong> — gap, padding, background color, and cell fit.</FeatureRow>
                <FeatureRow><strong className="text-black">Contain or cover</strong> for grid cells — letterbox or fill and crop.</FeatureRow>
                <FeatureRow><strong className="text-black">Up to 20 images</strong> at {MAX_SIZE_MB} MB each, all processed locally.</FeatureRow>
              </ul>
            </motion.div>

            {/* Privacy */}
            <motion.div variants={fadeUp} className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Your images never leave your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Loading, scaling, layout, and encoding all run locally via the HTML5 Canvas API.
                Open DevTools → Network — you'll see zero requests for your images.
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
            How does combining images actually work?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12">
            There's no AI, no compositing magic. Just one big canvas, a layout loop, and
            pixel-exact drawImage calls. Here's the flow.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <DeepDiveCard
              n="01"
              icon={<Cpu size={18} />}
              title="Measure the layout"
              body="Before drawing, we compute the final canvas dimensions. Horizontal = max image height × sum of scaled widths. Vertical = max image width × sum of scaled heights. Grid = uniform cells × rows × cols + gaps."
            />
            <DeepDiveCard
              n="02"
              icon={<MoveVertical size={18} />}
              title="Position each image"
              body="A running cursor (x for horizontal, y for vertical, or row/col for grid) places each image sequentially. The order in your list maps directly to layout order — first is left, top, or top-left."
            />
            <DeepDiveCard
              n="03"
              icon={<FileCheck2 size={18} />}
              title="Draw & encode"
              body="Each image is drawn into its slot with drawImage, the canvas is flattened, then exported via canvas.toBlob() as PNG, JPG, or WebP. One file, one download."
            />
          </div>

          <motion.div variants={fadeUp} className="mt-10 p-6 rounded-[20px] bg-white border border-black/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                <Info size={16} className="text-[#ff6a00]" />
              </div>
              <div className="text-[13px] leading-relaxed text-black/65">
                <strong className="text-black">Why images aren't upscaled:</strong> in row and
                stack layouts, images are scaled to a common dimension (height for rows, width for
                stacks). Images smaller than the target size get upscaled — this can look soft. For
                best results, upload images that are already similar in size.
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
            Combine images when…
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCaseCard icon={<Columns3 size={18} />} title="Before / after comparisons" desc="Place a 'before' and 'after' photo side-by-side in one image — cleaner than posting them separately." />
            <UseCaseCard icon={<LayoutGrid size={18} />} title="Mood boards & collages" desc="Arrange 4–9 images into a clean grid for design inspiration, Pinterest boards, or a portfolio thumbnail." />
            <UseCaseCard icon={<Rows3 size={18} />} title="Photo strips & comics" desc="Stack sequential panels vertically for a comic strip, film negative, or a comic-book style layout." />
            <UseCaseCard icon={<ImageIcon size={18} />} title="Product sheets & specs" desc="Combine hero + detail shots into one landscape strip for product listings, catalogs, or eBay posts." />
            <UseCaseCard icon={<Maximize2 size={18} />} title="Social preview images" desc="Build a composite OG image from a logo, hero image, and text card — all in one upload." />
            <UseCaseCard icon={<Ratio size={18} />} title="Grids for memory apps" desc="Combine multiple screenshots into a single clean grid for tutorials, docs, or app store previews." />
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
    q: "How do I change the order of images?",
    a: "Drag any thumbnail in the list up or down. Position 1 becomes the leftmost (row layout), topmost (stack layout), or top-left (grid layout). The order you see in the list is exactly the order in the output.",
  },
  {
    q: "What's the difference between 'Row' and 'Stack' layouts?",
    a: "'Row' places all images side-by-side in a single horizontal strip — every image is scaled to the same height, and widths vary by aspect ratio. 'Stack' does the opposite: all images share the same width and are arranged top-to-bottom, with heights varying by aspect ratio.",
  },
  {
    q: "Should I use 'Contain' or 'Cover' in grid mode?",
    a: "'Contain' fits the entire image inside each cell, adding background-colored space around it if needed (letterboxing). It's the safe choice — nothing gets cut off. 'Cover' fills the cell completely, cropping whatever doesn't fit — better for uniform, magazine-style grids where every cell looks full.",
  },
  {
    q: "Why can't I use a transparent background with JPG?",
    a: "JPG doesn't support alpha channels — it only stores fully opaque pixels. If you need a transparent background (for example, to add the composite to a design later), choose PNG or WebP instead.",
  },
  {
    q: "Can I combine images of different sizes?",
    a: "Yes. In row and stack layouts, every image is scaled to match the target dimension (height for rows, width for stacks) while preserving aspect ratio. In grid mode, each image is scaled to fit or cover its cell, again with aspect ratio preserved — nothing gets stretched.",
  },
  {
    q: "Is there a limit on output resolution?",
    a: "Browsers cap canvas dimensions around 16,000 pixels per side (varies by browser). The tool warns you if your settings would exceed that. For massive grids, lower the target size or split into multiple composites.",
  },
  {
    q: "Does combining reduce quality?",
    a: "Row and stack layouts use drawImage with the same scaling your browser already uses for display, so there's no visible loss. Grid 'cover' mode crops — a small amount of pixel loss is inherent to cropping. Encoding in PNG preserves quality perfectly; JPG/WebP add their own lossy compression.",
  },
  {
    q: "Are my images uploaded anywhere?",
    a: "No. Adding, loading, scaling, layout, and encoding all happen inside your browser using the HTML5 Canvas API. Open DevTools → Network — you'll see zero outgoing requests for your image files.",
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

function LayoutButton({
  active, onClick, icon, label, sub,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`p-3 rounded-xl border transition-colors flex flex-col items-center text-center ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
      }`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${active ? "bg-white/10" : "bg-black/[0.05]"}`}>
        {icon}
      </span>
      <div className="text-[12px] font-medium">{label}</div>
      <div className={`text-[10px] mt-0.5 ${active ? "text-white/50" : "text-black/40"}`}>{sub}</div>
    </motion.button>
  );
}

function FitButton({
  active, onClick, icon, title, sub,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 rounded-xl border transition-colors text-left ${
        active ? "bg-black text-white border-black" : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${active ? "bg-white/10" : "bg-black/[0.05]"}`}>
          {icon}
        </span>
        <span className="text-[12.5px] font-medium">{title}</span>
        {active && <Check size={12} className="ml-auto text-[#ff6a00]" />}
      </div>
      <div className={`text-[10.5px] ml-8 ${active ? "text-white/50" : "text-black/40"}`}>{sub}</div>
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