"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Download, ArrowUpRight, Shield, Zap, Infinity as InfinityIcon,
  Lock, Check, RotateCcw, FileImage, Loader2, AlertCircle, Sparkles,
  MousePointerClick, Wand2, HardDriveDownload, Info, FileCode2,
  Layers, Palette, Eye, Zap as ZapIcon, Route, ImageDown, Grid3x3,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type TraceMode = "vector" | "embed";
type Stage = "idle" | "reading" | "tracing" | "done";
type Converted = { url: string; size: number; name: string; paths: number };

const MAX_SIZE_MB = 15;

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

const isPngFile = (f: File) => f.type === "image/png" || /\.png$/i.test(f.name);

// count paths in SVG source
const countPaths = (svg: string) => {
  const m = svg.match(/<path\b/g);
  return m ? m.length : 0;
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
export const PngToSvg = () => {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [srcW, setSrcW] = useState(0);
  const [srcH, setSrcH] = useState(0);
  const [sourceImgData, setSourceImgData] = useState<ImageData | null>(null);

  // tracing options
  const [mode, setMode] = useState<TraceMode>("vector");
  const [numberOfColors, setNumberOfColors] = useState(16);
  const [detail, setDetail] = useState(2); // maps to ltres/qtres — higher = more detail (0-5)
  const [smoothing, setSmoothing] = useState(1); // blur radius before tracing (0-3)
  const [pathOmit, setPathOmit] = useState(4);

  // preview
  const [svgSource, setSvgSource] = useState<string>("");
  const [paths, setPaths] = useState(0);
  const [previewBg, setPreviewBg] = useState<"checker" | "light" | "dark">("checker");
  const [showOriginal, setShowOriginal] = useState(false);

  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const convertedUrlRef = useRef<string | null>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    return () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  const reset = () => {
    if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }
    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }
    setFile(null); setSourceUrl(null);
    setSrcW(0); setSrcH(0);
    setSourceImgData(null);
    setSvgSource("");
    setPaths(0);
    setConverted(null); setError(null); setStage("idle");
    setShowOriginal(false);
    sourceImgRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = useCallback((f: File) => {
    setError(null); setConverted(null); setStage("idle");
    setSvgSource(""); setPaths(0);
    setShowOriginal(false);

    if (convertedUrlRef.current) { URL.revokeObjectURL(convertedUrlRef.current); convertedUrlRef.current = null; }

    if (!isPngFile(f)) {
      setError(
        "This tool only accepts PNG files. If your image is JPG, WebP, or another format, use one of the other converters."
      );
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
      setSrcW(probe.naturalWidth);
      setSrcH(probe.naturalHeight);

      // pre-compute ImageData once for fast re-traces
      try {
        const c = document.createElement("canvas");
        c.width = probe.naturalWidth;
        c.height = probe.naturalHeight;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(probe, 0, 0);
          setSourceImgData(ctx.getImageData(0, 0, c.width, c.height));
        }
      } catch {
        // tainted canvas shouldn't happen with blob URLs, but be safe
      }

      setFile(f);
      setSourceUrl(url);
    };
    probe.onerror = () => {
      setError("Couldn't read this PNG. The file may be corrupt.");
      URL.revokeObjectURL(url);
      sourceUrlRef.current = null;
    };
    probe.src = url;
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  // ---------- embed as base64 in <svg><image> ----------
  const buildEmbedSvg = useCallback(async (): Promise<string> => {
    if (!sourceUrlRef.current) throw new Error("Source missing.");
    const res = await fetch(sourceUrlRef.current);
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result);
        const comma = s.indexOf(",");
        resolve(comma >= 0 ? s.slice(comma + 1) : "");
      };
      reader.onerror = () => reject(new Error("Couldn't read the file."));
      reader.readAsDataURL(blob);
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${srcW}" height="${srcH}" viewBox="0 0 ${srcW} ${srcH}">
  <image width="${srcW}" height="${srcH}" xlink:href="data:image/png;base64,${base64}"/>
</svg>`;
  }, [srcW, srcH]);

  // ---------- vector trace via imagetracerjs ----------
  const traceToSvg = useCallback(
    async (imgData: ImageData): Promise<string> => {
      const mod = await import("imagetracerjs");
      const ImageTracer: any = (mod as any).default ?? mod;

      // Optionally blur the source with canvas for smoother traces
      let working = imgData;
      if (smoothing > 0) {
        const c = document.createElement("canvas");
        c.width = imgData.width;
        c.height = imgData.height;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.putImageData(imgData, 0, 0);
          const blurred = document.createElement("canvas");
          blurred.width = imgData.width;
          blurred.height = imgData.height;
          const bctx = blurred.getContext("2d");
          if (bctx) {
            bctx.filter = `blur(${smoothing}px)`;
            bctx.drawImage(c, 0, 0);
            bctx.filter = "none";
            working = bctx.getImageData(0, 0, blurred.width, blurred.height);
          }
        }
      }

      // detail 0..5 maps to ltres/qtres 5..0.5 (inverted: more detail = lower threshold)
      const ltres = Math.max(0.5, 5 - detail);
      const qtres = Math.max(0.5, 5 - detail);

      const options = {
        // tracing
        ltres,
        qtres,
        pathomit: pathOmit,
        rightangleenhance: true,

        // color quantization
        colorsampling: 2,
        numberofcolors: numberOfColors,
        mincolorratio: 0,
        colorquantcycles: 3,

        // rendering
        strokewidth: 1,
        linefilter: false,
        scale: 1,
        roundcoords: 1,
        viewbox: false,
        desc: false,
        blurradius: 0,
        blurdelta: 20,
      };

      return ImageTracer.imagedataToSVG(working, options);
    },
    [numberOfColors, detail, smoothing, pathOmit]
  );

  // ---------- live trace whenever options change ----------
  useEffect(() => {
    if (!sourceImgData || !file) return;

    let cancelled = false;
    setStage("tracing");
    setError(null);

    const t = window.setTimeout(async () => {
      try {
        if (mode === "embed") {
          const svg = await buildEmbedSvg();
          if (cancelled) return;
          setSvgSource(svg);
          setPaths(0);
          setStage("done");
        } else {
          const svg = await traceToSvg(sourceImgData);
          if (cancelled) return;
          setSvgSource(svg);
          setPaths(countPaths(svg));
          setStage("done");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Tracing failed. Try lowering the detail.");
        setStage("idle");
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [sourceImgData, file, mode, traceToSvg, buildEmbedSvg]);

  // ---------- download ----------
  const download = async () => {
    if (!svgSource || !file) return;
    setError(null);

    try {
      const blob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" });
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      setConverted({
        url,
        size: blob.size,
        name: `${stripExt(file.name)}.svg`,
        paths,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  };

  const busy = stage === "tracing";

  // SVG source size in bytes (as text)
  const svgSize = svgSource ? new Blob([svgSource]).size : 0;

  const sizeDelta =
    file && svgSize > 0
      ? Math.round(((file.size - svgSize) / file.size) * 100)
      : 0;

  const previewBgStyle = useMemo<React.CSSProperties>(() => {
    if (previewBg === "light") return { backgroundColor: "#ffffff" };
    if (previewBg === "dark") return { backgroundColor: "#0b0b0c" };
    return {
      backgroundImage:
        "linear-gradient(45deg, #d8d3c8 25%, transparent 25%), linear-gradient(-45deg, #d8d3c8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8d3c8 75%), linear-gradient(-45deg, transparent 75%, #d8d3c8 75%)",
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
    };
  }, [previewBg]);

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
          <span className="text-black/70">PNG to SVG</span>
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
                Real vectorization · Trace or embed · No signup
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Pixels into
              <br />
              <span className="italic text-[#ff6a00]">infinitely sharp</span> paths.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Turn a PNG into a real vector SVG by tracing its edges — perfect for logos, icons,
              line art, and simple illustrations. Choose <strong className="text-black/80 font-medium">vector trace</strong>{" "}
              for editable paths, or <strong className="text-black/80 font-medium">embed</strong> to
              wrap the original PNG inside an SVG. All on your device.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Route size={12} />} label="Real paths" />
            <TrustBadge icon={<Shield size={12} />} label="100% private" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* ===================== HONESTY NOTE ===================== */}
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
            <strong className="text-black font-medium">What vector tracing can and can't do.</strong>{" "}
            It's excellent for <strong className="text-black">logos, icons, signatures, line art,
            badges, and flat illustrations</strong> with a limited palette. It's the wrong choice
            for <strong className="text-black">photographs</strong> — tracing a photo produces
            thousands of tiny paths that look worse than the original and can't be edited usefully.
            For photos, use the Embed mode or keep the PNG.
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
              How this works
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExplainerCard
              n="01"
              icon={<MousePointerClick size={18} />}
              title="Drop a PNG"
              desc="Any .png up to 15 MB. Works best on logos, icons, and line art."
            />
            <ExplainerCard
              n="02"
              icon={<Wand2 size={18} />}
              title="Tune the trace"
              desc="Pick color count, detail, and smoothing. Preview updates live."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download SVG"
              desc="A fully vector file — scales to any size without pixelation."
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
                      accept="image/png,.png"
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
                      <FileCode2 size={26} strokeWidth={1.6} className={dragging ? "text-white" : "text-black/70"} />
                    </motion.div>

                    <h3 className="text-[22px] mb-2 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
                      {dragging ? "Drop your PNG here" : "Drop a PNG to vectorize"}
                    </h3>
                    <p className="text-[13px] text-black/50 max-w-[380px] leading-relaxed mb-6">
                      or click to browse. Logos, icons, and line art trace beautifully — photos
                      don't.
                    </p>

                    <motion.span
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[12.5px] font-medium"
                    >
                      Choose PNG
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

                    {/* background picker */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/40 mr-1">
                        Preview bg
                      </span>
                      <button
                        onClick={() => setPreviewBg("checker")}
                        className={`w-7 h-7 rounded-md border transition-all ${
                          previewBg === "checker" ? "border-[#ff6a00] ring-1 ring-[#ff6a00]/40" : "border-black/[0.15]"
                        }`}
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg, #bbb 25%, transparent 25%), linear-gradient(-45deg, #bbb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bbb 75%), linear-gradient(-45deg, transparent 75%, #bbb 75%)",
                          backgroundSize: "8px 8px",
                          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                        }}
                        aria-label="Checkerboard background"
                      />
                      <button
                        onClick={() => setPreviewBg("light")}
                        className={`w-7 h-7 rounded-md border bg-white transition-all ${
                          previewBg === "light" ? "border-[#ff6a00] ring-1 ring-[#ff6a00]/40" : "border-black/[0.15]"
                        }`}
                        aria-label="Light background"
                      />
                      <button
                        onClick={() => setPreviewBg("dark")}
                        className={`w-7 h-7 rounded-md border bg-black transition-all ${
                          previewBg === "dark" ? "border-[#ff6a00] ring-1 ring-[#ff6a00]/40" : "border-black/[0.15]"
                        }`}
                        aria-label="Dark background"
                      />
                      <div className="ml-auto text-[11px] font-mono uppercase tracking-[0.14em] text-black/45">
                        {mode === "vector" ? `${paths} paths` : "embed"}
                      </div>
                    </div>

                    {/* preview area */}
                    <div
                      className="relative rounded-2xl overflow-hidden border border-black/[0.06] mb-6 min-h-[320px] flex items-center justify-center p-4"
                      style={previewBgStyle}
                    >
                      {/* original image when hold-to-compare */}
                      {showOriginal ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={sourceUrl ?? ""}
                          alt="Original PNG"
                          className="max-w-full max-h-[440px] object-contain"
                        />
                      ) : (
                        <>
                          {svgSource ? (
                            <div
                              className="max-w-full max-h-[440px] [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[440px] [&>svg]:object-contain"
                              // eslint-disable-next-line react/no-danger
                              dangerouslySetInnerHTML={{ __html: svgSource }}
                            />
                          ) : (
                            <div className="text-center">
                              <Loader2 size={26} className="text-black/30 mx-auto mb-3 animate-spin" />
                              <div className="text-[12px] text-black/50">
                                {mode === "vector" ? "Tracing vectors…" : "Preparing embed…"}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* hold-to-compare */}
                      {svgSource && (
                        <motion.button
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          onMouseDown={() => setShowOriginal(true)}
                          onMouseUp={() => setShowOriginal(false)}
                          onMouseLeave={() => setShowOriginal(false)}
                          onTouchStart={() => setShowOriginal(true)}
                          onTouchEnd={() => setShowOriginal(false)}
                          className="absolute top-3 right-3 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/75 backdrop-blur-md text-white hover:bg-black transition-colors"
                        >
                          <Eye size={12} />
                          <span className="text-[10.5px] font-mono uppercase tracking-[0.16em]">
                            {showOriginal ? "Showing original" : "Hold to compare"}
                          </span>
                        </motion.button>
                      )}

                      {/* tracing overlay */}
                      <AnimatePresence>
                        {busy && svgSource && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-3 left-3 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/75 backdrop-blur-md text-white"
                          >
                            <Loader2 size={11} className="animate-spin" />
                            <span className="text-[10.5px] font-mono uppercase tracking-[0.16em]">
                              Re-tracing…
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <motion.button
                        whileHover={{ scale: busy || !svgSource ? 1 : 1.03 }}
                        whileTap={{ scale: busy || !svgSource ? 1 : 0.97 }}
                        onClick={download}
                        disabled={busy || !svgSource}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Download size={15} />
                        Download SVG
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

                      {svgSize > 0 && file && (
                        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-black/45 ml-auto">
                          SVG {formatBytes(svgSize)}
                          {sizeDelta !== 0 && (
                            <span className={`ml-2 ${sizeDelta > 0 ? "text-[#ff6a00]" : "text-black/40"}`}>
                              ({sizeDelta > 0 ? "−" : "+"}
                              {Math.abs(sizeDelta)}%)
                            </span>
                          )}
                        </div>
                      )}
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

            {/* ---------- Mode ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <SectionTitle label="Conversion mode" icon={<Route size={11} />} />

              <div className="grid grid-cols-2 gap-2 mb-5">
                <ModePill
                  icon={<Route size={15} />}
                  label="Vector trace"
                  subtitle="Real paths"
                  active={mode === "vector"}
                  onClick={() => { setMode("vector"); setConverted(null); }}
                />
                <ModePill
                  icon={<ImageDown size={15} />}
                  label="Embed"
                  subtitle="Wrap as-is"
                  active={mode === "embed"}
                  onClick={() => { setMode("embed"); setConverted(null); }}
                />
              </div>

              <AnimatePresence mode="wait">
                {mode === "vector" ? (
                  <motion.p
                    key="vector-desc"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-[12.5px] leading-relaxed text-black/55"
                  >
                    Traces edges and shapes into editable <code className="font-mono text-[11px] bg-black/[0.05] px-1.5 py-0.5 rounded">&lt;path&gt;</code> elements.
                    The result is a genuine vector — scales infinitely, editable in Illustrator,
                    Figma, or Inkscape.
                  </motion.p>
                ) : (
                  <motion.p
                    key="embed-desc"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="text-[12.5px] leading-relaxed text-black/55"
                  >
                    Wraps the original PNG as base64 inside an SVG. The output is not
                    vector — it's the same pixels in an SVG container. Useful when a tool
                    only accepts SVG but you don't need scalability.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ---------- Trace options (only for vector mode) ---------- */}
            <AnimatePresence>
              {mode === "vector" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7">
                    <SectionTitle label="Trace settings" icon={<Palette size={11} />} />

                    {/* colors */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Colors</Label>
                        <motion.div
                          key={numberOfColors}
                          initial={{ scale: 1.15, color: "#ff6a00" }}
                          animate={{ scale: 1, color: "#00000099" }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] font-mono"
                        >
                          {numberOfColors}
                        </motion.div>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={64}
                        step={1}
                        value={numberOfColors}
                        onChange={(e) => { setNumberOfColors(Number(e.target.value)); setConverted(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                        <span>2 (flat)</span>
                        <span>16 (logos)</span>
                        <span>64 (detailed)</span>
                      </div>
                    </div>

                    {/* detail */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Edge detail</Label>
                        <motion.div
                          key={detail}
                          initial={{ scale: 1.15, color: "#ff6a00" }}
                          animate={{ scale: 1, color: "#00000099" }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] font-mono"
                        >
                          {detail}/5
                        </motion.div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        step={1}
                        value={detail}
                        onChange={(e) => { setDetail(Number(e.target.value)); setConverted(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <div className="flex items-center justify-between mt-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/35">
                        <span>Simpler</span>
                        <span>More detail</span>
                      </div>
                    </div>

                    {/* smoothing */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <Label>Pre-trace smoothing</Label>
                        <motion.div
                          key={smoothing}
                          initial={{ scale: 1.15, color: "#ff6a00" }}
                          animate={{ scale: 1, color: "#00000099" }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] font-mono"
                        >
                          {smoothing}px
                        </motion.div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={3}
                        step={0.5}
                        value={smoothing}
                        onChange={(e) => { setSmoothing(Number(e.target.value)); setConverted(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <p className="mt-3 text-[11.5px] leading-relaxed text-black/45">
                        Blurs the source slightly to remove noise. Helps a lot on scans and
                        photos — leave at 0 for crisp logos.
                      </p>
                    </div>

                    {/* omit small paths */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Ignore speckles</Label>
                        <motion.div
                          key={pathOmit}
                          initial={{ scale: 1.15, color: "#ff6a00" }}
                          animate={{ scale: 1, color: "#00000099" }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] font-mono"
                        >
                          {pathOmit}
                        </motion.div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        step={1}
                        value={pathOmit}
                        onChange={(e) => { setPathOmit(Number(e.target.value)); setConverted(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <p className="mt-3 text-[11.5px] leading-relaxed text-black/45">
                        Drops tiny isolated paths smaller than this many pixels. Removes noise
                        without losing real shapes.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                        {mode === "vector" ? "Vector SVG ready" : "Embedded SVG ready"}
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
                      {formatBytes(converted.size)}
                      {mode === "vector" && converted.paths > 0 && (
                        <> · {converted.paths} paths</>
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
                      Download SVG
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
                  <strong className="text-black">Vector trace mode</strong> — samples colors, finds edges, and writes real <code className="font-mono text-[11px] bg-black/[0.05] px-1.5 py-0.5 rounded">&lt;path&gt;</code> elements. Scalable to any size.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Embed mode</strong> — wraps the PNG in base64 inside an SVG. Not vector, but a valid SVG that any tool will accept.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Live preview</strong> — every slider change re-traces in ~200ms so you can dial in the look.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Hold-to-compare</strong> — press the corner button to flash the original PNG against the trace.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">100% on-device.</strong> Tracing runs in your browser — the file is never uploaded.
                </FeatureRow>
              </ul>
            </motion.div>

            {/* ---------- Tips ---------- */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Getting good traces
                </span>
              </div>
              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>Start with 16 colors and detail 2 — good defaults for most logos.</FeatureRow>
                <FeatureRow>Raise <strong className="text-black">colors</strong> only if the preview looks flat or banded.</FeatureRow>
                <FeatureRow>Lower <strong className="text-black">detail</strong> and raise <strong className="text-black">smoothing</strong> to soften a noisy source.</FeatureRow>
                <FeatureRow>Increase <strong className="text-black">ignore speckles</strong> to drop JPEG-like noise from scans.</FeatureRow>
                <FeatureRow>Photos will trace badly no matter what — those belong in Embed mode.</FeatureRow>
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
                Tracing runs in your browser using WebAssembly and Canvas. There is no backend,
                no upload, and no tracking — open DevTools and you'll see zero network requests
                while you work.
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

function ModePill({
  icon, label, subtitle, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 py-4 px-3 rounded-xl border text-[12.5px] font-medium transition-all duration-200 ${
        active
          ? "border-black bg-black text-white"
          : "border-black/[0.10] bg-white text-black/70 hover:border-black/30"
      }`}
    >
      <div className={active ? "text-[#ff6a00]" : "text-black/50"}>{icon}</div>
      <div>{label}</div>
      <div className={`text-[10px] font-normal ${active ? "text-white/50" : "text-black/40"}`}>
        {subtitle}
      </div>
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

export default PngToSvg;