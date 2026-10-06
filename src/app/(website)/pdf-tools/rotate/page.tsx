"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, RotateCw, ArrowUpRight, Eye, Sparkles,
  RotateCcw, ChevronLeft, ChevronRight, Grid3x3, Check,
} from 'lucide-react';
import {
  rotatePDF,
  createBlobFromBytes,
  getPDFInfo,
  getAllPageThumbnails,
  formatBytes,
  downloadBlob,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface PageThumb {
  pageNum: number;
  dataUrl: string;
}

type RotateTarget = 'all' | 'selected';

// ============================================
// PAGE
// ============================================

export default function RotatePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState<RotateTarget>('all');
  const [angle, setAngle] = useState(0); // rotation angle in degrees (0-360)
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  // ---------- LOAD PDF ----------

  const loadPDF = useCallback(async (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFile(f);
    setResult(null);
    setSelectedPages(new Set());
    setThumbs([]);
    setLoadProgress(0);
    setAngle(0);

    try {
      const info = await getPDFInfo(f);
      setPageCount(info.pageCount);

      const loadedThumbs = await getAllPageThumbnails(f, (cur, total) => {
        setLoadProgress(Math.round((cur / total) * 100));
      });
      setThumbs(loadedThumbs);
    } catch (e) {
      setError('Failed to load PDF. The file may be corrupted.');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setSelectedPages(new Set());
    setResult(null);
    setPageCount(0);
    setAngle(0);
    setError(null);
    setPreviewIndex(0);
  };

  // ---------- WHEEL INTERACTION ----------

  const getAngleFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
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
  }, []);

  const handleWheelStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isDraggingWheel.current = true;
    const newAngle = getAngleFromEvent(e);
    if (newAngle !== null) setAngle(Math.round(newAngle));
    setResult(null);
  }, [getAngleFromEvent]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingWheel.current) return;
      e.preventDefault();
      const newAngle = getAngleFromEvent(e);
      if (newAngle !== null) setAngle(Math.round(newAngle));
    };

    const handleEnd = () => {
      if (isDraggingWheel.current) {
        isDraggingWheel.current = false;
        // Snap to nearest 15 degrees
        setAngle((prev) => Math.round(prev / 15) * 15);
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

  // Presets
  const setPreset = (deg: number) => {
    setAngle(deg);
    setResult(null);
  };

  const resetAngle = () => {
    setAngle(0);
    setResult(null);
  };

  // ---------- PAGE SELECTION ----------

  const togglePage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
    setResult(null);
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
    setResult(null);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    setResult(null);
  };

  // ---------- PROCESS ----------

  const handleRotate = async () => {
    if (!file) return;
    if (angle === 0) {
      setError('Please set a rotation angle.');
      return;
    }
    if (target === 'selected' && selectedPages.size === 0) {
      setError('Please select at least one page.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const pages = target === 'selected' ? Array.from(selectedPages) : undefined;
      const bytes = await rotatePDF(file, angle, pages);

      const blob = createBlobFromBytes(bytes, 'application/pdf');
      const suffix = target === 'all'
        ? `all-${angle}deg`
        : `pages-${selectedPages.size}-${angle}deg`;

      setResult({
        blob,
        filename: `rotated-${suffix}.pdf`,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message || 'Failed to rotate PDF. Please try again.' : 'Failed to rotate PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ---------- PREVIEW ----------

  const previewThumb = thumbs[previewIndex];
  const nextPreview = () => setPreviewIndex((i) => Math.min(i + 1, thumbs.length - 1));
  const prevPreview = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  // Normalize angle for display
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const rotationLabel = target === 'all'
    ? `All pages · ${normalizedAngle}°`
    : `${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''} · ${normalizedAngle}°`;

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
              Organize PDF — Rotate
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
              Chapter 02 — Organize
            </div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Rotate <span className="italic text-[#ff6a00]">PDF</span> pages.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Spin the wheel to fix sideways scans, upside-down pages, or any
              orientation issue. Live preview as you rotate.
            </p>
          </div>
        </motion.div>

        {/* ============================================ */}
        {/* UPLOAD STATE */}
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
                  animate={{ rotate: isDragging ? 180 : 0, y: isDragging ? -8 : 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <RotateCw size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">
                  Choose a PDF to rotate. Rotate all pages or pick specific
                  ones with a smooth, interactive wheel.
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

            {/* Features */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: RotateCw, label: 'Interactive wheel' },
                { icon: Eye, label: 'Live preview' },
                { icon: Grid3x3, label: 'Page picker' },
                { icon: Sparkles, label: 'Presets' },
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
              <RotateCw size={40} className="text-[#ff6a00]" />
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
              <div className="flex items-center gap-3">
                {/* Target selector */}
                <div className="flex items-center gap-1 p-1 rounded-full bg-[#f4f1ea]">
                  {[
                    { id: 'all' as const, label: 'All pages' },
                    { id: 'selected' as const, label: 'Pick pages' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setTarget(opt.id); setResult(null); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                        target === opt.id
                          ? 'bg-white shadow-sm text-black'
                          : 'text-black/50 hover:text-black'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                  Change file
                </button>
              </div>
            </div>

            {/* Main workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

              {/* LEFT: Wheel */}
              <div className="lg:col-span-5">
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-8 flex flex-col items-center">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-6 self-start">
                    Rotation wheel — drag to rotate
                  </div>

                  {/* ============ WHEEL ============ */}
                  <div
                    ref={wheelRef}
                    onMouseDown={handleWheelStart}
                    onTouchStart={handleWheelStart}
                    className="relative w-64 h-64 select-none touch-none cursor-grab active:cursor-grabbing"
                    style={{ WebkitUserSelect: 'none' }}
                  >
                    {/* Outer ring with ticks */}
                    <svg viewBox="0 0 240 240" className="absolute inset-0 w-full h-full pointer-events-none">
                      {/* Main circle */}
                      <circle cx="120" cy="120" r="115" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                      <circle cx="120" cy="120" r="95" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

                      {/* Degree ticks every 15° */}
                      {Array.from({ length: 24 }).map((_, i) => {
                        const deg = i * 15;
                        const rad = ((deg - 90) * Math.PI) / 180;
                        const isMajor = deg % 90 === 0;
                        const isMid = deg % 45 === 0;
                        const r1 = 95;
                        const r2 = isMajor ? 82 : isMid ? 86 : 90;
                        const x1 = 120 + r1 * Math.cos(rad);
                        const y1 = 120 + r1 * Math.sin(rad);
                        const x2 = 120 + r2 * Math.cos(rad);
                        const y2 = 120 + r2 * Math.sin(rad);
                        return (
                          <line
                            key={i}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={isMajor ? '#ff6a00' : isMid ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.15)'}
                            strokeWidth={isMajor ? 2 : 1}
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {/* Degree labels */}
                      {[0, 90, 180, 270].map((deg) => {
                        const rad = ((deg - 90) * Math.PI) / 180;
                        const r = 72;
                        const x = 120 + r * Math.cos(rad);
                        const y = 120 + r * Math.sin(rad);
                        return (
                          <text
                            key={deg}
                            x={x} y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgba(0,0,0,0.5)"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="600"
                          >
                            {deg}°
                          </text>
                        );
                      })}

                      {/* Pointer indicator — rotates with angle */}
                      <g transform={`rotate(${angle} 120 120)`}>
                        <line
                          x1="120" y1="120"
                          x2="120" y2="30"
                          stroke="#ff6a00"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx="120" cy="30" r="5" fill="#ff6a00" />
                      </g>
                    </svg>

                    {/* Center knob */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white to-[#f4f1ea] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_8px_24px_-8px_rgba(0,0,0,0.15)] border border-black/[0.06] flex flex-col items-center justify-center">
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                          Angle
                        </div>
                        <div
                          className="text-[32px] font-medium text-black leading-none"
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {normalizedAngle}°
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preset buttons */}
                  <div className="mt-8 w-full">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3 text-center">
                      Quick presets
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          onClick={() => setPreset(deg)}
                          className={`px-4 py-2 rounded-full text-[12px] font-mono uppercase tracking-[0.1em] transition-all ${
                            normalizedAngle === deg
                              ? 'bg-[#ff6a00] text-white shadow-[0_8px_20px_-8px_rgba(255,106,0,0.5)]'
                              : 'bg-black/[0.04] text-black/60 hover:bg-black/[0.08]'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-center gap-2 mt-2">
                      <button
                        onClick={() => setAngle((a) => a - 15)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] text-black/50 hover:text-black hover:bg-black/[0.04] transition-colors"
                      >
                        <RotateCcw size={11} /> -15°
                      </button>
                      <button
                        onClick={() => setAngle((a) => a + 15)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] text-black/50 hover:text-black hover:bg-black/[0.04] transition-colors"
                      >
                        <RotateCw size={11} /> +15°
                      </button>
                      <button
                        onClick={resetAngle}
                        className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] text-black/40 hover:text-red-500 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Preview */}
              <div className="lg:col-span-7">
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">

                  {/* Preview header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                    <div className="flex items-center gap-2.5">
                      <Eye size={14} className="text-[#ff6a00]" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/60">
                        Live Preview
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

                  {/* Preview canvas */}
                  <div className="p-8 bg-[#ebe7de]/40 flex items-center justify-center min-h-[500px] relative overflow-hidden">
                    {/* Background grid pattern */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                      }}
                    />

                    {previewThumb && (
                      <motion.div
                        animate={{ rotate: angle }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-lg overflow-hidden"
                        style={{ transformOrigin: 'center center' }}
                      >
                        <img
                          src={previewThumb.dataUrl}
                          alt={`Page ${previewThumb.pageNum}`}
                          className="block max-w-[320px] max-h-[420px] w-auto h-auto"
                          draggable={false}
                        />
                      </motion.div>
                    )}

                    {/* Corner badge showing angle */}
                    <motion.div
                      key={normalizedAngle}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute top-6 right-6 px-4 py-2 rounded-full bg-black/85 backdrop-blur-sm text-white text-[11px] font-mono tracking-[0.1em] shadow-lg"
                    >
                      <RotateCw size={11} className="inline -mt-0.5 mr-1.5" />
                      {normalizedAngle}°
                    </motion.div>
                  </div>

                  {/* Preview footer */}
                  <div className="px-6 py-3 border-t border-black/[0.06] flex items-center justify-between bg-white">
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      Page {previewThumb?.pageNum || 0} of {pageCount}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      {target === 'all' ? 'Applying to all pages' : `${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''} selected`}
                    </div>
                  </div>
                </div>

                {/* Page selection grid — only if target = selected */}
                <AnimatePresence>
                  {target === 'selected' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="rounded-[22px] bg-white border border-black/[0.06] p-6">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-black/[0.06]">
                          <div className="flex items-center gap-3">
                            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                              Select pages to rotate
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#ff6a00]">
                              {selectedPages.size} / {pageCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={selectAll}
                              className="px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-[#ff6a00]/10 hover:text-[#ff6a00] transition-colors"
                            >
                              Select all
                            </button>
                            <button
                              onClick={clearSelection}
                              className="px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] text-black/40 hover:text-red-500 transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[280px] overflow-y-auto pr-1">
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
                                    ? 'border-[#ff6a00] shadow-[0_8px_20px_-8px_rgba(255,106,0,0.4)]'
                                    : 'border-black/[0.06] hover:border-black/[0.2]'
                                }`}
                              >
                                <img
                                  src={t.dataUrl}
                                  alt={`Page ${t.pageNum}`}
                                  className="w-full h-full object-cover object-top"
                                  loading="lazy"
                                />
                                {/* Page number */}
                                <div
                                  className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                                    isSelected ? 'bg-[#ff6a00] text-white' : 'bg-black/60 text-white'
                                  }`}
                                >
                                  {t.pageNum}
                                </div>
                                {/* Check overlay */}
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute inset-0 bg-[#ff6a00]/10 flex items-center justify-center"
                                  >
                                    <div className="w-5 h-5 rounded-full bg-[#ff6a00] flex items-center justify-center">
                                      <Check size={11} className="text-white" strokeWidth={3} />
                                    </div>
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ============================================ */}
            {/* STATUS BAR */}
            {/* ============================================ */}
            {angle !== 0 && !result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-[18px] bg-gradient-to-r from-[#ff6a00]/[0.04] to-transparent border border-[#ff6a00]/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-[#ff6a00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-black/70">
                      Will rotate <span className="font-medium text-[#ff6a00]">{rotationLabel}</span>
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
                  <div className="flex items-center gap-3">
                    <Loader2 size={16} className="text-[#ff6a00] animate-spin" />
                    <span className="text-[13px] text-black">Rotating pages...</span>
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
                className="mb-6 rounded-[22px] bg-white border border-emerald-500/20 p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <h3
                  className="text-[24px] text-black mb-2"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Rotated successfully!
                </h3>
                <p className="text-[13px] text-black/55 mb-2">
                  {target === 'all'
                    ? `All ${pageCount} pages rotated ${normalizedAngle}°`
                    : `${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''} rotated ${normalizedAngle}°`}
                </p>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-8">
                  {result.filename} · {formatBytes(result.blob.size)}
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={downloadResult}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                  >
                    <Download size={14} />
                    Download rotated PDF
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/[0.12] text-[13px] font-medium hover:bg-black/[0.03] transition-colors"
                  >
                    <RefreshCw size={14} />
                    Rotate again
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* ROTATE BUTTON */}
            {/* ============================================ */}
            {!result && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleRotate}
                disabled={angle === 0 || (target === 'selected' && selectedPages.size === 0)}
                className={`group w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 ${
                  angle === 0 || (target === 'selected' && selectedPages.size === 0)
                    ? 'bg-black/[0.08] text-black/40 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <RotateCw size={16} />
                  {angle === 0
                    ? 'Set a rotation angle first'
                    : target === 'selected' && selectedPages.size === 0
                      ? 'Select pages to rotate'
                      : `Rotate ${target === 'all' ? 'all pages' : `${selectedPages.size} page${selectedPages.size !== 1 ? 's' : ''}`} by ${normalizedAngle}°`}
                  {angle !== 0 && !(target === 'selected' && selectedPages.size === 0) && (
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