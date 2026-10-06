"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, ArrowUpRight, Eye, Sparkles, FileOutput,
  FileType, FileCode2, FileSpreadsheet, Copy, Check, Edit3,
  Settings2, Bold, Italic, Type, AlignLeft, ListOrdered, List,
  Layers, Hash, ChevronLeft, ChevronRight, Save, Wand2, BookOpen,
  Layout, Table as TableIcon, Palette, Undo2, Redo2, Maximize2,
  ZoomIn, ZoomOut, Search, Filter, BarChart3, Info, type LucideIcon,
} from 'lucide-react';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, UnderlineType, Table, TableRow, TableCell,
  WidthType, BorderStyle, PageBreak, TabStopType,
} from 'docx';
import {
  getPDFInfo, formatBytes, downloadBlob, readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  pageNum: number;
}

interface PageContent {
  pageNum: number;
  items: TextItem[];
  text: string;
  htmlText: string;
  wordCount: number;
  charCount: number;
}

interface ExtractedDocument {
  pages: PageContent[];
  totalWords: number;
  totalChars: number;
  pageCount: number;
  title: string;
}

type OutputFormat = 'docx' | 'doc' | 'rtf' | 'txt' | 'html';
type LayoutMode = 'simple' | 'preserve' | 'structured';

const FORMAT_OPTIONS: { id: OutputFormat; label: string; ext: string; mime: string; desc: string; icon: LucideIcon }[] = [
  { id: 'docx', label: 'Word (.docx)', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', desc: 'Best compatibility', icon: FileType },
  { id: 'doc', label: 'Word 97 (.doc)', ext: 'doc', mime: 'application/msword', desc: 'Legacy format', icon: FileOutput },
  { id: 'rtf', label: 'Rich Text (.rtf)', ext: 'rtf', mime: 'application/rtf', desc: 'Universal format', icon: FileCode2 },
  { id: 'html', label: 'HTML (.html)', ext: 'html', mime: 'text/html', desc: 'Web format', icon: FileCode2 },
  { id: 'txt', label: 'Plain Text (.txt)', ext: 'txt', mime: 'text/plain', desc: 'Simple text', icon: FileText },
];

const LAYOUT_OPTIONS: { id: LayoutMode; label: string; desc: string; icon: LucideIcon }[] = [
  { id: 'simple', label: 'Simple Text', desc: 'Continuous paragraph flow', icon: Type },
  { id: 'structured', label: 'Structured', desc: 'Page-wise sections', icon: Layout },
  { id: 'preserve', label: 'Preserve Layout', desc: 'Approximate positions', icon: Layers },
];

const HEADING_SIZE_THRESHOLD = 16;

// ============================================
// COMPONENT
// ============================================

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<ExtractedDocument | null>(null);
  const [editedPages, setEditedPages] = useState<Record<number, string>>({});
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('docx');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('structured');
  const [fontFamily, setFontFamily] = useState('Calibri');
  const [fontSize, setFontSize] = useState(11);
  const [includePageNumbers, setIncludePageNumbers] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeFooters, setIncludeFooters] = useState(false);
  const [lineSpacing, setLineSpacing] = useState(1.15);
  const [showSettings, setShowSettings] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Record<number, string>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // TEXT EXTRACTION
  // ============================================

  const extractContent = useCallback(async (f: File): Promise<ExtractedDocument> => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: PageContent[] = [];
    let totalWords = 0;
    let totalChars = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      const items: TextItem[] = [];
      const lineMap = new Map<number, TextItem[]>();

      // Group items by approximate line (y position)
      textContent.items.forEach((item: any) => {
        if (!item.str || !item.str.trim()) return;

        const tx = item.transform;
        const x = tx[4];
        const y = tx[5];
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;

        const textItem: TextItem = {
          str: item.str,
          x,
          y,
          width: item.width || 0,
          height: item.height || fontSize,
          fontSize,
          isBold: false,
          isItalic: false,
          color: '#000000',
          pageNum: i,
        };

        // Round y to group same line (within 3pt)
        const lineKey = Math.round(y / 3) * 3;
        if (!lineMap.has(lineKey)) lineMap.set(lineKey, []);
        lineMap.get(lineKey)!.push(textItem);
        items.push(textItem);
      });

      // Sort lines by descending y (top to bottom in PDF coords)
      const sortedLines = Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0]);

      // Build text from sorted lines
      let text = '';
      let htmlText = '';

      sortedLines.forEach(([y, lineItems]) => {
        // Sort items in line by x
        lineItems.sort((a, b) => a.x - b.x);

        // Calculate avg font size for this line
        const avgFontSize = lineItems.reduce((sum, it) => sum + it.fontSize, 0) / lineItems.length;
        const isHeading = avgFontSize > HEADING_SIZE_THRESHOLD;

        // Join items with smart spacing
        let lineText = '';
        let prevEndX = 0;
        lineItems.forEach((item, idx) => {
          if (idx > 0) {
            const gap = item.x - prevEndX;
            // Add space if there's a visual gap
            if (gap > 2 && !lineText.endsWith(' ') && !item.str.startsWith(' ')) {
              lineText += ' ';
            }
          }
          lineText += item.str;
          prevEndX = item.x + item.width;
        });

        text += lineText + '\n';

        // HTML version with heading detection
        if (isHeading && lineText.trim().length > 0 && lineText.trim().length < 200) {
          const headingLevel = avgFontSize > 20 ? 'h1' : avgFontSize > 18 ? 'h2' : 'h3';
          htmlText += `<${headingLevel}>${escapeHtml(lineText.trim())}</${headingLevel}>\n`;
        } else if (lineText.trim()) {
          htmlText += `<p>${escapeHtml(lineText)}</p>\n`;
        }
      });

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const charCount = text.length;

      pages.push({
        pageNum: i,
        items,
        text: text.trim(),
        htmlText: htmlText.trim(),
        wordCount,
        charCount,
      });

      totalWords += wordCount;
      totalChars += charCount;
      setLoadProgress(Math.round((i / pdf.numPages) * 100));
    }

    return {
      pages,
      totalWords,
      totalChars,
      pageCount: pdf.numPages,
      title: f.name.replace(/\.pdf$/i, ''),
    };
  }, []);

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // ============================================
  // LOAD PDF
  // ============================================

  const loadPDF = useCallback(async (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFile(f);
    setDoc(null);
    setEditedPages({});
    setHistory([]);
    setHistoryIndex(-1);
    setResult(null);
    setPreviewIndex(0);
    setLoadProgress(0);

    try {
      const info = await getPDFInfo(f);
      // Validate we can read it
      if (info.pageCount === 0) {
        throw new Error('PDF has no pages.');
      }

      const extracted = await extractContent(f);
      setDoc(extracted);

      // Initialize edited pages
      const initial: Record<number, string> = {};
      extracted.pages.forEach((p) => { initial[p.pageNum] = p.text; });
      setEditedPages(initial);
      setHistory([initial]);
      setHistoryIndex(0);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to extract text. The PDF may be scanned or corrupted.' : 'Failed to extract text. The PDF may be scanned or corrupted.');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [extractContent]);

  // ============================================
  // INPUT HANDLERS
  // ============================================

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
    setDoc(null);
    setEditedPages({});
    setHistory([]);
    setHistoryIndex(-1);
    setResult(null);
    setError(null);
    setPreviewIndex(0);
  };

  // ============================================
  // EDIT HANDLERS
  // ============================================

  const updatePageText = (pageNum: number, text: string) => {
    const newPages = { ...editedPages, [pageNum]: text };
    setEditedPages(newPages);
    setResult(null);

    // Push history
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, newPages];
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setEditedPages(history[i]);
    setResult(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setEditedPages(history[i]);
    setResult(null);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const copyAllText = () => {
    if (!doc) return;
    const text = doc.pages.map((p) => editedPages[p.pageNum] || p.text).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetEdits = () => {
    if (!doc) return;
    const original: Record<number, string> = {};
    doc.pages.forEach((p) => { original[p.pageNum] = p.text; });
    setEditedPages(original);
    setResult(null);
  };

  // ============================================
  // BUILD OUTPUT
  // ============================================

  const buildDocx = async (): Promise<Blob> => {
    if (!doc) throw new Error('No document');

    const children: any[] = [];

    // Title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: doc.title,
            bold: true,
            size: 32,
            font: fontFamily,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Process each page
    for (let i = 0; i < doc.pages.length; i++) {
      const page = doc.pages[i];
      const pageText = editedPages[page.pageNum] || page.text;

      // Page heading (if structured mode)
      if (layoutMode === 'structured' && doc.pages.length > 1 && includeHeaders) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Page ${page.pageNum}`,
                bold: true,
                size: 20,
                color: '666666',
                font: fontFamily,
              }),
            ],
            spacing: { before: i > 0 ? 400 : 0, after: 200 },
            border: {
              bottom: {
                color: 'CCCCCC',
                size: 6,
                style: BorderStyle.SINGLE,
                space: 4,
              },
            },
          })
        );
      }

      // Split text into lines
      const lines = pageText.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
          // Empty line = paragraph break
          children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
          continue;
        }

        // Detect heading (all caps or short line ending with :)
        const isLikelyHeading =
          trimmed.length < 100 &&
          (trimmed === trimmed.toUpperCase() && trimmed.length > 3) ||
          trimmed.endsWith(':') && trimmed.length < 60;

        // Detect bullet points
        const isBullet = /^[\-\•\*\u2022]\s+/.test(trimmed);
        const isNumbered = /^\d+[\.\)]\s+/.test(trimmed);

        if (layoutMode !== 'simple' && isLikelyHeading) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmed,
                  bold: true,
                  size: 26,
                  font: fontFamily,
                  color: '1A1A1A',
                }),
              ],
              spacing: { before: 300, after: 150 },
              heading: HeadingLevel.HEADING_3,
            })
          );
        } else if (isBullet) {
          const bulletText = trimmed.replace(/^[\-\•\*\u2022]\s+/, '');
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: bulletText,
                  size: fontSize * 2,
                  font: fontFamily,
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 80, line: lineSpacing * 240 },
            })
          );
        } else if (isNumbered) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmed,
                  size: fontSize * 2,
                  font: fontFamily,
                }),
              ],
              spacing: { after: 80, line: lineSpacing * 240 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmed,
                  size: fontSize * 2,
                  font: fontFamily,
                }),
              ],
              spacing: { after: 120, line: lineSpacing * 240 },
            })
          );
        }
      }

      // Page break between pages
      if (i < doc.pages.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    }

    const document = new Document({
      creator: 'idcardtools',
      title: doc.title,
      description: 'Converted from PDF by idcardtools',
      styles: {
        default: {
          document: {
            run: {
              font: fontFamily,
              size: fontSize * 2,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(document);
    return blob;
  };

  const buildDoc = (): Blob => {
    if (!doc) throw new Error('No document');

    const pagesHtml = doc.pages.map((p, i) => {
      const text = editedPages[p.pageNum] || p.text;
      const lines = text.split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => `<p style="margin: 6pt 0; line-height: ${lineSpacing};">${escapeHtml(l)}</p>`)
        .join('');
      return `<div style="page-break-after: ${i < doc.pages.length - 1 ? 'always' : 'auto'};">${lines}</div>`;
    }).join('');

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { margin: 1in; }
  body { font-family: ${fontFamily}; font-size: ${fontSize}pt; line-height: ${lineSpacing}; color: #1a1a1a; }
  h1 { font-size: 20pt; color: #1a1a1a; }
  h2 { font-size: 16pt; color: #1a1a1a; }
  h3 { font-size: 13pt; color: #1a1a1a; }
  p { margin: 6pt 0; }
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
${pagesHtml}
</body>
</html>`;

    return new Blob([html], { type: 'application/msword' });
  };

  const buildRTF = (): Blob => {
    if (!doc) throw new Error('No document');

    const header = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}{\\f1 Times New Roman;}}`;
    const footer = `}`;

    let body = `\\fs32\\b ${escapeRtf(doc.title)}\\b0\\fs${fontSize * 2}\\par\\par `;

    doc.pages.forEach((p, i) => {
      const text = editedPages[p.pageNum] || p.text;
      const lines = text.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          body += '\\par ';
        } else {
          body += `${escapeRtf(trimmed)}\\par `;
        }
      });
      if (i < doc.pages.length - 1) {
        body += '\\page ';
      }
    });

    return new Blob([header + body + footer], { type: 'application/rtf' });
  };

  const escapeRtf = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/[^\x00-\x7F]/g, (char) => `\\u${char.charCodeAt(0)}?`);
  };

  const buildHTML = (): Blob => {
    if (!doc) throw new Error('No document');

    const pagesHtml = doc.pages.map((p) => {
      const text = editedPages[p.pageNum] || p.text;
      const lines = text.split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => {
          const isHeading =
            l.length < 100 &&
            l === l.toUpperCase() &&
            l.length > 3;
          return isHeading ? `<h3>${escapeHtml(l)}</h3>` : `<p>${escapeHtml(l)}</p>`;
        })
        .join('');
      return `<section>${lines}</section>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.title)}</title>
<style>
  body { font-family: ${fontFamily}, -apple-system, sans-serif; font-size: ${fontSize}pt; line-height: ${lineSpacing}; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
  h1 { font-size: 28px; border-bottom: 2px solid #ff6a00; padding-bottom: 12px; }
  h3 { font-size: 18px; color: #333; margin-top: 24px; }
  p { margin: 12px 0; }
  section { margin: 32px 0; padding-top: 24px; border-top: 1px solid #eee; }
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
${pagesHtml}
</body>
</html>`;

    return new Blob([html], { type: 'text/html' });
  };

  const buildTXT = (): Blob => {
    if (!doc) throw new Error('No document');
    const text = doc.pages
      .map((p) => editedPages[p.pageNum] || p.text)
      .join('\n\n' + '─'.repeat(40) + '\n\n');
    return new Blob([text], { type: 'text/plain' });
  };

  const handleConvert = async () => {
    if (!doc) return;
    setIsProcessing(true);
    setError(null);

    try {
      let blob: Blob;
      const format = FORMAT_OPTIONS.find((f) => f.id === outputFormat)!;

      switch (outputFormat) {
        case 'docx':
          blob = await buildDocx();
          break;
        case 'doc':
          blob = buildDoc();
          break;
        case 'rtf':
          blob = buildRTF();
          break;
        case 'html':
          blob = buildHTML();
          break;
        case 'txt':
          blob = buildTXT();
          break;
        default:
          throw new Error('Unsupported format');
      }

      setResult({
        blob,
        filename: `${doc.title}.${format.ext}`,
      });
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

  const currentPage = doc?.pages[previewIndex];
  const currentText = currentPage ? (editedPages[currentPage.pageNum] || currentPage.text) : '';

  const editedStats = useMemo(() => {
    if (!doc) return { words: 0, chars: 0, modified: false };
    let words = 0;
    let chars = 0;
    let modified = false;
    doc.pages.forEach((p) => {
      const text = editedPages[p.pageNum] ?? p.text;
      if (text !== p.text) modified = true;
      words += text.split(/\s+/).filter(Boolean).length;
      chars += text.length;
    });
    return { words, chars, modified };
  }, [doc, editedPages]);

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
              PDF to Word — Editable Document
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>5 Formats</span>
            <span>·</span>
            <span>Live Preview</span>
          </div>
        </div>

        {/* Heading (upload state) */}
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
                PDF to <span className="italic text-[#ff6a00]">Word</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Extract text with live preview, edit before download, and export as real
                DOCX, DOC, RTF, HTML, or plain text.
              </p>
            </div>
          </motion.div>
        )}

        {/* Upload state */}
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
                  <FileOutput size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Convert any PDF with text into an editable Word document. Live preview,
                  edit inline, then export.
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
                { icon: Edit3, label: 'Edit before export' },
                { icon: Eye, label: 'Live preview' },
                { icon: FileType, label: 'Real DOCX' },
                { icon: Wand2, label: 'Smart formatting' },
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <FileOutput size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Extracting text... {loadProgress}%
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

        {/* Workspace */}
        {file && doc && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{file.name}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{doc.pageCount}</span>
                  <span className="text-[12px] text-black/50">pages</span>
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
                  <span className="text-[13px] font-medium text-black">{editedStats.chars.toLocaleString()}</span>
                  <span className="text-[12px] text-black/50">chars</span>
                </div>
                {editedStats.modified && (
                  <>
                    <div className="w-px h-4 bg-black/10" />
                    <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-emerald-500">
                      ✎ Modified
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAllText}
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

                {/* Output format */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileType size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Output Format
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {FORMAT_OPTIONS.map((f) => {
                      const Icon = f.icon;
                      const isActive = outputFormat === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => { setOutputFormat(f.id); setResult(null); }}
                          className={`w-full p-3 rounded-lg text-left transition-all border flex items-center gap-3 ${
                            isActive
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-[#ff6a00] text-white' : 'bg-[#f4f1ea] text-black/50'
                          }`}>
                            <Icon size={13} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[12px] font-medium truncate ${
                              isActive ? 'text-[#ff6a00]' : 'text-black'
                            }`}>
                              {f.label}
                            </div>
                            <div className="text-[9px] font-mono uppercase text-black/40">
                              {f.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Layout mode */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layout size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Layout
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {LAYOUT_OPTIONS.map((l) => {
                      const Icon = l.icon;
                      const isActive = layoutMode === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => { setLayoutMode(l.id); setResult(null); }}
                          className={`w-full p-2.5 rounded-lg text-left transition-all border flex items-start gap-2.5 ${
                            isActive
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <Icon size={13} className={`mt-0.5 shrink-0 ${isActive ? 'text-[#ff6a00]' : 'text-black/40'}`} />
                          <div className="min-w-0 flex-1">
                            <div className={`text-[11px] font-medium ${isActive ? 'text-[#ff6a00]' : 'text-black'}`}>
                              {l.label}
                            </div>
                            <div className="text-[9px] text-black/40 leading-tight">
                              {l.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Formatting */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">
                        Formatting
                      </span>
                    </div>
                    <ChevronRight size={12} className={`text-black/40 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        {/* Font family */}
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">
                            Font
                          </label>
                          <select
                            value={fontFamily}
                            onChange={(e) => { setFontFamily(e.target.value); setResult(null); }}
                            className="w-full bg-[#f4f1ea] rounded-md px-3 py-2 text-[12px] border border-black/[0.06] focus:border-[#ff6a00] outline-none"
                          >
                            <option value="Calibri">Calibri</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Courier New">Courier New</option>
                          </select>
                        </div>

                        {/* Font size */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">
                              Size
                            </label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{fontSize}pt</span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={20}
                            value={fontSize}
                            onChange={(e) => { setFontSize(parseInt(e.target.value)); setResult(null); }}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        {/* Line spacing */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">
                              Line spacing
                            </label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">
                              {lineSpacing.toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={2}
                            step={0.05}
                            value={lineSpacing}
                            onChange={(e) => { setLineSpacing(parseFloat(e.target.value)); setResult(null); }}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        {/* Toggles */}
                        <div className="space-y-2 pt-2 border-t border-black/[0.06]">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeHeaders}
                              onChange={(e) => { setIncludeHeaders(e.target.checked); setResult(null); }}
                              className="accent-[#ff6a00]"
                            />
                            <span className="text-[11px] text-black/70">Page headers</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includePageNumbers}
                              onChange={(e) => { setIncludePageNumbers(e.target.checked); setResult(null); }}
                              className="accent-[#ff6a00]"
                            />
                            <span className="text-[11px] text-black/70">Page numbers</span>
                          </label>
                        </div>

                        {/* Reset edits */}
                        {editedStats.modified && (
                          <button
                            onClick={resetEdits}
                            className="w-full py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] hover:bg-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw size={11} />
                            Reset edits
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ============ CENTER — Preview/Edit ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  {/* View toggle */}
                  <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.1em] transition-all ${
                        viewMode === 'preview' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50 hover:text-black'
                      }`}
                    >
                      <Eye size={11} />
                      Preview
                    </button>
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.1em] transition-all ${
                        viewMode === 'edit' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50 hover:text-black'
                      }`}
                    >
                      <Edit3 size={11} />
                      Edit
                    </button>
                  </div>

                  {/* Page nav */}
                  <div className="flex items-center gap-1 bg-[#f4f1ea] rounded-lg p-1">
                    <button
                      onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                      disabled={previewIndex <= 0}
                      className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="px-2 text-[12px] font-mono">
                      {previewIndex + 1} / {doc.pageCount}
                    </span>
                    <button
                      onClick={() => setPreviewIndex(Math.min(doc.pageCount - 1, previewIndex + 1))}
                      disabled={previewIndex >= doc.pageCount - 1}
                      className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Undo/Redo */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={undo}
                      disabled={!canUndo}
                      className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={redo}
                      disabled={!canRedo}
                      className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>

                  {/* Zoom (preview mode) */}
                  {viewMode === 'preview' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setZoom((z) => Math.max(50, z - 10))}
                        className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <span className="text-[11px] font-mono w-10 text-center">{zoom}%</span>
                      <button
                        onClick={() => setZoom((z) => Math.min(200, z + 10))}
                        className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content area */}
                <div className="rounded-[18px] bg-[#ebe7de]/40 border border-black/[0.06] p-6 min-h-[700px] flex items-start justify-center overflow-auto relative">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Preview mode - Word-style */}
                  {viewMode === 'preview' && currentPage && (
                    <div
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <div
                        className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]"
                        style={{
                          width: 595,
                          minHeight: 842,
                          padding: '72px 72px',
                          fontFamily: `${fontFamily}, -apple-system, sans-serif`,
                          fontSize: `${fontSize}pt`,
                          lineHeight: lineSpacing,
                          color: '#1a1a1a',
                        }}
                      >
                        {/* Word-style header */}
                        {includeHeaders && doc.pageCount > 1 && (
                          <div
                            className="pb-3 mb-6 border-b border-gray-200 text-[10px] uppercase tracking-[0.15em] text-gray-400 flex items-center justify-between"
                            style={{ fontFamily: 'monospace' }}
                          >
                            <span>Page {previewIndex + 1}</span>
                            <span className="truncate max-w-[300px]">{doc.title}</span>
                          </div>
                        )}

                        {/* Content */}
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {currentText.split('\n').map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={idx} style={{ height: '0.7em' }} />;

                            const isLikelyHeading =
                              (trimmed.length < 100 &&
                                trimmed === trimmed.toUpperCase() &&
                                trimmed.length > 3) ||
                              (trimmed.endsWith(':') && trimmed.length < 60);

                            const isBullet = /^[\-\•\*\u2022]\s+/.test(trimmed);
                            const isNumbered = /^\d+[\.\)]\s+/.test(trimmed);

                            if (isLikelyHeading) {
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    fontSize: `${fontSize * 1.4}pt`,
                                    fontWeight: 600,
                                    marginTop: '1.2em',
                                    marginBottom: '0.6em',
                                    color: '#1a1a1a',
                                  }}
                                >
                                  {trimmed}
                                </div>
                              );
                            }

                            if (isBullet) {
                              return (
                                <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '0.4em' }}>
                                  <span style={{ color: '#ff6a00', fontWeight: 'bold' }}>•</span>
                                  <span>{trimmed.replace(/^[\-\•\*\u2022]\s+/, '')}</span>
                                </div>
                              );
                            }

                            if (isNumbered) {
                              return (
                                <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '0.4em' }}>
                                  <span style={{ color: '#ff6a00', fontWeight: 'bold' }}>
                                    {trimmed.match(/^\d+[\.\)]/)?.[0]}
                                  </span>
                                  <span>{trimmed.replace(/^\d+[\.\)]\s+/, '')}</span>
                                </div>
                              );
                            }

                            return (
                              <div key={idx} style={{ marginBottom: '0.4em' }}>
                                {trimmed}
                              </div>
                            );
                          })}
                        </div>

                        {/* Page number footer */}
                        {includePageNumbers && (
                          <div className="pt-4 mt-8 border-t border-gray-200 text-[10px] text-center text-gray-400" style={{ fontFamily: 'monospace' }}>
                            {previewIndex + 1}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit mode - Textarea */}
                  {viewMode === 'edit' && currentPage && (
                    <div className="w-full max-w-2xl">
                      <div className="bg-white rounded-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden border border-black/[0.06]">
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Edit3 size={13} className="text-[#ff6a00]" />
                            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                              Editing page {previewIndex + 1}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-black/40">
                            {currentText.split(/\s+/).filter(Boolean).length} words
                          </div>
                        </div>

                        {/* Textarea */}
                        <textarea
                          value={currentText}
                          onChange={(e) => updatePageText(currentPage.pageNum, e.target.value)}
                          className="w-full p-6 outline-none resize-none text-[13px] leading-[1.7] bg-white text-black"
                          style={{
                            fontFamily: `${fontFamily}, -apple-system, sans-serif`,
                            minHeight: '600px',
                          }}
                          spellCheck
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        <span>Page {previewIndex + 1} of {doc.pageCount}</span>
                        {currentText !== currentPage.text && (
                          <span className="text-emerald-500">✎ Modified</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ============ RIGHT — Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Preview stats */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Document Info
                    </span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Pages</span>
                      <span className="font-mono font-medium text-black">{doc.pageCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Total words</span>
                      <span className="font-mono font-medium text-black">{editedStats.words.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Total chars</span>
                      <span className="font-mono font-medium text-black">{editedStats.chars.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Output</span>
                      <span className="font-mono font-medium text-[#ff6a00]">
                        {FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.ext.toUpperCase()}
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
                        <div className="text-[13px] font-medium text-black mb-1">Word file ready!</div>
                        <div className="text-[10px] font-mono text-black/40">
                          {formatBytes(result.blob.size)}
                        </div>
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2"
                      >
                        <Download size={13} />
                        Download {FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.ext.toUpperCase()}
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
                        Converts {doc.pageCount} page{doc.pageCount !== 1 ? 's' : ''} to {FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.label}.
                      </p>
                      <button
                        onClick={handleConvert}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                          isProcessing
                            ? 'bg-black/[0.08] text-black/40'
                            : 'bg-black text-white hover:bg-[#ff6a00]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Converting...</>
                        ) : (
                          <><Sparkles size={13} /> Convert to Word</>
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
                  <div className="text-[10px] font-mono uppercase text-black/40 mb-3">
                    Tips
                  </div>
                  <ul className="space-y-2 text-[11px] text-black/60 leading-relaxed">
                    <li>• <strong>DOCX</strong> opens in Word, Google Docs, Pages</li>
                    <li>• <strong>Preserve Layout</strong> keeps approximate positions</li>
                    <li>• Scanned PDFs need <strong>OCR</strong> first</li>
                    <li>• Edit text before exporting for best results</li>
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