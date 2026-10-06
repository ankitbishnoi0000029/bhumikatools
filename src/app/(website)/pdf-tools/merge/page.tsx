"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { UploadCloud, FileText, X, GripVertical, Trash2, Layers, ArrowUpRight, Loader2, AlertCircle, CheckCircle2, Download, RefreshCw, Sparkles, Eye, ChevronLeft, ChevronRight, File } from "lucide-react";
import { createBlobFromBytes, mergePDFsWithInfo, getPDFInfo, formatBytes, downloadBlob } from "@/lib/pdf-utils";

// ============================================
// TYPES
// ============================================

interface PDFFile {
  id: string;
  file: File;
  pageCount: number;
  preview: string;
  title: string;
}

// ============================================
// PAGE
// ============================================

export default function MergePDFPage() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; totalPages: number } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Reset preview when files change
  useEffect(() => {
    if (previewIndex >= files.length) {
      setPreviewIndex(Math.max(0, files.length - 1));
    }
  }, [files.length, previewIndex]);

  // Auto-clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ---------- FILE HANDLING ----------

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const arr = Array.from(incoming).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));

      if (arr.length === 0) {
        setError("Please select PDF files only.");
        return;
      }

      // Filter out duplicates
      const existing = new Set(files.map((f) => `${f.file.name}-${f.file.size}-${f.file.lastModified}`));
      const unique = arr.filter((f) => !existing.has(`${f.name}-${f.size}-${f.lastModified}`));

      if (unique.length === 0) {
        setError("These files are already added.");
        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const newFiles: PDFFile[] = [];
        for (const file of unique) {
          try {
            const info = await getPDFInfo(file);
            newFiles.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
              file,
              pageCount: info.pageCount,
              preview: info.firstPagePreview,
              title: info.title,
            });
          } catch (e) {
            console.error("Failed to load:", file.name, e);
            setError(`Could not load "${file.name}". The file may be corrupted.`);
          }
        }
        if (newFiles.length > 0) {
          setFiles((prev) => [...prev, ...newFiles]);
        }
      } catch (e) {
        setError("Failed to load one or more files.");
      } finally {
        setIsLoading(false);
      }
    },
    [files],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setResult(null);
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setResult(null);
    setError(null);
    setPreviewIndex(0);
    if (inputRef.current) inputRef.current.value = "";
    if (addMoreInputRef.current) addMoreInputRef.current.value = "";
  }, []);

  // ---------- INPUT CHANGE HANDLERS ----------

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset so same file can be selected again
      e.target.value = "";
    },
    [addFiles],
  );

  const handleAddMoreChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      e.target.value = "";
    },
    [addFiles],
  );

  // ---------- DRAG & DROP ----------

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

  // ---------- PROCESS ----------

  const handleMerge = async () => {
    if (files.length < 2) {
      setError("Please add at least 2 PDF files to merge.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setProgress(20);

    try {
      const fileList = files.map((f) => f.file);
      setProgress(50);
      const res = await mergePDFsWithInfo(fileList);
      setProgress(100);

      const blob = createBlobFromBytes(res.bytes, "application/pdf");
      setResult({
        blob,
        filename: "merged.pdf",
        totalPages: res.totalPages,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message || "Failed to merge PDFs. Please try again." : "Failed to merge PDFs. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ---------- STATS ----------

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  // ---------- PREVIEW NAVIGATION ----------

  const nextPreview = () => setPreviewIndex((i) => Math.min(i + 1, files.length - 1));
  const prevPreview = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      {/* ============================================ */}
      {/* HIDDEN FILE INPUTS — ALWAYS MOUNTED */}
      {/* ============================================ */}

      {/* Primary input (for initial upload) */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload PDF files"
      />

      {/* Secondary input (for "Add more" button) */}
      <input
        ref={addMoreInputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        onChange={handleAddMoreChange}
        className="hidden"
        aria-label="Add more PDF files"
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
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Organize PDF — Merge</span>
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
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Chapter 02 — Organize</div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Merge <span className="italic text-[#ff6a00]">PDF</span> files.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">Combine two or more PDFs into a single document. Drag to reorder, preview side-by-side, then merge in one click. All in your browser.</p>
          </div>
        </motion.div>

        {/* ============================================ */}
        {/* UPLOAD STATE */}
        {/* ============================================ */}
        {files.length === 0 && !isLoading && (
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
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <Layers
                    size={32}
                    strokeWidth={1.5}
                    className="text-[#ff6a00]"
                  />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {isDragging ? "Drop PDFs here" : "Select or drop PDF files"}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">Drag and drop 2 or more PDFs to combine them into one document. Reorder before merging.</p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <UploadCloud size={14} />
                  Choose PDF files
                  <ArrowUpRight size={12} />
                </span>
              </div>
            </div>

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

            {/* Feature strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Layers, label: "Unlimited PDFs" },
                { icon: Eye, label: "Live preview" },
                { icon: GripVertical, label: "Drag to reorder" },
                { icon: Sparkles, label: "Fast merge" },
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
        {/* LOADING STATE (initial) */}
        {/* ============================================ */}
        {isLoading && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2
                size={40}
                className="text-[#ff6a00]"
              />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">Loading PDF files...</span>
          </div>
        )}

        {/* ============================================ */}
        {/* FILES + WORKSPACE */}
        {/* ============================================ */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <File
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">{files.length}</span>
                  <span className="text-[12px] text-black/50">{files.length === 1 ? "file" : "files"}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <FileText
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">{totalPages}</span>
                  <span className="text-[12px] text-black/50">pages total</span>
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
                  onClick={() => setShowPreview(!showPreview)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] transition-colors ${showPreview ? "bg-[#ff6a00] text-white" : "bg-black/[0.05] text-black/60 hover:bg-black/10"}`}
                >
                  <Eye size={12} />
                  {showPreview ? "Hide preview" : "Show preview"}
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

            {/* Workspace: Side-by-side */}
            <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
              {/* LEFT: File list with drag-reorder */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4 flex items-center justify-between">
                  <span>Files — Drag to reorder</span>
                  <span>
                    {files.length} {files.length === 1 ? "file" : "files"}
                  </span>
                </div>

                <Reorder.Group
                  axis="y"
                  values={files}
                  onReorder={(newOrder) => {
                    setFiles(newOrder);
                    setResult(null);
                  }}
                  className="space-y-3"
                >
                  {files.map((pdf, index) => (
                    <Reorder.Item
                      key={pdf.id}
                      value={pdf}
                      className="group cursor-grab active:cursor-grabbing"
                      whileDrag={{ scale: 1.02, zIndex: 10, boxShadow: "0 20px 50px -15px rgba(255,106,0,0.25)" }}
                    >
                      <div
                        className={`flex items-center gap-4 p-4 rounded-[18px] bg-white border transition-all duration-300 ${previewIndex === index && showPreview ? "border-[#ff6a00]/40 shadow-[0_8px_30px_-10px_rgba(255,106,0,0.2)]" : "border-black/[0.06] hover:border-black/[0.12]"}`}
                        onClick={() => setPreviewIndex(index)}
                      >
                        {/* Drag handle */}
                        <div className="shrink-0 text-black/20 group-hover:text-black/40 transition-colors">
                          <GripVertical size={18} />
                        </div>

                        {/* Thumbnail */}
                        <div className="shrink-0 w-14 h-20 rounded-lg overflow-hidden bg-[#f4f1ea] border border-black/[0.08] relative">
                          {pdf.preview ? (
                            <img
                              src={pdf.preview}
                              alt={pdf.title}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText
                                size={16}
                                className="text-black/30"
                              />
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] font-mono px-1.5 py-0.5 rounded-tl-md">{index + 1}</div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-medium text-black truncate mb-1">{pdf.file.name}</div>
                          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.1em] text-black/40">
                            <span>
                              {pdf.pageCount} {pdf.pageCount === 1 ? "page" : "pages"}
                            </span>
                            <span>·</span>
                            <span>{formatBytes(pdf.file.size)}</span>
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(pdf.id);
                          }}
                          className="shrink-0 w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/30 transition-colors"
                          aria-label="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>

                {/* Add more files — FIXED */}
                <button
                  onClick={() => addMoreInputRef.current?.click()}
                  disabled={isLoading}
                  className="mt-3 w-full py-4 rounded-[18px] border-2 border-dashed border-black/[0.08] hover:border-[#ff6a00]/40 hover:bg-[#ff6a00]/[0.02] flex items-center justify-center gap-2 text-[12px] font-mono uppercase tracking-[0.15em] text-black/40 hover:text-[#ff6a00] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Add more PDFs
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT: Preview */}
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="lg:sticky lg:top-32 h-fit"
                >
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4 flex items-center justify-between">
                    <span>Preview</span>
                    <span>
                      {previewIndex + 1} / {files.length}
                    </span>
                  </div>

                  <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
                    {/* Preview header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                        <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                          {files[previewIndex]?.file.name.slice(0, 30)}
                          {files[previewIndex]?.file.name.length > 30 ? "..." : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={prevPreview}
                          disabled={previewIndex === 0}
                          className="w-7 h-7 rounded-lg hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black/60 transition-colors"
                          aria-label="Previous file"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          onClick={nextPreview}
                          disabled={previewIndex === files.length - 1}
                          className="w-7 h-7 rounded-lg hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-black/60 transition-colors"
                          aria-label="Next file"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Preview content */}
                    <div className="p-6 bg-[#ebe7de]/40 flex justify-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={files[previewIndex]?.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden max-w-[400px]"
                        >
                          {files[previewIndex]?.preview ? (
                            <img
                              src={files[previewIndex].preview}
                              alt={files[previewIndex].title}
                              className="w-full h-auto"
                            />
                          ) : (
                            <div className="w-[300px] h-[400px] flex items-center justify-center">
                              <FileText
                                size={40}
                                className="text-black/20"
                              />
                            </div>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Preview footer */}
                    <div className="px-4 py-3 border-t border-black/[0.06] flex items-center justify-between">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">Page 1 of {files[previewIndex]?.pageCount || 0}</div>
                      <div className="flex items-center gap-1.5">
                        {files.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setPreviewIndex(i)}
                            className={`h-1 rounded-full transition-all duration-300 ${i === previewIndex ? "w-4 bg-[#ff6a00]" : "w-1 bg-black/20 hover:bg-black/40"}`}
                            aria-label={`Preview file ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Order indicator */}
                  <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                    <span>Files will merge in this order</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ============================================ */}
            {/* PROGRESS */}
            {/* ============================================ */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-8 rounded-[18px] bg-white border border-black/[0.06] p-5 overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2
                      size={16}
                      className="text-[#ff6a00] animate-spin"
                    />
                    <span className="text-[13px] text-black">Merging {files.length} PDFs...</span>
                    <span className="ml-auto text-[11px] font-mono text-black/40">{progress}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full bg-[#ff6a00]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
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
                className="mt-8 rounded-[22px] bg-white border border-emerald-500/20 p-8 text-center"
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
                  Merged successfully!
                </h3>
                <p className="text-[13px] text-black/55 mb-2">
                  {files.length} PDFs → 1 file · {result.totalPages} pages total
                </p>
                <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-8">
                  {result.filename} · {formatBytes(result.blob.size)}
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                  >
                    <Download size={14} />
                    Download merged PDF
                  </button>
                  <button
                    onClick={() => {
                      setResult(null);
                      setProgress(0);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/[0.12] text-[13px] font-medium hover:bg-black/[0.03] transition-colors"
                  >
                    <RefreshCw size={14} />
                    Merge again
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* MERGE BUTTON */}
            {/* ============================================ */}
            {!result && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleMerge}
                disabled={files.length < 2}
                className={`group mt-8 w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 ${files.length < 2 ? "bg-black/[0.08] text-black/40 cursor-not-allowed" : "bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]"}`}
              >
                <span className="inline-flex items-center gap-3">
                  <Layers size={16} />
                  {files.length < 2 ? `Add ${2 - files.length} more PDF to merge` : `Merge ${files.length} PDFs into 1`}
                  {files.length >= 2 && (
                    <ArrowUpRight
                      size={14}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  )}
                </span>
              </motion.button>
            )}
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
