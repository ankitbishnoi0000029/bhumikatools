"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
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
  Eye,
  Palette,
  FileCheck2,
  Cpu,
  Code2,
  Maximize2,
  Minimize2,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Converted = {
  url: string;
  size: number;
  name: string;
};

type Stage = "idle" | "decoding" | "encoding" | "done";

const MAX_SIZE_MB = 50;

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

const isJpgFile = (f: File) => {
  const type = f.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg") return true;
  return /\.(jpg|jpeg|jpe)$/i.test(f.name);
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
export const JpgToPng = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  const reset = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    setFile(null);
    setPreviewUrl(null);
    setConverted(null);
    setError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

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

    if (!isJpgFile(f)) {
      setError(
        "This tool only accepts JPG or JPEG files. For other formats, use the matching converter."
      );
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }

    // JPG is natively viewable — instant preview
    const url = URL.createObjectURL(f);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setFile(f);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const convert = async () => {
    if (!file) return;
    setError(null);
    setStage("decoding");

    try {
      // 1) Load the JPG into an Image element (browser decodes natively)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Couldn't read the JPG file."));
        image.src = previewUrl!;
      });

      setStage("encoding");

      // 2) Draw to canvas at full resolution
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not supported in this browser.");

      // PNG supports alpha, but JPG has none. Fill white just in case any
      // transparent pixels sneak in via broken encoders.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // 3) Export as PNG (lossless, no quality parameter)
      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) throw new Error("Couldn't encode the PNG. Please try again.");

      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const pngUrl = URL.createObjectURL(pngBlob);
      convertedUrlRef.current = pngUrl;

      setConverted({
        url: pngUrl,
        size: pngBlob.size,
        name: `${stripExt(file.name)}.png`,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStage("idle");
    }
  };

  const busy = stage === "decoding" || stage === "encoding";

  const sizeDelta =
    file && converted
      ? Math.round(((converted.size - file.size) / file.size) * 100)
      : 0;

  const stageLabel: Record<Stage, string> = {
    idle: "",
    decoding: "Reading JPG…",
    encoding: "Encoding PNG…",
    done: "",
  };

  const progressWidth =
    stage === "decoding" ? "40%" : stage === "encoding" ? "85%" : "0%";

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
          <span className="text-black/70">JPG to PNG</span>
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
                Lossless · Client-side · No uploads
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              JPG in.
              <br />
              <span className="italic text-[#ff6a00]">Pixel-perfect PNG</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              PNG is <strong className="text-black/80 font-medium">lossless</strong> — every pixel
              comes out exactly as it went in, no blur, no artifacts, no quality slider. Convert
              JPG to PNG in your browser with a single click. Nothing is uploaded.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Instant" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* ===================== WHY PNG NOTE ===================== */}
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
            <strong className="text-black font-medium">Heads-up on file size.</strong>{" "}
            PNG is lossless, so the output is usually <em>larger</em> than the JPG you put in.
            That's normal — you're trading file size for exact pixel fidelity, sharp edges,
            and a format every editor accepts without re-compressing.
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
              title="Drop a JPG"
              desc="Pick any .jpg or .jpeg file. Your browser can already display it, so you see it instantly."
            />
            <ExplainerCard
              n="02"
              icon={<Wand2 size={18} />}
              title="Canvas re-encodes it"
              desc="We draw the image onto an HTML5 canvas at full resolution, then export it as PNG — lossless."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the PNG"
              desc="A pixel-perfect PNG ready for Photoshop, Figma, Word, or anywhere that needs lossless."
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
                      accept=".jpg,.jpeg,.jpe,image/jpeg"
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
                      <FileImage
                        size={26}
                        strokeWidth={1.6}
                        className={dragging ? "text-white" : "text-black/70"}
                      />
                    </motion.div>

                    <h3
                      className="text-[22px] mb-2 tracking-tight"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {dragging ? "Drop your JPG here" : "Drop a JPG file here"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                      or click to browse. Accepts .jpg and .jpeg files — up to {MAX_SIZE_MB} MB.
                    </p>

                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[12.5px] font-medium"
                    >
                      Choose JPG file
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
                            {formatBytes(file.size)} · JPG
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

                    {/* preview area */}
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

                      {previewUrl && (
                        <motion.img
                          key={previewUrl}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          src={previewUrl}
                          alt="JPG preview"
                          className="relative z-10 max-w-full max-h-[420px] object-contain"
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
                            className="absolute inset-0 z-20 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
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
                        onClick={convert}
                        disabled={busy}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            {stage === "decoding" ? "Reading…" : "Encoding…"}
                          </>
                        ) : (
                          <>
                            <ImageDown size={15} />
                            Convert to PNG
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
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Output settings
                </span>
              </div>

              <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                Output format
              </div>
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-black bg-black text-white"
              >
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Layers size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium">PNG</div>
                  <div className="text-[11px] text-white/50">Lossless · 24-bit · editable</div>
                </div>
                <Check size={14} className="text-[#ff6a00]" />
              </motion.div>

              <div className="mt-6 pt-5 border-t border-black/[0.06]">
                <div className="flex items-start gap-3 text-[12px] leading-relaxed text-black/55">
                  <Info size={14} className="text-[#ff6a00] shrink-0 mt-0.5" />
                  <p>
                    PNG has <strong className="text-black">no quality slider</strong> — it's always
                    lossless. If you need a smaller file, keep the JPG.
                  </p>
                </div>
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
                        PNG ready
                      </span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-[22px] leading-tight mb-1 break-all"
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
                      {sizeDelta !== 0 && (
                        <>
                          {" · "}
                          <span className={sizeDelta > 0 ? "text-amber-400" : "text-emerald-400"}>
                            {sizeDelta > 0
                              ? `${sizeDelta}% larger (lossless)`
                              : `${Math.abs(sizeDelta)}% smaller`}
                          </span>
                        </>
                      )}
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
                  <strong className="text-black">Input: JPG or JPEG only.</strong> Other formats are
                  politely rejected so you know you're using the right tool.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Output: PNG.</strong> Lossless, 24-bit, with alpha
                  channel support — the format every editor trusts.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">No quality slider.</strong> PNG is inherently
                  lossless — every pixel is preserved exactly.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Runs in Chrome, Firefox, Edge, Safari.</strong> Uses
                  the HTML5 Canvas API — no server round-trip.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Files stay on your device.</strong> Open DevTools
                  and you'll see zero network requests.
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
                <span className="text-[13px] font-medium text-black">Your file never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                JPG decoding and PNG encoding both run inside your browser using the Canvas API.
                No upload, no server, no tracking.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ===================== DEEP DIVE: JPG vs PNG ===================== */}
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
            What actually happens when you convert JPG to PNG?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12">
            Short version: the browser unpacks the JPG into raw pixels, then re-packs those exact
            pixels as a PNG. Nothing is re-compressed, nothing is thrown away. Here's the long version.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <DeepDiveCard
              className="lg:col-span-4"
              n="01"
              icon={<Cpu size={18} />}
              title="Decode"
              body="The browser reads the JPG file and produces a bitmap of raw RGBA pixels. This is the exact same step your screen does when it displays the JPG — no guesswork, no quality loss added."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="02"
              icon={<Code2 size={18} />}
              title="Draw to canvas"
              body="We place those pixels onto an <canvas> element at the original width and height. The canvas holds the pixels in memory exactly as the browser decoded them — bit-for-bit."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="03"
              icon={<FileCheck2 size={18} />}
              title="Encode as PNG"
              body="canvas.toBlob('image/png') serialises the canvas into a PNG byte stream using lossless DEFLATE compression. Every pixel is preserved — the file is just heavier than the JPG was."
            />
          </div>

          {/* Comparison table */}
          <motion.div variants={fadeUp} className="mt-14">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-5 h-px bg-black/30" />
              <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
                JPG vs PNG — side by side
              </span>
            </div>

            <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
              <div className="grid grid-cols-3 text-[12px] font-mono uppercase tracking-[0.14em] text-black/45 border-b border-black/[0.06] bg-black/[0.015]">
                <div className="p-4">Property</div>
                <div className="p-4 border-l border-black/[0.06]">JPG</div>
                <div className="p-4 border-l border-black/[0.06] text-[#ff6a00]">PNG</div>
              </div>
              {[
                ["Compression", "Lossy (DCT)", "Lossless (DEFLATE)"],
                ["Transparency", "No", "Yes (alpha channel)"],
                ["Typical size", "Small", "Larger"],
                ["Best for", "Photos, web", "Logos, UI, screenshots, edits"],
                ["Re-editing", "Degrades", "Perfect fidelity"],
                ["Color depth", "24-bit", "Up to 48-bit"],
              ].map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 text-[13px] border-b last:border-b-0 border-black/[0.06]"
                >
                  <div className="p-4 text-black/50">{row[0]}</div>
                  <div className="p-4 border-l border-black/[0.06]">{row[1]}</div>
                  <div className="p-4 border-l border-black/[0.06] font-medium">{row[2]}</div>
                </div>
              ))}
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
            You probably need PNG when…
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCaseCard
              icon={<Eye size={18} />}
              title="You're editing and re-saving repeatedly"
              desc="Every JPG save adds new compression artifacts. Converting to PNG first stops the bleeding — you can now edit and save without losing anything else."
            />
            <UseCaseCard
              icon={<Palette size={18} />}
              title="You need transparency"
              desc="JPG can't hold transparency. If you want to cut out a background later, PNG is the format that keeps the alpha channel intact."
            />
            <UseCaseCard
              icon={<Maximize2 size={18} />}
              title="Publishing on a platform that rejects JPG"
              desc="Some design tools, CMSes, and print pipelines only accept PNG. This gets you there without opening Photoshop."
            />
            <UseCaseCard
              icon={<Minimize2 size={18} />}
              title="You need sharp text or flat colors"
              desc="JPG smears hard edges (text, icons, logos) with compression artifacts. PNG keeps them crisp — pixel for pixel."
            />
            <UseCaseCard
              icon={<Layers size={18} />}
              title="Feeding an image into a design or ML pipeline"
              desc="Many pipelines expect lossless input. PNG guarantees the model sees exactly the pixels that were in the file."
            />
            <UseCaseCard
              icon={<FileCheck2 size={18} />}
              title="You want an archival copy"
              desc="If you're archiving or backing up, PNG is safer long-term: no generational loss, no proprietary decoder quirks."
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
    q: "Will the PNG be larger than the JPG I put in?",
    a: "Almost always, yes — and that's expected. JPG throws away pixel information to make files small; PNG keeps everything. A 2 MB JPG can easily become a 6–10 MB PNG. That's the cost of lossless. If size matters more than fidelity, stick with JPG.",
  },
  {
    q: "Can this restore detail lost by JPG compression?",
    a: "No. Once a JPG has been saved, the missing detail is gone forever. What this tool does is freeze the current state in a lossless format so future edits and saves won't degrade it any further.",
  },
  {
    q: "Does the converted PNG have transparency?",
    a: "Not automatically. JPG has no alpha channel, so there's nothing to carry over. We fill the canvas with white first to avoid any weird artifacts, then export as PNG. If you want to add transparency, you'll need to cut out the background in an editor afterward — but now the file is a PNG, so your cutout will survive every save.",
  },
  {
    q: "Is my image uploaded anywhere?",
    a: "No. Decoding and encoding both happen in your browser using the HTML5 Canvas API. Open your browser's DevTools → Network tab and you'll see zero outgoing requests for the image itself.",
  },
  {
    q: "Does the tool resize or crop my image?",
    a: "No. The PNG comes out at exactly the same width and height as the input JPG. Pixels are preserved 1:1.",
  },
  {
    q: "What's the maximum file size?",
    a: `Up to ${MAX_SIZE_MB} MB per file. Larger files will still work in most browsers but may be slow — the canvas has to hold the whole decoded bitmap in memory.`,
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. The tool is fully responsive and works in mobile Chrome and Safari. Large images may take a few seconds on older phones, but it's all local — no data usage beyond loading the page.",
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