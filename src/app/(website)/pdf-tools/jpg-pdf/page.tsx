"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { UploadCloud, X, Loader2, AlertCircle, CheckCircle2, Download, RefreshCw, Image as ImageIcon, ArrowUpRight, Eye, Sparkles, GripVertical, FileText, Trash2, RotateCw, RotateCcw, Layers, Settings2, ChevronLeft, ChevronRight, Check, Maximize, Minimize } from "lucide-react";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import { createBlobFromBytes, formatBytes, downloadBlob, readFileAsArrayBuffer } from "@/lib/pdf-utils";

// ============================================
// TYPES
// ============================================

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
}

type PageSize = "fit" | "a4" | "letter" | "a5" | "legal" | "a3";
type Orientation = "portrait" | "landscape" | "auto";
type FitMode = "contain" | "cover" | "stretch";

const PAGE_SIZES: Record<PageSize, { w: number; h: number; label: string } | null> = {
  fit: null,
  a4: { w: 595.28, h: 841.89, label: "A4" },
  letter: { w: 612, h: 792, label: "Letter" },
  a5: { w: 419.53, h: 595.28, label: "A5" },
  legal: { w: 612, h: 1008, label: "Legal" },
  a3: { w: 841.89, h: 1190.55, label: "A3" },
};

const MARGINS = [
  { id: "none", label: "None", value: 0 },
  { id: "small", label: "Small", value: 20 },
  { id: "medium", label: "Medium", value: 40 },
  { id: "large", label: "Large", value: 60 },
];

// ============================================
// PAGE
// ============================================

export default function JpgToPdfPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [margin, setMargin] = useState(0);
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [quality, setQuality] = useState(92); // 0-100, for JPEG compression
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; totalPages: number } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Clamp preview index
  useEffect(() => {
    if (previewIndex >= images.length) {
      setPreviewIndex(Math.max(0, images.length - 1));
    }
  }, [images.length, previewIndex]);

  // ---------- FILE HANDLING ----------

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const arr = Array.from(incoming).filter((f) => f.type.startsWith("image/"));

      if (arr.length === 0) {
        setError("Please select image files (JPG, PNG, WebP, GIF, BMP).");
        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const newImages: ImageFile[] = [];

        for (const file of arr) {
          // Skip duplicates
          if (images.some((img) => img.file.name === file.name && img.file.size === file.size)) {
            continue;
          }

          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            // Get dimensions
            const dimensions = await new Promise<{ w: number; h: number }>((resolve) => {
              const img = new window.Image();
              img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
              img.onerror = () => resolve({ w: 100, h: 100 });
              img.src = dataUrl;
            });

            newImages.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
              file,
              preview: dataUrl,
              width: dimensions.w,
              height: dimensions.h,
              rotation: 0,
            });
          } catch (e) {
            console.error("Failed to load:", file.name, e);
          }
        }

        if (newImages.length > 0) {
          setImages((prev) => [...prev, ...newImages]);
        }
      } catch (e) {
        setError("Failed to load one or more images.");
      } finally {
        setIsLoading(false);
      }
    },
    [images],
  );

  // ---------- INPUT ----------

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  // ---------- IMAGE ACTIONS ----------

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setResult(null);
  };

  const rotateImage = (id: string, direction: 1 | -1) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, rotation: (img.rotation + direction * 90 + 360) % 360 } : img)));
    setResult(null);
  };

  const clearAll = () => {
    setImages([]);
    setResult(null);
    setError(null);
    setPreviewIndex(0);
  };

  const reverseOrder = () => {
    setImages((prev) => [...prev].reverse());
    setResult(null);
  };

  // ---------- PROCESS (Build PDF) ----------

  const buildPDF = async () => {
    const doc = await PDFDocument.create();
    const sizeConfig = PAGE_SIZES[pageSize];

    for (const img of images) {
      // Load image
      const arrayBuffer = await readFileAsArrayBuffer(img.file);
      const bytes = new Uint8Array(arrayBuffer);

      // Embed image (PDF-lib supports JPG and PNG)
      let embedded;
      const isPng = img.file.type.includes("png");
      const isJpg = img.file.type.includes("jpeg") || img.file.type.includes("jpg");

      if (isPng) {
        embedded = await doc.embedPng(bytes);
      } else if (isJpg) {
        embedded = await doc.embedJpg(bytes);
      } else {
        // Convert to PNG via canvas
        const converted = await convertToPngBlob(img.preview);
        embedded = await doc.embedPng(converted);
      }

      // Determine page dimensions
      let pageW: number;
      let pageH: number;
      let isLandscape = img.width > img.height;

      if (sizeConfig === null) {
        // Fit to image size
        pageW = img.width + margin * 2;
        pageH = img.height + margin * 2;
      } else {
        pageW = sizeConfig.w;
        pageH = sizeConfig.h;

        // Apply orientation
        if (orientation === "landscape") {
          [pageW, pageH] = [pageH, pageW];
        } else if (orientation === "portrait") {
          // keep as is
        } else {
          // auto
          if (isLandscape && img.rotation % 180 === 0) {
            [pageW, pageH] = [pageH, pageW];
          }
        }
      }

      const page = doc.addPage([pageW, pageH]);

      // Compute image placement
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;

      const imgAspect = embedded.width / embedded.height;
      const boxAspect = availW / availH;

      let drawW: number;
      let drawH: number;

      if (fitMode === "stretch") {
        drawW = availW;
        drawH = availH;
      } else if (fitMode === "contain") {
        if (imgAspect > boxAspect) {
          drawW = availW;
          drawH = availW / imgAspect;
        } else {
          drawH = availH;
          drawW = availH * imgAspect;
        }
      } else {
        // cover
        if (imgAspect > boxAspect) {
          drawH = availH;
          drawW = availH * imgAspect;
        } else {
          drawW = availW;
          drawH = availW / imgAspect;
        }
      }

      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;

      // Draw image with rotation
      page.drawImage(embedded, {
        x,
        y,
        width: drawW,
        height: drawH,
        rotate: degrees(img.rotation),
      });
    }

    return await doc.save();
  };

  // Helper: convert any image to PNG bytes
  const convertToPngBlob = (dataUrl: string): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (!blob) return reject(new Error("Conversion failed"));
          const arrBuf = await blob.arrayBuffer();
          resolve(new Uint8Array(arrBuf));
        }, "image/png");
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setError("Please add at least one image.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const bytes = await buildPDF();
      const blob = createBlobFromBytes(bytes, "application/pdf");

      setResult({
        blob,
        filename: images.length === 1 ? `${images[0].file.name.replace(/\.[^.]+$/, "")}.pdf` : `images-${images.length}-pages.pdf`,
        totalPages: images.length,
      });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || "Failed to create PDF. Please try again." : "Failed to create PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ---------- PREVIEW ----------

  const nextPreview = () => setPreviewIndex((i) => Math.min(i + 1, images.length - 1));
  const prevPreview = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  // ---------- STATS ----------

  const totalSize = images.reduce((sum, img) => sum + img.file.size, 0);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload images"
      />

      {/* Vertical rules */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      <div className="container mx-auto px-8 relative max-w-[1400px]">
        {/* Top meta */}
        <div className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Convert Images — To PDF</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Free</span>
            <span>·</span>
            <span>Client-side</span>
          </div>
        </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Chapter 03 — Convert</div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              JPG to <span className="italic text-[#ff6a00]">PDF</span>.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">Convert JPG, PNG, WebP, and other images into a beautifully formatted PDF. Drag to reorder, control page layout, preview live.</p>
          </div>
        </motion.div>

        {/* ============================================ */}
        {/* UPLOAD */}
        {/* ============================================ */}
        {images.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative p-16 rounded-[22px] bg-white border-2 border-dashed transition-all duration-300 cursor-pointer ${isDragging ? "border-[#ff6a00] bg-[#ff6a00]/[0.03] scale-[1.01]" : "border-black/[0.12] hover:border-[#ff6a00]/40"}`}
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: isDragging ? -8 : 0, scale: isDragging ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <ImageIcon
                    size={32}
                    strokeWidth={1.5}
                    className="text-[#ff6a00]"
                  />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {isDragging ? "Drop images here" : "Select or drop images"}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">Drag multiple JPG, PNG, or WebP files. Combine them into a single PDF with custom page layout.</p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <UploadCloud size={14} />
                  Choose images
                  <ArrowUpRight size={12} />
                </span>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[13px]"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: ImageIcon, label: "JPG · PNG · WebP" },
                { icon: GripVertical, label: "Drag to reorder" },
                { icon: Settings2, label: "Page layouts" },
                { icon: Eye, label: "Live preview" },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 p-4 rounded-[14px] bg-white/60 border border-black/[0.06]"
                  >
                    <Icon
                      size={14}
                      className="text-[#ff6a00]"
                      strokeWidth={1.75}
                    />
                    <span className="text-[12px] text-black/70">{f.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ============================================ */}
        {/* LOADING */}
        {/* ============================================ */}
        {isLoading && images.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <Loader2
                size={40}
                className="text-[#ff6a00]"
              />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">Loading images...</span>
          </div>
        )}

        {/* ============================================ */}
        {/* WORKSPACE */}
        {/* ============================================ */}
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <ImageIcon
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">{images.length}</span>
                  <span className="text-[12px] text-black/50">{images.length === 1 ? "image" : "images"}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <FileText
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">{images.length}</span>
                  <span className="text-[12px] text-black/50">PDF pages</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">{formatBytes(totalSize)}</span>
                  <span className="text-[12px] text-black/50">total size</span>
                </div>
                {isLoading && (
                  <>
                    <div className="w-px h-4 bg-black/10" />
                    <div className="flex items-center gap-2">
                      <Loader2
                        size={14}
                        className="text-[#ff6a00] animate-spin"
                      />
                      <span className="text-[12px] text-black/50">Loading more...</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={reverseOrder}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] bg-black/[0.05] text-black/60 hover:bg-black/10 transition-colors"
                >
                  <RotateCw size={12} />
                  Reverse
                </button>
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                  Clear all
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[13px]"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Workspace Grid */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* LEFT — Image list with drag-reorder */}
              <div className="lg:col-span-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4 flex items-center justify-between">
                  <span>Images — Drag to reorder</span>
                  <span>
                    {images.length} {images.length === 1 ? "image" : "images"}
                  </span>
                </div>

                <Reorder.Group
                  axis="y"
                  values={images}
                  onReorder={(newOrder) => {
                    setImages(newOrder);
                    setResult(null);
                  }}
                  className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1"
                >
                  {images.map((img, index) => (
                    <Reorder.Item
                      key={img.id}
                      value={img}
                      className="group cursor-grab active:cursor-grabbing"
                      whileDrag={{ scale: 1.02, zIndex: 10, boxShadow: "0 20px 50px -15px rgba(255,106,0,0.25)" }}
                    >
                      <div
                        className={`flex items-center gap-3 p-3 rounded-[16px] bg-white border transition-all duration-300 ${previewIndex === index ? "border-[#ff6a00]/40 shadow-[0_8px_30px_-10px_rgba(255,106,0,0.2)]" : "border-black/[0.06] hover:border-black/[0.12]"}`}
                        onClick={() => setPreviewIndex(index)}
                      >
                        {/* Drag handle */}
                        <div className="shrink-0 text-black/20 group-hover:text-black/40 transition-colors">
                          <GripVertical size={16} />
                        </div>

                        {/* Thumbnail */}
                        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[#f4f1ea] border border-black/[0.08] relative">
                          <img
                            src={img.preview}
                            alt={img.file.name}
                            className="w-full h-full object-cover"
                            style={{ transform: `rotate(${img.rotation}deg)` }}
                          />
                          <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-tl-md">{index + 1}</div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-black truncate mb-0.5">{img.file.name}</div>
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.1em] text-black/40">
                            <span>
                              {img.width}×{img.height}
                            </span>
                            <span>·</span>
                            <span>{formatBytes(img.file.size)}</span>
                          </div>
                        </div>

                        {/* Rotate buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateImage(img.id, -1);
                            }}
                            className="w-7 h-7 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-[#ff6a00] transition-colors"
                            aria-label="Rotate left"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateImage(img.id, 1);
                            }}
                            className="w-7 h-7 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-[#ff6a00] transition-colors"
                            aria-label="Rotate right"
                          >
                            <RotateCw size={12} />
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="shrink-0 w-7 h-7 rounded-md hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/30 transition-colors"
                          aria-label="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>

                {/* Add more */}
                <button
                  onClick={() => inputRef.current?.click()}
                  disabled={isLoading}
                  className="mt-3 w-full py-3.5 rounded-[16px] border-2 border-dashed border-black/[0.08] hover:border-[#ff6a00]/40 hover:bg-[#ff6a00]/[0.02] flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 hover:text-[#ff6a00] transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                      Loading...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      Add more images
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT — Settings + Preview */}
              <div className="lg:col-span-7 space-y-5">
                {/* Settings panel (collapsible) */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full px-6 py-4 flex items-center justify-between border-b border-black/[0.06] hover:bg-black/[0.01] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings2
                        size={14}
                        className="text-[#ff6a00]"
                      />
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Page Settings</span>
                    </div>
                    <ChevronRight
                      size={14}
                      className={`text-black/40 transition-transform duration-300 ${showSettings ? "rotate-90" : ""}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {showSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-6">
                          {/* Page size */}
                          <div>
                            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">Page size</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(Object.keys(PAGE_SIZES) as PageSize[]).map((key) => (
                                <button
                                  key={key}
                                  onClick={() => {
                                    setPageSize(key);
                                    setResult(null);
                                  }}
                                  className={`py-2.5 rounded-lg text-[12px] font-medium transition-all border ${pageSize === key ? "bg-[#ff6a00] text-white border-[#ff6a00]" : "bg-white border-black/[0.08] text-black/60 hover:border-black/[0.2]"}`}
                                >
                                  {key === "fit" ? "Fit image" : PAGE_SIZES[key]?.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Orientation */}
                          {pageSize !== "fit" && (
                            <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">Orientation</label>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { id: "auto", label: "Auto", icon: Maximize },
                                  { id: "portrait", label: "Portrait", icon: Minimize },
                                  { id: "landscape", label: "Landscape", icon: Maximize },
                                ].map((o) => {
                                  const Icon = o.icon;
                                  return (
                                    <button
                                      key={o.id}
                                      onClick={() => {
                                        setOrientation(o.id as Orientation);
                                        setResult(null);
                                      }}
                                      className={`py-2.5 rounded-lg text-[12px] font-medium transition-all border flex items-center justify-center gap-1.5 ${orientation === o.id ? "bg-[#ff6a00] text-white border-[#ff6a00]" : "bg-white border-black/[0.08] text-black/60 hover:border-black/[0.2]"}`}
                                    >
                                      <Icon size={12} />
                                      {o.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Margin */}
                          <div>
                            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">Margin</label>
                            <div className="grid grid-cols-4 gap-2">
                              {MARGINS.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    setMargin(m.value);
                                    setResult(null);
                                  }}
                                  className={`py-2.5 rounded-lg text-[12px] font-medium transition-all border ${margin === m.value ? "bg-[#ff6a00] text-white border-[#ff6a00]" : "bg-white border-black/[0.08] text-black/60 hover:border-black/[0.2]"}`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Fit mode */}
                          {pageSize !== "fit" && (
                            <div>
                              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">Image fit</label>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { id: "contain", label: "Contain", desc: "Fit inside" },
                                  { id: "cover", label: "Cover", desc: "Fill page" },
                                  { id: "stretch", label: "Stretch", desc: "Distort" },
                                ].map((f) => (
                                  <button
                                    key={f.id}
                                    onClick={() => {
                                      setFitMode(f.id as FitMode);
                                      setResult(null);
                                    }}
                                    className={`p-2.5 rounded-lg text-left transition-all border ${fitMode === f.id ? "bg-[#ff6a00]/[0.06] border-[#ff6a00]/40" : "bg-white border-black/[0.08] hover:border-black/[0.2]"}`}
                                  >
                                    <div className={`text-[12px] font-medium ${fitMode === f.id ? "text-[#ff6a00]" : "text-black"}`}>{f.label}</div>
                                    <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-black/40 mt-0.5">{f.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quality */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Image quality</label>
                              <span className="text-[11px] font-mono text-[#ff6a00]">{quality}%</span>
                            </div>
                            <input
                              type="range"
                              min={60}
                              max={100}
                              value={quality}
                              onChange={(e) => {
                                setQuality(parseInt(e.target.value));
                                setResult(null);
                              }}
                              className="w-full accent-[#ff6a00]"
                            />
                            <div className="flex justify-between text-[9px] font-mono uppercase tracking-[0.1em] text-black/30 mt-1">
                              <span>Smaller file</span>
                              <span>Better quality</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Live preview */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden lg:sticky lg:top-32">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                    <div className="flex items-center gap-2.5">
                      <Eye
                        size={14}
                        className="text-[#ff6a00]"
                      />
                      <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/60">Live Preview</span>
                    </div>
                    {images.length > 1 && (
                      <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.1em] text-black/50">
                        <button
                          onClick={prevPreview}
                          disabled={previewIndex === 0}
                          className="w-6 h-6 rounded-md hover:bg-black/[0.06] disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <span>
                          {previewIndex + 1} / {images.length}
                        </span>
                        <button
                          onClick={nextPreview}
                          disabled={previewIndex === images.length - 1}
                          className="w-6 h-6 rounded-md hover:bg-black/[0.06] disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preview canvas */}
                  <div className="p-8 bg-[#ebe7de]/40 flex items-center justify-center min-h-[500px] relative">
                    {/* Dot grid */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                        backgroundSize: "20px 20px",
                      }}
                    />

                    {/* Simulated PDF page */}
                    {images[previewIndex] && (
                      <PDFPagePreview
                        image={images[previewIndex]}
                        pageSize={pageSize}
                        orientation={orientation}
                        margin={margin}
                        fitMode={fitMode}
                      />
                    )}

                    {/* Badge */}
                    <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-sm text-white text-[10px] font-mono tracking-[0.1em] shadow-lg">
                      <FileText
                        size={10}
                        className="inline -mt-0.5 mr-1.5"
                      />
                      Page {previewIndex + 1} · {pageSize === "fit" ? "Fit" : PAGE_SIZES[pageSize]?.label}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3 border-t border-black/[0.06] bg-white flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      Output: {images.length} page{images.length !== 1 ? "s" : ""} PDF
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">{margin > 0 ? `${margin}pt margin` : "No margin"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* STATUS BAR */}
            {/* ============================================ */}
            {!result && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 mb-6 p-5 rounded-[18px] bg-gradient-to-r from-[#ff6a00]/[0.04] to-transparent border border-[#ff6a00]/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                    <Sparkles
                      size={16}
                      className="text-[#ff6a00]"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-black mb-0.5">Ready to convert</div>
                    <div className="text-[12px] text-black/60">
                      <span className="font-medium text-[#ff6a00]">
                        {images.length} page{images.length !== 1 ? "s" : ""}
                      </span>{" "}
                      · {PAGE_SIZES[pageSize]?.label || "Fit to image"} · {formatBytes(totalSize)} total input
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* PROCESSING */}
            {/* ============================================ */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 mb-6 rounded-[18px] bg-white border border-black/[0.06] p-5 overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <Loader2
                      size={16}
                      className="text-[#ff6a00] animate-spin"
                    />
                    <span className="text-[13px] text-black">
                      Building PDF from {images.length} image{images.length !== 1 ? "s" : ""}...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* RESULT */}
            {/* ============================================ */}
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 mb-6 rounded-[22px] bg-white border border-emerald-500/20 p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2
                    size={28}
                    className="text-emerald-500"
                  />
                </div>
                <h3
                  className="text-[24px] text-black mb-2"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  PDF created!
                </h3>
                <p className="text-[13px] text-black/55 mb-2">
                  {result.totalPages} page{result.totalPages !== 1 ? "s" : ""} · {formatBytes(result.blob.size)}
                </p>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-8">{result.filename}</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={downloadResult}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/[0.12] text-[13px] font-medium hover:bg-black/[0.03] transition-colors"
                  >
                    <RefreshCw size={14} />
                    Create again
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* CONVERT BUTTON */}
            {/* ============================================ */}
            {!result && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleConvert}
                disabled={images.length === 0}
                className={`group w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 ${images.length === 0 ? "bg-black/[0.08] text-black/40 cursor-not-allowed" : "bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]"}`}
              >
                <span className="inline-flex items-center gap-3">
                  <FileText size={16} />
                  Create PDF from {images.length} image{images.length !== 1 ? "s" : ""}
                  <ArrowUpRight
                    size={14}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </span>
              </motion.button>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[13px]"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Back link */}
        <div className="mt-16 text-center">
          <Link
            href="/pdf-tools"
            className="group inline-flex items-center gap-3"
          >
            <span className="relative text-[14px] font-medium text-black pb-1">
              Back to all tools
              <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
            </span>
            <span className="w-8 h-8 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
              <ArrowUpRight
                size={13}
                className="text-black group-hover:text-white transition-colors"
              />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PDF PAGE PREVIEW (Simulated)
// ============================================

function PDFPagePreview({ image, pageSize, orientation, margin, fitMode }: { image: ImageFile; pageSize: PageSize; orientation: Orientation; margin: number; fitMode: FitMode }) {
  const sizeConfig = PAGE_SIZES[pageSize];

  // Compute preview dimensions
  const containerW = 340;
  let pageW = containerW;
  let pageH = containerW * 1.414;

  const isRotated = image.rotation % 180 !== 0;
  const imgW = isRotated ? image.height : image.width;
  const imgH = isRotated ? image.width : image.height;

  if (sizeConfig === null) {
    // Fit to image
    const aspect = imgW / imgH;
    if (aspect > 1) {
      pageW = containerW;
      pageH = containerW / aspect;
    } else {
      pageH = containerW * 1.414;
      pageW = pageH * aspect;
    }
  } else {
    // Standard page
    let ratio = sizeConfig.h / sizeConfig.w;
    if (orientation === "landscape") ratio = 1 / ratio;
    else if (orientation === "auto" && imgW > imgH) ratio = 1 / ratio;

    pageH = containerW * ratio;
  }

  // Cap height
  if (pageH > 480) {
    const scale = 480 / pageH;
    pageH *= scale;
    pageW *= scale;
  }

  // Margin scaling
  const scaleFactor = pageW / (sizeConfig?.w || imgW + margin * 2);
  const marginPx = margin * scaleFactor * (sizeConfig ? 1 : 0.5);

  // Image sizing inside page
  const availW = pageW - marginPx * 2;
  const availH = pageH - marginPx * 2;

  const imgAspect = imgW / imgH;
  const boxAspect = availW / availH;

  let drawW: number;
  let drawH: number;

  if (fitMode === "stretch") {
    drawW = availW;
    drawH = availH;
  } else if (fitMode === "contain") {
    if (imgAspect > boxAspect) {
      drawW = availW;
      drawH = availW / imgAspect;
    } else {
      drawH = availH;
      drawW = availH * imgAspect;
    }
  } else {
    if (imgAspect > boxAspect) {
      drawH = availH;
      drawW = availH * imgAspect;
    } else {
      drawW = availW;
      drawH = availW / imgAspect;
    }
  }

  return (
    <motion.div
      key={`${image.id}-${pageSize}-${orientation}-${margin}-${fitMode}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] rounded-md"
      style={{ width: pageW, height: pageH }}
    >
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: marginPx,
          top: marginPx,
          right: marginPx,
          bottom: marginPx,
        }}
      >
        <img
          src={image.preview}
          alt=""
          className="block"
          style={{
            width: drawW,
            height: drawH,
            objectFit: fitMode === "stretch" ? "fill" : fitMode === "cover" ? "cover" : "contain",
            transform: `rotate(${image.rotation}deg)`,
            transformOrigin: "center",
          }}
          draggable={false}
        />
      </div>

      {/* Subtle page border overlay */}
      <div className="absolute inset-0 rounded-md border border-black/[0.06] pointer-events-none" />
    </motion.div>
  );
}
