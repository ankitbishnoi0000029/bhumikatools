"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, Presentation, Copy, Check,
  Edit3, Settings2, Type, Layers, ChevronLeft, ChevronRight, Save,
  Wand2, Layout, Palette, Image as ImageIcon, ZoomIn, ZoomOut,
  RefreshCw, Info, BarChart3, Maximize2, Search, Grid3x3,
  AlignLeft, AlignCenter, AlignRight, Hash, SplitSquareHorizontal,
  Monitor, Sun, Moon, Sparkle, FileOutput, CheckSquare, Minus,
  ChevronDown, ChevronUp, RotateCw, List, type LucideIcon,
} from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import {
  getPDFInfo, formatBytes, downloadBlob, readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface SlideContent {
  pageNum: number;
  title: string;
  body: string[];
  rawText: string;
  imageDataUrl?: string;
  wordCount: number;
  charCount: number;
  hasImages: boolean;
}

interface ExtractedPresentation {
  slides: SlideContent[];
  totalPages: number;
  totalWords: number;
  title: string;
}

type LayoutType = 'title-content' | 'title-only' | 'two-column' | 'image-focus' | 'section-header' | 'content-only';
type ThemeType = 'cream' | 'dark' | 'modern' | 'minimal' | 'corporate' | 'vibrant';
type AspectRatio = '16:9' | '4:3' | '16:10';
type OutputMode = 'single-pptx' | 'per-slide-images' | 'both';

interface ThemeConfig {
  id: ThemeType;
  label: string;
  desc: string;
  bg: string;
  bgAlt: string;
  titleColor: string;
  bodyColor: string;
  accent: string;
  fontTitle: string;
  fontBody: string;
}

const THEMES: ThemeConfig[] = [
  {
    id: 'cream', label: 'Cream Editorial', desc: 'Warm & elegant',
    bg: '#f4f1ea', bgAlt: '#ebe7de', titleColor: '#0a0a0a', bodyColor: '#3a3a3a',
    accent: '#ff6a00', fontTitle: 'Georgia', fontBody: 'Calibri',
  },
  {
    id: 'dark', label: 'Dark Pro', desc: 'Sleek & modern',
    bg: '#0a0a0a', bgAlt: '#1a1a1a', titleColor: '#ffffff', bodyColor: '#d0d0d0',
    accent: '#ff6a00', fontTitle: 'Georgia', fontBody: 'Calibri',
  },
  {
    id: 'modern', label: 'Modern Minimal', desc: 'Clean & light',
    bg: '#ffffff', bgAlt: '#f8f8f8', titleColor: '#111111', bodyColor: '#444444',
    accent: '#3b82f6', fontTitle: 'Arial', fontBody: 'Arial',
  },
  {
    id: 'minimal', label: 'Mono Minimal', desc: 'Typography focus',
    bg: '#fafafa', bgAlt: '#f0f0f0', titleColor: '#000000', bodyColor: '#333333',
    accent: '#000000', fontTitle: 'Courier New', fontBody: 'Courier New',
  },
  {
    id: 'corporate', label: 'Corporate Blue', desc: 'Professional',
    bg: '#ffffff', bgAlt: '#f0f6ff', titleColor: '#1e3a8a', bodyColor: '#1f2937',
    accent: '#1e40af', fontTitle: 'Calibri', fontBody: 'Calibri',
  },
  {
    id: 'vibrant', label: 'Vibrant', desc: 'Bold & colorful',
    bg: '#1e1b4b', bgAlt: '#312e81', titleColor: '#ffffff', bodyColor: '#e0e7ff',
    accent: '#ec4899', fontTitle: 'Arial', fontBody: 'Arial',
  },
];

const LAYOUTS: { id: LayoutType; label: string; desc: string; icon: LucideIcon }[] = [
  { id: 'title-content', label: 'Title + Content', desc: 'Heading with body', icon: Layout },
  { id: 'title-only', label: 'Title Only', desc: 'Just the heading', icon: Type },
  { id: 'two-column', label: 'Two Column', desc: 'Split content', icon: SplitSquareHorizontal },
  { id: 'image-focus', label: 'Image Focus', desc: 'Large visual', icon: ImageIcon },
  { id: 'section-header', label: 'Section Header', desc: 'Chapter divider', icon: Hash },
  { id: 'content-only', label: 'Content Only', desc: 'No title', icon: AlignLeft },
];

const ASPECT_RATIOS: { id: AspectRatio; label: string; w: number; h: number }[] = [
  { id: '16:9', label: 'Widescreen 16:9', w: 13.333, h: 7.5 },
  { id: '4:3', label: 'Standard 4:3', w: 10, h: 7.5 },
  { id: '16:10', label: 'Wide 16:10', w: 13.333, h: 8.333 },
];

// ============================================
// COMPONENT
// ============================================

export default function PdfToPowerPointPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pres, setPres] = useState<ExtractedPresentation | null>(null);
  const [editedSlides, setEditedSlides] = useState<Record<number, SlideContent>>({});
  const [layout, setLayout] = useState<LayoutType>('title-content');
  const [theme, setTheme] = useState<ThemeType>('cream');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [outputMode, setOutputMode] = useState<OutputMode>('single-pptx');
  const [fontScale, setFontScale] = useState(1);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [includeBullets, setIncludeBullets] = useState(true);
  const [splitOnBlankLine, setSplitOnBlankLine] = useState(true);
  const [maxBulletChars, setMaxBulletChars] = useState(200);

  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'slide' | 'grid'>('slide');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, SlideContent>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // SLIDE BUILDER — Split text into slides
  // ============================================

  const buildSlide = useCallback((
    pageNum: number,
    text: string,
    images: string[]
  ): SlideContent[] => {
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0 && images.length === 0) {
      return [{
        pageNum, title: `Page ${pageNum}`, body: [], rawText: '',
        wordCount: 0, charCount: 0, hasImages: false,
      }];
    }

    // Detect title: first line, or first line before blank/short
    const firstLine = lines[0] || '';
    const titleIsHead = firstLine.length < 120 && (
      firstLine === firstLine.toUpperCase() ||
      firstLine.length < 60
    );

    const title = titleIsHead ? firstLine : `Page ${pageNum}`;
    const contentLines = titleIsHead ? lines.slice(1) : lines;

    // Group content into bullet points
    const bullets: string[] = [];
    let currentBullet = '';

    contentLines.forEach((line) => {
      // Check for existing bullet markers
      const isExistingBullet = /^[\-\•\*\u2022\u25CF\u25E6\u2023]\s+/.test(line);
      const isNumbered = /^\d+[\.\)]\s+/.test(line);

      if (isExistingBullet || isNumbered) {
        // Push current, start new
        if (currentBullet) bullets.push(currentBullet.trim());
        const cleanLine = line
          .replace(/^[\-\•\*\u2022\u25CF\u25E6\u2023]\s+/, '')
          .replace(/^\d+[\.\)]\s+/, '');
        currentBullet = cleanLine;
      } else if (line.length > maxBulletChars) {
        // Long line — split into multiple bullets
        if (currentBullet) bullets.push(currentBullet.trim());
        const chunks = line.match(new RegExp(`.{1,${maxBulletChars}}(\\s|$)`, 'g')) || [line];
        chunks.forEach((chunk) => {
          if (chunk.trim()) bullets.push(chunk.trim());
        });
        currentBullet = '';
      } else if (
        currentBullet &&
        !/\.\s*$/.test(currentBullet) &&
        line.length < 100 &&
        !splitOnBlankLine
      ) {
        // Continue if not a full sentence and no blank line split
        currentBullet += ' ' + line;
      } else {
        if (currentBullet) bullets.push(currentBullet.trim());
        currentBullet = line;
      }
    });

    if (currentBullet) bullets.push(currentBullet.trim());

    const allText = [title, ...bullets].join('\n');

    return [{
      pageNum,
      title,
      body: bullets.filter((b) => b.length > 0),
      rawText: allText,
      wordCount: allText.split(/\s+/).filter(Boolean).length,
      charCount: allText.length,
      hasImages: images.length > 0,
      imageDataUrl: images[0],
    }];
  }, [maxBulletChars, splitOnBlankLine]);

  // ============================================
  // EXTRACT PDF
  // ============================================

  const extractPDF = useCallback(async (f: File): Promise<ExtractedPresentation> => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const slides: SlideContent[] = [];
    let totalWords = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      // Group text by lines
      const lineMap = new Map<number, any[]>();
      (textContent.items as any[]).forEach((item) => {
        if (!item.str) return;
        const tx = item.transform;
        const y = tx[5];
        const key = Math.round(y / 3) * 3;
        if (!lineMap.has(key)) lineMap.set(key, []);
        lineMap.get(key)!.push(item);
      });

      const sortedLines = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([_, items]) => {
          items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
          let lineText = '';
          let prevEnd = 0;
          items.forEach((it: any, idx: number) => {
            if (idx > 0) {
              const x = it.transform[4];
              if (x - prevEnd > 3 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
                lineText += ' ';
              }
            }
            lineText += it.str;
            prevEnd = it.transform[4] + (it.width || 0);
          });
          return lineText.trim();
        })
        .filter((l) => l.length > 0);

      const pageText = sortedLines.join('\n');

      // Extract images
      const images: string[] = [];
      try {
        const ops = await page.getOperatorList();
        const pdfjsLib = await import('pdfjs-dist');
        for (let k = 0; k < ops.fnArray.length; k++) {
          if (
            ops.fnArray[k] === (pdfjsLib as any).OPS.paintImageXObject ||
            ops.fnArray[k] === (pdfjsLib as any).OPS.paintJpegXObject
          ) {
            const imgName = ops.argsArray[k][0];
            try {
              const img = await new Promise<any>((resolve) => {
                page.objs.get(imgName, (val: any) => resolve(val));
              });
              if (img && img.width && img.height) {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d')!;
                const imgData = ctx.createImageData(img.width, img.height);
                if (img.data) {
                  if (img.data.length === img.width * img.height * 4) {
                    imgData.data.set(img.data);
                  } else if (img.data.length === img.width * img.height * 3) {
                    for (let p = 0, q = 0; p < img.data.length; p += 3, q += 4) {
                      imgData.data[q] = img.data[p];
                      imgData.data[q + 1] = img.data[p + 1];
                      imgData.data[q + 2] = img.data[p + 2];
                      imgData.data[q + 3] = 255;
                    }
                  }
                  ctx.putImageData(imgData, 0, 0);
                  images.push(canvas.toDataURL('image/jpeg', 0.85));
                }
              }
            } catch {}
          }
        }
      } catch {}

      const pageSlides = buildSlide(i, pageText, images);
      pageSlides.forEach((s) => {
        slides.push(s);
        totalWords += s.wordCount;
      });

      setLoadProgress(Math.round((i / pdf.numPages) * 100));
    }

    return {
      slides,
      totalPages: pdf.numPages,
      totalWords,
      title: f.name.replace(/\.pdf$/i, ''),
    };
  }, [buildSlide]);

  // ============================================
  // LOAD
  // ============================================

  const loadPDF = useCallback(async (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFile(f);
    setPres(null);
    setEditedSlides({});
    setResult(null);
    setPreviewIndex(0);
    setLoadProgress(0);
    setHistory([]);
    setHistoryIndex(-1);

    try {
      const info = await getPDFInfo(f);
      if (info.pageCount === 0) throw new Error('PDF has no pages.');

      const extracted = await extractPDF(f);
      setPres(extracted);
      const initial: Record<number, SlideContent> = {};
      extracted.slides.forEach((s, idx) => { initial[idx] = s; });
      setEditedSlides(initial);
      setHistory([initial]);
      setHistoryIndex(0);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to extract. PDF may be scanned.' : 'Failed to extract. PDF may be scanned.');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [extractPDF]);

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
    setPres(null);
    setEditedSlides({});
    setResult(null);
    setError(null);
    setPreviewIndex(0);
  };

  // ============================================
  // EDIT
  // ============================================

  const pushHistory = useCallback((newSlides: Record<number, SlideContent>) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, JSON.parse(JSON.stringify(newSlides))];
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const updateSlide = (idx: number, updates: Partial<SlideContent>) => {
    const newSlides = { ...editedSlides };
    newSlides[idx] = { ...newSlides[idx], ...updates };
    setEditedSlides(newSlides);
    setResult(null);
    pushHistory(newSlides);
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
    if (!pres) return;
    const initial: Record<number, SlideContent> = {};
    pres.slides.forEach((s, idx) => { initial[idx] = s; });
    setEditedSlides(initial);
    setResult(null);
  };

  const copySlideText = (idx: number) => {
    const s = editedSlides[idx];
    if (!s) return;
    navigator.clipboard.writeText(`# ${s.title}\n\n${s.body.map((b) => '• ' + b).join('\n')}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const addBullet = (idx: number) => {
    const s = editedSlides[idx];
    if (!s) return;
    updateSlide(idx, { body: [...s.body, 'New bullet point'] });
  };

  const removeBullet = (idx: number, bulletIdx: number) => {
    const s = editedSlides[idx];
    if (!s) return;
    updateSlide(idx, { body: s.body.filter((_, i) => i !== bulletIdx) });
  };

  const updateBullet = (idx: number, bulletIdx: number, text: string) => {
    const s = editedSlides[idx];
    if (!s) return;
    const newBody = [...s.body];
    newBody[bulletIdx] = text;
    updateSlide(idx, { body: newBody });
  };

  // ============================================
  // BUILD PPTX
  // ============================================

  const buildPPTX = async (): Promise<Blob> => {
    if (!pres) throw new Error('No presentation');

    const pptx = new PptxGenJS();
    const ar = ASPECT_RATIOS.find((a) => a.id === aspectRatio)!;
    pptx.defineLayout({ name: 'CUSTOM', width: ar.w, height: ar.h });
    pptx.layout = 'CUSTOM';

    const themeConfig = THEMES.find((t) => t.id === theme)!;

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: themeConfig.bg };
    titleSlide.addText(pres.title, {
      x: 0.6, y: ar.h / 2 - 1.2, w: ar.w - 1.2, h: 1.2,
      fontSize: 40 * fontScale,
      fontFace: themeConfig.fontTitle,
      color: themeConfig.titleColor.replace('#', ''),
      bold: true,
      align: 'center',
      valign: 'middle',
    });
    titleSlide.addText(
      `${pres.totalPages} pages · ${pres.totalWords.toLocaleString()} words`,
      {
        x: 0.6, y: ar.h / 2 + 0.2, w: ar.w - 1.2, h: 0.5,
        fontSize: 14 * fontScale,
        fontFace: themeConfig.fontBody,
        color: themeConfig.bodyColor.replace('#', ''),
        align: 'center',
        italic: true,
      }
    );
    // Accent line
    titleSlide.addShape('rect', {
      x: ar.w / 2 - 0.6, y: ar.h / 2 + 0.9, w: 1.2, h: 0.06,
      fill: { color: themeConfig.accent.replace('#', '') },
      line: { color: themeConfig.accent.replace('#', ''), width: 0 },
    });

    // Slide per page
    Object.keys(editedSlides).forEach((key, idx) => {
      const s = editedSlides[parseInt(key)];
      if (!s) return;

      const slide = pptx.addSlide();
      slide.background = { color: idx % 2 === 0 ? themeConfig.bg : themeConfig.bgAlt };

      const margin = 0.5;
      const contentW = ar.w - margin * 2;

      if (layout === 'title-content' || layout === 'two-column') {
        // Title
        slide.addText(s.title, {
          x: margin, y: margin, w: contentW, h: 0.9,
          fontSize: 28 * fontScale,
          fontFace: themeConfig.fontTitle,
          color: themeConfig.titleColor.replace('#', ''),
          bold: true,
          valign: 'top',
        });
        // Accent underline
        slide.addShape('rect', {
          x: margin, y: margin + 0.95, w: 1.5, h: 0.05,
          fill: { color: themeConfig.accent.replace('#', '') },
          line: { color: themeConfig.accent.replace('#', ''), width: 0 },
        });

        // Body
        const bodyY = margin + 1.2;
        const bodyH = ar.h - bodyY - margin - (includePageNumbers ? 0.4 : 0);

        if (layout === 'two-column' && s.body.length > 3) {
          const half = Math.ceil(s.body.length / 2);
          const leftBullets = s.body.slice(0, half);
          const rightBullets = s.body.slice(half);
          const halfW = (contentW - 0.3) / 2;

          slide.addText(
            leftBullets.map((b) => ({
              text: includeBullets ? b : b,
              options: {
                bullet: includeBullets,
                fontSize: 14 * fontScale,
                fontFace: themeConfig.fontBody,
                color: themeConfig.bodyColor.replace('#', ''),
                breakLine: true,
                paraSpaceAfter: 4,
              },
            })),
            { x: margin, y: bodyY, w: halfW, h: bodyH, valign: 'top' }
          );
          slide.addText(
            rightBullets.map((b) => ({
              text: b,
              options: {
                bullet: includeBullets,
                fontSize: 14 * fontScale,
                fontFace: themeConfig.fontBody,
                color: themeConfig.bodyColor.replace('#', ''),
                breakLine: true,
                paraSpaceAfter: 4,
              },
            })),
            { x: margin + halfW + 0.3, y: bodyY, w: halfW, h: bodyH, valign: 'top' }
          );
        } else {
          const bodyItems = s.body.length > 0 ? s.body : ['(no content)'];
          slide.addText(
            bodyItems.map((b) => ({
              text: b,
              options: {
                bullet: includeBullets,
                fontSize: 14 * fontScale,
                fontFace: themeConfig.fontBody,
                color: themeConfig.bodyColor.replace('#', ''),
                breakLine: true,
                paraSpaceAfter: 6,
              },
            })),
            { x: margin, y: bodyY, w: contentW, h: bodyH, valign: 'top' }
          );
        }
      } else if (layout === 'title-only') {
        slide.addText(s.title, {
          x: margin, y: ar.h / 2 - 0.6, w: contentW, h: 1.2,
          fontSize: 36 * fontScale,
          fontFace: themeConfig.fontTitle,
          color: themeConfig.titleColor.replace('#', ''),
          bold: true,
          align: 'center',
          valign: 'middle',
        });
      } else if (layout === 'section-header') {
        slide.addText(`SECTION ${idx + 1}`, {
          x: margin, y: ar.h / 2 - 1.2, w: contentW, h: 0.5,
          fontSize: 12 * fontScale,
          fontFace: themeConfig.fontBody,
          color: themeConfig.accent.replace('#', ''),
          align: 'center',
          bold: true,
          charSpacing: 4,
        });
        slide.addText(s.title, {
          x: margin, y: ar.h / 2 - 0.5, w: contentW, h: 1.5,
          fontSize: 34 * fontScale,
          fontFace: themeConfig.fontTitle,
          color: themeConfig.titleColor.replace('#', ''),
          bold: true,
          align: 'center',
          valign: 'middle',
        });
      } else if (layout === 'content-only') {
        const bodyItems = s.body.length > 0 ? s.body : [s.title];
        slide.addText(
          bodyItems.map((b) => ({
            text: b,
            options: {
              bullet: includeBullets,
              fontSize: 14 * fontScale,
              fontFace: themeConfig.fontBody,
              color: themeConfig.bodyColor.replace('#', ''),
              breakLine: true,
              paraSpaceAfter: 6,
            },
          })),
          { x: margin, y: margin, w: contentW, h: ar.h - margin * 2, valign: 'top' }
        );
      } else if (layout === 'image-focus' && s.imageDataUrl) {
        slide.addText(s.title, {
          x: margin, y: margin, w: contentW, h: 0.7,
          fontSize: 24 * fontScale,
          fontFace: themeConfig.fontTitle,
          color: themeConfig.titleColor.replace('#', ''),
          bold: true,
        });
        try {
          slide.addImage({
            data: s.imageDataUrl,
            x: margin, y: margin + 0.9, w: contentW, h: ar.h - margin * 2 - 0.9,
            sizing: { type: 'contain', w: contentW, h: ar.h - margin * 2 - 0.9 },
          });
        } catch {}
      }

      // Page number
      if (includePageNumbers) {
        slide.addText(`${idx + 1}`, {
          x: ar.w - margin - 0.5, y: ar.h - margin - 0.3, w: 0.5, h: 0.3,
          fontSize: 10,
          fontFace: themeConfig.fontBody,
          color: themeConfig.bodyColor.replace('#', ''),
          align: 'right',
        });
      }
    });

    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    return blob;
  };

  const buildImagesZip = async (): Promise<Blob> => {
    if (!pres) throw new Error('No presentation');
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder(pres.title) || zip;

    // Reuse pptx rendering is complex; fallback: generate placeholder text files
    Object.keys(editedSlides).forEach((key, idx) => {
      const s = editedSlides[parseInt(key)];
      if (!s) return;
      const txt = `# ${s.title}\n\n${s.body.map((b) => '• ' + b).join('\n')}`;
      folder.file(`slide-${String(idx + 1).padStart(3, '0')}.txt`, txt);
    });
    zip.file('README.txt', 'PPTX file is the primary output. This ZIP contains text versions.');
    return await zip.generateAsync({ type: 'blob' });
  };

  const handleConvert = async () => {
    if (!pres) return;
    setIsProcessing(true);
    setError(null);

    try {
      if (outputMode === 'single-pptx' || outputMode === 'both') {
        const blob = await buildPPTX();
        setResult({ blob, filename: `${pres.title}.pptx` });
      } else {
        const blob = await buildImagesZip();
        setResult({ blob, filename: `${pres.title}.zip` });
      }
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Conversion failed.' : 'Conversion failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ============================================
  // COMPUTED
  // ============================================

  const slides = useMemo(() => {
    return Object.keys(editedSlides).sort((a, b) => parseInt(a) - parseInt(b)).map((k) => editedSlides[parseInt(k)]);
  }, [editedSlides]);

  const currentSlide = slides[previewIndex];
  const themeConfig = THEMES.find((t) => t.id === theme)!;

  const stats = useMemo(() => {
    let words = 0;
    let bullets = 0;
    let modified = false;
    slides.forEach((s, idx) => {
      words += s.wordCount || 0;
      bullets += s.body.length;
      if (pres && JSON.stringify(s) !== JSON.stringify(pres.slides[idx])) modified = true;
    });
    return { words, bullets, modified };
  }, [slides, pres]);

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
      />

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
              PDF to PowerPoint — Slides
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>6 Themes</span>
            <span>·</span>
            <span>Live Slide Preview</span>
          </div>
        </div>

        {/* Heading */}
        {!file && !isLoading && (
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
                PDF to <span className="italic text-[#ff6a00]">PowerPoint</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Turn any PDF into presentation-ready slides. 6 themes, 6 layouts,
                live preview, and real .pptx export.
              </p>
            </div>
          </motion.div>
        )}

        {/* Upload */}
        {!file && !isLoading && (
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
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Convert pages to editable slides. Choose theme, layout, aspect ratio.
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
                { icon: Palette, label: '6 themes' },
                { icon: Layout, label: '6 layouts' },
                { icon: Eye, label: 'Live preview' },
                { icon: Presentation, label: 'Real .pptx' },
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
              Building slides... {loadProgress}%
            </span>
            <div className="mt-4 w-64 h-1 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div className="h-full bg-[#ff6a00]" animate={{ width: `${loadProgress}%` }} transition={{ duration: 0.2 }} />
            </div>
          </div>
        )}

        {/* Workspace */}
        {file && pres && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black truncate max-w-[200px]">{file.name}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{slides.length}</span>
                  <span className="text-[12px] text-black/50">slides</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <List size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.bullets}</span>
                  <span className="text-[12px] text-black/50">bullets</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.words.toLocaleString()}</span>
                  <span className="text-[12px] text-black/50">words</span>
                </div>
                {stats.modified && (
                  <>
                    <div className="w-px h-4 bg-black/10" />
                    <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-emerald-500">✎ Modified</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                  title="Undo"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                  title="Redo"
                >
                  <ChevronRight size={15} />
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

              {/* ============ LEFT — Settings ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Theme picker */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Theme</span>
                  </div>
                  <div className="space-y-1.5">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id); setResult(null); }}
                        className={`w-full p-2.5 rounded-lg text-left transition-all border flex items-center gap-3 ${
                          theme === t.id
                            ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                            : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                        }`}
                      >
                        <div className="flex -space-x-1">
                          <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: t.bg }} />
                          <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: t.accent }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[11px] font-medium truncate ${theme === t.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                            {t.label}
                          </div>
                          <div className="text-[9px] text-black/40">{t.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layout size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Slide Layout</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LAYOUTS.map((l) => {
                      const Icon = l.icon;
                      const isActive = layout === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => { setLayout(l.id); setResult(null); }}
                          className={`p-2.5 rounded-lg text-left transition-all border ${
                            isActive
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <Icon size={13} className={isActive ? 'text-[#ff6a00] mb-1.5' : 'text-black/40 mb-1.5'} />
                          <div className={`text-[10px] font-medium leading-tight ${isActive ? 'text-[#ff6a00]' : 'text-black'}`}>
                            {l.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aspect ratio */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Monitor size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Aspect Ratio</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ASPECT_RATIOS.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => { setAspectRatio(a.id); setResult(null); }}
                        className={`py-2.5 px-3 rounded-lg text-left text-[11px] font-medium transition-all border ${
                          aspectRatio === a.id
                            ? 'bg-[#ff6a00] text-white border-[#ff6a00]'
                            : 'bg-white border-black/[0.06] text-black/60 hover:border-black/[0.15]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{a.label}</span>
                          <span className="text-[9px] font-mono opacity-60">{a.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings2 size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">Options</span>
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
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">Font scale</label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{Math.round(fontScale * 100)}%</span>
                          </div>
                          <input
                            type="range" min={0.6} max={1.6} step={0.05}
                            value={fontScale}
                            onChange={(e) => { setFontScale(parseFloat(e.target.value)); setResult(null); }}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">Max bullet length</label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{maxBulletChars} chars</span>
                          </div>
                          <input
                            type="range" min={80} max={400} step={20}
                            value={maxBulletChars}
                            onChange={(e) => setMaxBulletChars(parseInt(e.target.value))}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-black/[0.06]">
                          {[
                            { label: 'Include page numbers', value: includePageNumbers, set: setIncludePageNumbers },
                            { label: 'Bullet style', value: includeBullets, set: setIncludeBullets },
                            { label: 'Split on blank lines', value: splitOnBlankLine, set: setSplitOnBlankLine },
                          ].map((opt) => (
                            <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={opt.value}
                                onChange={(e) => { opt.set(e.target.checked); setResult(null); }}
                                className="accent-[#ff6a00]"
                              />
                              <span className="text-[11px] text-black/70">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ============ CENTER — Slide Preview ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                    <button
                      onClick={() => setViewMode('slide')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase transition-all ${
                        viewMode === 'slide' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50'
                      }`}
                    >
                      <Presentation size={11} />
                      Slide
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

                  {viewMode === 'slide' && (
                    <>
                      <div className="flex items-center gap-1 bg-[#f4f1ea] rounded-lg p-1">
                        <button
                          onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                          disabled={previewIndex <= 0}
                          className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span className="px-2 text-[12px] font-mono">{previewIndex + 1} / {slides.length}</span>
                        <button
                          onClick={() => setPreviewIndex(Math.min(slides.length - 1, previewIndex + 1))}
                          disabled={previewIndex >= slides.length - 1}
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

                {/* Preview area */}
                <div className="rounded-[18px] bg-[#ebe7de]/40 border border-black/[0.06] p-6 min-h-[700px] flex items-start justify-center overflow-auto relative">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Slide view */}
                  {viewMode === 'slide' && currentSlide && (
                    <div style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.2s',
                    }}>
                      <div
                        className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] overflow-hidden"
                        style={{
                          width: aspectRatio === '4:3' ? 640 : 720,
                          height: aspectRatio === '4:3' ? 480 : aspectRatio === '16:9' ? 405 : 450,
                          background: themeConfig.bg,
                          padding: 40,
                          position: 'relative',
                        }}
                      >
                        {/* Page number */}
                        {includePageNumbers && (
                          <div
                            className="absolute"
                            style={{
                              top: 20,
                              right: 24,
                              fontFamily: `${themeConfig.fontBody}, sans-serif`,
                              fontSize: 11,
                              color: themeConfig.bodyColor,
                              opacity: 0.6,
                            }}
                          >
                            {previewIndex + 1}
                          </div>
                        )}

                        {/* Layout: title-content */}
                        {(layout === 'title-content' || layout === 'two-column') && (
                          <>
                            <div
                              style={{
                                fontFamily: `${themeConfig.fontTitle}, Georgia, serif`,
                                color: themeConfig.titleColor,
                                fontSize: 28 * fontScale,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                marginBottom: 12,
                              }}
                            >
                              {currentSlide.title}
                            </div>
                            <div
                              style={{
                                width: 80,
                                height: 4,
                                background: themeConfig.accent,
                                marginBottom: 20,
                              }}
                            />
                            {layout === 'two-column' && currentSlide.body.length > 3 ? (
                              <div style={{ display: 'flex', gap: 24 }}>
                                <div style={{ flex: 1 }}>
                                  {currentSlide.body.slice(0, Math.ceil(currentSlide.body.length / 2)).map((b, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 8,
                                        fontFamily: `${themeConfig.fontBody}, sans-serif`,
                                        color: themeConfig.bodyColor,
                                        fontSize: 13 * fontScale,
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {includeBullets && <span style={{ color: themeConfig.accent }}>•</span>}
                                      <span>{b}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ flex: 1 }}>
                                  {currentSlide.body.slice(Math.ceil(currentSlide.body.length / 2)).map((b, i) => (
                                    <div
                                      key={i}
                                      style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 8,
                                        fontFamily: `${themeConfig.fontBody}, sans-serif`,
                                        color: themeConfig.bodyColor,
                                        fontSize: 13 * fontScale,
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {includeBullets && <span style={{ color: themeConfig.accent }}>•</span>}
                                      <span>{b}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                {(currentSlide.body.length > 0 ? currentSlide.body : ['(no content)']).map((b, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'flex',
                                      gap: 8,
                                      marginBottom: 10,
                                      fontFamily: `${themeConfig.fontBody}, sans-serif`,
                                      color: themeConfig.bodyColor,
                                      fontSize: 13 * fontScale,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {includeBullets && <span style={{ color: themeConfig.accent, flexShrink: 0 }}>•</span>}
                                    <span>{b}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        {/* Layout: title-only */}
                        {layout === 'title-only' && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '100%',
                              textAlign: 'center',
                              fontFamily: `${themeConfig.fontTitle}, Georgia, serif`,
                              color: themeConfig.titleColor,
                              fontSize: 36 * fontScale,
                              fontWeight: 700,
                              lineHeight: 1.2,
                            }}
                          >
                            {currentSlide.title}
                          </div>
                        )}

                        {/* Layout: section-header */}
                        {layout === 'section-header' && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                            <div style={{
                              fontFamily: `${themeConfig.fontBody}, sans-serif`,
                              fontSize: 11,
                              letterSpacing: '0.3em',
                              color: themeConfig.accent,
                              fontWeight: 700,
                              marginBottom: 12,
                            }}>
                              SECTION {previewIndex + 1}
                            </div>
                            <div style={{
                              fontFamily: `${themeConfig.fontTitle}, Georgia, serif`,
                              color: themeConfig.titleColor,
                              fontSize: 34 * fontScale,
                              fontWeight: 700,
                              lineHeight: 1.2,
                            }}>
                              {currentSlide.title}
                            </div>
                          </div>
                        )}

                        {/* Layout: content-only */}
                        {layout === 'content-only' && (
                          <div>
                            {(currentSlide.body.length > 0 ? currentSlide.body : [currentSlide.title]).map((b, i) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  gap: 8,
                                  marginBottom: 10,
                                  fontFamily: `${themeConfig.fontBody}, sans-serif`,
                                  color: themeConfig.bodyColor,
                                  fontSize: 14 * fontScale,
                                  lineHeight: 1.6,
                                }}
                              >
                                {includeBullets && <span style={{ color: themeConfig.accent, flexShrink: 0 }}>•</span>}
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Layout: image-focus */}
                        {layout === 'image-focus' && (
                          <>
                            <div style={{
                              fontFamily: `${themeConfig.fontTitle}, Georgia, serif`,
                              color: themeConfig.titleColor,
                              fontSize: 22 * fontScale,
                              fontWeight: 700,
                              marginBottom: 16,
                            }}>
                              {currentSlide.title}
                            </div>
                            {currentSlide.imageDataUrl ? (
                              <img
                                src={currentSlide.imageDataUrl}
                                alt=""
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: 'calc(100% - 60px)',
                                  objectFit: 'contain',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: 'calc(100% - 50px)',
                                  background: themeConfig.bgAlt,
                                  borderRadius: 8,
                                  color: themeConfig.bodyColor,
                                  fontFamily: `${themeConfig.fontBody}, sans-serif`,
                                  fontSize: 12,
                                  opacity: 0.5,
                                }}
                              >
                                No image on this page
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grid view */}
                  {viewMode === 'grid' && (
                    <div className="w-full">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {slides.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setPreviewIndex(idx); setViewMode('slide'); }}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                              previewIndex === idx ? 'border-[#ff6a00] shadow-lg' : 'border-black/[0.08]'
                            }`}
                          >
                            <div
                              style={{
                                aspectRatio: aspectRatio === '4:3' ? '4/3' : '16/9',
                                background: themeConfig.bg,
                                padding: 12,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: `${themeConfig.fontTitle}, Georgia, serif`,
                                  color: themeConfig.titleColor,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  marginBottom: 4,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {s.title}
                              </div>
                              <div
                                style={{
                                  fontFamily: `${themeConfig.fontBody}, sans-serif`,
                                  color: themeConfig.bodyColor,
                                  fontSize: 6,
                                  lineHeight: 1.4,
                                  opacity: 0.7,
                                  maxHeight: '70%',
                                  overflow: 'hidden',
                                }}
                              >
                                {s.body.slice(0, 3).join(' · ')}
                              </div>
                            </div>
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-mono px-1.5 py-0.5 rounded">
                              {idx + 1}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slide info bar */}
                {currentSlide && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[18px] bg-white border border-black/[0.06]">
                    <div className="text-[11px] font-mono uppercase text-black/40">
                      Slide {previewIndex + 1} of {slides.length} · {currentSlide.body.length} bullets
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingSlide(editingSlide === previewIndex ? null : previewIndex)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] transition-colors ${
                          editingSlide === previewIndex
                            ? 'bg-[#ff6a00] text-white'
                            : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                        }`}
                      >
                        <Edit3 size={11} />
                        {editingSlide === previewIndex ? 'Close editor' : 'Edit slide'}
                      </button>
                      <button
                        onClick={() => copySlideText(previewIndex)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] transition-colors ${
                          copied ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                        }`}
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline editor */}
                <AnimatePresence>
                  {editingSlide === previewIndex && currentSlide && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-[18px] bg-white border-2 border-[#ff6a00]/40 p-4 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Edit3 size={14} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-[#ff6a00] font-semibold">
                          Editing slide {previewIndex + 1}
                        </span>
                      </div>

                      <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Title</label>
                      <input
                        type="text"
                        value={currentSlide.title}
                        onChange={(e) => updateSlide(previewIndex, { title: e.target.value })}
                        className="w-full bg-[#f4f1ea] rounded-lg px-3 py-2 outline-none text-[13px] border border-black/[0.06] focus:border-[#ff6a00] mb-3"
                      />

                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[9px] font-mono uppercase text-black/40">Bullets</label>
                        <button
                          onClick={() => addBullet(previewIndex)}
                          className="text-[10px] font-mono uppercase text-[#ff6a00] hover:text-[#ff8a3d] flex items-center gap-1"
                        >
                          <Sparkle size={10} /> Add bullet
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                        {currentSlide.body.map((b, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[12px] text-[#ff6a00] shrink-0">•</span>
                            <input
                              type="text"
                              value={b}
                              onChange={(e) => updateBullet(previewIndex, i, e.target.value)}
                              className="flex-1 bg-[#f4f1ea] rounded-md px-3 py-1.5 outline-none text-[12px] border border-transparent focus:border-[#ff6a00]"
                            />
                            <button
                              onClick={() => removeBullet(previewIndex, i)}
                              className="w-7 h-7 rounded-md hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/30 shrink-0"
                            >
                              <Minus size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ============ RIGHT — Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Output mode */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileOutput size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Output</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { id: 'single-pptx' as OutputMode, label: 'PowerPoint (.pptx)', desc: 'Editable slides' },
                      { id: 'per-slide-images' as OutputMode, label: 'Text bundle (.zip)', desc: 'Text versions' },
                      { id: 'both' as OutputMode, label: 'Both', desc: 'PPTX + ZIP' },
                    ].map((o) => (
                      <button
                        key={o.id}
                        onClick={() => { setOutputMode(o.id); setResult(null); }}
                        className={`w-full p-2.5 rounded-lg text-left transition-all border ${
                          outputMode === o.id
                            ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                            : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                        }`}
                      >
                        <div className={`text-[11px] font-medium ${outputMode === o.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                          {o.label}
                        </div>
                        <div className="text-[9px] text-black/40">{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Stats</span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Slides</span>
                      <span className="font-mono font-medium text-black">{slides.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Bullets</span>
                      <span className="font-mono font-medium text-black">{stats.bullets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Words</span>
                      <span className="font-mono font-medium text-black">{stats.words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Theme</span>
                      <span className="font-mono font-medium text-[#ff6a00]">{themeConfig.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Aspect</span>
                      <span className="font-mono font-medium text-black">{aspectRatio}</span>
                    </div>
                  </div>
                </div>

                {/* Save panel */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Save size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Export</span>
                  </div>

                  {result ? (
                    <div className="space-y-3">
                      <div className="text-center py-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2 size={22} className="text-emerald-500" />
                        </div>
                        <div className="text-[13px] font-medium text-black mb-1">File ready!</div>
                        <div className="text-[10px] font-mono text-black/40">{formatBytes(result.blob.size)}</div>
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2"
                      >
                        <Download size={13} />
                        Download
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
                        Converts {slides.length} slide{slides.length !== 1 ? 's' : ''} using {themeConfig.label}.
                      </p>
                      <button
                        onClick={handleConvert}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                          isProcessing ? 'bg-black/[0.08] text-black/40' : 'bg-black text-white hover:bg-[#ff6a00]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Converting...</>
                        ) : (
                          <><Sparkles size={13} /> Convert to PPTX</>
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
                    <li>• <strong>Theme</strong> — pick a color scheme</li>
                    <li>• <strong>Layout</strong> — change per-slide style</li>
                    <li>• <strong>Edit slide</strong> — inline bullets</li>
                    <li>• <strong>Grid view</strong> — see all slides</li>
                    <li>• Scanned PDFs need OCR first</li>
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