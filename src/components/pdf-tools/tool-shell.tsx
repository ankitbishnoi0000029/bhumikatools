"use client";

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, ArrowUpRight, FileText, X, Loader2,
  AlertCircle, CheckCircle2, Download, RefreshCw,
} from 'lucide-react';
import { formatBytes, downloadBlob } from '@/lib/pdf-utils';

interface ToolShellProps {
  title: string;
  slug: string;
  description: string;
  category: string;
  multiple?: boolean;
  accept?: string;
  children?: (files: File[], reset: () => void) => React.ReactNode;
  onProcess?: (files: File[], setProgress: (p: number) => void) => Promise<{ blob: Blob; filename: string; extra?: any }>;
}

export default function ToolShell({
  title,
  slug,
  description,
  category,
  multiple = false,
  accept = 'application/pdf',
  children,
  onProcess,
}: ToolShellProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; filename: string; extra?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFiles([]);
    setResult(null);
    setError(null);
    setIsProcessing(false);
    setProgress(0);
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setError(null);
    setResult(null);
    setFiles(multiple ? [...files, ...arr] : arr.slice(0, 1));
  }, [files, multiple]);

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleProcess = async () => {
    if (!onProcess || files.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setProgress(10);
    try {
      const res = await onProcess(files, setProgress);
      setProgress(100);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
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
              {category} — {title}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Free</span><span>·</span><span>Client-side</span>
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
              PDF Tools — {category}
            </div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {title}
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              {description}
            </p>
          </div>
        </motion.div>

        {/* Main */}
        <div className="max-w-3xl mx-auto">
          {!files.length && !result ? (
            /* ---------- UPLOAD ---------- */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
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
                <input
                  ref={inputRef}
                  type="file"
                  multiple={multiple}
                  accept={accept}
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                  className="hidden"
                />
                <div className="text-center">
                  <motion.div
                    animate={{ y: isDragging ? -8 : 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                  >
                    <UploadCloud size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                  </motion.div>
                  <h3
                    className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {isDragging ? 'Drop file here' : `Select or drop ${multiple ? 'files' : 'file'}`}
                  </h3>
                  <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">
                    Drag and drop or click to browse. Files are processed locally in your browser.
                  </p>
                  <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                    <FileText size={14} />
                    Choose {multiple ? 'files' : 'file'}
                    <ArrowUpRight size={12} />
                  </span>
                </div>
              </div>
              {error && (
                <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[13px]">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </motion.div>
          ) : (
            /* ---------- FILES / RESULT ---------- */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Files list */}
              <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 mb-6">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-black/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                      {files.length} {files.length === 1 ? 'file' : 'files'} selected
                    </span>
                  </div>
                  <button
                    onClick={reset}
                    className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 hover:text-[#ff6a00] transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#f4f1ea]/50 border border-black/[0.04]"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0">
                        <FileText size={15} className="text-[#ff6a00]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-black truncate">{f.name}</div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          {formatBytes(f.size)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="w-7 h-7 rounded-lg hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/40 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom controls (children) */}
              {children && !result && (
                <div className="rounded-[22px] bg-white border border-black/[0.06] p-6 mb-6">
                  {children(files, reset)}
                </div>
              )}

              {/* Progress */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-[22px] bg-white border border-black/[0.06] p-6 mb-6 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 size={16} className="text-[#ff6a00] animate-spin" />
                      <span className="text-[13px] text-black">Processing your file...</span>
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

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-[22px] bg-white border border-emerald-500/20 p-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <h3
                    className="text-[24px] text-black mb-2"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Done!
                  </h3>
                  <p className="text-[13px] text-black/55 mb-8">{result.filename}</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                    >
                      <Download size={14} />
                      Download
                    </button>
                    <button
                      onClick={reset}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/[0.12] text-[13px] font-medium hover:bg-black/[0.03] transition-colors"
                    >
                      <RefreshCw size={14} />
                      Start over
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Action button */}
              {!result && !isProcessing && onProcess && (
                <button
                  onClick={handleProcess}
                  className="w-full mt-6 py-4 rounded-full bg-black text-white text-[14px] font-medium hover:bg-[#ff6a00] transition-colors"
                >
                  Process now
                </button>
              )}

              {error && (
                <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-[13px]">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </div>

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