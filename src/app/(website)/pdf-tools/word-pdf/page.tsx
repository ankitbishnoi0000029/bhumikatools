"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, FileOutput, Copy, Check,
  Edit3, Settings2, Layers, ChevronLeft, ChevronRight, Save,
  Wand2, Layout, Palette, Image as ImageIcon, ZoomIn, ZoomOut,
  RefreshCw, Info, BarChart3, Search, FileType, Bold, Italic,
  Underline, Type, ListOrdered, List, AlignLeft, AlignCenter,
  AlignRight, Hash, Quote, Minus, Link2, Table as TableIcon,
  Monitor, Sun, Moon, FileText as FileTextIcon, Printer,
  CheckSquare, Maximize2, Grid3x3,
} from 'lucide-react';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import mammoth from 'mammoth';
import { formatBytes, downloadBlob } from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface DocStats {
  paragraphs: number;
  words: number;
  characters: number;
  headings: number;
  images: number;
  tables: number;
  lists: number;
}

interface ParsedDocument {
  html: string;
  text: string;
  fileName: string;
  title: string;
  stats: DocStats;
  images: string[]; // data URLs
  rawStyles?: string;
}

type PageSize = 'a4' | 'a3' | 'a5' | 'letter' | 'legal';
type Orientation = 'portrait' | 'landscape';
type MarginOption = 'narrow' | 'normal' | 'wide';
type FontFamily = 'Helvetica' | 'Times' | 'Courier';

interface PageConfig {
  id: PageSize;
  label: string;
  w: number;
  h: number;
}

const PAGE_SIZES: PageConfig[] = [
  { id: 'a4', label: 'A4', w: 210, h: 297 },
  { id: 'a3', label: 'A3', w: 297, h: 420 },
  { id: 'a5', label: 'A5', w: 148, h: 210 },
  { id: 'letter', label: 'Letter', w: 216, h: 279 },
  { id: 'legal', label: 'Legal', w: 216, h: 356 },
];

const MARGINS: { id: MarginOption; label: string; value: number; desc: string }[] = [
  { id: 'narrow', label: 'Narrow', value: 12, desc: '12mm' },
  { id: 'normal', label: 'Normal', value: 20, desc: '20mm' },
  { id: 'wide', label: 'Wide', value: 32, desc: '32mm' },
];

const FONTS: { id: FontFamily; label: string; css: string }[] = [
  { id: 'Helvetica', label: 'Sans', css: 'Helvetica, Arial, sans-serif' },
  { id: 'Times', label: 'Serif', css: '"Times New Roman", Times, serif' },
  { id: 'Courier', label: 'Mono', css: '"Courier New", Courier, monospace' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function WordToPdfPage() {
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [editedHtml, setEditedHtml] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margin, setMargin] = useState<MarginOption>('normal');
  const [fontSize, setFontSize] = useState(11);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [fontFamily, setFontFamily] = useState<FontFamily>('Helvetica');
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [preserveImages, setPreserveImages] = useState(true);
  const [preserveTables, setPreserveTables] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'text'>('preview');
  const [showSettings, setShowSettings] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // PARSE DOCX
  // ============================================

  const parseDocx = useCallback(async (file: File): Promise<ParsedDocument> => {
    const arrayBuffer = await file.arrayBuffer();

    // Use mammoth to convert DOCX to HTML
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          try {
            const buffer = await image.read('base64');
            const mime = image.contentType || 'image/png';
            return {
              src: `data:${mime};base64,${buffer}`,
            };
          } catch (e) {
            return { src: '' };
          }
        }),
        styleMap: [
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
          "p[style-name='Intense Quote'] => blockquote.intense:fresh",
          "p[style-name='Subtitle'] => h2.subtitle:fresh",
        ],
      }
    );

    const rawHtml = result.value;

    // Get raw text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const text = textResult.value;

    // Extract images
    const images: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    let match;
    while ((match = imgRegex.exec(rawHtml)) !== null) {
      if (match[1]) images.push(match[1]);
    }

    // Compute stats
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

    const paragraphs = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6').length;
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const tables = tempDiv.querySelectorAll('table').length;
    const lists = tempDiv.querySelectorAll('ul, ol').length;
    const imgs = tempDiv.querySelectorAll('img').length;

    const words = text.split(/\s+/).filter(Boolean).length;
    const characters = text.length;

    // Try to extract title from first heading
    const firstHeading = tempDiv.querySelector('h1, h2, h3');
    const title = firstHeading?.textContent?.trim() || file.name.replace(/\.(docx?|doc)$/i, '');

    return {
      html: rawHtml,
      text,
      fileName: file.name.replace(/\.(docx?|doc)$/i, ''),
      title,
      stats: {
        paragraphs,
        words,
        characters,
        headings,
        images: imgs,
        tables,
        lists,
      },
      images,
    };
  }, []);

  // ============================================
  // LOAD FILE
  // ============================================

  const loadFile = useCallback(async (file: File) => {
    const validExt = /\.(docx?|doc)$/i.test(file.name);
    if (!validExt) {
      setError('Please select a Word file (.docx, .doc).');
      return;
    }

    // Check for old .doc format
    if (/\.doc$/i.test(file.name) && !/\.docx$/i.test(file.name)) {
      // Legacy .doc — check magic bytes
      const header = await file.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(header);
      // DOCX starts with PK (0x50 0x4B)
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
      if (!isZip) {
        setError('Legacy .doc format is not supported. Please save as .docx first.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setDoc(null);
    setEditedHtml('');
    setResult(null);
    setLoadProgress(0);

    try {
      setLoadProgress(30);
      const parsed = await parseDocx(file);
      setLoadProgress(80);
      setDoc(parsed);
      setEditedHtml(parsed.html);
      setHistory([parsed.html]);
      setHistoryIndex(0);
      setLoadProgress(100);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to parse Word document.');
    } finally {
      setIsLoading(false);
    }
  }, [parseDocx]);

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
    setDoc(null);
    setEditedHtml('');
    setResult(null);
    setError(null);
    setHistory([]);
    setHistoryIndex(-1);
  };

  // ============================================
  // EDIT
  // ============================================

  const pushHistory = useCallback((html: string) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, html];
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const updateHtml = (html: string) => {
    setEditedHtml(html);
    setResult(null);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setEditedHtml(history[i]);
    setResult(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setEditedHtml(history[i]);
    setResult(null);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const copyText = () => {
    if (!doc) return;
    navigator.clipboard.writeText(doc.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ============================================
  // BUILD PDF (HTML → PDF)
  // ============================================

  const buildPDF = async () => {
    if (!doc) throw new Error('No document');

    const cfg = PAGE_SIZES.find((p) => p.id === pageSize)!;
    let pdfW = cfg.w;
    let pdfH = cfg.h;
    if (orientation === 'landscape') [pdfW, pdfH] = [pdfH, pdfW];

    const marginValue = MARGINS.find((m) => m.id === margin)?.value || 20;

    // Create jsPDF
    const pdf = new jsPDF({
      orientation: pdfW > pdfH ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfW, pdfH],
      compress: true,
    });

    const fontMap: Record<FontFamily, string> = {
      Helvetica: 'helvetica',
      Times: 'times',
      Courier: 'courier',
    };
    const pdfFont = fontMap[fontFamily];

    // Available width
    const availW = pdfW - marginValue * 2;

    let cursorY = marginValue;
    let pageNum = 1;

    // Helper: check page break
    const checkPageBreak = (needed: number) => {
      if (cursorY + needed > pdfH - marginValue - 8) {
        if (includePageNumbers) {
          pdf.setFontSize(9);
          pdf.setFont(pdfFont, 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text(`${pageNum}`, pdfW - marginValue, pdfH - marginValue / 2, { align: 'right' });
        }
        pdf.addPage([pdfW, pdfH], pdfW > pdfH ? 'landscape' : 'portrait');
        pageNum++;
        cursorY = marginValue;
        return true;
      }
      return false;
    };

    // Cover page (optional)
    if (includeMetadata && doc.title && doc.title.length > 3) {
      // Title block
      pdf.setFontSize(28);
      pdf.setFont(pdfFont, 'bold');
      pdf.setTextColor(10, 10, 10);

      const titleLines = pdf.splitTextToSize(doc.title, availW);
      titleLines.forEach((line: string) => {
        pdf.text(line, marginValue, cursorY + 12);
        cursorY += 12;
      });

      cursorY += 6;

      // Accent line
      pdf.setDrawColor(255, 106, 0);
      pdf.setLineWidth(0.8);
      pdf.line(marginValue, cursorY, marginValue + 25, cursorY);

      cursorY += 10;

      // Metadata
      pdf.setFontSize(10);
      pdf.setFont(pdfFont, 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated from: ${doc.fileName}.docx`, marginValue, cursorY);
      cursorY += 5;
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, marginValue, cursorY);

      pdf.addPage([pdfW, pdfH], pdfW > pdfH ? 'landscape' : 'portrait');
      pageNum++;
      cursorY = marginValue;
    }

    // Parse HTML and render
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(`<div>${editedHtml}</div>`, 'text/html');
    const root = htmlDoc.querySelector('div');

    if (!root) throw new Error('Failed to parse HTML');

    // Process each child node
    const processNode = async (node: Node, indent = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (!text) return;

        pdf.setFontSize(fontSize);
        pdf.setFont(pdfFont, 'normal');
        pdf.setTextColor(30, 30, 30);

        const lines = pdf.splitTextToSize(text, availW - indent * 4);
        const lineH = (fontSize * lineHeight * 0.35);

        for (const line of lines) {
          checkPageBreak(lineH);
          pdf.text(line, marginValue + indent * 4, cursorY);
          cursorY += lineH;
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      switch (tag) {
        case 'h1': {
          cursorY += 4;
          checkPageBreak(12);
          pdf.setFontSize(fontSize * 2);
          pdf.setFont(pdfFont, 'bold');
          pdf.setTextColor(10, 10, 10);
          const lines = pdf.splitTextToSize(el.textContent || '', availW);
          for (const line of lines) {
            checkPageBreak(10);
            pdf.text(line, marginValue, cursorY + 8);
            cursorY += 10;
          }
          cursorY += 4;
          break;
        }
        case 'h2': {
          cursorY += 3;
          checkPageBreak(10);
          pdf.setFontSize(fontSize * 1.6);
          pdf.setFont(pdfFont, 'bold');
          pdf.setTextColor(10, 10, 10);
          const lines = pdf.splitTextToSize(el.textContent || '', availW);
          for (const line of lines) {
            checkPageBreak(8);
            pdf.text(line, marginValue, cursorY + 6);
            cursorY += 8;
          }
          cursorY += 3;
          break;
        }
        case 'h3': {
          cursorY += 2;
          checkPageBreak(8);
          pdf.setFontSize(fontSize * 1.35);
          pdf.setFont(pdfFont, 'bold');
          pdf.setTextColor(10, 10, 10);
          const lines = pdf.splitTextToSize(el.textContent || '', availW);
          for (const line of lines) {
            checkPageBreak(7);
            pdf.text(line, marginValue, cursorY + 5);
            cursorY += 7;
          }
          cursorY += 2;
          break;
        }
        case 'h4':
        case 'h5':
        case 'h6': {
          checkPageBreak(7);
          pdf.setFontSize(fontSize * 1.15);
          pdf.setFont(pdfFont, 'bold');
          pdf.setTextColor(40, 40, 40);
          const lines = pdf.splitTextToSize(el.textContent || '', availW);
          for (const line of lines) {
            checkPageBreak(6);
            pdf.text(line, marginValue, cursorY + 4);
            cursorY += 6;
          }
          cursorY += 1;
          break;
        }
        case 'p': {
          // Check if this paragraph contains images
          const hasImage = el.querySelector('img');

          if (hasImage && preserveImages) {
            // Handle images in paragraph
            const imgEl = el.querySelector('img')!;
            try {
              const src = imgEl.getAttribute('src');
              if (src && src.startsWith('data:')) {
                // Get image dimensions
                const imgData = await loadImage(src);
                const imgW = imgData.width;
                const imgH = imgData.height;

                // Calculate fitted size
                const fitW = Math.min(availW, 150);
                const fitH = (imgH / imgW) * fitW;

                checkPageBreak(fitH + 4);
                pdf.addImage(src, 'PNG', marginValue, cursorY, fitW, fitH);
                cursorY += fitH + 4;
              }
            } catch (e) {
              console.warn('Failed to embed image:', e);
            }
          }

          // Render text content
          const text = el.textContent || '';
          if (text.trim()) {
            pdf.setFontSize(fontSize);
            pdf.setFont(pdfFont, 'normal');
            pdf.setTextColor(30, 30, 30);

            const lines = pdf.splitTextToSize(text, availW);
            const lineH = fontSize * lineHeight * 0.35;

            for (const line of lines) {
              checkPageBreak(lineH);
              pdf.text(line, marginValue, cursorY);
              cursorY += lineH;
            }
            cursorY += 2;
          }
          break;
        }
        case 'ul':
        case 'ol': {
          const items = el.querySelectorAll('li');
          let idx = 1;
          items.forEach((li) => {
            const text = li.textContent || '';
            pdf.setFontSize(fontSize);
            pdf.setFont(pdfFont, 'normal');
            pdf.setTextColor(30, 30, 30);

            const prefix = tag === 'ol' ? `${idx}. ` : '• ';
            const bulletIndent = 6;
            const lines = pdf.splitTextToSize(prefix + text, availW - bulletIndent);
            const lineH = fontSize * lineHeight * 0.35;

            lines.forEach((line: string, lineIdx: number) => {
              checkPageBreak(lineH);
              pdf.text(line, marginValue + bulletIndent, cursorY);
              cursorY += lineH;
            });
            idx++;
          });
          cursorY += 2;
          break;
        }
        case 'blockquote': {
          cursorY += 2;
          pdf.setFontSize(fontSize);
          pdf.setFont(pdfFont, 'italic');
          pdf.setTextColor(80, 80, 80);

          const lines = pdf.splitTextToSize(el.textContent || '', availW - 10);
          const lineH = fontSize * lineHeight * 0.35;

          const startY = cursorY;
          lines.forEach((line: string) => {
            checkPageBreak(lineH);
            pdf.text(line, marginValue + 8, cursorY);
            cursorY += lineH;
          });

          // Left border
          pdf.setDrawColor(255, 106, 0);
          pdf.setLineWidth(1);
          pdf.line(marginValue + 2, startY - 3, marginValue + 2, cursorY - 3);
          cursorY += 3;
          break;
        }
        case 'table': {
          if (!preserveTables) break;
          const rows = el.querySelectorAll('tr');
          const cellPadding = 2;
          const rowH = fontSize * 0.5;

          rows.forEach((row) => {
            const cells = row.querySelectorAll('td, th');
            const cellWidths: number[] = [];
            let totalContent = 0;

            cells.forEach((cell) => {
              const len = (cell.textContent || '').length;
              cellWidths.push(Math.max(len, 8));
              totalContent += Math.max(len, 8);
            });

            const scale = availW / totalContent;
            const actualWidths = cellWidths.map((w) => w * scale);

            checkPageBreak(rowH + cellPadding * 2 + 2);

            let cellX = marginValue;
            cells.forEach((cell, idx) => {
              const isHeader = cell.tagName.toLowerCase() === 'th';
              const cellW = actualWidths[idx];

              if (isHeader) {
                pdf.setFillColor(244, 241, 234);
                pdf.rect(cellX, cursorY, cellW, rowH + 4, 'F');
              }

              pdf.setDrawColor(200, 200, 200);
              pdf.setLineWidth(0.15);
              pdf.rect(cellX, cursorY, cellW, rowH + 4);

              pdf.setFontSize(fontSize * 0.9);
              pdf.setFont(pdfFont, isHeader ? 'bold' : 'normal');
              pdf.setTextColor(30, 30, 30);

              const cellText = (cell.textContent || '').trim();
              const wrapped = pdf.splitTextToSize(cellText, cellW - cellPadding * 2);
              pdf.text(wrapped[0] || '', cellX + cellPadding, cursorY + 3.5);

              cellX += cellW;
            });
            cursorY += rowH + 4;
          });
          cursorY += 3;
          break;
        }
        case 'br': {
          cursorY += fontSize * 0.35;
          break;
        }
        case 'hr': {
          checkPageBreak(4);
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.2);
          pdf.line(marginValue, cursorY + 2, pdfW - marginValue, cursorY + 2);
          cursorY += 5;
          break;
        }
        default: {
          // Recursively process children
          for (const child of Array.from(node.childNodes)) {
            await processNode(child, indent);
          }
        }
      }
    };

    // Process all nodes
    for (const child of Array.from(root.childNodes)) {
      await processNode(child);
    }

    // Final page number
    if (includePageNumbers) {
      pdf.setFontSize(9);
      pdf.setFont(pdfFont, 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${pageNum}`, pdfW - marginValue, pdfH - marginValue / 2, { align: 'right' });
    }

    // Metadata
    pdf.setProperties({
      title: doc.title,
      creator: 'idcardtools',
      subject: doc.fileName,
      author: 'idcardtools',
    });

    const blob = pdf.output('blob');
    return blob;
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleConvert = async () => {
    if (!doc) return;
    setIsProcessing(true);
    setError(null);

    try {
      const blob = await buildPDF();
      setResult({
        blob,
        filename: `${doc.fileName}.pdf`,
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'PDF generation failed.');
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

  const editedStats = useMemo<DocStats>(() => {
    if (!editedHtml) {
      return { paragraphs: 0, words: 0, characters: 0, headings: 0, images: 0, tables: 0, lists: 0 };
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editedHtml;
    const text = tempDiv.textContent || '';
    return {
      paragraphs: tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6').length,
      words: text.split(/\s+/).filter(Boolean).length,
      characters: text.length,
      headings: tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      images: tempDiv.querySelectorAll('img').length,
      tables: tempDiv.querySelectorAll('table').length,
      lists: tempDiv.querySelectorAll('ul, ol').length,
    };
  }, [editedHtml]);

  // Highlight search in preview
  const highlightPreviewHtml = useMemo(() => {
    if (!searchQuery.trim()) return editedHtml;
    const re = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return editedHtml.replace(re, '<mark style="background:#ffe082;padding:0 2px;border-radius:2px">$1</mark>');
  }, [editedHtml, searchQuery]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      <input
        ref={inputRef}
        type="file"
        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
              Word to PDF — Real DOCX Parsing
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Formatting Preserved</span>
            <span>·</span>
            <span>Live Preview</span>
          </div>
        </div>

        {/* Heading */}
        {!doc && !isLoading && (
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
                Word to <span className="italic text-[#ff6a00]">PDF</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Convert DOCX files to beautiful PDF with real formatting preserved.
                Live preview, edit HTML, adjust page size and export.
              </p>
            </div>
          </motion.div>
        )}

        {/* Upload state */}
        {!doc && !isLoading && (
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
                  <FileOutput size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop Word file here' : 'Select or drop a Word file'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Supports .docx files with text, headings, images, tables, and lists.
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <UploadCloud size={14} />
                  Choose Word file
                  <ArrowUpRight size={12} />
                </span>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {['.docx', '.doc'].map((ext) => (
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
                { icon: Bold, label: 'Rich formatting' },
                { icon: ImageIcon, label: 'Images embedded' },
                { icon: TableIcon, label: 'Tables supported' },
                { icon: Eye, label: 'Live preview' },
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
              <FileOutput size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Parsing document... {loadProgress}%
            </span>
            <div className="mt-4 w-64 h-1 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div className="h-full bg-[#ff6a00]" animate={{ width: `${loadProgress}%` }} transition={{ duration: 0.2 }} />
            </div>
          </div>
        )}

        {/* Workspace */}
        {doc && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black truncate max-w-[200px]">
                    {doc.fileName}
                  </span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{editedStats.words.toLocaleString()}</span>
                  <span className="text-[12px] text-black/50">words</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{editedStats.headings}</span>
                  <span className="text-[12px] text-black/50">headings</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{editedStats.images}</span>
                  <span className="text-[12px] text-black/50">images</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <TableIcon size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{editedStats.tables}</span>
                  <span className="text-[12px] text-black/50">tables</span>
                </div>
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
                  onClick={copyText}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] transition-colors ${
                    copied ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                  }`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy text'}
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

                {/* Page setup */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Page Setup</span>
                  </div>

                  {/* Page size */}
                  <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Page size</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
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

                  {/* Orientation */}
                  <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Orientation</label>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {(['portrait', 'landscape'] as Orientation[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => { setOrientation(o); setResult(null); }}
                        className={`py-1.5 rounded-md text-[10px] font-mono uppercase transition-all ${
                          orientation === o
                            ? 'bg-[#ff6a00] text-white'
                            : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>

                  {/* Margin */}
                  <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Margins</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {MARGINS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setMargin(m.id); setResult(null); }}
                        className={`py-1.5 rounded-md text-[9px] font-mono uppercase transition-all ${
                          margin === m.id
                            ? 'bg-[#ff6a00] text-white'
                            : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                        }`}
                        title={m.desc}
                      >
                        {m.label.slice(0, 6)}
                      </button>
                    ))}
                  </div>

                  {/* Font family */}
                  <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Font</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { setFontFamily(f.id); setResult(null); }}
                        className={`py-1.5 rounded-md text-[10px] transition-all ${
                          fontFamily === f.id
                            ? 'bg-[#ff6a00] text-white'
                            : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                        }`}
                        style={{ fontFamily: f.css }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Font size */}
                  <div className="mb-3">
                    <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                      <span>Font size</span>
                      <span className="text-[#ff6a00]">{fontSize}pt</span>
                    </label>
                    <input
                      type="range" min={8} max={18}
                      value={fontSize}
                      onChange={(e) => { setFontSize(parseInt(e.target.value)); setResult(null); }}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  {/* Line height */}
                  <div className="mb-3">
                    <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                      <span>Line height</span>
                      <span className="text-[#ff6a00]">{lineHeight.toFixed(1)}</span>
                    </label>
                    <input
                      type="range" min={1} max={2.5} step={0.1}
                      value={lineHeight}
                      onChange={(e) => { setLineHeight(parseFloat(e.target.value)); setResult(null); }}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-black/[0.06] space-y-2">
                    {[
                      { label: 'Page numbers', value: includePageNumbers, set: setIncludePageNumbers },
                      { label: 'Cover page', value: includeMetadata, set: setIncludeMetadata },
                      { label: 'Preserve images', value: preserveImages, set: setPreserveImages },
                      { label: 'Preserve tables', value: preserveTables, set: setPreserveTables },
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
                </div>

                {/* Stats */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Document Info</span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Paragraphs</span>
                      <span className="font-mono font-medium text-black">{editedStats.paragraphs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Words</span>
                      <span className="font-mono font-medium text-black">{editedStats.words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Characters</span>
                      <span className="font-mono font-medium text-black">{editedStats.characters.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Headings</span>
                      <span className="font-mono font-medium text-black">{editedStats.headings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Lists</span>
                      <span className="font-mono font-medium text-black">{editedStats.lists}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Tables</span>
                      <span className="font-mono font-medium text-black">{editedStats.tables}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Images</span>
                      <span className="font-mono font-medium text-black">{editedStats.images}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============ CENTER — Preview/Edit ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                    {[
                      { id: 'preview' as const, label: 'Preview', icon: Eye },
                      { id: 'edit' as const, label: 'Edit HTML', icon: Edit3 },
                      { id: 'text' as const, label: 'Text', icon: FileText },
                    ].map((v) => {
                      const Icon = v.icon;
                      const isActive = viewMode === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setViewMode(v.id)}
                          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.1em] transition-all ${
                            isActive ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50 hover:text-black'
                          }`}
                        >
                          <Icon size={11} />
                          {v.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div className="relative flex items-center">
                    <Search size={11} className="absolute left-2.5 text-black/30 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 pr-2 py-1.5 rounded-full bg-[#f4f1ea] border border-transparent outline-none text-[11px] w-32 md:w-40"
                    />
                  </div>

                  {viewMode === 'preview' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center">
                        <ZoomOut size={14} />
                      </button>
                      <span className="text-[11px] font-mono w-10 text-center">{zoom}%</span>
                      <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center">
                        <ZoomIn size={14} />
                      </button>
                    </div>
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

                  {/* Preview mode — Word-like page */}
                  {viewMode === 'preview' && (
                    <div
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <div
                        ref={previewRef}
                        className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]"
                        style={{
                          width: 595,
                          minHeight: 842,
                          padding: '60px 55px',
                          fontFamily: FONTS.find((f) => f.id === fontFamily)?.css,
                          fontSize: `${fontSize}pt`,
                          lineHeight: lineHeight,
                          color: '#1e1e1e',
                        }}
                      >
                        {/* Docx Word-style content */}
                        <div
                          className="docx-preview"
                          dangerouslySetInnerHTML={{ __html: highlightPreviewHtml }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Edit mode — HTML textarea */}
                  {viewMode === 'edit' && (
                    <div className="w-full max-w-3xl">
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-black/[0.06]">
                        <div className="px-5 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Edit3 size={13} className="text-[#ff6a00]" />
                            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                              HTML Source
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-black/40">
                            {editedHtml.length} chars
                          </div>
                        </div>
                        <textarea
                          value={editedHtml}
                          onChange={(e) => updateHtml(e.target.value)}
                          onBlur={() => pushHistory(editedHtml)}
                          className="w-full p-5 outline-none resize-none text-[12px] leading-[1.6] font-mono bg-white text-black"
                          style={{ minHeight: 600 }}
                          spellCheck={false}
                        />
                        <div className="px-5 py-3 border-t border-black/[0.06] bg-[#f4f1ea]/30 text-[10px] font-mono text-black/40">
                          Edit HTML directly. Changes reflect live in preview.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text-only mode */}
                  {viewMode === 'text' && (
                    <div className="w-full max-w-3xl">
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-black/[0.06]">
                        <div className="px-5 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText size={13} className="text-[#ff6a00]" />
                            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                              Plain Text Content
                            </span>
                          </div>
                          <button
                            onClick={copyText}
                            className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] hover:text-[#ff8a3d] flex items-center gap-1"
                          >
                            <Copy size={10} /> Copy
                          </button>
                        </div>
                        <pre className="p-6 text-[12px] leading-[1.7] whitespace-pre-wrap font-mono text-black/80 max-h-[700px] overflow-auto">
                          {doc.text}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="text-[11px] font-mono uppercase text-black/40">
                    Mode: <span className="text-[#ff6a00]">{viewMode}</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase text-black/40">
                    {pageSize.toUpperCase()} · {orientation} · {margin}mm
                  </div>
                </div>
              </div>

              {/* ============ RIGHT — Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Preview thumbnail */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileType size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Output</span>
                  </div>

                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Format</span>
                      <span className="font-mono font-medium text-black">PDF</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Page size</span>
                      <span className="font-mono font-medium text-black">
                        {PAGE_SIZES.find((p) => p.id === pageSize)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Orientation</span>
                      <span className="font-mono font-medium text-black capitalize">{orientation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Font</span>
                      <span className="font-mono font-medium text-black">
                        {FONTS.find((f) => f.id === fontFamily)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Font size</span>
                      <span className="font-mono font-medium text-black">{fontSize}pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Cover</span>
                      <span className="font-mono font-medium text-black">
                        {includeMetadata ? 'Yes' : 'No'}
                      </span>
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
                        Convert with all formatting preserved — {editedStats.headings} headings, {editedStats.images} images.
                      </p>
                      <button
                        onClick={handleConvert}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                          isProcessing ? 'bg-black/[0.08] text-black/40' : 'bg-black text-white hover:bg-[#ff6a00]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Generating...</>
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
                    <li>• Only <strong>.docx</strong> files supported (not legacy .doc)</li>
                    <li>• Scanned docs need OCR first</li>
                    <li>• Complex layouts may vary</li>
                    <li>• Edit HTML for fine control</li>
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

      {/* Global CSS for docx preview */}
      <style jsx global>{`
        .docx-preview h1 {
          font-size: 1.8em;
          font-weight: 700;
          margin: 1em 0 0.5em;
          color: #0a0a0a;
          line-height: 1.2;
        }
        .docx-preview h2 {
          font-size: 1.4em;
          font-weight: 700;
          margin: 1em 0 0.5em;
          color: #0a0a0a;
          line-height: 1.3;
        }
        .docx-preview h3 {
          font-size: 1.2em;
          font-weight: 700;
          margin: 0.9em 0 0.4em;
          color: #1a1a1a;
        }
        .docx-preview h4, .docx-preview h5, .docx-preview h6 {
          font-size: 1.05em;
          font-weight: 600;
          margin: 0.8em 0 0.4em;
          color: #2a2a2a;
        }
        .docx-preview p {
          margin: 0 0 0.7em;
          color: #1e1e1e;
        }
        .docx-preview strong, .docx-preview b {
          font-weight: 700;
          color: #0a0a0a;
        }
        .docx-preview em, .docx-preview i {
          font-style: italic;
        }
        .docx-preview u {
          text-decoration: underline;
        }
        .docx-preview ul, .docx-preview ol {
          padding-left: 1.6em;
          margin: 0.6em 0;
        }
        .docx-preview ul li, .docx-preview ol li {
          margin-bottom: 0.3em;
          color: #1e1e1e;
        }
        .docx-preview ul li {
          list-style-type: disc;
        }
        .docx-preview ol li {
          list-style-type: decimal;
        }
        .docx-preview blockquote {
          border-left: 3px solid #ff6a00;
          padding-left: 1em;
          margin: 1em 0;
          color: #555;
          font-style: italic;
        }
        .docx-preview a {
          color: #ff6a00;
          text-decoration: underline;
        }
        .docx-preview img {
          max-width: 100%;
          height: auto;
          margin: 0.8em 0;
          border-radius: 4px;
        }
        .docx-preview table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
          font-size: 0.9em;
        }
        .docx-preview table th {
          background: #f4f1ea;
          border: 1px solid #d0c8bc;
          padding: 6px 10px;
          text-align: left;
          font-weight: 600;
        }
        .docx-preview table td {
          border: 1px solid #d0c8bc;
          padding: 6px 10px;
        }
        .docx-preview hr {
          border: none;
          border-top: 1px solid #d0c8bc;
          margin: 1.5em 0;
        }
        .docx-preview mark {
          background: #ffe082;
          padding: 0 2px;
          border-radius: 2px;
        }
        .docx-preview code {
          background: #f4f1ea;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #ff6a00;
        }
        .docx-preview pre {
          background: #f4f1ea;
          padding: 12px;
          border-radius: 6px;
          overflow: auto;
          font-family: 'Courier New', monospace;
          font-size: 0.85em;
        }
      `}</style>
    </div>
  );
}