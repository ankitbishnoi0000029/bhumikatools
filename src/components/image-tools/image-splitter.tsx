"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageDown,
  X,
  Download,
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
  Palette,
  Cpu,
  Code2,
  FileCheck2,
  Maximize2,
  Minimize2,
  HelpCircle,
  ChevronDown,
  Grid3x3,
  Package,
  Scissors,
  Grid2x2,
  LayoutGrid,
  Image as ImageIcon,
  Hash,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Tile = {
  url: string;
  row: number;
  col: number;
  width: number;
  height: number;
  size: number;
  name: string;
};

type Result = {
  tiles: Tile[];
  zipUrl: string | null;
  zipSize: number;
  zipName: string;
  totalTiles: number;
};

type Stage = "idle" | "loading-lib" | "slicing" | "packaging" | "done";
type Format = "png" | "jpg";

const MAX_SIZE_MB = 50;
const MIN_DIM = 2;
const MAX_DIM = 10;

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
  const type = f.type.toLowerCase();
  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp"
  ) {
    return true;
  }
  return /\.(jpg|jpeg|png|webp)$/i.test(f.name);
};

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
export const ImageSplitter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);

  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [format, setFormat] = useState<Format>("png");
  const [gap, setGap] = useState(0);

  const [result, setResult] = useState<Result | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const tileUrlsRef = useRef<string[]>([]);
  const zipUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      tileUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    };
  }, []);

  const cleanupOutputs = () => {
    tileUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    tileUrlsRef.current = [];
    if (zipUrlRef.current) {
      URL.revokeObjectURL(zipUrlRef.current);
      zipUrlRef.current = null;
    }
  };

  const reset = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    cleanupOutputs();
    setFile(null);
    setPreviewUrl(null);
    setImageDims(null);
    setResult(null);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null);
    setResult(null);
    setStage("idle");
    cleanupOutputs();

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!isSupportedImage(f)) {
      setError("Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }

    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setFile(f);

    // Read natural dimensions
    const img = new Image();
    img.onload = () => setImageDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const split = async () => {
    if (!file || !previewUrl || !imageDims) return;
    setError(null);
    setResult(null);
    cleanupOutputs();
    setStage("loading-lib");

    try {
      // 1) Load JSZip lazily (only when user clicks Split)
      const JSZip = (await import("jszip")).default;

      // 2) Decode source image
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Couldn't read the image."));
        image.src = previewUrl;
      });

      setStage("slicing");

      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const tileW = Math.floor(srcW / cols);
      const tileH = Math.floor(srcH / rows);
      const baseName = stripExt(file.name);
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const ext = format;

      const zip = new JSZip();
      const folder = zip.folder(`${baseName}-tiles`)!;

      const tiles: Tile[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement("canvas");
          canvas.width = tileW;
          canvas.height = tileH;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas is not supported in this browser.");

          // White background for JPG (which has no alpha)
          if (format === "jpg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, tileW, tileH);
          }

          // Apply a small inner gap by shrinking the destination
          const drawW = Math.max(1, tileW - gap);
          const drawH = Math.max(1, tileH - gap);

          ctx.drawImage(
            img,
            c * tileW,
            r * tileH,
            tileW,
            tileH,
            0,
            0,
            drawW,
            drawH
          );

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, mime, format === "jpg" ? 0.92 : undefined)
          );
          if (!blob) throw new Error("Couldn't encode a tile.");

          const name = `${baseName}_r${r + 1}-c${c + 1}.${ext}`;
          folder.file(name, blob);

          const url = URL.createObjectURL(blob);
          tileUrlsRef.current.push(url);

          tiles.push({
            url,
            row: r,
            col: c,
            width: drawW,
            height: drawH,
            size: blob.size,
            name,
          });
        }
      }

      setStage("packaging");

      // 3) Build the ZIP blob
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      zipUrlRef.current = zipUrl;

      setResult({
        tiles,
        zipUrl,
        zipSize: zipBlob.size,
        zipName: `${baseName}-tiles.zip`,
        totalTiles: tiles.length,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStage("idle");
    }
  };

  const busy =
    stage === "loading-lib" || stage === "slicing" || stage === "packaging";

  const stageLabel: Record<Stage, string> = {
    idle: "",
    "loading-lib": "Loading packager…",
    slicing: "Slicing tiles…",
    packaging: "Building ZIP…",
    done: "",
  };

  const stageStep: Record<Stage, string> = {
    idle: "",
    "loading-lib": "step 1 of 3",
    slicing: "step 2 of 3",
    packaging: "step 3 of 3",
    done: "",
  };

  const progressWidth =
    stage === "loading-lib"
      ? "20%"
      : stage === "slicing"
      ? "65%"
      : stage === "packaging"
      ? "92%"
      : "0%";

  const totalTiles = rows * cols;

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
          <span className="text-black/70">Image Splitter</span>
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
                Up to 10 × 10 · ZIP export · No uploads
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              One image in.
              <br />
              <span className="italic text-[#ff6a00]">Perfect grid</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Slice any image into a clean grid — 2×2, 3×3, or up to 10×10 tiles. Perfect
              for Instagram carousels, puzzle games, print sheets, and sprite atlases.
              Everything happens <strong className="text-black/80 font-medium">in your browser</strong>, no server, no watermark.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Instant" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* ===================== GRID NOTE ===================== */}
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
            <strong className="text-black font-medium">Square thinking.</strong>{" "}
            For an Instagram grid (3×3), your source image should ideally be square — otherwise
            tiles will be non-square rectangles. We slice evenly by pixel count, so if the image
            can't divide cleanly, the last column/row absorbs the remainder.
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
              icon={<FileImage size={18} />}
              title="Upload an image"
              desc="Any JPG, PNG, or WebP up to 50 MB. Your browser shows it instantly — no decoding tricks needed."
            />
            <ExplainerCard
              n="02"
              icon={<Grid3x3 size={18} />}
              title="Pick a grid size"
              desc="Choose rows and columns. Watch the live preview overlay update so you know exactly where the cuts will land."
            />
            <ExplainerCard
              n="03"
              icon={<Package size={18} />}
              title="Download ZIP"
              desc="All tiles are packaged into a single ZIP — or grab individual tiles right from the result panel."
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
                    className={`relative flex flex-col items-center justify-center text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[360px] px-6 ${
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
                      <Scissors
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
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                      or click to browse. Accepts .jpg, .png, and .webp — up to {MAX_SIZE_MB} MB.
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
                          <div className="text-[13.5px] font-medium text-black truncate">
                            {file.name}
                          </div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            {imageDims ? `${imageDims.w} × ${imageDims.h} px · ` : ""}
                            {formatBytes(file.size)}
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

                    {/* preview area with grid overlay */}
                    <div className="relative rounded-2xl overflow-hidden bg-[#f4f1ea] border border-black/[0.06] mb-6 min-h-[280px] flex items-center justify-center p-4">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #e5e0d5 25%, transparent 25%), linear-gradient(-45deg, #e5e0d5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e0d5 75%), linear-gradient(-45deg, transparent 75%, #e5e0d5 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                        }}
                      />

                      {previewUrl && (
                        <div className="relative z-10 max-w-full max-h-[420px] inline-flex">
                          <motion.img
                            key={previewUrl}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            src={previewUrl}
                            alt="Image preview"
                            className="max-w-full max-h-[420px] object-contain block"
                          />
                          {/* Grid overlay */}
                          <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: cols - 1 }).map((_, i) => (
                              <motion.div
                                key={`v-${i}`}
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{ opacity: 1, scaleY: 1 }}
                                transition={{ delay: 0.05 * i, duration: 0.3 }}
                                className="absolute top-0 bottom-0 w-px bg-[#ff6a00]/80"
                                style={{
                                  left: `${((i + 1) / cols) * 100}%`,
                                  boxShadow: "0 0 8px rgba(255,106,0,0.5)",
                                }}
                              />
                            ))}
                            {Array.from({ length: rows - 1 }).map((_, i) => (
                              <motion.div
                                key={`h-${i}`}
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                transition={{ delay: 0.05 * i, duration: 0.3 }}
                                className="absolute left-0 right-0 h-px bg-[#ff6a00]/80"
                                style={{
                                  top: `${((i + 1) / rows) * 100}%`,
                                  boxShadow: "0 0 8px rgba(255,106,0,0.5)",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* badge overlay */}
                      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-sm text-white text-[10.5px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5">
                        <Grid3x3 size={11} />
                        {rows} × {cols} · {totalTiles} tiles
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
                              <div className="text-[13px] font-medium text-white">
                                {stageLabel[stage]}
                              </div>
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
                        whileHover={{ scale: busy ? 1 : 1.03 }}
                        whileTap={{ scale: busy ? 1 : 0.97 }}
                        onClick={split}
                        disabled={busy}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            {stage === "loading-lib"
                              ? "Loading…"
                              : stage === "slicing"
                              ? "Slicing…"
                              : "Packaging…"}
                          </>
                        ) : (
                          <>
                            <Grid3x3 size={15} />
                            Split into {totalTiles} tiles
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

          {/* ---------- RIGHT: Settings + Result ---------- */}
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
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Grid settings
                </span>
              </div>

              {/* Presets */}
              <div className="mb-7">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Quick presets
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <PresetButton
                    active={rows === 2 && cols === 2}
                    onClick={() => {
                      setRows(2);
                      setCols(2);
                      setResult(null);
                    }}
                    icon={<Grid2x2 size={14} />}
                    label="2 × 2"
                  />
                  <PresetButton
                    active={rows === 3 && cols === 3}
                    onClick={() => {
                      setRows(3);
                      setCols(3);
                      setResult(null);
                    }}
                    icon={<Grid3x3 size={14} />}
                    label="3 × 3"
                  />
                  <PresetButton
                    active={rows === 4 && cols === 4}
                    onClick={() => {
                      setRows(4);
                      setCols(4);
                      setResult(null);
                    }}
                    icon={<LayoutGrid size={14} />}
                    label="4 × 4"
                  />
                </div>
              </div>

              {/* Rows */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Rows
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{rows}</div>
                </div>
                <input
                  type="range"
                  min={MIN_DIM}
                  max={MAX_DIM}
                  value={rows}
                  onChange={(e) => {
                    setRows(Number(e.target.value));
                    setResult(null);
                  }}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              {/* Columns */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Columns
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{cols}</div>
                </div>
                <input
                  type="range"
                  min={MIN_DIM}
                  max={MAX_DIM}
                  value={cols}
                  onChange={(e) => {
                    setCols(Number(e.target.value));
                    setResult(null);
                  }}
                  className="w-full accent-[#ff6a00]"
                />
              </div>

              {/* Gap */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Inner padding
                  </div>
                  <div className="text-[11px] font-mono text-black/60">{gap} px</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={gap}
                  onChange={(e) => {
                    setGap(Number(e.target.value));
                    setResult(null);
                  }}
                  className="w-full accent-[#ff6a00]"
                />
                <p className="mt-2 text-[11.5px] text-black/40 leading-relaxed">
                  Shrinks each tile and adds transparent/white space around it. Useful for
                  Instagram grid gutters.
                </p>
              </div>

              {/* Format */}
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Output format
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormatButton
                    active={format === "png"}
                    onClick={() => {
                      setFormat("png");
                      setResult(null);
                    }}
                    title="PNG"
                    subtitle="Lossless · transparency"
                    icon={<Layers size={14} />}
                  />
                  <FormatButton
                    active={format === "jpg"}
                    onClick={() => {
                      setFormat("jpg");
                      setResult(null);
                    }}
                    title="JPG"
                    subtitle="Smaller · no alpha"
                    icon={<ImageIcon size={14} />}
                  />
                </div>
              </div>

              {/* Meta info */}
              {imageDims && (
                <div className="mt-6 pt-5 border-t border-black/[0.06] flex items-start gap-3 text-[11.5px] leading-relaxed text-black/55">
                  <Hash size={13} className="text-[#ff6a00] shrink-0 mt-0.5" />
                  <span>
                    Each tile will be approximately{" "}
                    <strong className="text-black font-medium">
                      {Math.floor(imageDims.w / cols)} × {Math.floor(imageDims.h / rows)} px
                    </strong>{" "}
                    (tile {totalTiles} total).
                  </span>
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
                        {result.totalTiles} tiles ready
                      </span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-[22px] leading-tight mb-1 break-all"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {result.zipName}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.28 }}
                      className="text-[13px] text-white/50 mb-6"
                    >
                      {formatBytes(result.zipSize)} · {rows} × {cols} grid · {format.toUpperCase()}
                    </motion.p>

                    {/* Tile preview strip */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.32 }}
                      className="mb-6 rounded-xl bg-white/[0.04] border border-white/10 p-3 max-h-[220px] overflow-y-auto"
                    >
                      <div
                        className="grid gap-1.5"
                        style={{
                          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                        }}
                      >
                        {result.tiles.map((tile, i) => (
                          <motion.a
                            key={`${tile.row}-${tile.col}`}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.35 + i * 0.02 }}
                            href={tile.url}
                            download={tile.name}
                            whileHover={{ scale: 1.06, zIndex: 10 }}
                            title={`Download ${tile.name}`}
                            className="relative aspect-square rounded-md overflow-hidden border border-white/10 group cursor-pointer"
                          >
                            <img
                              src={tile.url}
                              alt={`Tile ${tile.row + 1}-${tile.col + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                              <Download
                                size={14}
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </span>
                          </motion.a>
                        ))}
                      </div>
                    </motion.div>

                    {result.zipUrl && (
                      <motion.a
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        href={result.zipUrl}
                        download={result.zipName}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[13.5px] font-medium hover:bg-[#ff6a00] hover:text-white transition-colors"
                      >
                        <Package size={15} />
                        Download all as ZIP
                        <ArrowUpRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </motion.a>
                    )}
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
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  What this tool does
                </span>
              </div>

              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>
                  <strong className="text-black">Input: JPG, PNG, or WebP.</strong> Any common
                  image format up to 50 MB.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Output: a ZIP of tiles.</strong> Named
                  systematically as <code className="font-mono text-[11.5px] bg-black/[0.05] px-1 rounded">name_r1-c1.png</code> so
                  order is preserved.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Rows and columns: 2 to 10.</strong> Mix any grid
                  you need — square 3×3 or custom 2×5 for a long strip.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Optional inner padding.</strong> Add gutters
                  between tiles — perfect for Instagram grids.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs in your browser.</strong> No upload, no
                  server, no watermark.
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
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Your image never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Decoding, slicing, and ZIP packaging all run locally via the HTML5 Canvas API.
                Open DevTools → Network — you'll see zero requests for your image.
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
            How does splitting an image into a grid actually work?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12">
            There's no magic. Just nine canvas draws, nine PNG encodes, and one ZIP. Here's the
            full flow.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <DeepDiveCard
              className="lg:col-span-4"
              n="01"
              icon={<Cpu size={18} />}
              title="Decode once"
              body="The image is decoded into an HTMLImageElement — a single in-memory bitmap. Every tile reads from this one source, so there's no repeated disk I/O and no quality loss between slices."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="02"
              icon={<Code2 size={18} />}
              title="Slice with canvas.drawImage"
              body="For each tile we create a small canvas and call drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh). This copies a rectangular region of pixels — exact, bit-for-bit, no resampling."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="03"
              icon={<Package size={18} />}
              title="Encode + ZIP"
              body="Each tile is exported with canvas.toBlob() as PNG or JPG, then fed into JSZip. The result is a single ZIP file built entirely in memory — no server round-trip."
            />
          </div>

          <motion.div variants={fadeUp} className="mt-10 p-6 rounded-[20px] bg-white border border-black/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                <Info size={16} className="text-[#ff6a00]" />
              </div>
              <div className="text-[13px] leading-relaxed text-black/65">
                <strong className="text-black">Rounding note:</strong> if the source image
                dimensions don't divide evenly by rows × columns, we floor the tile size and the
                last column/row absorbs the remainder. E.g. a 1000×1000 image split 3×3 produces
                three 333px columns + a leftover that gets merged into the last column (334px).
                Use images that divide cleanly (like 900×900) for perfectly uniform tiles.
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
            <UseCaseCard
              icon={<Grid3x3 size={18} />}
              title="Building an Instagram grid"
              desc="Split a square photo into 3×3 tiles and post them one by one to create a cohesive profile grid that only looks complete from the profile page."
            />
            <UseCaseCard
              icon={<Palette size={18} />}
              title="Making a puzzle or game asset"
              desc="Slice a source image into tiles for a sliding puzzle, jigsaw game, or memory-match mechanic. Files come pre-numbered."
            />
            <UseCaseCard
              icon={<Layers size={18} />}
              title="Creating a sprite atlas"
              desc="Break a large sprite sheet into individual frame images, or vice versa — split a reference chart into separate icon files."
            />
            <UseCaseCard
              icon={<Maximize2 size={18} />}
              title="Print tiling on A4/Letter"
              desc="Slice a poster-sized image into printable tiles you can cut and reassemble. Choose the grid to match your paper size."
            />
            <UseCaseCard
              icon={<Minimize2 size={18} />}
              title="Generating carousel slides"
              desc="Turn a wide banner into square slides for a LinkedIn carousel or a Twitter thread — every post looks intentional."
            />
            <UseCaseCard
              icon={<ImageIcon size={18} />}
              title="Breaking down a reference board"
              desc="Cut a mood board or color reference into individual tiles for a design system, moodboard, or inspiration wall."
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
    q: "My last column or row is a different size. Why?",
    a: "When the image's width or height doesn't divide evenly by the number of columns or rows, we floor the tile size and the last tile absorbs the remainder. Example: 1000px width split into 3 columns = 333px + 333px + 334px. For perfectly uniform tiles, use source dimensions that divide cleanly (e.g. 900×900 for a 3×3 grid).",
  },
  {
    q: "What's the difference between the inner padding and a gap?",
    a: "The inner padding shrinks each tile and adds transparent (PNG) or white (JPG) space around the content. It doesn't create real gaps between tiles in the ZIP — each tile file just has fewer edge pixels. It's meant for when you want visible spacing when the tiles are displayed together (like on Instagram).",
  },
  {
    q: "Which format should I pick — PNG or JPG?",
    a: "PNG if you want lossless, transparency, or you'll keep editing the tiles. JPG if file size matters more and you don't need transparency. For a 3×3 grid of a photo, the JPG tiles will typically be 3–5× smaller than PNG.",
  },
  {
    q: "Can I download tiles individually instead of a ZIP?",
    a: "Yes. In the result panel, every tile thumbnail is a clickable download link. The big button at the bottom downloads everything as one ZIP — same tiles, one file.",
  },
  {
    q: "How are the files named inside the ZIP?",
    a: "Systematically: yourimage_r1-c1.png, yourimage_r1-c2.png, and so on. Row first, then column, so when you sort alphabetically the order matches the visual grid exactly.",
  },
  {
    q: "Does the tool support GIF or HEIC input?",
    a: "Not currently — only JPG, PNG, and WebP. If you have a GIF or HEIC, convert it to PNG first using our other tools, then come back.",
  },
  {
    q: "Does splitting reduce image quality?",
    a: "No — as long as you export as PNG. Canvas drawImage copies pixels exactly. If you export as JPG, you're re-encoding each tile with JPG compression, which is lossy, but at quality 92% it's visually indistinguishable for most content.",
  },
  {
    q: "Is anything uploaded to a server?",
    a: "No. Everything — decoding, slicing, encoding, and ZIP packaging — runs entirely in your browser using the HTML5 Canvas API and JSZip. Open DevTools → Network and you'll see zero outgoing requests for your image.",
  },
];

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

function PresetButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`py-2.5 rounded-xl text-[12.5px] font-medium border transition-colors inline-flex items-center justify-center gap-1.5 ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function FormatButton({
  active,
  onClick,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`text-left p-3.5 rounded-xl border transition-colors ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            active ? "bg-white/10" : "bg-black/[0.05]"
          }`}
        >
          {icon}
        </span>
        <span className="text-[13px] font-medium">{title}</span>
        {active && <Check size={12} className="ml-auto text-[#ff6a00]" />}
      </div>
      <div className={`text-[10.5px] ${active ? "text-white/50" : "text-black/40"}`}>
        {subtitle}
      </div>
    </motion.button>
  );
}

function ExplainerCard({
  n,
  icon,
  title,
  desc,
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

function DeepDiveCard({
  n,
  icon,
  title,
  body,
  className = "",
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative p-6 rounded-[20px] bg-white border border-black/[0.06] ${className}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center text-black/70">
          {icon}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
          {n}
        </span>
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

function UseCaseCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-start gap-4 p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center text-[#ff6a00] shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-[15px] font-medium text-black mb-1.5 leading-tight">
          {title}
        </h4>
        <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
      </div>
    </motion.div>
  );
}

function FaqRow({
  q,
  a,
  open,
  onClick,
}: {
  q: string;
  a: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-6 p-6 text-left hover:bg-black/[0.015] transition-colors"
      >
        <span className="text-[14.5px] font-medium text-black flex items-start gap-3">
          <HelpCircle size={16} className="text-[#ff6a00] shrink-0 mt-0.5" />
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
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
            <div className="px-6 pb-6 pl-[58px] text-[13px] leading-relaxed text-black/60">
              {a}
            </div>
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