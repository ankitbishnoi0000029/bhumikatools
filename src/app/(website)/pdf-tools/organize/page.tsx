"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, ArrowUpRight, Eye, Sparkles, GripVertical,
  Trash2, RotateCw, RotateCcw, Copy, Undo2, Redo2, Plus, Check,
  Grid3x3, ChevronLeft, ChevronRight, FilePlus2, Layers, Hash,
  ArrowLeft, ArrowRight, Save, Sliders,
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  createBlobFromBytes,
  getPDFInfo,
  getAllPageThumbnails,
  formatBytes,
  downloadBlob,
  readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface PageItem {
  id: string;           // unique ID for React key
  originalIndex: number; // original page number (1-based)
  thumbnail: string;    // preview data URL
  rotation: number;     // 0, 90, 180, 270
  deleted: boolean;
  isBlank?: boolean;
}

interface HistoryState {
  pages: PageItem[];
}

// ============================================
// PAGE
// ============================================

export default function OrganizePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ---------- HISTORY MANAGEMENT ----------

  const pushHistory = useCallback((newPages: PageItem[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, { pages: JSON.parse(JSON.stringify(newPages)) }];
      // Keep only last 30 states
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setPages(JSON.parse(JSON.stringify(history[newIndex].pages)));
    setResult(null);
  };

  const redo = () => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setPages(JSON.parse(JSON.stringify(history[newIndex].pages)));
    setResult(null);
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
    setResult(null);
    setSelectedIds(new Set());
    setPages([]);
    setHistory([]);
    setHistoryIndex(-1);
    setLoadProgress(0);

    try {
      const info = await getPDFInfo(f);
      const thumbs = await getAllPageThumbnails(f, (cur, total) => {
        setLoadProgress(Math.round((cur / total) * 100));
      });

      const newPages: PageItem[] = thumbs.map((t) => ({
        id: `page-${t.pageNum}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        originalIndex: t.pageNum,
        thumbnail: t.dataUrl,
        rotation: 0,
        deleted: false,
      }));

      setPages(newPages);
      setHistory([{ pages: JSON.parse(JSON.stringify(newPages)) }]);
      setHistoryIndex(0);
      setPreviewId(newPages[0]?.id || null);
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
    setPages([]);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedIds(new Set());
    setResult(null);
    setError(null);
    setPreviewId(null);
  };

  // ---------- PAGE OPERATIONS ----------

  const toggleDelete = (id: string) => {
    const updated = pages.map((p) => (p.id === id ? { ...p, deleted: !p.deleted } : p));
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  const deleteMultiple = (ids: Set<string>) => {
    const updated = pages.map((p) => (ids.has(p.id) ? { ...p, deleted: true } : p));
    setPages(updated);
    pushHistory(updated);
    setSelectedIds(new Set());
    setResult(null);
  };

  const restoreAll = () => {
    const updated = pages.map((p) => ({ ...p, deleted: false }));
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  const rotatePage = (id: string, direction: 1 | -1) => {
    const updated = pages.map((p) =>
      p.id === id ? { ...p, rotation: (p.rotation + direction * 90 + 360) % 360 } : p
    );
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  const duplicatePage = (id: string) => {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const original = pages[idx];
    const newPage: PageItem = {
      ...original,
      id: `page-${original.originalIndex}-dup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    const updated = [...pages.slice(0, idx + 1), newPage, ...pages.slice(idx + 1)];
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  const insertBlankPage = (afterId?: string) => {
    const newPage: PageItem = {
      id: `blank-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      originalIndex: -1,
      thumbnail: '',
      rotation: 0,
      deleted: false,
      isBlank: true,
    };
    let updated: PageItem[];
    if (afterId) {
      const idx = pages.findIndex((p) => p.id === afterId);
      updated = [...pages.slice(0, idx + 1), newPage, ...pages.slice(idx + 1)];
    } else {
      updated = [...pages, newPage];
    }
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  const handleReorder = (newOrder: PageItem[]) => {
    setPages(newOrder);
    pushHistory(newOrder);
    setResult(null);
  };

  // ---------- SELECTION ----------

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(pages.map((p) => p.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // ---------- QUICK ACTIONS ----------

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    deleteMultiple(selectedIds);
  };

  const rotateSelected = (dir: 1 | -1) => {
    if (selectedIds.size === 0) return;
    const updated = pages.map((p) =>
      selectedIds.has(p.id) ? { ...p, rotation: (p.rotation + dir * 90 + 360) % 360 } : p
    );
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  const duplicateSelected = () => {
    if (selectedIds.size === 0) return;
    const newPages: PageItem[] = [];
    pages.forEach((p) => {
      newPages.push(p);
      if (selectedIds.has(p.id)) {
        newPages.push({
          ...p,
          id: `page-${p.originalIndex}-dup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        });
      }
    });
    setPages(newPages);
    pushHistory(newPages);
    setSelectedIds(new Set());
    setResult(null);
  };

  const moveSelected = (direction: 'left' | 'right') => {
    if (selectedIds.size === 0) return;
    const selectedArray = pages.filter((p) => selectedIds.has(p.id));
    const others = pages.filter((p) => !selectedIds.has(p.id));

    if (direction === 'left') {
      // Move to start
      const updated = [...selectedArray, ...others];
      setPages(updated);
      pushHistory(updated);
    } else {
      // Move to end
      const updated = [...others, ...selectedArray];
      setPages(updated);
      pushHistory(updated);
    }
    setResult(null);
  };

  const reverseAll = () => {
    const updated = [...pages].reverse();
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  const sortByOriginal = () => {
    const updated = [...pages].sort((a, b) => {
      if (a.originalIndex === -1) return 1;
      if (b.originalIndex === -1) return -1;
      return a.originalIndex - b.originalIndex;
    });
    setPages(updated);
    pushHistory(updated);
    setResult(null);
  };

  // ---------- BUILD PDF ----------

  const buildPDF = async () => {
    if (!file) throw new Error('No file');

    const activePages = pages.filter((p) => !p.deleted);
    if (activePages.length === 0) {
      throw new Error('At least one page must remain.');
    }

    const bytes = await readFileAsArrayBuffer(file);
    const source = await PDFDocument.load(bytes);
    const newDoc = await PDFDocument.create();
    const sourcePageCount = source.getPageCount();

    // Cache copied pages to avoid duplication issues
    const copiedPages = await newDoc.copyPages(source, source.getPageIndices());

    for (const page of activePages) {
      if (page.isBlank) {
        // Add blank page (A4 size)
        newDoc.addPage([595.28, 841.89]);
      } else {
        const sourceIndex = page.originalIndex - 1;
        if (sourceIndex >= 0 && sourceIndex < sourcePageCount) {
          const copied = copiedPages[sourceIndex];
          // Preserve existing rotation + new rotation
          const existingRotation = copied.getRotation().angle;
          copied.setRotation(degrees(existingRotation + page.rotation));
          newDoc.addPage(copied);
        }
      }
    }

    return await newDoc.save();
  };

  const handleSave = async () => {
    if (!file) return;
    if (pages.filter((p) => !p.deleted).length === 0) {
      setError('At least one page must remain.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const bytes = await buildPDF();
      const blob = createBlobFromBytes(bytes, 'application/pdf');
      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        blob,
        filename: `${baseName}-organized.pdf`,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message || 'Failed to process PDF. Please try again.' : 'Failed to process PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ---------- PREVIEW NAVIGATION ----------

  const previewPage = pages.find((p) => p.id === previewId);
  const activePages = pages.filter((p) => !p.deleted);
  const previewIndexInActive = activePages.findIndex((p) => p.id === previewId);

  const nextPreview = () => {
    if (activePages.length === 0) return;
    const currentIdx = previewIndexInActive;
    const nextIdx = (currentIdx + 1) % activePages.length;
    setPreviewId(activePages[nextIdx].id);
  };

  const prevPreview = () => {
    if (activePages.length === 0) return;
    const currentIdx = previewIndexInActive;
    const prevIdx = (currentIdx - 1 + activePages.length) % activePages.length;
    setPreviewId(activePages[prevIdx].id);
  };

  // ---------- STATS ----------

  const stats = useMemo(() => {
    const total = pages.length;
    const active = pages.filter((p) => !p.deleted).length;
    const deleted = pages.filter((p) => p.deleted).length;
    const rotated = pages.filter((p) => p.rotation !== 0).length;
    const blank = pages.filter((p) => p.isBlank).length;
    return { total, active, deleted, rotated, blank };
  }, [pages]);

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
              Organize PDF — Pages
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
              Organize <span className="italic text-[#ff6a00]">pages</span>.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Reorder, rotate, delete, duplicate, or insert blank pages. Full visual
              page manager with undo/redo and live preview.
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
                  <Grid3x3 size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">
                  Load a PDF to visually reorder, rotate, delete, or duplicate pages.
                  Undo everything if you change your mind.
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
                { icon: GripVertical, label: 'Drag to reorder' },
                { icon: RotateCw, label: 'Rotate pages' },
                { icon: Copy, label: 'Duplicate' },
                { icon: Undo2, label: 'Undo/redo' },
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
                    <span>{stats.total} pages</span>
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

            {/* Stats + Toolbar */}
            <div className="mb-6 p-4 rounded-[18px] bg-white border border-black/[0.06]">
              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-4 mb-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-[#ff6a00]" />
                  <span className="text-[12px] font-medium text-black">{stats.active}</span>
                  <span className="text-[11px] text-black/50">active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 size={13} className="text-red-400" />
                  <span className="text-[12px] font-medium text-black">{stats.deleted}</span>
                  <span className="text-[11px] text-black/50">deleted</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCw size={13} className="text-amber-500" />
                  <span className="text-[12px] font-medium text-black">{stats.rotated}</span>
                  <span className="text-[11px] text-black/50">rotated</span>
                </div>
                {stats.blank > 0 && (
                  <div className="flex items-center gap-2">
                    <FilePlus2 size={13} className="text-blue-500" />
                    <span className="text-[12px] font-medium text-black">{stats.blank}</span>
                    <span className="text-[11px] text-black/50">blank</span>
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="w-8 h-8 rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black/60 transition-colors"
                    title="Undo"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="w-8 h-8 rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black/60 transition-colors"
                    title="Redo"
                  >
                    <Redo2 size={14} />
                  </button>
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50 hover:text-black'
                    }`}
                    title="Grid view"
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50 hover:text-black'
                    }`}
                    title="List view"
                  >
                    <Hash size={14} />
                  </button>
                </div>

                <div className="w-px h-6 bg-black/[0.08] mx-1" />

                {/* Selection actions */}
                <button
                  onClick={selectedIds.size === pages.length ? clearSelection : selectAll}
                  className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-black/[0.08] transition-colors"
                >
                  {selectedIds.size === pages.length ? 'Clear all' : 'Select all'}
                </button>

                {selectedIds.size > 0 && (
                  <>
                    <span className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-[#ff6a00]/10 text-[#ff6a00]">
                      {selectedIds.size} selected
                    </span>
                    <button
                      onClick={() => rotateSelected(-1)}
                      className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 hover:text-[#ff6a00] transition-colors"
                      title="Rotate left"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => rotateSelected(1)}
                      className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 hover:text-[#ff6a00] transition-colors"
                      title="Rotate right"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      onClick={duplicateSelected}
                      className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 hover:text-[#ff6a00] transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => moveSelected('left')}
                      className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 hover:text-[#ff6a00] transition-colors"
                      title="Move to start"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      onClick={() => moveSelected('right')}
                      className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 hover:text-[#ff6a00] transition-colors"
                      title="Move to end"
                    >
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-black/60 hover:text-red-500 transition-colors"
                      title="Delete selected"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}

                <div className="w-px h-6 bg-black/[0.08] mx-1" />

                {/* Global actions */}
                <button
                  onClick={() => insertBlankPage()}
                  className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-black/[0.08] transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus size={11} />
                  Blank
                </button>
                <button
                  onClick={reverseAll}
                  className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-black/[0.04] text-black/60 hover:bg-black/[0.08] transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeft size={11} />
                  Reverse
                </button>
                {stats.deleted > 0 && (
                  <button
                    onClick={restoreAll}
                    className="px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.1em] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={11} />
                    Restore all
                  </button>
                )}
              </div>
            </div>

            {/* ============================================ */}
            {/* MAIN GRID: Pages + Preview */}
            {/* ============================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* LEFT: Page grid */}
              <div className="lg:col-span-8">
                {viewMode === 'grid' ? (
                  <Reorder.Group
                    axis="y"
                    values={pages}
                    onReorder={handleReorder}
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                  >
                    {pages.map((page, index) => (
                      <GridPageCard
                        key={page.id}
                        page={page}
                        index={index}
                        isSelected={selectedIds.has(page.id)}
                        isPreviewing={previewId === page.id}
                        onSelect={() => toggleSelect(page.id)}
                        onToggleDelete={() => toggleDelete(page.id)}
                        onRotate={(dir) => rotatePage(page.id, dir)}
                        onDuplicate={() => duplicatePage(page.id)}
                        onPreview={() => setPreviewId(page.id)}
                        onInsertBlank={() => insertBlankPage(page.id)}
                      />
                    ))}
                  </Reorder.Group>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={pages}
                    onReorder={handleReorder}
                    className="space-y-2"
                  >
                    {pages.map((page, index) => (
                      <ListPageRow
                        key={page.id}
                        page={page}
                        index={index}
                        isSelected={selectedIds.has(page.id)}
                        isPreviewing={previewId === page.id}
                        onSelect={() => toggleSelect(page.id)}
                        onToggleDelete={() => toggleDelete(page.id)}
                        onRotate={(dir) => rotatePage(page.id, dir)}
                        onDuplicate={() => duplicatePage(page.id)}
                        onPreview={() => setPreviewId(page.id)}
                      />
                    ))}
                  </Reorder.Group>
                )}

                {/* Add blank page at end */}
                <button
                  onClick={() => insertBlankPage()}
                  className="mt-4 w-full py-4 rounded-[18px] border-2 border-dashed border-black/[0.08] hover:border-[#ff6a00]/40 hover:bg-[#ff6a00]/[0.02] flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 hover:text-[#ff6a00] transition-all"
                >
                  <FilePlus2 size={14} />
                  Insert blank page
                </button>
              </div>

              {/* RIGHT: Live preview */}
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-32">
                  <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                      <div className="flex items-center gap-2">
                        <Eye size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                          Preview
                        </span>
                      </div>
                      {activePages.length > 1 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.1em] text-black/50">
                          <button
                            onClick={prevPreview}
                            className="w-6 h-6 rounded-md hover:bg-black/[0.06] flex items-center justify-center"
                          >
                            <ChevronLeft size={12} />
                          </button>
                          <span>
                            {previewIndexInActive >= 0 ? previewIndexInActive + 1 : 1} / {activePages.length}
                          </span>
                          <button
                            onClick={nextPreview}
                            className="w-6 h-6 rounded-md hover:bg-black/[0.06] flex items-center justify-center"
                          >
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preview content */}
                    <div className="p-6 bg-[#ebe7de]/40 flex items-center justify-center min-h-[400px] relative overflow-hidden">
                      <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                          backgroundSize: '20px 20px',
                        }}
                      />

                      <AnimatePresence mode="wait">
                        {previewPage && (
                          <motion.div
                            key={previewPage.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            className="relative"
                          >
                            {previewPage.isBlank ? (
                              <div className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-md w-[220px] h-[311px] flex items-center justify-center border border-black/[0.06]">
                                <div className="text-center">
                                  <FilePlus2 size={28} className="text-black/20 mx-auto mb-2" />
                                  <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/30">
                                    Blank page
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-md overflow-hidden"
                                style={{ transform: `rotate(0deg)` }}
                              >
                                <img
                                  src={previewPage.thumbnail}
                                  alt=""
                                  className="block max-w-[220px] max-h-[311px] w-auto h-auto transition-transform duration-300"
                                  style={{ transform: `rotate(${previewPage.rotation}deg)` }}
                                  draggable={false}
                                />
                              </div>
                            )}

                            {/* Rotation badge */}
                            {previewPage.rotation !== 0 && (
                              <div className="absolute -top-2 -right-2 px-2 py-1 rounded-full bg-[#ff6a00] text-white text-[9px] font-mono font-semibold shadow-lg">
                                {previewPage.rotation}°
                              </div>
                            )}

                            {/* Deleted badge */}
                            {previewPage.deleted && (
                              <div className="absolute -top-2 -left-2 px-2 py-1 rounded-full bg-red-500 text-white text-[9px] font-mono font-semibold shadow-lg">
                                DELETED
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Nav arrows */}
                      {activePages.length > 1 && (
                        <>
                          <button
                            onClick={prevPreview}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-black/[0.06] flex items-center justify-center text-black/60 hover:bg-[#ff6a00] hover:text-white hover:border-[#ff6a00] transition-all"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            onClick={nextPreview}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-black/[0.06] flex items-center justify-center text-black/60 hover:bg-[#ff6a00] hover:text-white hover:border-[#ff6a00] transition-all"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-black/[0.06] bg-white flex items-center justify-between">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Position {previewIndexInActive + 1} of {activePages.length}
                      </div>
                      {previewPage && (
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          Orig. page {previewPage.originalIndex > 0 ? previewPage.originalIndex : '—'}
                        </div>
                      )}
                    </div>
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
                    <Sparkles size={16} className="text-[#ff6a00]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-black mb-0.5">
                      Ready to save
                    </div>
                    <div className="text-[12px] text-black/60">
                      <span className="font-medium text-[#ff6a00]">{stats.active} page{stats.active !== 1 ? 's' : ''}</span>
                      {' '}will be saved
                      {stats.deleted > 0 && (
                        <span className="text-black/50">
                          {' · '}<span className="text-red-500">{stats.deleted} removed</span>
                        </span>
                      )}
                      {stats.rotated > 0 && (
                        <span className="text-black/50">
                          {' · '}<span className="text-amber-600">{stats.rotated} rotated</span>
                        </span>
                      )}
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
                  className="mt-6 mb-6 rounded-[18px] bg-white border border-black/[0.06] p-5 overflow-hidden"
                >
                  <div className="flex items-center gap-3">
                    <Loader2 size={16} className="text-[#ff6a00] animate-spin" />
                    <span className="text-[13px] text-black">
                      Building PDF from {stats.active} page{stats.active !== 1 ? 's' : ''}...
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
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <h3
                  className="text-[24px] text-black mb-2"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  PDF organized!
                </h3>
                <p className="text-[13px] text-black/55 mb-2">
                  {stats.active} page{stats.active !== 1 ? 's' : ''} · {formatBytes(result.blob.size)}
                </p>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-8">
                  {result.filename}
                </p>
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
                    Continue editing
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* SAVE BUTTON */}
            {/* ============================================ */}
            {!result && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleSave}
                disabled={stats.active === 0}
                className={`group w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 ${
                  stats.active === 0
                    ? 'bg-black/[0.08] text-black/40 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Save size={16} />
                  {stats.active === 0
                    ? 'At least one page required'
                    : `Save organized PDF (${stats.active} page${stats.active !== 1 ? 's' : ''})`}
                  {stats.active > 0 && (
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

// ============================================
// GRID PAGE CARD
// ============================================

function GridPageCard({
  page,
  index,
  isSelected,
  isPreviewing,
  onSelect,
  onToggleDelete,
  onRotate,
  onDuplicate,
  onPreview,
  onInsertBlank,
}: {
  page: PageItem;
  index: number;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onToggleDelete: () => void;
  onRotate: (dir: 1 | -1) => void;
  onDuplicate: () => void;
  onPreview: () => void;
  onInsertBlank: () => void;
}) {
  return (
    <Reorder.Item
      value={page}
      className="group cursor-grab active:cursor-grabbing relative"
      whileDrag={{ scale: 1.05, zIndex: 20, boxShadow: '0 20px 50px -15px rgba(255,106,0,0.3)' }}
      onClick={onPreview}
    >
      <div
        className={`relative aspect-[8.5/11] rounded-[14px] overflow-hidden border-2 transition-all duration-300 bg-white ${
          isSelected
            ? 'border-[#ff6a00] shadow-[0_8px_24px_-8px_rgba(255,106,0,0.4)]'
            : isPreviewing
              ? 'border-black/40 shadow-md'
              : 'border-black/[0.06] hover:border-black/[0.15]'
        } ${page.deleted ? 'opacity-40' : ''}`}
      >
        {/* Thumbnail */}
        {page.isBlank ? (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <div className="text-center">
              <FilePlus2 size={20} className="text-black/20 mx-auto mb-1" />
              <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-black/30">
                Blank
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white overflow-hidden">
            <img
              src={page.thumbnail}
              alt=""
              className="max-w-full max-h-full object-contain transition-transform duration-300"
              style={{ transform: `rotate(${page.rotation}deg)` }}
              loading="lazy"
              draggable={false}
            />
          </div>
        )}

        {/* Selection checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 border-2 ${
            isSelected
              ? 'bg-[#ff6a00] border-[#ff6a00]'
              : 'bg-white/90 backdrop-blur-sm border-white/60 hover:border-[#ff6a00]/50 opacity-0 group-hover:opacity-100'
          }`}
          aria-label="Select"
        >
          {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
        </button>

        {/* Page number badge */}
        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[9px] font-mono font-medium">
          {index + 1}
        </div>

        {/* Rotation badge */}
        {page.rotation !== 0 && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-[#ff6a00] text-white text-[8px] font-mono font-semibold">
            {page.rotation}°
          </div>
        )}

        {/* Deleted overlay */}
        {page.deleted && (
          <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
            <div className="px-2 py-1 rounded bg-red-500 text-white text-[9px] font-mono font-semibold uppercase tracking-wider">
              Deleted
            </div>
          </div>
        )}

        {/* Hover action overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onRotate(-1); }}
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-colors"
              title="Rotate left"
            >
              <RotateCcw size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRotate(1); }}
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-colors"
              title="Rotate right"
            >
              <RotateCw size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-colors"
              title="Duplicate"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleDelete(); }}
              className={`w-7 h-7 rounded-lg backdrop-blur flex items-center justify-center text-white transition-colors ${
                page.deleted ? 'bg-emerald-500/80 hover:bg-emerald-500' : 'bg-red-500/80 hover:bg-red-500'
              }`}
              title={page.deleted ? 'Restore' : 'Delete'}
            >
              {page.deleted ? <RefreshCw size={12} /> : <Trash2 size={12} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onInsertBlank(); }}
              className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white transition-colors"
              title="Insert blank after"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}

// ============================================
// LIST PAGE ROW
// ============================================

function ListPageRow({
  page,
  index,
  isSelected,
  isPreviewing,
  onSelect,
  onToggleDelete,
  onRotate,
  onDuplicate,
  onPreview,
}: {
  page: PageItem;
  index: number;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: () => void;
  onToggleDelete: () => void;
  onRotate: (dir: 1 | -1) => void;
  onDuplicate: () => void;
  onPreview: () => void;
}) {
  return (
    <Reorder.Item
      value={page}
      className="group cursor-grab active:cursor-grabbing"
      whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 20px 50px -15px rgba(255,106,0,0.25)' }}
    >
      <div
        className={`flex items-center gap-3 p-3 rounded-[16px] bg-white border transition-all duration-300 ${
          isSelected
            ? 'border-[#ff6a00] shadow-[0_8px_24px_-8px_rgba(255,106,0,0.3)]'
            : isPreviewing
              ? 'border-black/30'
              : 'border-black/[0.06] hover:border-black/[0.15]'
        } ${page.deleted ? 'opacity-50' : ''}`}
        onClick={onPreview}
      >
        {/* Drag handle */}
        <div className="shrink-0 text-black/20 group-hover:text-black/40 transition-colors">
          <GripVertical size={16} />
        </div>

        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all border-2 ${
            isSelected ? 'bg-[#ff6a00] border-[#ff6a00]' : 'border-black/20 hover:border-[#ff6a00]/50'
          }`}
        >
          {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
        </button>

        {/* Thumbnail */}
        <div className="shrink-0 w-12 h-16 rounded-lg overflow-hidden bg-[#f4f1ea] border border-black/[0.08] relative">
          {page.isBlank ? (
            <div className="w-full h-full flex items-center justify-center">
              <FilePlus2 size={14} className="text-black/20" />
            </div>
          ) : (
            <img
              src={page.thumbnail}
              alt=""
              className="w-full h-full object-cover object-top"
              style={{ transform: `rotate(${page.rotation}deg)` }}
            />
          )}
          <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-tl-md">
            {index + 1}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-black mb-0.5">
            {page.isBlank ? 'Blank page' : `Original page ${page.originalIndex}`}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.1em] text-black/40">
            <span>Position {index + 1}</span>
            {page.rotation !== 0 && (
              <>
                <span>·</span>
                <span className="text-[#ff6a00]">Rotated {page.rotation}°</span>
              </>
            )}
            {page.deleted && (
              <>
                <span>·</span>
                <span className="text-red-500">Deleted</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(-1); }}
            className="w-7 h-7 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-[#ff6a00] transition-colors"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(1); }}
            className="w-7 h-7 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-[#ff6a00] transition-colors"
          >
            <RotateCw size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="w-7 h-7 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-[#ff6a00] transition-colors"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleDelete(); }}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              page.deleted
                ? 'text-emerald-500 hover:bg-emerald-500/10'
                : 'text-black/30 hover:bg-red-500/10 hover:text-red-500'
            }`}
          >
            {page.deleted ? <RefreshCw size={12} /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}