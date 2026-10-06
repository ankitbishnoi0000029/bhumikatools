"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, Presentation, Copy, Check,
  Edit3, Settings2, Layers, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Save,
  Palette, Image as ImageIcon, ZoomIn, ZoomOut, RefreshCw, Info,
  BarChart3, Grid3x3, Search, Plus, Minus, Trash2, RotateCw,
  Monitor, FileOutput, CheckSquare, List, EyeOff, Maximize2,
  Lock, Unlock, Move, Sparkle, FileType,
} from 'lucide-react';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatBytes, downloadBlob } from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface SlideTextRun {
  text: string;
  x: number;    // in EMU
  y: number;
  width: number;
  height: number;
  fontSize: number;  // in pt
  bold: boolean;
  italic: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
}

interface SlideImage {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ParsedSlide {
  id: string;
  index: number;
  textRuns: SlideTextRun[];
  images: SlideImage[];
  rawText: string;
  notes?: string;
  hidden: boolean;
  bgColor?: string;
}

interface ParsedPresentation {
  slides: ParsedSlide[];
  fileName: string;
  slideCount: number;
  slideWidth: number;
  slideHeight: number;
}

type PageSize = 'match' | 'a4' | 'letter' | 'a3' | 'legal';
type Orientation = 'landscape' | 'portrait';
type Quality = 'low' | 'medium' | 'high';

interface PageConfig {
  id: PageSize;
  label: string;
  w: number;
  h: number;
}

const PAGE_SIZES: PageConfig[] = [
  { id: 'match', label: 'Match slides', w: 0, h: 0 },
  { id: 'a4', label: 'A4', w: 210, h: 297 },
  { id: 'a3', label: 'A3', w: 297, h: 420 },
  { id: 'letter', label: 'Letter', w: 216, h: 279 },
  { id: 'legal', label: 'Legal', w: 216, h: 356 },
];

const QUALITY_OPTIONS: { id: Quality; label: string; scale: number; desc: string }[] = [
  { id: 'low', label: 'Draft', scale: 1, desc: 'Fast, small file' },
  { id: 'medium', label: 'Standard', scale: 1.5, desc: 'Balanced' },
  { id: 'high', label: 'High', scale: 2, desc: 'Best quality' },
];

// EMU to pixels (1 pt = 12700 EMU, 1 pt = 1.333 px at 96 DPI)
const EMU_PER_PT = 12700;
const PT_TO_PX = 1.333;

const emuToPt = (emu: number) => emu / EMU_PER_PT;
const ptToPx = (pt: number) => pt * PT_TO_PX;

// ============================================
// COMPONENT
// ============================================

export default function PptToPdfPage() {
  const [presentation, setPresentation] = useState<ParsedPresentation | null>(null);
  const [editedSlides, setEditedSlides] = useState<ParsedSlide[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('match');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [quality, setQuality] = useState<Quality>('medium');
  const [margin, setMargin] = useState(0);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [slideRange, setSlideRange] = useState<{ from: number; to: number } | null>(null);
  const [showRangeInput, setShowRangeInput] = useState(false);
  const [filename, setFilename] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentRenderingSlide, setCurrentRenderingSlide] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [showSettings, setShowSettings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<ParsedSlide[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const slidePreviewRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // PARSE PPTX
  // ============================================

  const parsePPTX = useCallback(async (file: File): Promise<ParsedPresentation> => {
    const zip = await JSZip.loadAsync(file);

    // Find presentation.xml for slide size
    const presXml = await zip.file('ppt/presentation.xml')?.async('string');
    if (!presXml) throw new Error('Invalid PPTX file — missing presentation.xml');

    // Extract slide dimensions
    const sldSzMatch = presXml.match(/<p:sldSz\s+cx="(\d+)"\s+cy="(\d+)"/);
    const slideWidth = sldSzMatch ? parseInt(sldSzMatch[1]) : 9144000;   // 10 inches default
    const slideHeight = sldSzMatch ? parseInt(sldSzMatch[2]) : 6858000;  // 7.5 inches default

    // Find slide files
    const slideFiles: string[] = [];
    zip.forEach((path) => {
      if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) {
        slideFiles.push(path);
      }
    });

    // Sort by slide number
    slideFiles.sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
      const nb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
      return na - nb;
    });

    if (slideFiles.length === 0) {
      throw new Error('No slides found in the presentation.');
    }

    const slides: ParsedSlide[] = [];

    // Pre-load all images from ppt/media
    const imageMap = new Map<string, string>();
    const mediaFiles: string[] = [];
    zip.forEach((path) => {
      if (/^ppt\/media\/.+\.(png|jpg|jpeg|gif|bmp|svg)$/i.test(path)) {
        mediaFiles.push(path);
      }
    });

    await Promise.all(
      mediaFiles.map(async (path) => {
        try {
          const data = await zip.file(path)?.async('base64');
          if (data) {
            const ext = path.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'svg' ? 'image/svg+xml' :
                        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                        ext === 'gif' ? 'image/gif' :
                        ext === 'bmp' ? 'image/bmp' : 'image/png';
            imageMap.set(path.split('/').pop() || '', `data:${mime};base64,${data}`);
          }
        } catch {}
      })
    );

    // Parse each slide
    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const slideNum = i + 1;

      try {
        const slideXml = await zip.file(slidePath)?.async('string');
        if (!slideXml) continue;

        // Find relationships file
        const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
        const relsXml = await zip.file(relsPath)?.async('string') || '';
        const relMap = new Map<string, string>();
        const relMatches = relsXml.matchAll(/<Relationship\s+Id="([^"]+)"[^>]*Target="([^"]+)"/g);
        for (const m of relMatches) {
          relMap.set(m[1], m[2]);
        }

        // Extract all <p:sp> shape elements (text boxes)
        const textRuns: SlideTextRun[] = [];

        // Match each shape element (sp = shape)
        const shapeMatches = slideXml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g);

        for (const shapeMatch of shapeMatches) {
          const shapeXml = shapeMatch[0];

          // Get position (in EMU)
          const offMatch = shapeXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const extMatch = shapeXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (!offMatch || !extMatch) continue;

          const x = parseInt(offMatch[1]);
          const y = parseInt(offMatch[2]);
          const width = parseInt(extMatch[1]);
          const height = parseInt(extMatch[2]);

          // Extract all text runs <a:r>
          const textRunMatches = shapeXml.matchAll(/<a:r>[\s\S]*?<\/a:r>/g);

          for (const trMatch of textRunMatches) {
            const trXml = trMatch[0];

            // Get text
            const tMatch = trXml.match(/<a:t>([\s\S]*?)<\/a:t>/);
            if (!tMatch) continue;
            const text = tMatch[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            if (!text) continue;

            // Get font size (in centipoints — divide by 100 to get pt)
            const szMatch = trXml.match(/sz="(\d+)"/);
            const fontSize = szMatch ? parseInt(szMatch[1]) / 100 : 18;

            // Get bold/italic
            const isBold = /<a:rPr[^>]*\sb="1"/.test(trXml);
            const isItalic = /<a:rPr[^>]*\si="1"/.test(trXml);

            // Get color
            const colorMatch = trXml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
            const color = colorMatch ? `#${colorMatch[1]}` : '#000000';

            textRuns.push({
              text,
              x,
              y,
              width,
              height,
              fontSize,
              bold: isBold,
              italic: isItalic,
              color,
              align: 'left',
            });
          }
        }

        // Extract images (p:pic elements)
        const images: SlideImage[] = [];
        const picMatches = slideXml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g);

        for (const picMatch of picMatches) {
          const picXml = picMatch[0];

          const offMatch = picXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const extMatch = picXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          const embedMatch = picXml.match(/r:embed="(rId\d+)"/);

          if (!offMatch || !extMatch || !embedMatch) continue;

          const target = relMap.get(embedMatch[1]);
          if (!target) continue;

          const imageName = target.split('/').pop() || '';
          const dataUrl = imageMap.get(imageName);
          if (!dataUrl) continue;

          images.push({
            dataUrl,
            x: parseInt(offMatch[1]),
            y: parseInt(offMatch[2]),
            width: parseInt(extMatch[1]),
            height: parseInt(extMatch[2]),
          });
        }

        const rawText = textRuns.map((r) => r.text).join(' ');

        slides.push({
          id: `slide-${slideNum}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          index: i,
          textRuns,
          images,
          rawText,
          hidden: false,
        });

      } catch (e) {
        console.warn(`Failed to parse slide ${slideNum}:`, e);
      }

      setLoadProgress(Math.round(((i + 1) / slideFiles.length) * 100));
    }

    if (slides.length === 0) {
      throw new Error('Could not extract any slides from the file.');
    }

    return {
      slides,
      fileName: file.name.replace(/\.pptx?$/i, ''),
      slideCount: slides.length,
      slideWidth,
      slideHeight,
    };
  }, []);

  // ============================================
  // LOAD
  // ============================================

  const loadFile = useCallback(async (f: File) => {
    const validExt = /\.(pptx?|potx?)$/i.test(f.name);
    if (!validExt) {
      setError('Please select a PowerPoint file (.pptx, .ppt).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPresentation(null);
    setEditedSlides([]);
    setResult(null);
    setPreviewIndex(0);
    setLoadProgress(0);
    setHistory([]);
    setHistoryIndex(-1);

    try {
      const parsed = await parsePPTX(f);
      setPresentation(parsed);
      setEditedSlides(parsed.slides);
      setFilename(parsed.fileName);
      setHistory([parsed.slides]);
      setHistoryIndex(0);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to parse PowerPoint file.' : 'Failed to parse PowerPoint file.');
    } finally {
      setIsLoading(false);
    }
  }, [parsePPTX]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadFile(e.target.files[0]);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setPresentation(null);
    setEditedSlides([]);
    setResult(null);
    setError(null);
    setPreviewIndex(0);
    setHistory([]);
    setHistoryIndex(-1);
  };

  // ============================================
  // EDIT
  // ============================================

  const pushHistory = useCallback((newSlides: ParsedSlide[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, JSON.parse(JSON.stringify(newSlides))];
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const toggleSlideHidden = (idx: number) => {
    const updated = editedSlides.map((s, i) =>
      i === idx ? { ...s, hidden: !s.hidden } : s
    );
    setEditedSlides(updated);
    setResult(null);
    pushHistory(updated);
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editedSlides.length) return;
    const updated = [...editedSlides];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setEditedSlides(updated);
    setPreviewIndex(newIdx);
    setResult(null);
    pushHistory(updated);
  };

  const deleteSlide = (idx: number) => {
    if (editedSlides.length <= 1) {
      setError('Cannot delete the last slide.');
      return;
    }
    const updated = editedSlides.filter((_, i) => i !== idx);
    setEditedSlides(updated);
    setPreviewIndex(Math.min(previewIndex, updated.length - 1));
    setResult(null);
    pushHistory(updated);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setEditedSlides(JSON.parse(JSON.stringify(history[i])));
    setResult(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setEditedSlides(JSON.parse(JSON.stringify(history[i])));
    setResult(null);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const resetEdits = () => {
    if (!presentation) return;
    setEditedSlides(presentation.slides);
    setResult(null);
  };

  // ============================================
  // GET ACTIVE SLIDES
  // ============================================

  const activeSlides = useMemo(() => {
    let slides = editedSlides.filter((s) => !s.hidden);
    if (slideRange) {
      slides = slides.slice(slideRange.from - 1, slideRange.to);
    }
    return slides;
  }, [editedSlides, slideRange]);

  // ============================================
  // RENDER SLIDE TO CANVAS
  // ============================================

  const renderSlideToCanvas = async (slide: ParsedSlide, scale: number): Promise<HTMLCanvasElement> => {
    if (!presentation) throw new Error('No presentation');

    // Determine canvas size
    const slideW_px = ptToPx(emuToPt(presentation.slideWidth));
    const slideH_px = ptToPx(emuToPt(presentation.slideHeight));

    const canvas = document.createElement('canvas');
    canvas.width = slideW_px * scale;
    canvas.height = slideH_px * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slideW_px, slideH_px);

    // Draw images first (background)
    for (const img of slide.images) {
      try {
        const imgEl = await loadImage(img.dataUrl);
        const x = ptToPx(emuToPt(img.x));
        const y = ptToPx(emuToPt(img.y));
        const w = ptToPx(emuToPt(img.width));
        const h = ptToPx(emuToPt(img.height));
        ctx.drawImage(imgEl, x, y, w, h);
      } catch {}
    }

    // Draw text runs
    for (const run of slide.textRuns) {
      const x = ptToPx(emuToPt(run.x));
      const y = ptToPx(emuToPt(run.y));
      const w = ptToPx(emuToPt(run.width));
      const h = ptToPx(emuToPt(run.height));
      const fontPx = ptToPx(run.fontSize);

      // Build font string
      const fontStyle = run.italic ? 'italic ' : '';
      const fontWeight = run.bold ? 'bold ' : '';
      ctx.font = `${fontStyle}${fontWeight}${fontPx}px Helvetica, Arial, sans-serif`;
      ctx.fillStyle = run.color;
      ctx.textBaseline = 'top';

      // Word-wrap within box
      const words = run.text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const test = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(test);
        if (metrics.width > w && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);

      const lineHeight = fontPx * 1.25;
      lines.forEach((line, i) => {
        if (y + i * lineHeight > y + h + 20) return;
        ctx.fillText(line, x + 4, y + 4 + i * lineHeight, w - 8);
      });
    }

    return canvas;
  };

  const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  // ============================================
  // BUILD PDF
  // ============================================

  const handleConvert = async () => {
    if (!presentation || activeSlides.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setProcessProgress(0);
    setCurrentRenderingSlide(0);

    try {
      // Determine PDF page size
      let pdfW: number;
      let pdfH: number;

      const scale = QUALITY_OPTIONS.find((q) => q.id === quality)?.scale || 1.5;

      if (pageSize === 'match') {
        // Match slide aspect ratio
        const slideW_pt = emuToPt(presentation.slideWidth);
        const slideH_pt = emuToPt(presentation.slideHeight);
        pdfW = slideW_pt;
        pdfH = slideH_pt;
        if (orientation === 'portrait' && pdfW > pdfH) [pdfW, pdfH] = [pdfH, pdfW];
        if (orientation === 'landscape' && pdfH > pdfW) [pdfW, pdfH] = [pdfH, pdfW];
      } else {
        const cfg = PAGE_SIZES.find((p) => p.id === pageSize)!;
        pdfW = cfg.w;
        pdfH = cfg.h;
        if (orientation === 'landscape') [pdfW, pdfH] = [pdfH, pdfW];
      }

      const doc = new jsPDF({
        orientation: pdfW > pdfH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfW, pdfH],
        compress: true,
      });

      // Render each slide
      for (let i = 0; i < activeSlides.length; i++) {
        const slide = activeSlides[i];
        setCurrentRenderingSlide(i + 1);

        const canvas = await renderSlideToCanvas(slide, scale);
        const imgData = canvas.toDataURL('image/jpeg', 0.9);

        if (i > 0) doc.addPage([pdfW, pdfH], pdfW > pdfH ? 'landscape' : 'portrait');

        // Fit image into page with margin
        const availW = pdfW - margin * 2;
        const availH = pdfH - margin * 2;

        const imgAspect = canvas.width / canvas.height;
        const boxAspect = availW / availH;

        let drawW: number;
        let drawH: number;
        if (imgAspect > boxAspect) {
          drawW = availW;
          drawH = availW / imgAspect;
        } else {
          drawH = availH;
          drawW = availH * imgAspect;
        }

        const drawX = (pdfW - drawW) / 2;
        const drawY = (pdfH - drawH) / 2;

        doc.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');

        setProcessProgress(Math.round(((i + 1) / activeSlides.length) * 100));
      }

      const blob = doc.output('blob');
      setResult({
        blob,
        filename: `${filename || 'presentation'}.pdf`,
      });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'PDF generation failed.' : 'PDF generation failed.');
    } finally {
      setIsProcessing(false);
      setCurrentRenderingSlide(0);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ============================================
  // COMPUTED
  // ============================================

  const stats = useMemo(() => {
    let totalText = 0;
    let totalImages = 0;
    editedSlides.forEach((s) => {
      totalText += s.textRuns.length;
      totalImages += s.images.length;
    });
    return {
      total: editedSlides.length,
      visible: editedSlides.filter((s) => !s.hidden).length,
      hidden: editedSlides.filter((s) => s.hidden).length,
      totalText,
      totalImages,
    };
  }, [editedSlides]);

  const currentSlide = activeSlides[previewIndex];

  const searchMatch = (text: string) => {
    if (!searchQuery.trim()) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Aspect ratio of slide for preview
  const slideAspect = presentation
    ? presentation.slideWidth / presentation.slideHeight
    : 16 / 9;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      <input
        ref={inputRef}
        type="file"
        accept=".ppt,.pptx,.pot,.potx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onChange={handleInputChange}
        className="hidden"
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
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-black/[0.12]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              PowerPoint to PDF — Slide Conversion
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Real PPTX Parsing</span>
            <span>·</span>
            <span>Live Preview</span>
          </div>
        </div>

        {/* Heading */}
        {!presentation && !isLoading && (
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
              <h1 className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                PowerPoint to <span className="italic text-[#ff6a00]">PDF</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Convert PPTX presentations to PDF with real slide parsing. Preview every slide,
                pick range, adjust quality, and export high-quality PDF.
              </p>
            </div>
          </motion.div>
        )}

        {/* Upload state */}
        {!presentation && !isLoading && (
          <div className="max-w-3xl mx-auto">
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative p-16 rounded-[22px] bg-white border-2 border-dashed transition-all cursor-pointer ${
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
                  <Presentation size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop presentation here' : 'Select or drop a presentation'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Supports .pptx, .ppt, .pot, .potx files. All processing happens in your browser.
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <UploadCloud size={14} />
                  Choose PowerPoint file
                  <ArrowUpRight size={12} />
                </span>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {['.pptx', '.ppt', '.potx'].map((ext) => (
                    <span key={ext} className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 px-2 py-1 rounded-full border border-black/[0.08]">
                      {ext}
                    </span>
                  ))}
                </div>
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
                { icon: Presentation, label: 'Real slide parsing' },
                { icon: Eye, label: 'Live preview' },
                { icon: Grid3x3, label: 'Thumbnail grid' },
                { icon: FileText, label: 'High-quality PDF' },
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
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
              <Presentation size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Parsing slides... {loadProgress}%
            </span>
            <div className="mt-4 w-64 h-1 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div className="h-full bg-[#ff6a00]" animate={{ width: `${loadProgress}%` }} transition={{ duration: 0.2 }} />
            </div>
          </div>
        )}

        {/* Workspace */}
        {presentation && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <Presentation size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black truncate max-w-[200px]">{filename}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.visible}/{stats.total}</span>
                  <span className="text-[12px] text-black/50">slides</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.totalText}</span>
                  <span className="text-[12px] text-black/50">text runs</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.totalImages}</span>
                  <span className="text-[12px] text-black/50">images</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  onClick={resetEdits}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08] transition-colors"
                  title="Reset all edits"
                >
                  <RefreshCw size={12} />
                  Reset
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* ============ LEFT — Slides List ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Filename */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <label className="block text-[10px] font-mono uppercase text-black/40 mb-2">
                    Output filename
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => { setFilename(e.target.value); setResult(null); }}
                    className="w-full bg-[#f4f1ea] rounded-lg px-3 py-2 outline-none text-[13px] border border-black/[0.06] focus:border-[#ff6a00] transition-colors"
                  />
                </div>

                {/* Slide range */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <button
                    onClick={() => setShowRangeInput(!showRangeInput)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <List size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">
                        Slide Range
                      </span>
                    </div>
                    {showRangeInput ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  <AnimatePresence>
                    {showRangeInput && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={stats.visible}
                            value={slideRange?.from || 1}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(stats.visible, parseInt(e.target.value) || 1));
                              setSlideRange({ from: v, to: Math.max(v, slideRange?.to || stats.visible) });
                              setResult(null);
                            }}
                            className="flex-1 bg-[#f4f1ea] rounded-lg px-3 py-1.5 outline-none text-[12px] border border-black/[0.06] focus:border-[#ff6a00]"
                          />
                          <span className="text-[11px] text-black/40">to</span>
                          <input
                            type="number"
                            min={1}
                            max={stats.visible}
                            value={slideRange?.to || stats.visible}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(stats.visible, parseInt(e.target.value) || stats.visible));
                              setSlideRange({ from: Math.min(v, slideRange?.from || 1), to: v });
                              setResult(null);
                            }}
                            className="flex-1 bg-[#f4f1ea] rounded-lg px-3 py-1.5 outline-none text-[12px] border border-black/[0.06] focus:border-[#ff6a00]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-black/40">
                            {activeSlides.length} slides selected
                          </span>
                          <button
                            onClick={() => { setSlideRange(null); setResult(null); }}
                            className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] hover:text-[#ff8a3d]"
                          >
                            Clear
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Slides thumbnails */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Slides ({editedSlides.length})
                    </span>
                    <span className="text-[10px] font-mono text-black/40">
                      {stats.hidden > 0 && `${stats.hidden} hidden`}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {editedSlides.map((slide, idx) => {
                      const isActive = previewIndex === idx && !slide.hidden;
                      const isHidden = slide.hidden;
                      return (
                        <div
                          key={slide.id}
                          className={`group rounded-lg border transition-all ${
                            isActive
                              ? 'border-[#ff6a00]/60 bg-[#ff6a00]/[0.04] shadow-sm'
                              : isHidden
                              ? 'border-black/[0.04] bg-black/[0.02] opacity-50'
                              : 'border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (slide.hidden) return;
                              const visibleIdx = activeSlides.findIndex((s) => s.id === slide.id);
                              if (visibleIdx >= 0) setPreviewIndex(visibleIdx);
                            }}
                            className="w-full p-2 flex items-center gap-2 text-left"
                          >
                            <div className="shrink-0 w-16 h-10 rounded-md overflow-hidden bg-white border border-black/[0.08] relative">
                              <div
                                className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-black/30"
                                style={{ background: '#ffffff' }}
                              >
                                {slide.images.length > 0 ? (
                                  <img
                                    src={slide.images[0].dataUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : slide.textRuns.length > 0 ? (
                                  <div className="w-full h-full p-1 text-[6px] text-black/60 overflow-hidden leading-tight">
                                    {slide.textRuns.slice(0, 2).map((r) => r.text).join(' ').slice(0, 40)}
                                  </div>
                                ) : (
                                  <span>Empty</span>
                                )}
                              </div>
                              {isHidden && (
                                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                  <EyeOff size={10} className="text-red-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-[11px] font-medium ${isHidden ? 'text-black/40 line-through' : 'text-black'}`}>
                                Slide {idx + 1}
                              </div>
                              <div className="text-[9px] font-mono uppercase text-black/40">
                                {slide.textRuns.length}t · {slide.images.length}i
                              </div>
                            </div>
                          </button>
                          {/* Slide actions */}
                          <div className="flex items-center justify-end gap-0.5 px-2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveSlide(idx, -1)}
                              disabled={idx === 0}
                              className="w-6 h-6 rounded-md hover:bg-black/[0.06] disabled:opacity-30 flex items-center justify-center text-black/40"
                              title="Move up"
                            >
                              <ChevronUp size={11} />
                            </button>
                            <button
                              onClick={() => moveSlide(idx, 1)}
                              disabled={idx === editedSlides.length - 1}
                              className="w-6 h-6 rounded-md hover:bg-black/[0.06] disabled:opacity-30 flex items-center justify-center text-black/40"
                              title="Move down"
                            >
                              <ChevronDown size={11} />
                            </button>
                            <button
                              onClick={() => toggleSlideHidden(idx)}
                              className="w-6 h-6 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40"
                              title={isHidden ? 'Show' : 'Hide'}
                            >
                              {isHidden ? <Eye size={11} /> : <EyeOff size={11} />}
                            </button>
                            <button
                              onClick={() => deleteSlide(idx)}
                              className="w-6 h-6 rounded-md hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/40"
                              title="Delete"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ============ CENTER — Preview ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                    <button
                      onClick={() => setViewMode('single')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase transition-all ${
                        viewMode === 'single' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50'
                      }`}
                    >
                      <Maximize2 size={11} />
                      Single
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase transition-all ${
                        viewMode === 'grid' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50'
                      }`}
                    >
                      <Grid3x3 size={11} />
                      Grid
                    </button>
                  </div>

                  {viewMode === 'single' && (
                    <>
                      <div className="flex items-center gap-1 bg-[#f4f1ea] rounded-lg p-1">
                        <button
                          onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                          disabled={previewIndex <= 0}
                          className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span className="px-2 text-[12px] font-mono">{previewIndex + 1} / {activeSlides.length}</span>
                        <button
                          onClick={() => setPreviewIndex(Math.min(activeSlides.length - 1, previewIndex + 1))}
                          disabled={previewIndex >= activeSlides.length - 1}
                          className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center">
                          <ZoomOut size={14} />
                        </button>
                        <span className="text-[11px] font-mono w-10 text-center">{zoom}%</span>
                        <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center">
                          <ZoomIn size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Preview canvas */}
                <div className="rounded-[18px] bg-[#ebe7de]/40 border border-black/[0.06] p-6 min-h-[700px] flex items-start justify-center overflow-auto relative">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Single slide view */}
                  {viewMode === 'single' && currentSlide && (
                    <div
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <div
                        ref={(el) => {
                          if (el) slidePreviewRefs.current.set(previewIndex, el);
                        }}
                        className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] relative overflow-hidden"
                        style={{
                          width: 720,
                          height: 720 / slideAspect,
                          fontFamily: 'Helvetica, Arial, sans-serif',
                        }}
                      >
                        {/* Render images */}
                        {currentSlide.images.map((img, i) => {
                          const imgAspect = presentation.slideWidth / presentation.slideHeight;
                          const previewW = 720;
                          const previewH = 720 / imgAspect;
                          const xPct = img.x / presentation.slideWidth;
                          const yPct = img.y / presentation.slideHeight;
                          const wPct = img.width / presentation.slideWidth;
                          const hPct = img.height / presentation.slideHeight;
                          return (
                            <img
                              key={`img-${i}`}
                              src={img.dataUrl}
                              alt=""
                              className="absolute pointer-events-none select-none"
                              style={{
                                left: `${xPct * 100}%`,
                                top: `${yPct * 100}%`,
                                width: `${wPct * 100}%`,
                                height: `${hPct * 100}%`,
                                objectFit: 'contain',
                              }}
                            />
                          );
                        })}

                        {/* Render text runs */}
                        {currentSlide.textRuns.map((run, i) => {
                          const xPct = run.x / presentation.slideWidth;
                          const yPct = run.y / presentation.slideHeight;
                          const wPct = run.width / presentation.slideWidth;
                          const hPct = run.height / presentation.slideHeight;
                          const fontPxPreview = (run.fontSize / emuToPt(presentation.slideHeight)) * (720 / slideAspect);
                          const fontPx = (run.fontSize / 100) * (720 / emuToPt(presentation.slideWidth) / 1000) * 6;

                          // Better font calculation: pt in original slide, scaled to preview
                          const origSlideHeightPt = emuToPt(presentation.slideHeight);
                          const previewHeight = 720 / slideAspect;
                          const previewFontPx = (run.fontSize / origSlideHeightPt) * previewHeight;

                          return (
                            <div
                              key={`text-${i}`}
                              className="absolute pointer-events-none select-none"
                              style={{
                                left: `${xPct * 100}%`,
                                top: `${yPct * 100}%`,
                                width: `${wPct * 100}%`,
                                height: `${hPct * 100}%`,
                                fontSize: `${previewFontPx}px`,
                                fontWeight: run.bold ? 'bold' : 'normal',
                                fontStyle: run.italic ? 'italic' : 'normal',
                                color: run.color,
                                lineHeight: 1.2,
                                overflow: 'hidden',
                                padding: '2px 4px',
                              }}
                            >
                              {run.text}
                            </div>
                          );
                        })}

                        {/* Empty state */}
                        {currentSlide.images.length === 0 && currentSlide.textRuns.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-black/30 text-[14px]">
                            Empty slide
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grid view */}
                  {viewMode === 'grid' && (
                    <div className="w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeSlides.map((slide, idx) => (
                          <button
                            key={slide.id}
                            onClick={() => { setPreviewIndex(idx); setViewMode('single'); }}
                            className={`group relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] bg-white ${
                              previewIndex === idx ? 'border-[#ff6a00] shadow-lg' : 'border-black/[0.08]'
                            }`}
                            style={{ aspectRatio: `${slideAspect}` }}
                          >
                            {/* Mini render */}
                            <div className="absolute inset-0">
                              {slide.images.map((img, i) => {
                                const xPct = img.x / presentation.slideWidth;
                                const yPct = img.y / presentation.slideHeight;
                                const wPct = img.width / presentation.slideWidth;
                                const hPct = img.height / presentation.slideHeight;
                                return (
                                  <img
                                    key={i}
                                    src={img.dataUrl}
                                    alt=""
                                    className="absolute pointer-events-none"
                                    style={{
                                      left: `${xPct * 100}%`,
                                      top: `${yPct * 100}%`,
                                      width: `${wPct * 100}%`,
                                      height: `${hPct * 100}%`,
                                      objectFit: 'contain',
                                    }}
                                  />
                                );
                              })}
                              {slide.textRuns.slice(0, 5).map((run, i) => {
                                const xPct = run.x / presentation.slideWidth;
                                const yPct = run.y / presentation.slideHeight;
                                const wPct = run.width / presentation.slideWidth;
                                const hPct = run.height / presentation.slideHeight;
                                return (
                                  <div
                                    key={i}
                                    className="absolute overflow-hidden"
                                    style={{
                                      left: `${xPct * 100}%`,
                                      top: `${yPct * 100}%`,
                                      width: `${wPct * 100}%`,
                                      height: `${hPct * 100}%`,
                                      fontSize: '6px',
                                      lineHeight: 1.1,
                                      color: run.color,
                                      fontWeight: run.bold ? 'bold' : 'normal',
                                    }}
                                  >
                                    {run.text.slice(0, 60)}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                              {idx + 1}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slide info */}
                {currentSlide && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[18px] bg-white border border-black/[0.06]">
                    <div className="text-[11px] font-mono uppercase text-black/40">
                      Slide {previewIndex + 1} of {activeSlides.length} · {currentSlide.textRuns.length} text · {currentSlide.images.length} images
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSlideHidden(editedSlides.findIndex((s) => s.id === currentSlide.id))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08] transition-colors"
                      >
                        <EyeOff size={11} />
                        Hide
                      </button>
                      <button
                        onClick={() => {
                          const idx = editedSlides.findIndex((s) => s.id === currentSlide.id);
                          if (idx >= 0) moveSlide(idx, -1);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08] transition-colors"
                      >
                        <ChevronUp size={11} />
                        Up
                      </button>
                      <button
                        onClick={() => {
                          const idx = editedSlides.findIndex((s) => s.id === currentSlide.id);
                          if (idx >= 0) moveSlide(idx, 1);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08] transition-colors"
                      >
                        <ChevronDown size={11} />
                        Down
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ============ RIGHT — Settings & Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Page settings */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings2 size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">Page Setup</span>
                    </div>
                    {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        {/* Page size */}
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Page size</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {PAGE_SIZES.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => { setPageSize(p.id); setResult(null); }}
                                className={`py-1.5 rounded-md text-[10px] font-mono uppercase transition-all ${
                                  pageSize === p.id
                                    ? 'bg-[#ff6a00] text-white'
                                    : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Orientation */}
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Orientation</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(['landscape', 'portrait'] as Orientation[]).map((o) => (
                              <button
                                key={o}
                                onClick={() => { setOrientation(o); setResult(null); }}
                                className={`py-1.5 rounded-md text-[10px] font-mono uppercase transition-all ${
                                  orientation === o
                                    ? 'bg-[#ff6a00] text-white'
                                    : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                                }`}
                              >
                                {o.slice(0, 5)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Margin */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">Margin</label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{margin}mm</span>
                          </div>
                          <input
                            type="range" min={0} max={20}
                            value={margin}
                            onChange={(e) => { setMargin(parseInt(e.target.value)); setResult(null); }}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        {/* Include notes */}
                        <div className="pt-2 border-t border-black/[0.06]">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeNotes}
                              onChange={(e) => { setIncludeNotes(e.target.checked); setResult(null); }}
                              className="accent-[#ff6a00]"
                            />
                            <span className="text-[11px] text-black/70">Include speaker notes</span>
                          </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quality */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkle size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Quality</span>
                  </div>
                  <div className="space-y-1.5">
                    {QUALITY_OPTIONS.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => { setQuality(q.id); setResult(null); }}
                        className={`w-full p-2.5 rounded-lg text-left transition-all border ${
                          quality === q.id
                            ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                            : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                        }`}
                      >
                        <div className={`text-[11px] font-medium ${quality === q.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                          {q.label}
                        </div>
                        <div className="text-[9px] text-black/40">{q.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Info</span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Total slides</span>
                      <span className="font-mono font-medium text-black">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Visible</span>
                      <span className="font-mono font-medium text-black">{stats.visible}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Hidden</span>
                      <span className="font-mono font-medium text-black">{stats.hidden}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-black/[0.06]">
                      <span className="text-black/50">Exporting</span>
                      <span className="font-mono font-medium text-[#ff6a00]">{activeSlides.length}</span>
                    </div>
                  </div>
                </div>

                {/* Save */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Save size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Export PDF</span>
                  </div>

                  {result ? (
                    <div className="space-y-3">
                      <div className="text-center py-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 size={22} className="text-emerald-500" />
                        </div>
                        <div className="text-[13px] font-medium text-black mb-1">PDF ready!</div>
                        <div className="text-[10px] font-mono text-black/40">{formatBytes(result.blob.size)}</div>
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2"
                      >
                        <Download size={13} />
                        Download PDF
                      </button>
                      <button
                        onClick={() => setResult(null)}
                        className="w-full py-2.5 rounded-full border border-black/[0.12] text-[11px] hover:bg-black/[0.03]"
                      >
                        Change settings
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-black/50 mb-4 leading-relaxed">
                        {activeSlides.length} slide{activeSlides.length !== 1 ? 's' : ''} will be exported to PDF.
                      </p>

                      {/* Progress */}
                      {isProcessing && (
                        <div className="mb-4">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[10px] font-mono uppercase text-black/40">
                              Rendering slide {currentRenderingSlide}/{activeSlides.length}
                            </span>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{processProgress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                            <motion.div
                              className="h-full bg-[#ff6a00]"
                              animate={{ width: `${processProgress}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleConvert}
                        disabled={isProcessing || activeSlides.length === 0}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                          isProcessing || activeSlides.length === 0
                            ? 'bg-black/[0.08] text-black/40'
                            : 'bg-black text-white hover:bg-[#ff6a00]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Converting...</>
                        ) : (
                          <><Sparkles size={13} /> Convert to PDF</>
                        )}
                      </button>
                    </>
                  )}

                  {error && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[11px]">
                      <AlertCircle size={12} />
                      {error}
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="text-[10px] font-mono uppercase text-black/40 mb-3">Tips</div>
                  <ul className="space-y-2 text-[11px] text-black/60 leading-relaxed">
                    <li>• <strong>Match slides</strong> preserves aspect ratio</li>
                    <li>• <strong>Hide slides</strong> to exclude from PDF</li>
                    <li>• <strong>Drag order</strong> with up/down buttons</li>
                    <li>• <strong>High quality</strong> for printing</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Back link */}
        <div className="mt-16 text-center">
          <Link href="/pdf-tools" className="group inline-flex items-center gap-3">
            <span className="relative text-[14px] font-medium text-black pb-1">
              Back to all tools
              <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
            </span>
            <span className="w-8 h-8 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all">
              <ArrowUpRight size={13} className="text-black group-hover:text-white transition-colors" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}