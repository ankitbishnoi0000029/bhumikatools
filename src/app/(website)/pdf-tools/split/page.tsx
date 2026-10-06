"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, Scissors, ArrowUpRight, Layers, Grid3x3,
  Hash, ListOrdered, FileStack, Eye, ChevronDown, Sparkles,
} from 'lucide-react';
import {
  splitPDFByRanges,
  splitPDFIndividualPages,
  splitPDFEveryNPages,
  splitPDFByCustomPages,
  downloadAsZip,
  downloadBlob,
  getAllPageThumbnails,
  createBlobFromBytes,
  getPDFInfo,
  formatBytes,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

type SplitMode = 'range' | 'visual' | 'every' | 'individual';

interface PageThumb {
  pageNum: number;
  dataUrl: string;
}

interface SplitResult {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

// ============================================
// PAGE
// ============================================

export default function SplitPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<SplitMode>('range');
  const [rangeInput, setRangeInput] = useState('1-1');
  const [everyN, setEveryN] = useState(2);
  const [visualGrouping, setVisualGrouping] = useState<'individual' | 'combined'>('combined');
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SplitResult[] | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ---------- PARSE RANGES ----------

  const parseRanges = (input: string, max: number): { from: number; to: number }[] => {
    const ranges: { from: number; to: number }[] = [];
    const parts = input.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [fromStr, toStr] = part.split('-').map((s) => s.trim());
        const from = parseInt(fromStr);
        const to = parseInt(toStr);
        if (!isNaN(from) && !isNaN(to) && from >= 1 && to <= max && from <= to) {
          ranges.push({ from, to });
        }
      } else {
        const single = parseInt(part);
        if (!isNaN(single) && single >= 1 && single <= max) {
          ranges.push({ from: single, to: single });
        }
      }
    }
    return ranges;
  };

  // ---------- LOAD PDF ----------

  const loadPDF = useCallback(async (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFile(f);
    setResults(null);
    setSelectedPages(new Set());
    setThumbs([]);
    setLoadProgress(0);

    try {
      const info = await getPDFInfo(f);
      setPageCount(info.pageCount);
      setRangeInput(`1-${info.pageCount}`);

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

  // ---------- INPUT HANDLERS ----------

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
    setResults(null);
    setPageCount(0);
    setRangeInput('1-1');
    setError(null);
  };

  // ---------- PAGE SELECTION (Visual) ----------

  const togglePage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
    setResults(null);
  };

  const selectAll = () => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i + 1)));
    setResults(null);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    setResults(null);
  };

  const selectOdd = () => {
    const odd = new Set<number>();
    for (let i = 1; i <= pageCount; i += 2) odd.add(i);
    setSelectedPages(odd);
    setResults(null);
  };

  const selectEven = () => {
    const even = new Set<number>();
    for (let i = 2; i <= pageCount; i += 2) even.add(i);
    setSelectedPages(even);
    setResults(null);
  };

  // ---------- LIVE PREVIEW ----------

  const livePreview = useCallback((): { count: number; pages: number; label: string } => {
    if (!file || pageCount === 0) return { count: 0, pages: 0, label: '' };

    if (mode === 'range') {
      const ranges = parseRanges(rangeInput, pageCount);
      const total = ranges.reduce((sum, r) => sum + (r.to - r.from + 1), 0);
      return {
        count: ranges.length,
        pages: total,
        label: `${ranges.length} PDF${ranges.length !== 1 ? 's' : ''} · ${total} page${total !== 1 ? 's' : ''}`,
      };
    }
    if (mode === 'every') {
      const count = Math.ceil(pageCount / everyN);
      return {
        count,
        pages: pageCount,
        label: `${count} PDF${count !== 1 ? 's' : ''} · ${pageCount} pages`,
      };
    }
    if (mode === 'individual') {
      return {
        count: pageCount,
        pages: pageCount,
        label: `${pageCount} PDF${pageCount !== 1 ? 's' : ''} · 1 page each`,
      };
    }
    if (mode === 'visual') {
      const count = selectedPages.size;
      if (visualGrouping === 'combined') {
        return {
          count: count > 0 ? 1 : 0,
          pages: count,
          label: count > 0 ? `1 PDF · ${count} page${count !== 1 ? 's' : ''}` : 'Select pages',
        };
      }
      return {
        count,
        pages: count,
        label: `${count} PDF${count !== 1 ? 's' : ''} · 1 page each`,
      };
    }
    return { count: 0, pages: 0, label: '' };
  }, [file, pageCount, mode, rangeInput, everyN, selectedPages, visualGrouping]);

  const preview = livePreview();

  // ---------- PROCESS ----------

  const handleSplit = async () => {
    if (!file) return;

    let ranges: { from: number; to: number }[] = [];
    let splitResults: SplitResult[] = [];

    // Validate
    if (mode === 'range') {
      ranges = parseRanges(rangeInput, pageCount);
      if (ranges.length === 0) {
        setError('Please enter a valid range (e.g. 1-5, 8-10).');
        return;
      }
    } else if (mode === 'visual' && selectedPages.size === 0) {
      setError('Please select at least one page.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (mode === 'range') {
        splitResults = await splitPDFByRanges(file, ranges);
      } else if (mode === 'individual') {
        splitResults = await splitPDFIndividualPages(file);
      } else if (mode === 'every') {
        splitResults = await splitPDFEveryNPages(file, everyN);
      } else if (mode === 'visual') {
        splitResults = await splitPDFByCustomPages(
          file,
          Array.from(selectedPages),
          visualGrouping
        );
      }

      setResults(splitResults);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message || 'Failed to split PDF. Please try again.' : 'Failed to split PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- DOWNLOAD ----------

  const downloadAll = async () => {
    if (!results || results.length === 0) return;
    if (results.length === 1) {
      downloadBlob(createBlobFromBytes(results[0].bytes, 'application/pdf'), results[0].name);
    } else {
      await downloadAsZip(results, 'split-pdfs.zip');
    }
  };

  const downloadOne = (result: SplitResult) => {
    downloadBlob(createBlobFromBytes(result.bytes, 'application/pdf'), result.name);
  };

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
              Organize PDF — Split
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
              Split <span className="italic text-[#ff6a00]">PDF</span> files.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Extract specific pages, split into individual files, or divide by chunks.
              Visual page selection with live preview. All in your browser.
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
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <Scissors size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">
                  Choose a PDF to split. Extract pages, split into individual files,
                  or divide by custom chunks.
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

            {/* Feature strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Eye, label: 'Visual selection' },
                { icon: Grid3x3, label: 'Page thumbnails' },
                { icon: Hash, label: 'Range support' },
                { icon: Sparkles, label: 'Live preview' },
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
        {/* LOADING STATE */}
        {/* ============================================ */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
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

            {/* Mode selector */}
            <div className="mb-8">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4">
                Split mode
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'range' as SplitMode, icon: Hash, label: 'By Range', desc: 'e.g. 1-5, 8-10' },
                  { id: 'visual' as SplitMode, icon: Eye, label: 'Visual Pick', desc: 'Click pages' },
                  { id: 'every' as SplitMode, icon: Layers, label: 'Every N', desc: 'Fixed chunks' },
                  { id: 'individual' as SplitMode, icon: FileStack, label: 'Individuals', desc: '1 file/page' },
                ].map((m) => {
                  const Icon = m.icon;
                  const isActive = mode === m.id;
                  return (
                    <motion.button
                      key={m.id}
                      onClick={() => { setMode(m.id); setResults(null); }}
                      whileHover={{ y: -2 }}
                      className={`relative p-4 rounded-[16px] text-left transition-all duration-300 border ${
                        isActive
                          ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                          : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                          isActive ? 'bg-[#ff6a00] text-white' : 'bg-[#f4f1ea] text-black/60'
                        }`}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                      </div>
                      <div className={`text-[13px] font-medium mb-0.5 ${isActive ? 'text-[#ff6a00]' : 'text-black'}`}>
                        {m.label}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-black/40">
                        {m.desc}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Mode-specific controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

              {/* LEFT — Controls / Thumbnails */}
              <div className={mode === 'visual' ? 'lg:col-span-8' : 'lg:col-span-12'}>
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-6">

                  {/* Range Mode */}
                  {mode === 'range' && (
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                        Page ranges (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={rangeInput}
                        onChange={(e) => { setRangeInput(e.target.value); setResults(null); }}
                        placeholder="e.g. 1-5, 8-10, 15"
                        className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[15px] transition-colors"
                      />
                      <div className="mt-4 flex flex-wrap gap-2">
                        {['1-1', `1-${pageCount}`, '1-3', '4-6'].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => { setRangeInput(preset); setResults(null); }}
                            className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-[#ff6a00]/10 hover:text-[#ff6a00] transition-colors"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 text-[12px] text-black/45">
                        Each range creates a separate PDF file. Example: "1-5, 8-10" creates two files.
                      </p>
                    </div>
                  )}

                  {/* Every N Mode */}
                  {mode === 'every' && (
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                        Split every N pages
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min={1}
                          max={pageCount}
                          value={everyN}
                          onChange={(e) => { setEveryN(Math.max(1, parseInt(e.target.value) || 1)); setResults(null); }}
                          className="w-24 bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[18px] font-medium transition-colors"
                        />
                        <div className="flex gap-2">
                          {[2, 5, 10].map((n) => (
                            <button
                              key={n}
                              onClick={() => { setEveryN(n); setResults(null); }}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] transition-colors ${
                                everyN === n
                                  ? 'bg-[#ff6a00] text-white'
                                  : 'bg-black/[0.04] text-black/60 hover:bg-black/10'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="mt-4 text-[12px] text-black/45">
                        Splits into chunks of {everyN} pages each. Last chunk may be smaller.
                      </p>
                    </div>
                  )}

                  {/* Individual Mode */}
                  {mode === 'individual' && (
                    <div>
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center">
                          <FileStack size={16} className="text-[#ff6a00]" />
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-black mb-1">
                            One PDF per page
                          </div>
                          <p className="text-[12px] text-black/50 leading-[1.6]">
                            This will create {pageCount} separate PDF files, one for each page.
                            All files will be downloaded as a ZIP.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visual Mode */}
                  {mode === 'visual' && (
                    <div>
                      {/* Selection toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-5 border-b border-black/[0.06]">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={selectAll}
                            className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-[#ff6a00]/10 hover:text-[#ff6a00] transition-colors"
                          >
                            Select all
                          </button>
                          <button
                            onClick={selectOdd}
                            className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-[#ff6a00]/10 hover:text-[#ff6a00] transition-colors"
                          >
                            Odd pages
                          </button>
                          <button
                            onClick={selectEven}
                            className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-[#ff6a00]/10 hover:text-[#ff6a00] transition-colors"
                          >
                            Even pages
                          </button>
                          <button
                            onClick={clearSelection}
                            className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] text-black/40 hover:text-red-500 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#ff6a00]">
                          {selectedPages.size} / {pageCount} selected
                        </div>
                      </div>

                      {/* Grouping toggle */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                          Output as:
                        </div>
                        <div className="flex gap-1 p-1 rounded-full bg-[#f4f1ea]">
                          {[
                            { id: 'combined' as const, label: 'One PDF' },
                            { id: 'individual' as const, label: 'Separate files' },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => { setVisualGrouping(opt.id); setResults(null); }}
                              className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                                visualGrouping === opt.id
                                  ? 'bg-white shadow-sm text-black'
                                  : 'text-black/50 hover:text-black'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Thumbnails grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-2">
                        {thumbs.map((t) => {
                          const isSelected = selectedPages.has(t.pageNum);
                          return (
                            <motion.button
                              key={t.pageNum}
                              onClick={() => togglePage(t.pageNum)}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.97 }}
                              className={`group relative rounded-[14px] overflow-hidden border-2 transition-all duration-200 bg-white ${
                                isSelected
                                  ? 'border-[#ff6a00] shadow-[0_8px_24px_-8px_rgba(255,106,0,0.3)]'
                                  : 'border-black/[0.06] hover:border-black/[0.15]'
                              }`}
                            >
                              <div className="aspect-[8.5/11] bg-[#f4f1ea] overflow-hidden">
                                <img
                                  src={t.dataUrl}
                                  alt={`Page ${t.pageNum}`}
                                  className="w-full h-full object-cover object-top"
                                  loading="lazy"
                                />
                              </div>

                              {/* Page number badge */}
                              <div
                                className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all ${
                                  isSelected
                                    ? 'bg-[#ff6a00] text-white'
                                    : 'bg-black/70 text-white'
                                }`}
                              >
                                {t.pageNum}
                              </div>

                              {/* Checkmark overlay */}
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute inset-0 bg-[#ff6a00]/10 flex items-center justify-center pointer-events-none"
                                >
                                  <div className="w-8 h-8 rounded-full bg-[#ff6a00] flex items-center justify-center shadow-lg">
                                    <CheckCircle2 size={16} className="text-white" />
                                  </div>
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — Live Preview (only in visual mode) */}
              {mode === 'visual' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="lg:col-span-4 lg:sticky lg:top-32 h-fit"
                >
                  <div className="rounded-[22px] bg-white border border-black/[0.06] p-6">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4 pb-3 border-b border-black/[0.06]">
                      Live Preview
                    </div>

                    <div className="space-y-5">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1.5">
                          Output files
                        </div>
                        <div className="text-[32px] font-medium text-black leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                          {preview.count}
                        </div>
                      </div>

                      <div className="h-px bg-black/[0.06]" />

                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1.5">
                          Total pages
                        </div>
                        <div className="text-[24px] font-medium text-black leading-none" style={{ fontFamily: 'Georgia, serif' }}>
                          {preview.pages}
                        </div>
                      </div>

                      {selectedPages.size > 0 && (
                        <>
                          <div className="h-px bg-black/[0.06]" />
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                              Selected pages
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                              {Array.from(selectedPages).sort((a, b) => a - b).map((p) => (
                                <span
                                  key={p}
                                  className="px-2 py-0.5 rounded-md bg-[#ff6a00]/10 text-[#ff6a00] text-[11px] font-mono"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ============================================ */}
            {/* LIVE PREVIEW BAR (for non-visual modes) */}
            {/* ============================================ */}
            {mode !== 'visual' && preview.count > 0 && (
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
                      Will produce <span className="font-medium text-[#ff6a00]">{preview.label}</span>
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
                  className="mt-6 rounded-[18px] bg-white border border-black/[0.06] p-5 overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 size={16} className="text-[#ff6a00] animate-spin" />
                    <span className="text-[13px] text-black">Splitting PDF...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* RESULTS */}
            {/* ============================================ */}
            {results && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8"
              >
                <div className="rounded-[22px] bg-white border border-emerald-500/20 p-8">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={28} className="text-emerald-500" />
                    </div>
                    <h3
                      className="text-[24px] text-black mb-2"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      Split successfully!
                    </h3>
                    <p className="text-[13px] text-black/55 mb-6">
                      {results.length} file{results.length !== 1 ? 's' : ''} created
                      {' · '}
                      {results.reduce((sum, r) => sum + r.pageCount, 0)} pages total
                    </p>
                    <button
                      onClick={downloadAll}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                    >
                      <Download size={14} />
                      {results.length === 1 ? 'Download PDF' : `Download all (ZIP)`}
                    </button>
                  </div>

                  {/* File list */}
                  <div className="pt-6 border-t border-black/[0.06]">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4">
                      Files ({results.length})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                      {results.map((r, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => downloadOne(r)}
                          className="group flex items-center gap-3 p-3 rounded-[14px] bg-[#f4f1ea]/50 border border-black/[0.06] hover:border-[#ff6a00]/40 hover:bg-[#ff6a00]/[0.03] transition-all text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 group-hover:bg-[#ff6a00] transition-colors">
                            <FileText size={16} className="text-[#ff6a00] group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-black truncate">
                              {r.name}
                            </div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-black/40">
                              {r.pageCount} page{r.pageCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <Download
                            size={14}
                            className="text-black/30 group-hover:text-[#ff6a00] transition-colors shrink-0"
                          />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-6 border-t border-black/[0.06] flex items-center justify-center">
                    <button
                      onClick={() => setResults(null)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/[0.12] text-[12px] font-medium hover:bg-black/[0.03] transition-colors"
                    >
                      <RefreshCw size={12} />
                      Split again
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* SPLIT BUTTON */}
            {/* ============================================ */}
            {!results && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleSplit}
                disabled={preview.count === 0}
                className={`group mt-8 w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 ${
                  preview.count === 0
                    ? 'bg-black/[0.08] text-black/40 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Scissors size={16} />
                  {preview.count === 0
                    ? 'Configure split options above'
                    : `Split into ${preview.count} file${preview.count !== 1 ? 's' : ''}`}
                  {preview.count > 0 && (
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