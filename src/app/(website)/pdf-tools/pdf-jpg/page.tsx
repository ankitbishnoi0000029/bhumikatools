"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, Image as ImageIcon, ArrowUpRight, Eye,
  Sparkles, Grid3x3, ChevronLeft, ChevronRight, Check, ZoomIn,
  Settings2, FileStack, Package,
} from 'lucide-react';
import {
  getPDFInfo,
  formatBytes,
  downloadBlob,
  downloadAsZip,
  readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface PageThumb {
  pageNum: number;
  dataUrl: string;
}

interface ConvertedImage {
  pageNum: number;
  dataUrl: string;
  blob: Blob;
  size: number;
}

type OutputFormat = 'jpeg' | 'png' | 'webp';

const FORMATS: { id: OutputFormat; label: string; ext: string; mime: string }[] = [
  { id: 'jpeg', label: 'JPG', ext: 'jpg', mime: 'image/jpeg' },
  { id: 'png', label: 'PNG', ext: 'png', mime: 'image/png' },
  { id: 'webp', label: 'WebP', ext: 'webp', mime: 'image/webp' },
];

const QUALITIES = [
  { id: 'sd', label: 'Standard', scale: 1, desc: '72 DPI · Smallest' },
  { id: 'hd', label: 'HD', scale: 2, desc: '150 DPI · Balanced' },
  { id: 'fhd', label: 'Full HD', scale: 3, desc: '300 DPI · Print ready' },
  { id: '4k', label: 'Ultra', scale: 4, desc: '600 DPI · Max detail' },
];

// ============================================
// PAGE
// ============================================

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [quality, setQuality] = useState('hd');
  const [jpegQuality, setJpegQuality] = useState(92); // 0-100
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ConvertedImage[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ---------- GENERATE THUMBNAILS ----------

  const generateThumbs = useCallback(
    async (f: File) => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const bytes = await readFileAsArrayBuffer(f);
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const loaded: PageThumb[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        loaded.push({
          pageNum: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.7),
        });
        setLoadProgress(Math.round((i / pdf.numPages) * 100));
      }
      return loaded;
    },
    []
  );

  // ---------- LOAD PDF ----------

  const loadPDF = useCallback(
    async (f: File) => {
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a PDF file.');
        return;
      }

      setIsLoading(true);
      setError(null);
      setFile(f);
      setImages(null);
      setSelectedPages(new Set());
      setThumbs([]);
      setLoadProgress(0);
      setPreviewIndex(0);

      try {
        const info = await getPDFInfo(f);
        setPageCount(info.pageCount);
        const loaded = await generateThumbs(f);
        setThumbs(loaded);
        // Default: select all pages
        setSelectedPages(new Set(loaded.map((t) => t.pageNum)));
      } catch (e) {
        setError('Failed to load PDF. The file may be corrupted.');
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [generateThumbs]
  );

  // ---------- INPUT ----------

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadPDF(e.target.files[0]);
    e.target.value = '';
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
    if (e.dataTransfer.files[0]) loadPDF(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setFile(null);
    setThumbs([]);
    setSelectedPages(new Set());
    setImages(null);
    setPageCount(0);
    setError(null);
    setPreviewIndex(0);
    setProcessProgress(0);
  };

  // ---------- PAGE SELECTION ----------

  const togglePage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
    setImages(null);
  };

  const selectAll = () => {
    setSelectedPages(new Set(thumbs.map((t) => t.pageNum)));
    setImages(null);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    setImages(null);
  };

  // ---------- CONVERT ----------

  const handleConvert = async () => {
    if (!file) return;
    if (selectedPages.size === 0) {
      setError('Please select at least one page.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessProgress(0);
    setImages(null);

    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const bytes = await readFileAsArrayBuffer(file);
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const qualityConfig = QUALITIES.find((q) => q.id === quality)!;
      const formatConfig = FORMATS.find((f) => f.id === format)!;

      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const converted: ConvertedImage[] = [];

      for (let i = 0; i < sortedPages.length; i++) {
        const pageNum = sortedPages[i];
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: qualityConfig.scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        // White background for JPEG
        if (format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        const dataUrl = canvas.toDataURL(
          formatConfig.mime,
          format === 'png' ? undefined : jpegQuality / 100
        );

        // Convert dataUrl to Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        converted.push({
          pageNum,
          dataUrl,
          blob,
          size: blob.size,
        });

        setProcessProgress(Math.round(((i + 1) / sortedPages.length) * 100));
      }

      setImages(converted);
    } catch (e: any) {
      setError(e.message || 'Failed to convert PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- DOWNLOAD ----------

  const downloadOne = (img: ConvertedImage) => {
    const formatConfig = FORMATS.find((f) => f.id === format)!;
    downloadBlob(img.blob, `page-${img.pageNum}.${formatConfig.ext}`);
  };

  const downloadAll = async () => {
    if (!images) return;
    const formatConfig = FORMATS.find((f) => f.id === format)!;
    if (images.length === 1) {
      downloadOne(images[0]);
      return;
    }

    // ZIP them
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    images.forEach((img) => {
      zip.file(`page-${img.pageNum}.${formatConfig.ext}`, img.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `pdf-images-${formatConfig.ext}.zip`);
  };

  // ---------- PREVIEW ----------

  const nextPreview = () =>
    setPreviewIndex((i) => Math.min(i + 1, thumbs.length - 1));
  const prevPreview = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  // ---------- STATS ----------

  const totalImageSize = images
    ? images.reduce((sum, img) => sum + img.size, 0)
    : 0;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload PDF"
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
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              Convert PDF — To Images
            </span>
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
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Chapter 03 — Convert
            </div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              PDF to <span className="italic text-[#ff6a00]">images</span>.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Convert every page into a JPG, PNG, or WebP image. Choose quality,
              preview live, and download as ZIP.
            </p>
          </div>
        </motion.div>

        {/* ============================================ */}
        {/* UPLOAD */}
        {/* ============================================ */}
        {!file && !isLoading && (
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
              className={`relative p-16 rounded-[22px] bg-white border-2 border-dashed transition-all duration-300 cursor-pointer ${
                isDragging
                  ? 'border-[#ff6a00] bg-[#ff6a00]/[0.03] scale-[1.01]'
                  : 'border-black/[0.12] hover:border-[#ff6a00]/40'
              }`}
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: isDragging ? -8 : 0, scale: isDragging ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <ImageIcon size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">
                  Convert each PDF page into a high-quality image. Preview before
                  download, choose from 3 formats.
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <UploadCloud size={14} />
                  Choose PDF file
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
                { icon: ImageIcon, label: 'JPG · PNG · WebP' },
                { icon: Eye, label: 'Live preview' },
                { icon: Sparkles, label: 'Up to 4K' },
                { icon: Package, label: 'ZIP download' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center gap-3 p-4 rounded-[14px] bg-white/60 border border-black/[0.06]">
                    <Icon size={14} className="text-[#ff6a00]" strokeWidth={1.75} />
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
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <ImageIcon size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Loading pages... {loadProgress}%
            </span>
            <div className="mt-4 w-64 h-1 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-[#ff6a00]"
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* WORKSPACE */}
        {/* ============================================ */}
        {file && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* File info strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex items-center gap-4 min-w-0">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center">
                  <FileText size={18} className="text-[#ff6a00]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-black truncate max-w-[300px]">
                    {file.name}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.1em] text-black/40 mt-0.5">
                    <span>{pageCount} pages</span>
                    <span>·</span>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
              >
                <X size={12} />
                Change file
              </button>
            </div>

            {/* Main workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

              {/* LEFT: Settings + Page picker */}
              <div className="lg:col-span-5 space-y-5">

                {/* Output format */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings2 size={14} className="text-[#ff6a00]" />
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                      Output format
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { setFormat(f.id); setImages(null); }}
                        className={`py-3 rounded-xl text-[13px] font-medium transition-all duration-200 border ${
                          format === f.id
                            ? 'bg-[#ff6a00] text-white border-[#ff6a00] shadow-[0_8px_20px_-8px_rgba(255,106,0,0.5)]'
                            : 'bg-white border-black/[0.08] text-black/60 hover:border-black/[0.2]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={14} className="text-[#ff6a00]" />
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                      Quality
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {QUALITIES.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => { setQuality(q.id); setImages(null); }}
                        className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                          quality === q.id
                            ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                            : 'bg-white border-black/[0.08] hover:border-black/[0.2]'
                        }`}
                      >
                        <div className={`text-[12px] font-medium mb-0.5 ${quality === q.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                          {q.label}
                        </div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.05em] text-black/40">
                          {q.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* JPEG quality slider */}
                  {format !== 'png' && (
                    <div className="mt-4 pt-4 border-t border-black/[0.06]">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          Compression
                        </span>
                        <span className="text-[11px] font-mono text-[#ff6a00]">
                          {jpegQuality}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={60}
                        max={100}
                        value={jpegQuality}
                        onChange={(e) => { setJpegQuality(parseInt(e.target.value)); setImages(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                      <div className="flex justify-between text-[9px] font-mono uppercase tracking-[0.1em] text-black/30 mt-1">
                        <span>Smaller</span>
                        <span>Better</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Page picker */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Grid3x3 size={14} className="text-[#ff6a00]" />
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                        Pages to convert
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAll}
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-[#ff6a00]/10 hover:text-[#ff6a00] transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] text-black/40 hover:text-red-500 transition-colors"
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] mb-3">
                    {selectedPages.size} / {pageCount} selected
                  </div>

                  <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {thumbs.map((t) => {
                      const isSelected = selectedPages.has(t.pageNum);
                      return (
                        <motion.button
                          key={t.pageNum}
                          onClick={() => togglePage(t.pageNum)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          className={`relative aspect-[8.5/11] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-[#ff6a00] shadow-[0_6px_16px_-6px_rgba(255,106,0,0.4)]'
                              : 'border-black/[0.06] hover:border-black/[0.2] opacity-50'
                          }`}
                        >
                          <img
                            src={t.dataUrl}
                            alt={`Page ${t.pageNum}`}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                          <div
                            className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                              isSelected ? 'bg-[#ff6a00] text-white' : 'bg-black/60 text-white'
                            }`}
                          >
                            {t.pageNum}
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#ff6a00]/10 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-[#ff6a00] flex items-center justify-center">
                                <Check size={11} className="text-white" strokeWidth={3} />
                              </div>
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT: Preview / Results */}
              <div className="lg:col-span-7">
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden lg:sticky lg:top-32">

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                    <div className="flex items-center gap-2.5">
                      <Eye size={14} className="text-[#ff6a00]" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/60">
                        {images ? 'Converted preview' : 'Live preview'}
                      </span>
                    </div>
                    {!images && thumbs.length > 1 && (
                      <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.1em] text-black/50">
                        <button
                          onClick={prevPreview}
                          disabled={previewIndex === 0}
                          className="w-6 h-6 rounded-md hover:bg-black/[0.06] disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronLeft size={12} />
                        </button>
                        <span>{previewIndex + 1} / {thumbs.length}</span>
                        <button
                          onClick={nextPreview}
                          disabled={previewIndex === thumbs.length - 1}
                          className="w-6 h-6 rounded-md hover:bg-black/[0.06] disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                    {images && (
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#ff6a00]">
                        {images.length} image{images.length !== 1 ? 's' : ''} ready
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-8 bg-[#ebe7de]/40 flex items-center justify-center min-h-[500px] relative">

                    {/* Live preview (before convert) */}
                    {!images && thumbs[previewIndex] && (
                      <>
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                            backgroundSize: '20px 20px',
                          }}
                        />
                        <div className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-lg overflow-hidden max-w-[380px]">
                          <img
                            src={thumbs[previewIndex].dataUrl}
                            alt={`Page ${thumbs[previewIndex].pageNum}`}
                            className="block w-full h-auto"
                            draggable={false}
                          />
                        </div>

                        {/* Format badge */}
                        <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-sm text-white text-[10px] font-mono tracking-[0.1em] shadow-lg">
                          <ImageIcon size={10} className="inline -mt-0.5 mr-1.5" />
                          {FORMATS.find((f) => f.id === format)?.label} · {QUALITIES.find((q) => q.id === quality)?.label}
                        </div>
                      </>
                    )}

                    {/* Converted preview (after convert) */}
                    {images && images.length > 0 && (
                      <>
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                            backgroundSize: '20px 20px',
                          }}
                        />
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={images[previewIndex]?.pageNum}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-lg overflow-hidden max-w-[380px]"
                          >
                            <img
                              src={images[previewIndex]?.dataUrl}
                              alt={`Page ${images[previewIndex]?.pageNum}`}
                              className="block w-full h-auto"
                              draggable={false}
                            />
                          </motion.div>
                        </AnimatePresence>

                        {/* Angle badge */}
                        <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-emerald-500/95 backdrop-blur-sm text-white text-[10px] font-mono tracking-[0.1em] shadow-lg flex items-center gap-1.5">
                          <Check size={10} strokeWidth={3} />
                          Converted · {formatBytes(images[previewIndex]?.size || 0)}
                        </div>

                        {/* Prev/next for images */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                              disabled={previewIndex === 0}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-black/[0.06] flex items-center justify-center text-black/60 hover:bg-[#ff6a00] hover:text-white hover:border-[#ff6a00] transition-all disabled:opacity-30"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={() => setPreviewIndex((i) => Math.min(images.length - 1, i + 1))}
                              disabled={previewIndex === images.length - 1}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-black/[0.06] flex items-center justify-center text-black/60 hover:bg-[#ff6a00] hover:text-white hover:border-[#ff6a00] transition-all disabled:opacity-30"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-black/[0.06] bg-white">
                    {!images && (
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        <span>Page {thumbs[previewIndex]?.pageNum || 0} of {pageCount}</span>
                        <span>Preview · not converted yet</span>
                      </div>
                    )}
                    {images && (
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          {images.length} image{images.length !== 1 ? 's' : ''} · {formatBytes(totalImageSize)} total
                        </div>
                        <div className="flex items-center gap-1.5">
                          {images.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewIndex(i)}
                              className={`h-1 rounded-full transition-all duration-300 ${
                                i === previewIndex ? 'w-4 bg-[#ff6a00]' : 'w-1 bg-black/20 hover:bg-black/40'
                              }`}
                              aria-label={`Preview image ${i + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* STATUS BAR */}
            {/* ============================================ */}
            {!images && selectedPages.size > 0 && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-5 rounded-[18px] bg-gradient-to-r from-[#ff6a00]/[0.04] to-transparent border border-[#ff6a00]/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-[#ff6a00]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-black mb-0.5">
                      Live Preview
                    </div>
                    <div className="text-[12px] text-black/60">
                      Will convert <span className="font-medium text-[#ff6a00]">{selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''}</span>
                      {' '}to {FORMATS.find((f) => f.id === format)?.label} at {QUALITIES.find((q) => q.id === quality)?.label} quality
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
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 rounded-[18px] bg-white border border-black/[0.06] p-5 overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 size={16} className="text-[#ff6a00] animate-spin" />
                    <span className="text-[13px] text-black">Converting pages...</span>
                    <span className="ml-auto text-[11px] font-mono text-black/40">
                      {processProgress}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full bg-[#ff6a00]"
                      initial={{ width: 0 }}
                      animate={{ width: `${processProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* RESULT — Download section */}
            {/* ============================================ */}
            {images && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-[22px] bg-white border border-emerald-500/20 p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <h3
                    className="text-[24px] text-black mb-2"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Converted successfully!
                  </h3>
                  <p className="text-[13px] text-black/55 mb-8">
                    {images.length} image{images.length !== 1 ? 's' : ''} · {formatBytes(totalImageSize)} total
                  </p>

                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={downloadAll}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                    >
                      {images.length === 1 ? (
                        <>
                          <Download size={14} />
                          Download image
                        </>
                      ) : (
                        <>
                          <Package size={14} />
                          Download all (ZIP)
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { setImages(null); setPreviewIndex(0); setProcessProgress(0); }}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/[0.12] text-[13px] font-medium hover:bg-black/[0.03] transition-colors"
                    >
                      <RefreshCw size={14} />
                      Convert again
                    </button>
                  </div>
                </div>

                {/* Image grid */}
                {images.length > 1 && (
                  <div className="pt-6 border-t border-black/[0.06]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                        All images ({images.length})
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Click to download
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {images.map((img, i) => (
                        <motion.button
                          key={img.pageNum}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => downloadOne(img)}
                          onMouseEnter={() => setPreviewIndex(i)}
                          className={`group relative aspect-[8.5/11] rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                            i === previewIndex
                              ? 'border-[#ff6a00] shadow-[0_8px_24px_-8px_rgba(255,106,0,0.3)]'
                              : 'border-black/[0.06] hover:border-[#ff6a00]/40'
                          }`}
                        >
                          <img
                            src={img.dataUrl}
                            alt={`Page ${img.pageNum}`}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                          {/* Page badge */}
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-black/70 text-white">
                            {img.pageNum}
                          </div>
                          {/* Size badge */}
                          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono bg-black/70 text-white">
                            {formatBytes(img.size)}
                          </div>
                          {/* Hover download overlay */}
                          <div className="absolute inset-0 bg-[#ff6a00]/85 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Download size={18} className="text-white" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ============================================ */}
            {/* CONVERT BUTTON */}
            {/* ============================================ */}
            {!images && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleConvert}
                disabled={selectedPages.size === 0}
                className={`group w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 ${
                  selectedPages.size === 0
                    ? 'bg-black/[0.08] text-black/40 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <ImageIcon size={16} />
                  {selectedPages.size === 0
                    ? 'Select pages to convert'
                    : `Convert ${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''} to ${FORMATS.find((f) => f.id === format)?.label}`}
                  {selectedPages.size > 0 && (
                    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  )}
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
          <Link href="/pdf-tools" className="group inline-flex items-center gap-3">
            <span className="relative text-[14px] font-medium text-black pb-1">
              Back to all tools
              <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
            </span>
            <span className="w-8 h-8 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
              <ArrowUpRight size={13} className="text-black group-hover:text-white transition-colors" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}