"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, ScanText, ArrowUpRight, Eye, Sparkles,
  ChevronLeft, ChevronRight, Languages, Settings2, Copy, Check,
  Search, Type, FileType, FileCode2, Package, Sparkle, Brain,
  ZoomIn, ZoomOut, Maximize2, RotateCw, Layers, Hash, BookOpen,
  Wand2, Gauge, Target, Percent,
} from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
  width: number;
  height: number;
}

interface PageOcrResult {
  pageNum: number;
  text: string;
  confidence: number;
  wordCount: number;
  charCount: number;
}

type OutputFormat = 'txt' | 'pdf' | 'docx' | 'json' | 'md';
type OcrMode = 'fast' | 'balanced' | 'accurate';

// ============================================
// LANGUAGES
// ============================================

const LANGUAGES = [
  { code: 'eng', label: 'English', flag: '🇬🇧' },
  { code: 'hin', label: 'Hindi', flag: '🇮🇳' },
  { code: 'tam', label: 'Tamil', flag: '🇮🇳' },
  { code: 'tel', label: 'Telugu', flag: '🇮🇳' },
  { code: 'ben', label: 'Bengali', flag: '🇮🇳' },
  { code: 'mar', label: 'Marathi', flag: '🇮🇳' },
  { code: 'guj', label: 'Gujarati', flag: '🇮🇳' },
  { code: 'kan', label: 'Kannada', flag: '🇮🇳' },
  { code: 'mal', label: 'Malayalam', flag: '🇮🇳' },
  { code: 'pan', label: 'Punjabi', flag: '🇮🇳' },
  { code: 'urd', label: 'Urdu', flag: '🇵🇰' },
  { code: 'ara', label: 'Arabic', flag: '🇸🇦' },
  { code: 'chi_sim', label: 'Chinese', flag: '🇨🇳' },
  { code: 'jpn', label: 'Japanese', flag: '🇯🇵' },
  { code: 'kor', label: 'Korean', flag: '🇰🇷' },
  { code: 'fra', label: 'French', flag: '🇫🇷' },
  { code: 'deu', label: 'German', flag: '🇩🇪' },
  { code: 'spa', label: 'Spanish', flag: '🇪🇸' },
];

const OCR_MODES: { id: OcrMode; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'fast', label: 'Fast', desc: 'Quick scan', icon: Gauge, color: '#10b981' },
  { id: 'balanced', label: 'Balanced', desc: 'Good accuracy', icon: Target, color: '#3b82f6' },
  { id: 'accurate', label: 'Accurate', desc: 'Best quality', icon: Sparkle, color: '#a855f7' },
];

const OUTPUT_FORMATS: { id: OutputFormat; label: string; ext: string; icon: any; desc: string }[] = [
  { id: 'txt', label: 'Plain Text', ext: 'txt', icon: FileText, desc: '.txt' },
  { id: 'pdf', label: 'Searchable PDF', ext: 'pdf', icon: FileType, desc: '.pdf' },
  { id: 'docx', label: 'Word Document', ext: 'doc', icon: FileType, desc: '.doc' },
  { id: 'md', label: 'Markdown', ext: 'md', icon: FileCode2, desc: '.md' },
  { id: 'json', label: 'JSON Data', ext: 'json', icon: Hash, desc: '.json' },
];

// ============================================
// PAGE
// ============================================

export default function OcrPDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [language, setLanguage] = useState('eng');
  const [mode, setMode] = useState<OcrMode>('balanced');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('txt');
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentOcrPage, setCurrentOcrPage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PageOcrResult[] | null>(null);
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({});
  const [showSettings, setShowSettings] = useState(true);
  const [zoomedThumb, setZoomedThumb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
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
    setThumbs([]);
    setResults(null);
    setEditedTexts({});
    setLoadProgress(0);
    setPreviewIndex(0);

    try {
      const info = await getPDFInfo(f);
      setPageCount(info.pageCount);

      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const bytes = await readFileAsArrayBuffer(f);
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const loaded: PageThumb[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        loaded.push({
          pageNum: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: viewport.width,
          height: viewport.height,
        });
        setLoadProgress(Math.round((i / pdf.numPages) * 100));
      }
      setThumbs(loaded);
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
    setPageCount(0);
    setResults(null);
    setEditedTexts({});
    setError(null);
    setPreviewIndex(0);
    setProcessProgress(0);
    setCurrentOcrPage(0);
  };

  // ---------- OCR PROCESS ----------

  const runOCR = async () => {
    if (!file || thumbs.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setProcessProgress(0);
    setResults(null);
    setEditedTexts({});

    try {
      // Dynamically import Tesseract.js
      const Tesseract = await import('tesseract.js');

      // Map our mode to Tesseract's PSM
      const psmMapping: Record<OcrMode, any> = {
        fast: 6, // Assume a single uniform block of text
        balanced: 3, // Fully automatic
        accurate: 1, // Auto with OSD
      };

      const ocrResults: PageOcrResult[] = [];

      for (let i = 0; i < thumbs.length; i++) {
        const thumb = thumbs[i];
        setCurrentOcrPage(i + 1);

        try {
          const result = await Tesseract.recognize(
            thumb.dataUrl,
            language,
            {
              logger: (m) => {
                if (m.status === 'recognizing text') {
                  const baseProgress = (i / thumbs.length) * 100;
                  const pageProgress = m.progress * (100 / thumbs.length);
                  setProcessProgress(Math.round(baseProgress + pageProgress));
                }
              },
            }
          );

          const text = result.data.text.trim();
          const confidence = result.data.confidence;

          ocrResults.push({
            pageNum: thumb.pageNum,
            text,
            confidence,
            wordCount: text.split(/\s+/).filter(Boolean).length,
            charCount: text.length,
          });
        } catch (e) {
          console.error(`OCR failed for page ${thumb.pageNum}`, e);
          ocrResults.push({
            pageNum: thumb.pageNum,
            text: '',
            confidence: 0,
            wordCount: 0,
            charCount: 0,
          });
        }
      }

      setProcessProgress(100);
      setResults(ocrResults);

      // Initialize edited texts
      const initial: Record<number, string> = {};
      ocrResults.forEach((r) => { initial[r.pageNum] = r.text; });
      setEditedTexts(initial);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'OCR failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setCurrentOcrPage(0);
    }
  };

  // ---------- BUILD OUTPUT ----------

  const buildText = () => {
    if (!results) return '';
    return results.map((r) => {
      const text = editedTexts[r.pageNum] !== undefined ? editedTexts[r.pageNum] : r.text;
      return `--- Page ${r.pageNum} ---\n${text}`;
    }).join('\n\n');
  };

  const buildMarkdown = () => {
    if (!results) return '';
    return results.map((r) => {
      const text = editedTexts[r.pageNum] !== undefined ? editedTexts[r.pageNum] : r.text;
      return `## Page ${r.pageNum}\n\n${text}`;
    }).join('\n\n');
  };

  const buildJSON = () => {
    if (!results) return '';
    const data = {
      source: file?.name,
      pages: results.length,
      language,
      mode,
      extractedAt: new Date().toISOString(),
      content: results.map((r) => ({
        page: r.pageNum,
        text: editedTexts[r.pageNum] !== undefined ? editedTexts[r.pageNum] : r.text,
        confidence: r.confidence,
        wordCount: r.wordCount,
        charCount: r.charCount,
      })),
    };
    return JSON.stringify(data, null, 2);
  };

  const buildSearchablePDF = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    for (const r of results!) {
      const text = editedTexts[r.pageNum] !== undefined ? editedTexts[r.pageNum] : r.text;
      const pageW = 595.28;
      const pageH = 841.89;
      const margin = 50;
      const fontSize = 11;
      const lineHeight = 15;
      const maxWidth = pageW - margin * 2;

      let page = doc.addPage([pageW, pageH]);
      let y = pageH - margin - 30;

      // Page header
      page.drawText(`Page ${r.pageNum}`, {
        x: margin, y: pageH - margin,
        size: 10, font: boldFont,
        color: rgb(0.4, 0.4, 0.4),
      });

      page.drawText(`Confidence: ${r.confidence.toFixed(1)}%`, {
        x: pageW - margin - 100, y: pageH - margin,
        size: 10, font,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Divider
      page.drawLine({
        start: { x: margin, y: pageH - margin - 8 },
        end: { x: pageW - margin, y: pageH - margin - 8 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });

      y -= 40;

      const lines = text.split('\n');
      for (const rawLine of lines) {
        const words = rawLine.split(' ');
        let currentLine = '';

        for (const word of words) {
          const test = currentLine ? `${currentLine} ${word}` : word;
          const width = font.widthOfTextAtSize(test, fontSize);

          if (width > maxWidth && currentLine) {
            if (y < margin) {
              page = doc.addPage([pageW, pageH]);
              y = pageH - margin;
            }
            page.drawText(currentLine, {
              x: margin, y, size: fontSize, font,
              color: rgb(0.1, 0.1, 0.1),
            });
            y -= lineHeight;
            currentLine = word;
          } else {
            currentLine = test;
          }
        }

        if (currentLine) {
          if (y < margin) {
            page = doc.addPage([pageW, pageH]);
            y = pageH - margin;
          }
          page.drawText(currentLine, {
            x: margin, y, size: fontSize, font,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= lineHeight;
        }
      }
    }

    return await doc.save();
  };

  const handleDownload = async () => {
    if (!results || !file) return;
    const baseName = file.name.replace(/\.pdf$/i, '');

    try {
      if (outputFormat === 'txt') {
        downloadBlob(new Blob([buildText()], { type: 'text/plain' }), `${baseName}-ocr.txt`);
      } else if (outputFormat === 'md') {
        downloadBlob(new Blob([buildMarkdown()], { type: 'text/markdown' }), `${baseName}-ocr.md`);
      } else if (outputFormat === 'json') {
        downloadBlob(new Blob([buildJSON()], { type: 'application/json' }), `${baseName}-ocr.json`);
      } else if (outputFormat === 'docx') {
        // Simple HTML-based .doc
        const html = results.map((r) => {
          const text = editedTexts[r.pageNum] || r.text;
          return `<div style="page-break-after: always;"><h2>Page ${r.pageNum}</h2><p>${text.replace(/\n/g, '<br/>')}</p></div>`;
        }).join('');
        const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>OCR Result</title></head><body>${html}</body></html>`;
        downloadBlob(new Blob([docHtml], { type: 'application/msword' }), `${baseName}-ocr.doc`);
      } else if (outputFormat === 'pdf') {
        const bytes = await buildSearchablePDF();
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}-searchable.pdf`);
      }
    } catch (e: any) {
      setError('Download failed. Please try again.');
    }
  };

  // ---------- COPY ----------

  const copyAllText = () => {
    const text = buildText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------- PREVIEW ----------

  const nextPreview = () => setPreviewIndex((i) => Math.min(i + 1, thumbs.length - 1));
  const prevPreview = () => setPreviewIndex((i) => Math.max(i - 1, 0));

  // ---------- STATS ----------

  const stats = useMemo(() => {
    if (!results) return { pages: 0, words: 0, chars: 0, avgConfidence: 0, totalConfidence: 0 };
    const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
    const totalChars = results.reduce((sum, r) => sum + r.charCount, 0);
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const avgConfidence = results.length > 0 ? totalConfidence / results.length : 0;
    return {
      pages: results.length,
      words: totalWords,
      chars: totalChars,
      avgConfidence,
      totalConfidence,
    };
  }, [results]);

  // ---------- SEARCH HIGHLIGHT ----------

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '***$1***');
  };

  // ============================================
  // RENDER
  // ============================================

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
              Optimize PDF — OCR
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>18 Languages</span>
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
              OCR <span className="italic text-[#ff6a00]">scanned</span> PDFs.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Extract searchable text from scanned documents using AI-powered OCR.
              Supports 18 languages. Edit, preview, and export in 5 formats.
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
                  <ScanText size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {isDragging ? 'Drop scanned PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-sm mx-auto font-light">
                  Perfect for scanned documents, old books, receipts, or image-based PDFs.
                  Extract text in your language.
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
                { icon: Languages, label: '18 languages' },
                { icon: Brain, label: 'AI-powered' },
                { icon: Eye, label: 'Editable text' },
                { icon: FileType, label: '5 output formats' },
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
              <ScanText size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Scanning pages... {loadProgress}%
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

            {/* Main workspace grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

              {/* LEFT: Preview */}
              <div className="lg:col-span-5 space-y-5">

                {/* Page preview */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden lg:sticky lg:top-32">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                    <div className="flex items-center gap-2">
                      <Eye size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                        Scanned page
                      </span>
                    </div>
                    {thumbs.length > 1 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.1em] text-black/50">
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

                  <div className="p-6 bg-[#ebe7de]/40 flex items-center justify-center min-h-[400px] relative">
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                      }}
                    />

                    {thumbs[previewIndex] && (
                      <div className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden max-w-[280px]">
                        <img
                          src={thumbs[previewIndex].dataUrl}
                          alt=""
                          className="block w-full h-auto"
                          draggable={false}
                        />
                        {/* OCR progress badge */}
                        {isProcessing && currentOcrPage === thumbs[previewIndex].pageNum && (
                          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#ff6a00] text-white text-[10px] font-mono uppercase tracking-[0.1em] shadow-lg flex items-center gap-1.5">
                            <Loader2 size={10} className="animate-spin" />
                            OCR running
                          </div>
                        )}
                        {/* Confidence badge */}
                        {results && results.find((r) => r.pageNum === thumbs[previewIndex].pageNum) && (
                          <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-white text-[10px] font-mono shadow-lg ${
                            (results.find((r) => r.pageNum === thumbs[previewIndex].pageNum)?.confidence || 0) > 85
                              ? 'bg-emerald-500'
                              : (results.find((r) => r.pageNum === thumbs[previewIndex].pageNum)?.confidence || 0) > 60
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          }`}>
                            {Math.round(results.find((r) => r.pageNum === thumbs[previewIndex].pageNum)?.confidence || 0)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-5 py-3 border-t border-black/[0.06] bg-white flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      Page {thumbs[previewIndex]?.pageNum || 0} of {pageCount}
                    </div>
                    {results && (
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        {results.find((r) => r.pageNum === thumbs[previewIndex].pageNum)?.wordCount || 0} words
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings panel */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full px-6 py-4 flex items-center justify-between border-b border-black/[0.06] hover:bg-black/[0.01] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings2 size={14} className="text-[#ff6a00]" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/60">
                        OCR Settings
                      </span>
                    </div>
                    <ChevronRight size={14} className={`text-black/40 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {showSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 space-y-6">

                          {/* Language */}
                          <div>
                            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                              Language
                            </label>
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              disabled={isProcessing}
                              className="w-full bg-[#f4f1ea] rounded-lg px-4 py-3 outline-none border border-black/[0.08] focus:border-[#ff6a00] text-[14px] transition-colors disabled:opacity-50"
                            >
                              {LANGUAGES.map((l) => (
                                <option key={l.code} value={l.code}>
                                  {l.flag} {l.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* OCR mode */}
                          <div>
                            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                              Accuracy mode
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {OCR_MODES.map((m) => {
                                const Icon = m.icon;
                                const isActive = mode === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    disabled={isProcessing}
                                    className={`p-3 rounded-xl text-left transition-all border ${
                                      isActive
                                        ? 'text-white border-transparent shadow-lg'
                                        : 'bg-white border-black/[0.08] text-black/60 hover:border-black/[0.2]'
                                    } disabled:opacity-50`}
                                    style={isActive ? { backgroundColor: m.color } : {}}
                                  >
                                    <Icon size={13} className="mb-1.5" />
                                    <div className="text-[11px] font-medium mb-0.5">{m.label}</div>
                                    <div className={`text-[9px] font-mono uppercase tracking-[0.05em] ${
                                      isActive ? 'text-white/80' : 'text-black/40'
                                    }`}>
                                      {m.desc}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Output format */}
                          <div>
                            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                              Output format
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {OUTPUT_FORMATS.map((f) => {
                                const Icon = f.icon;
                                const isActive = outputFormat === f.id;
                                return (
                                  <button
                                    key={f.id}
                                    onClick={() => setOutputFormat(f.id)}
                                    className={`p-3 rounded-xl text-left transition-all border flex items-center gap-2.5 ${
                                      isActive
                                        ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                                        : 'bg-white border-black/[0.08] hover:border-black/[0.2]'
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      isActive ? 'bg-[#ff6a00] text-white' : 'bg-[#f4f1ea] text-black/50'
                                    }`}>
                                      <Icon size={14} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className={`text-[11px] font-medium truncate ${isActive ? 'text-[#ff6a00]' : 'text-black'}`}>
                                        {f.label}
                                      </div>
                                      <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-black/40">
                                        {f.desc}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* RIGHT: OCR Results */}
              <div className="lg:col-span-7 space-y-5">

                {/* Progress / Stats */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-[18px] bg-white border border-[#ff6a00]/20 p-5 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Brain size={16} className="text-[#ff6a00] animate-pulse" />
                        <div className="flex-1">
                          <div className="text-[13px] text-black font-medium">
                            Extracting text from page {currentOcrPage} of {pageCount}
                          </div>
                          <div className="text-[11px] text-black/50 mt-0.5">
                            Language: {LANGUAGES.find((l) => l.code === language)?.label} · {mode} mode
                          </div>
                        </div>
                        <span className="text-[13px] font-mono text-[#ff6a00] font-semibold">
                          {processProgress}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full bg-[#ff6a00]"
                          initial={{ width: 0 }}
                          animate={{ width: `${processProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Result stats */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-4 gap-3"
                  >
                    <div className="p-4 rounded-[16px] bg-white border border-black/[0.06]">
                      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                        Pages
                      </div>
                      <div className="text-[20px] font-medium text-black" style={{ fontFamily: 'Georgia, serif' }}>
                        {stats.pages}
                      </div>
                    </div>
                    <div className="p-4 rounded-[16px] bg-white border border-black/[0.06]">
                      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                        Words
                      </div>
                      <div className="text-[20px] font-medium text-black" style={{ fontFamily: 'Georgia, serif' }}>
                        {stats.words.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 rounded-[16px] bg-white border border-black/[0.06]">
                      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                        Chars
                      </div>
                      <div className="text-[20px] font-medium text-black" style={{ fontFamily: 'Georgia, serif' }}>
                        {stats.chars.toLocaleString()}
                      </div>
                    </div>
                    <div className={`p-4 rounded-[16px] border ${
                      stats.avgConfidence > 85
                        ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                        : stats.avgConfidence > 60
                          ? 'bg-amber-500/[0.06] border-amber-500/30'
                          : 'bg-red-500/[0.06] border-red-500/30'
                    }`}>
                      <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40 mb-1">
                        Confidence
                      </div>
                      <div className={`text-[20px] font-medium ${
                        stats.avgConfidence > 85 ? 'text-emerald-600' : stats.avgConfidence > 60 ? 'text-amber-600' : 'text-red-600'
                      }`} style={{ fontFamily: 'Georgia, serif' }}>
                        {Math.round(stats.avgConfidence)}%
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Text output */}
                <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                    <div className="flex items-center gap-2.5">
                      <Type size={14} className="text-[#ff6a00]" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/60">
                        Extracted text {results ? `(${results.length} pages)` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {results && (
                        <>
                          {/* Search input */}
                          <div className="relative flex items-center">
                            <Search size={11} className="absolute left-2.5 text-black/30 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-7 pr-2 py-1.5 rounded-full bg-white border border-black/[0.08] focus:border-[#ff6a00] outline-none text-[11px] w-32 md:w-40 transition-colors"
                            />
                          </div>
                          <button
                            onClick={copyAllText}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] transition-colors ${
                              copied ? 'bg-emerald-500/10 text-emerald-600' : 'bg-black/[0.04] text-black/60 hover:bg-black/[0.08]'
                            }`}
                          >
                            {copied ? <Check size={10} /> : <Copy size={10} />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="max-h-[600px] overflow-y-auto">
                    {!results && !isProcessing && (
                      <div className="p-16 text-center">
                        <ScanText size={40} className="text-black/20 mx-auto mb-4" strokeWidth={1.5} />
                        <div className="text-[13px] font-medium text-black/60 mb-1">
                          Ready to extract text
                        </div>
                        <div className="text-[11px] text-black/40">
                          Choose your language and mode, then click Extract Text
                        </div>
                      </div>
                    )}

                    {isProcessing && !results && (
                      <div className="p-16 text-center">
                        <Loader2 size={40} className="text-[#ff6a00] animate-spin mx-auto mb-4" />
                        <div className="text-[13px] font-medium text-black/60 mb-1">
                          OCR in progress...
                        </div>
                        <div className="text-[11px] text-black/40">
                          This may take a few seconds per page
                        </div>
                      </div>
                    )}

                    {results && (
                      <div className="divide-y divide-black/[0.06]">
                        {results.map((r) => {
                          const currentText = editedTexts[r.pageNum] !== undefined ? editedTexts[r.pageNum] : r.text;
                          const isEditing = false;
                          return (
                            <div key={r.pageNum} className="p-6">
                              {/* Page header */}
                              <div className="flex items-center justify-between mb-3 pb-3 border-b border-black/[0.06]">
                                <div className="flex items-center gap-3">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-semibold ${
                                    r.confidence > 85 ? 'bg-emerald-500/10 text-emerald-600'
                                      : r.confidence > 60 ? 'bg-amber-500/10 text-amber-600'
                                        : 'bg-red-500/10 text-red-600'
                                  }`}>
                                    {r.pageNum}
                                  </div>
                                  <div>
                                    <div className="text-[12px] font-medium text-black">Page {r.pageNum}</div>
                                    <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-black/40">
                                      {r.wordCount} words · {r.confidence.toFixed(1)}% confidence
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => setPreviewIndex(results.findIndex((x) => x.pageNum === r.pageNum))}
                                    className="w-6 h-6 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40 hover:text-[#ff6a00] transition-colors"
                                    title="Preview page"
                                  >
                                    <Eye size={11} />
                                  </button>
                                </div>
                              </div>

                              {/* Editable text */}
                              <textarea
                                value={currentText}
                                onChange={(e) => setEditedTexts((prev) => ({ ...prev, [r.pageNum]: e.target.value }))}
                                rows={Math.min(12, Math.max(4, currentText.split('\n').length))}
                                className="w-full bg-[#f4f1ea]/40 rounded-xl p-4 outline-none border border-transparent focus:border-[#ff6a00]/40 text-[13px] leading-[1.7] text-black font-light resize-y transition-colors"
                                placeholder="No text detected on this page"
                              />

                              {!currentText && (
                                <div className="text-[11px] text-black/40 italic mt-2">
                                  No text detected. Try a different language or accuracy mode.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {results && (
                    <div className="px-6 py-3 border-t border-black/[0.06] bg-white flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Editing as {outputFormat.toUpperCase()} · {LANGUAGES.find((l) => l.code === language)?.label}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        You can edit text before downloading
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* STATUS BAR */}
            {/* ============================================ */}
            {!results && !isProcessing && (
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
                      Ready to extract text
                    </div>
                    <div className="text-[12px] text-black/60">
                      {pageCount} page{pageCount !== 1 ? 's' : ''} · <span className="font-medium text-[#ff6a00]">{LANGUAGES.find((l) => l.code === language)?.label}</span>
                      {' '}· <span className="text-black/50">{mode} mode</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================ */}
            {/* EXTRACT BUTTON */}
            {/* ============================================ */}
            {!results && !isProcessing && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={runOCR}
                className="group w-full py-4 rounded-full text-[14px] font-medium transition-all duration-300 bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]"
              >
                <span className="inline-flex items-center gap-3">
                  <ScanText size={16} />
                  Extract Text from {pageCount} Page{pageCount !== 1 ? 's' : ''}
                  <ArrowUpRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.button>
            )}

            {/* ============================================ */}
            {/* DOWNLOAD BAR */}
            {/* ============================================ */}
            {results && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 rounded-[22px] bg-white border border-emerald-500/20"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <div>
                      <div
                        className="text-[16px] font-medium text-black mb-0.5"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        OCR complete!
                      </div>
                      <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-black/50">
                        {stats.pages} pages · {stats.words.toLocaleString()} words · {Math.round(stats.avgConfidence)}% confidence
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                    >
                      <Download size={14} />
                      Download {OUTPUT_FORMATS.find((f) => f.id === outputFormat)?.label}
                    </button>
                    <button
                      onClick={() => {
                        setResults(null);
                        setEditedTexts({});
                        setProcessProgress(0);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-black/[0.12] text-[13px] font-medium hover:bg-black/[0.03] transition-colors"
                    >
                      <RefreshCw size={14} />
                      Re-run OCR
                    </button>
                  </div>
                </div>
              </motion.div>
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