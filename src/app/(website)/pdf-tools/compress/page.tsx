"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, Minimize, ArrowUpRight, Eye, Sparkles,
  ChevronLeft, ChevronRight, TrendingDown, Zap, Gauge, Settings2,
  Image as ImageIcon, Layers, FileDown, Percent, Target, type LucideIcon,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import {
  createBlobFromBytes,
  getPDFInfo,
  formatBytes,
  downloadBlob,
  readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface PageThumb {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

type CompressionPreset = 'light' | 'balanced' | 'strong' | 'extreme' | 'custom';

interface CompressionResult {
  blob: Blob;
  size: number;
  originalSize: number;
  savedBytes: number;
  savedPercent: number;
}

// ============================================
// PRESETS
// ============================================

const PRESETS: { id: CompressionPreset; label: string; desc: string; quality: number; scale: number; icon: LucideIcon; color: string }[] = [
  { id: 'light', label: 'Light', desc: 'Best quality', quality: 0.92, scale: 1.5, icon: ImageIcon, color: '#10b981' },
  { id: 'balanced', label: 'Balanced', desc: 'Good quality', quality: 0.75, scale: 1.2, icon: Gauge, color: '#3b82f6' },
  { id: 'strong', label: 'Strong', desc: 'Smaller size', quality: 0.55, scale: 1.0, icon: Zap, color: '#f59e0b' },
  { id: 'extreme', label: 'Extreme', desc: 'Tiny file', quality: 0.35, scale: 0.8, icon: Minimize, color: '#ef4444' },
];

// ============================================
// PAGE
// ============================================

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  const [quality, setQuality] = useState(0.75);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [previewMode, setPreviewMode] = useState<'original' | 'compressed'>('original');

  const inputRef = useRef<HTMLInputElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDraggingWheel = useRef(false);

  // Auto-clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Sync preset with quality/scale
  useEffect(() => {
    const p = PRESETS.find((p) => p.id === preset);
    if (p) {
      setQuality(p.quality);
      setScale(p.scale);
    }
  }, [preset]);

  // ---------- GENERATE THUMBS ----------

  const generateThumbs = useCallback(async (f: File): Promise<PageThumb[]> => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const loaded: PageThumb[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      loaded.push({
        pageNum: i,
        dataUrl: canvas.toDataURL('image/jpeg', 0.75),
        width: viewport.width,
        height: viewport.height,
      });
      setLoadProgress(Math.round((i / pdf.numPages) * 100));
    }
    return loaded;
  }, []);

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
      setThumbs([]);
      setResult(null);
      setLoadProgress(0);
      setPreviewIndex(0);
      setPreviewMode('original');

      try {
        const info = await getPDFInfo(f);
        setPageCount(info.pageCount);
        const loaded = await generateThumbs(f);
        setThumbs(loaded);
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

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) loadPDF(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setFile(null);
    setThumbs([]);
    setPageCount(0);
    setResult(null);
    setError(null);
    setPreviewIndex(0);
    setProcessProgress(0);
    setPreviewMode('original');
    setPreset('balanced');
  };

  // ---------- WHEEL INTERACTION ----------

  // Map rotation angle to quality (0-360° → 30-100% quality)
  const angleToQuality = (angle: number) => {
    const normalized = ((angle % 360) + 360) % 360;
    // 0° = 100% quality, 360° = 30% quality (highest compression)
    return 100 - (normalized / 360) * 70;
  };

  const qualityToAngle = (q: number) => {
    const normalized = ((100 - q) / 70) * 360;
    return normalized;
  };

  const getAngleFromEvent = useCallback(
    (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
      if (!wheelRef.current) return null;
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let clientX: number, clientY: number;
      if ('touches' in e && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as any).clientX;
        clientY = (e as any).clientY;
      } else {
        return null;
      }

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      return deg;
    },
    []
  );

  const handleWheelStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isDraggingWheel.current = true;
      const newAngle = getAngleFromEvent(e);
      if (newAngle !== null) {
        const q = angleToQuality(newAngle);
        setQuality(q / 100);
        setPreset('custom');
        // Scale proportional to quality
        setScale(0.8 + (q - 30) / 70 * 0.9);
      }
      setResult(null);
    },
    [getAngleFromEvent]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingWheel.current) return;
      e.preventDefault();
      const newAngle = getAngleFromEvent(e);
      if (newAngle !== null) {
        const q = angleToQuality(newAngle);
        setQuality(q / 100);
        setPreset('custom');
        setScale(0.8 + (q - 30) / 70 * 0.9);
      }
    };

    const handleEnd = () => {
      if (isDraggingWheel.current) {
        isDraggingWheel.current = false;
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [getAngleFromEvent]);

  // ---------- BUILD COMPRESSED PDF ----------

  const buildCompressedPDF = async () => {
    if (!file) throw new Error('No file');

    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(file);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const newDoc = await PDFDocument.create();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d')!;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      // Convert to JPEG with chosen quality
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const arrayBuffer = await blob.arrayBuffer();
      const imageBytes = new Uint8Array(arrayBuffer);

      const embedded = await newDoc.embedJpg(imageBytes);

      // Original page size in points
      const originalViewport = page.getViewport({ scale: 1.0 });
      const pageW = originalViewport.width;
      const pageH = originalViewport.height;

      const newPage = newDoc.addPage([pageW, pageH]);
      newPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
      });

      setProcessProgress(Math.round((i / pdf.numPages) * 100));
    }

    return await newDoc.save();
  };

  const handleCompress = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProcessProgress(0);
    setResult(null);

    try {
      const bytes = await buildCompressedPDF();
      const blob = createBlobFromBytes(bytes, 'application/pdf');
      const originalSize = file.size;
      const compressedSize = blob.size;
      const savedBytes = originalSize - compressedSize;
      const savedPercent = (savedBytes / originalSize) * 100;

      setResult({
        blob,
        size: compressedSize,
        originalSize,
        savedBytes,
        savedPercent,
      });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to compress PDF. Please try again.' : 'Failed to compress PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.pdf$/i, '');
    downloadBlob(result.blob, `${baseName}-compressed.pdf`);
  };

  // ---------- LIVE ESTIMATED SIZE ----------

  const estimatedSize = useMemo(() => {
    if (!file || !pageCount) return 0;
    // Rough estimate based on quality & scale
    // Higher quality = less compression
    const compressionFactor = (quality * 0.6 + 0.15) * (scale * 0.5 + 0.5);
    return file.size * compressionFactor;
  }, [file, pageCount, quality, scale]);

  const estimatedSaved = file ? Math.max(0, file.size - estimatedSize) : 0;
  const estimatedPercent = file ? (estimatedSaved / file.size) * 100 : 0;

  // ---------- PREVIEW NAV ----------

  const nextPreview = () => setPreviewIndex((i) => Math.min(i + 1, thumbs.length - 1));
  const prevPreview = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  // ============================================
  // RENDER
  // ============================================

  const normalizedAngle = qualityToAngle(quality * 100);

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
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
              Optimize PDF — Compress
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
              Chapter 03 — Optimize
            </div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Compress <span className="italic text-[#ff6a00]">PDF</span> files.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Spin the wheel to control compression. See size savings in real
              time. Preview before you download.
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
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <Minimize size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">
                  Reduce file size with a visual compression wheel. Choose your
                  balance of quality and size.
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
                { icon: Gauge, label: '4 presets' },
                { icon: Target, label: 'Custom wheel' },
                { icon: TrendingDown, label: 'Live size' },
                { icon: Eye, label: 'Preview' },
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
              <Loader2 size={40} className="text-[#ff6a00]" />
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
            {/* File strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
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
                    <span className="text-[#ff6a00] font-semibold">
                      {formatBytes(file.size)} original
                    </span>
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

              {/* LEFT: Wheel + Presets */}
              <div className="lg:col-span-5 space-y-5">
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 flex flex-col items-center">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-6 self-start">
                    Compression wheel — drag to adjust
                  </div>

                  {/* ============ WHEEL ============ */}
                  <div
                    ref={wheelRef}
                    onMouseDown={handleWheelStart}
                    onTouchStart={handleWheelStart}
                    className="relative w-60 h-60 select-none touch-none cursor-grab active:cursor-grabbing"
                    style={{ WebkitUserSelect: 'none' }}
                  >
                    {/* SVG ring */}
                    <svg viewBox="0 0 240 240" className="absolute inset-0 w-full h-full pointer-events-none">
                      {/* Background ring */}
                      <circle cx="120" cy="120" r="105" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="12" />

                      {/* Colored quality ring (based on quality) */}
                      <circle
                        cx="120"
                        cy="120"
                        r="105"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 105}`}
                        strokeDashoffset={`${2 * Math.PI * 105 * (1 - quality)}`}
                        transform="rotate(-90 120 120)"
                        style={{
                          transition: 'stroke-dashoffset 0.15s',
                          filter: `drop-shadow(0 0 6px ${quality > 0.7 ? '#10b981' : quality > 0.5 ? '#f59e0b' : '#ef4444'})`,
                          stroke: quality > 0.7 ? '#10b981' : quality > 0.5 ? '#f59e0b' : '#ef4444',
                        }}
                      />

                      {/* Tick marks */}
                      {Array.from({ length: 36 }).map((_, i) => {
                        const deg = i * 10;
                        const rad = ((deg - 90) * Math.PI) / 180;
                        const isMajor = deg % 90 === 0;
                        const isMid = deg % 45 === 0;
                        const r1 = 85;
                        const r2 = isMajor ? 78 : isMid ? 82 : 86;
                        const x1 = 120 + r1 * Math.cos(rad);
                        const y1 = 120 + r1 * Math.sin(rad);
                        const x2 = 120 + r2 * Math.cos(rad);
                        const y2 = 120 + r2 * Math.sin(rad);
                        return (
                          <line
                            key={i}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={isMajor ? '#0a0a0a' : 'rgba(0,0,0,0.15)'}
                            strokeWidth={isMajor ? 1.5 : 1}
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {/* Pointer indicator */}
                      <g transform={`rotate(${normalizedAngle} 120 120)`}>
                        <line
                          x1="120" y1="120"
                          x2="120" y2="22"
                          stroke="#0a0a0a"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle cx="120" cy="22" r="6" fill="#0a0a0a" />
                        <circle cx="120" cy="22" r="3" fill="white" />
                      </g>
                    </svg>

                    {/* Center knob */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white to-[#f4f1ea] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_-8px_rgba(0,0,0,0.15)] border border-black/[0.06] flex flex-col items-center justify-center">
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                          Quality
                        </div>
                        <div
                          className="text-[32px] font-medium text-black leading-none"
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {Math.round(quality * 100)}%
                        </div>
                        <div className={`text-[9px] font-mono uppercase tracking-[0.15em] mt-1 ${
                          quality > 0.7 ? 'text-emerald-500' : quality > 0.5 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {quality > 0.7 ? 'Light' : quality > 0.5 ? 'Balanced' : quality > 0.3 ? 'Strong' : 'Extreme'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="mt-8 w-full">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3 text-center">
                      Presets
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESETS.map((p) => {
                        const Icon = p.icon;
                        const isActive = preset === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { setPreset(p.id); setResult(null); }}
                            className={`p-3 rounded-xl text-[11px] font-medium transition-all border flex flex-col items-center gap-1.5 ${
                              isActive
                                ? 'text-white border-transparent shadow-lg'
                                : 'bg-white border-black/[0.08] text-black/60 hover:border-black/[0.2]'
                            }`}
                            style={isActive ? { backgroundColor: p.color } : {}}
                          >
                            <Icon size={14} />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Fine-tune */}
                    <div className="mt-4 p-4 rounded-[14px] bg-[#f4f1ea]/50 border border-black/[0.06]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          Fine-tune quality
                        </span>
                        <span className="text-[11px] font-mono text-[#ff6a00]">
                          {Math.round(quality * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        value={quality * 100}
                        onChange={(e) => {
                          const q = parseInt(e.target.value) / 100;
                          setQuality(q);
                          setScale(0.8 + (q * 100 - 20) / 80 * 0.9);
                          setPreset('custom');
                          setResult(null);
                        }}
                        className="w-full accent-[#ff6a00]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Preview + Stats */}
              <div className="lg:col-span-7 space-y-5">

                {/* Size comparison card */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <TrendingDown size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                      Size comparison
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {/* Original */}
                    <div className="p-5 rounded-[16px] bg-[#f4f1ea] border border-black/[0.06]">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                        Original
                      </div>
                      <div
                        className="text-[26px] font-medium text-black leading-none mb-1"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {formatBytes(file.size)}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-black/40">
                        {pageCount} pages
                      </div>
                    </div>

                    {/* Estimated / Compressed */}
                    <div className={`p-5 rounded-[16px] border transition-colors ${
                      result
                        ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                        : 'bg-[#ff6a00]/[0.04] border-[#ff6a00]/20'
                    }`}>
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                        {result ? 'Compressed' : 'Estimated'}
                      </div>
                      <div
                        className={`text-[26px] font-medium leading-none mb-1 ${
                          result ? 'text-emerald-600' : 'text-[#ff6a00]'
                        }`}
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {formatBytes(result ? result.size : estimatedSize)}
                      </div>
                      <div className={`text-[10px] font-mono uppercase tracking-[0.1em] ${
                        result ? 'text-emerald-600' : 'text-[#ff6a00]'
                      }`}>
                        {result ? (
                          <>{result.savedPercent.toFixed(1)}% smaller</>
                        ) : (
                          <>{estimatedPercent.toFixed(1)}% estimated</>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Savings
                      </span>
                      <span className={`text-[11px] font-mono font-semibold ${
                        (result ? result.savedPercent : estimatedPercent) > 50 ? 'text-emerald-500' :
                        (result ? result.savedPercent : estimatedPercent) > 25 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {(result ? result.savedPercent : estimatedPercent).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                      <motion.div
                        className={`h-full ${
                          (result ? result.savedPercent : estimatedPercent) > 50 ? 'bg-emerald-500' :
                          (result ? result.savedPercent : estimatedPercent) > 25 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, result ? result.savedPercent : estimatedPercent)}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center justify-between pt-4 border-t border-black/[0.06]">
                    <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-black/40">
                      {preset === 'custom' ? 'Custom mode' : `${PRESETS.find((p) => p.id === preset)?.label} preset`}
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-black/40">
                      {Math.round(quality * 100)}% quality · {scale.toFixed(1)}× scale
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                    <div className="flex items-center gap-2.5">
                      <Eye size={14} className="text-[#ff6a00]" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/60">
                        Preview
                      </span>
                    </div>
                    {thumbs.length > 1 && (
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
                  </div>

                  <div className="p-8 bg-[#ebe7de]/40 flex items-center justify-center min-h-[360px] relative">
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                      }}
                    />

                    {thumbs[previewIndex] && (
                      <div className="relative">
                        <div
                          className={`bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden max-w-[280px] transition-all duration-300 ${
                            previewMode === 'compressed' ? 'blur-[0.5px]' : ''
                          }`}
                        >
                          <img
                            src={thumbs[previewIndex].dataUrl}
                            alt=""
                            className="block w-full h-auto transition-all duration-300"
                            draggable={false}
                            style={{
                              filter: previewMode === 'compressed'
                                ? `saturate(${Math.max(0.5, quality)}) blur(${(1 - quality) * 0.5}px)`
                                : 'none',
                            }}
                          />
                        </div>

                        {/* Preview toggle */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full bg-black/70 backdrop-blur-sm shadow-lg">
                          <button
                            onClick={() => setPreviewMode('original')}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] transition-all ${
                              previewMode === 'original' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                            }`}
                          >
                            Original
                          </button>
                          <button
                            onClick={() => setPreviewMode('compressed')}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] transition-all ${
                              previewMode === 'compressed' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                            }`}
                          >
                            Compressed
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-3 border-t border-black/[0.06] bg-white flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      Page {thumbs[previewIndex]?.pageNum || 0} of {pageCount}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      {previewMode === 'compressed' ? 'Compressed view (simulated)' : 'Original view'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                    <span className="text-[13px] text-black">Compressing PDF...</span>
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
            {/* RESULT */}
            {/* ============================================ */}
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-[22px] bg-white border border-emerald-500/20 p-8"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <h3
                    className="text-[28px] text-black mb-3"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Compressed!
                  </h3>

                  {/* Big savings display */}
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                    <TrendingDown size={16} className="text-emerald-500" />
                    <span className="text-[18px] font-semibold text-emerald-600" style={{ fontFamily: 'Georgia, serif' }}>
                      {result.savedPercent.toFixed(1)}% smaller
                    </span>
                  </div>

                  {/* Size comparison */}
                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div className="text-center">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                        Before
                      </div>
                      <div className="text-[20px] font-medium text-black/50 line-through" style={{ fontFamily: 'Georgia, serif' }}>
                        {formatBytes(result.originalSize)}
                      </div>
                    </div>
                    <ArrowUpRight size={20} className="text-[#ff6a00]" />
                    <div className="text-center">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                        After
                      </div>
                      <div className="text-[22px] font-medium text-emerald-600" style={{ fontFamily: 'Georgia, serif' }}>
                        {formatBytes(result.size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={downloadResult}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                    >
                      <Download size={14} />
                      Download compressed PDF
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/[0.12] text-[13px] font-medium hover:bg-black/[0.03] transition-colors"
                    >
                      <RefreshCw size={14} />
                      Try different settings
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* STATUS BAR */}
            {/* ============================================ */}
            {!result && !isProcessing && (
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
                      Ready to compress
                    </div>
                    <div className="text-[12px] text-black/60">
                      At <span className="font-medium text-[#ff6a00]">{Math.round(quality * 100)}% quality</span>
                      {' '}· Estimated output: {formatBytes(estimatedSize)}
                      {' '}(<span className="text-emerald-600">{estimatedPercent.toFixed(0)}% smaller</span>)
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* COMPRESS BUTTON */}
            {/* ============================================ */}
            {!result && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleCompress}
                className="group w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]"
              >
                <span className="inline-flex items-center gap-3">
                  <Minimize size={16} />
                  Compress PDF at {Math.round(quality * 100)}% quality
                  <ArrowUpRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
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