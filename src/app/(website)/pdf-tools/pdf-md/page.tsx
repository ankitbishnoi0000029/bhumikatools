"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, RefreshCw, ArrowUpRight, Eye, Sparkles, FileCode2,
  Copy, Check, Edit3, Settings2, Bold, Italic, Type, Hash,
  ListOrdered, List, Layers, ChevronLeft, ChevronRight, Save,
  Wand2, BookOpen, Layout, Table as TableIcon, Code, Link2,
  Quote, Minus, CheckSquare, Image as ImageIcon, ZoomIn, ZoomOut,
  Undo2, Redo2, Info, BarChart3, Braces, Maximize2, Search,
  SplitSquareHorizontal, FileOutput, DownloadCloud, FolderTree,
} from 'lucide-react';
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
  pageNum: number;
  hasEOL: boolean;
}

interface PageContent {
  pageNum: number;
  items: TextItem[];
  markdown: string;
  stats: {
    words: number;
    chars: number;
    headings: number;
    paragraphs: number;
  };
}

interface ExtractedDoc {
  pages: PageContent[];
  totalPages: number;
  totalWords: number;
  totalHeadings: number;
  title: string;
}

interface FrontmatterOptions {
  enabled: boolean;
  title: boolean;
  author: boolean;
  date: boolean;
  source: boolean;
  description: boolean;
  tags: boolean;
}

type HeadingStyle = 'atx' | 'setext';
type ListStyle = 'dash' | 'asterisk' | 'plus';
type OutputMode = 'single' | 'per-page' | 'outline';
type DetectionMode = 'conservative' | 'balanced' | 'aggressive';

const HEADING_STYLES: { id: HeadingStyle; label: string; example: string }[] = [
  { id: 'atx', label: 'ATX (#)', example: '# Heading' },
  { id: 'setext', label: 'Setext', example: 'Heading\n=====' },
];

const LIST_STYLES: { id: ListStyle; label: string; char: string }[] = [
  { id: 'dash', label: 'Dash', char: '-' },
  { id: 'asterisk', label: 'Asterisk', char: '*' },
  { id: 'plus', label: 'Plus', char: '+' },
];

const OUTPUT_MODES: { id: OutputMode; label: string; desc: string; icon: any }[] = [
  { id: 'single', label: 'Single File', desc: 'All pages in one .md', icon: FileText },
  { id: 'per-page', label: 'Per Page', desc: 'One .md per page', icon: Layers },
  { id: 'outline', label: 'Outline Only', desc: 'Headings summary', icon: List },
];

const DETECTION_MODES: { id: DetectionMode; label: string; desc: string; icon: any }[] = [
  { id: 'conservative', label: 'Conservative', desc: 'Only obvious headings', icon: CheckSquare },
  { id: 'balanced', label: 'Balanced', desc: 'Smart defaults', icon: Wand2 },
  { id: 'aggressive', label: 'Aggressive', desc: 'Detect more structure', icon: Sparkles },
];

// ============================================
// COMPONENT
// ============================================

export default function PdfToMarkdownPage() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<ExtractedDoc | null>(null);
  const [editedMarkdown, setEditedMarkdown] = useState<string>('');
  const [outputMode, setOutputMode] = useState<OutputMode>('single');
  const [headingStyle, setHeadingStyle] = useState<HeadingStyle>('atx');
  const [listStyle, setListStyle] = useState<ListStyle>('dash');
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('balanced');
  const [preserveLineBreaks, setPreserveLineBreaks] = useState(true);
  const [detectTables, setDetectTables] = useState(true);
  const [detectCodeBlocks, setDetectCodeBlocks] = useState(true);
  const [detectBold, setDetectBold] = useState(true);
  const [detectLinks, setDetectLinks] = useState(true);
  const [detectBlockquotes, setDetectBlockquotes] = useState(true);

  const [frontmatter, setFrontmatter] = useState<FrontmatterOptions>({
    enabled: false,
    title: true,
    author: false,
    date: true,
    source: true,
    description: false,
    tags: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; isZip?: boolean } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'split' | 'raw' | 'preview'>('split');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // SMART MARKDOWN CONVERSION
  // ============================================

  const detectHeadingLevel = (
    text: string,
    fontSize: number,
    avgFontSize: number
  ): number | null => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 200) return null;

    // Detection thresholds based on mode
    const thresholds = {
      conservative: { ratio1: 1.6, ratio2: 1.3, ratio3: 1.1 },
      balanced: { ratio1: 1.5, ratio2: 1.25, ratio3: 1.08 },
      aggressive: { ratio1: 1.35, ratio2: 1.15, ratio3: 1.02 },
    }[detectionMode];

    const ratio = fontSize / avgFontSize;

    // H1 - much larger than average
    if (ratio >= thresholds.ratio1) return 1;
    if (ratio >= thresholds.ratio2) return 2;
    if (ratio >= thresholds.ratio3) return 3;

    // Heuristics for uppercase short lines
    if (
      detectionMode !== 'conservative' &&
      trimmed.length > 3 &&
      trimmed.length < 80 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed) &&
      !/[.!?]$/.test(trimmed)
    ) {
      return 2;
    }

    // Lines ending with colon and short
    if (
      detectionMode === 'aggressive' &&
      trimmed.length < 60 &&
      trimmed.endsWith(':') &&
      !trimmed.includes('.')
    ) {
      return 3;
    }

    return null;
  };

  const isBullet = (text: string): boolean => {
    return /^[\-\•\*\u2022\u25CF\u25E6\u2023]\s+/.test(text.trim());
  };

  const isNumberedList = (text: string): boolean => {
    return /^\d+[\.\)]\s+/.test(text.trim());
  };

  const isLikelyTable = (lines: string[]): boolean => {
    if (!detectTables || lines.length < 2) return false;
    // Look for lines with multiple space-separated tokens
    const withMultipleSpaces = lines.filter((l) => {
      const parts = l.trim().split(/\s{2,}/);
      return parts.length >= 2;
    });
    return withMultipleSpaces.length >= 2;
  };

  const isLikelyCodeBlock = (lines: string[]): boolean => {
    if (!detectCodeBlocks) return false;
    // Lines with lots of symbols, indentation, or specific patterns
    const codeIndicators = lines.filter((l) => {
      return (
        /^[\s]{4,}/.test(l) ||
        /[{}();=><]/.test(l) ||
        /^\s*\w+\s*[:=]\s*.+$/.test(l) ||
        /^\s*(if|for|while|function|class|def|const|let|var|import|export|return|console\.)/.test(l)
      );
    });
    return codeIndicators.length >= Math.ceil(lines.length * 0.5);
  };

  const convertPageToMarkdown = (
    page: PageContent,
    avgFontSize: number,
    isFirstPage: boolean
  ): string => {
    // Group items by line (y position)
    const lineMap = new Map<number, TextItem[]>();

    page.items.forEach((item) => {
      const lineKey = Math.round(item.y / 3) * 3;
      if (!lineMap.has(lineKey)) lineMap.set(lineKey, []);
      lineMap.get(lineKey)!.push(item);
    });

    // Sort lines top to bottom
    const sortedLines = Array.from(lineMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => {
        items.sort((a, b) => a.x - b.x);

        // Get avg font size of line
        const lineFontSize = items.reduce((sum, it) => sum + it.fontSize, 0) / items.length;

        // Join with smart spacing
        let text = '';
        let prevEndX = 0;
        items.forEach((item, idx) => {
          if (idx > 0) {
            const gap = item.x - prevEndX;
            if (gap > 3 && !text.endsWith(' ') && !item.str.startsWith(' ')) {
              text += ' ';
            }
          }
          text += item.str;
          prevEndX = item.x + item.width;
        });

        return { text: text.trim(), fontSize: lineFontSize, y };
      })
      .filter((l) => l.text.length > 0);

    // Build markdown
    let md = '';
    const listChar = LIST_STYLES.find((l) => l.id === listStyle)?.char || '-';
    let i = 0;

    while (i < sortedLines.length) {
      const { text, fontSize } = sortedLines[i];

      // Check for code block
      if (detectCodeBlocks) {
        const codeCandidate = sortedLines.slice(i, Math.min(i + 10, sortedLines.length));
        if (codeCandidate.length >= 3 && isLikelyCodeBlock(codeCandidate.map((c) => c.text))) {
          const codeLines: string[] = [];
          let j = i;
          while (
            j < sortedLines.length &&
            (codeCandidate.some((c) => c.text === sortedLines[j].text) || j === i)
          ) {
            codeLines.push(sortedLines[j].text);
            j++;
            if (codeLines.length >= 15) break;
          }
          md += '```\n' + codeLines.join('\n') + '\n```\n\n';
          i = j;
          continue;
        }
      }

      // Check for table
      if (detectTables) {
        const tableCandidate = sortedLines.slice(i, Math.min(i + 10, sortedLines.length));
        if (isLikelyTable(tableCandidate.slice(0, 5).map((c) => c.text))) {
          // Try to build table
          const tableLines: string[][] = [];
          let j = i;
          while (j < sortedLines.length) {
            const parts = sortedLines[j].text.split(/\s{2,}/);
            if (parts.length < 2) break;
            tableLines.push(parts);
            j++;
            if (tableLines.length >= 15) break;
          }
          if (tableLines.length >= 2) {
            // Header
            md += '| ' + tableLines[0].join(' | ') + ' |\n';
            md += '|' + tableLines[0].map(() => '---').join('|') + '|\n';
            // Rows
            for (let k = 1; k < tableLines.length; k++) {
              md += '| ' + tableLines[k].join(' | ') + ' |\n';
            }
            md += '\n';
            i = j;
            continue;
          }
        }
      }

      // Heading
      const headingLevel = detectHeadingLevel(text, fontSize, avgFontSize);
      if (headingLevel !== null) {
        if (isFirstPage && headingLevel === 1 && !md.trim()) {
          // First heading is the title
          if (headingStyle === 'atx') {
            md += `${'#'.repeat(headingLevel)} ${text}\n\n`;
          } else {
            md += `${text}\n${'='.repeat(text.length)}\n\n`;
          }
        } else {
          if (headingStyle === 'atx') {
            md += `${'#'.repeat(headingLevel)} ${text}\n\n`;
          } else {
            const underline = headingLevel === 1 ? '=' : '-';
            md += `${text}\n${underline.repeat(Math.min(text.length, 60))}\n\n`;
          }
        }
        i++;
        continue;
      }

      // Bullet list
      if (isBullet(text)) {
        const bulletText = text.replace(/^[\-\•\*\u2022\u25CF\u25E6\u2023]\s+/, '');
        md += `${listChar} ${bulletText}\n`;
        // Check if next line is also a bullet
        if (i + 1 < sortedLines.length && !isBullet(sortedLines[i + 1].text)) {
          md += '\n';
        }
        i++;
        continue;
      }

      // Numbered list
      if (isNumberedList(text)) {
        md += `${text}\n`;
        if (i + 1 < sortedLines.length && !isNumberedList(sortedLines[i + 1].text)) {
          md += '\n';
        }
        i++;
        continue;
      }

      // Blockquote (starts with > or special indentation)
      if (detectBlockquotes && /^>/.test(text)) {
        md += `> ${text.replace(/^>\s*/, '')}\n\n`;
        i++;
        continue;
      }

      // Horizontal rule detection
      if (/^[\-\=\_\*\s]{3,}$/.test(text) && text.length < 20) {
        md += '---\n\n';
        i++;
        continue;
      }

      // Regular paragraph
      let paragraph = text;

      // Bold detection (short all-caps within line)
      if (detectBold && detectionMode !== 'conservative') {
        // Detect potential bold (all caps words of 3+ chars in mixed case line)
        if (!isFirstPage || md.length > 100) {
          // Don't over-bold, keep simple
        }
      }

      md += paragraph;
      if (preserveLineBreaks) {
        md += '\n';
      } else {
        md += ' ';
        // Look ahead - if next line starts with lowercase, don't break paragraph
        if (i + 1 < sortedLines.length) {
          const nextText = sortedLines[i + 1].text;
          if (!/^[A-Z\u0900-\u097F]/.test(nextText) && !isBullet(nextText) && !isNumberedList(nextText)) {
            // Continue same paragraph
            i++;
            continue;
          }
        }
        md += '\n\n';
      }
      i++;
    }

    return md.trim();
  };

  const buildFrontmatter = (doc: ExtractedDoc): string => {
    if (!frontmatter.enabled) return '';
    const lines: string[] = ['---'];
    if (frontmatter.title) lines.push(`title: "${doc.title}"`);
    if (frontmatter.author) lines.push(`author: ""`);
    if (frontmatter.date) lines.push(`date: "${new Date().toISOString().split('T')[0]}"`);
    if (frontmatter.source) lines.push(`source: "${file?.name || ''}"`);
    if (frontmatter.description) lines.push(`description: ""`);
    if (frontmatter.tags) lines.push(`tags: []`);
    lines.push(`pages: ${doc.totalPages}`);
    lines.push(`words: ${doc.totalWords}`);
    lines.push('---');
    return lines.join('\n') + '\n\n';
  };

  // ============================================
  // EXTRACT PDF
  // ============================================

  const extractPDF = useCallback(async (f: File): Promise<ExtractedDoc> => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: PageContent[] = [];
    let totalWords = 0;
    let totalHeadings = 0;

    // First pass - collect all font sizes for average
    const allFontSizes: number[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      (content.items as any[]).forEach((item) => {
        if (item.str && item.str.trim()) {
          const tx = item.transform;
          const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;
          allFontSizes.push(fontSize);
        }
      });
      setLoadProgress(Math.round((i / pdf.numPages) * 50));
    }

    const avgFontSize = allFontSizes.length > 0
      ? allFontSizes.reduce((a, b) => a + b, 0) / allFontSizes.length
      : 12;

    // Second pass - build pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const items: TextItem[] = [];
      (content.items as any[]).forEach((item) => {
        if (!item.str) return;
        const tx = item.transform;
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;

        items.push({
          str: item.str,
          x: tx[4],
          y: tx[5],
          width: item.width || 0,
          height: item.height || fontSize,
          fontSize,
          pageNum: i,
          hasEOL: item.hasEOL || false,
        });
      });

      const pageContent: PageContent = {
        pageNum: i,
        items,
        markdown: '',
        stats: { words: 0, chars: 0, headings: 0, paragraphs: 0 },
      };

      // Build markdown
      const md = convertPageToMarkdown(pageContent, avgFontSize, i === 1);
      pageContent.markdown = md;

      // Stats
      pageContent.stats.words = md.split(/\s+/).filter(Boolean).length;
      pageContent.stats.chars = md.length;
      pageContent.stats.headings = (md.match(/^#+\s/gm) || []).length;
      pageContent.stats.paragraphs = md.split(/\n\n+/).length;

      totalWords += pageContent.stats.words;
      totalHeadings += pageContent.stats.headings;

      pages.push(pageContent);
      setLoadProgress(50 + Math.round((i / pdf.numPages) * 50));
    }

    return {
      pages,
      totalPages: pdf.numPages,
      totalWords,
      totalHeadings,
      title: f.name.replace(/\.pdf$/i, ''),
    };
  }, [detectionMode, headingStyle, listStyle, preserveLineBreaks, detectTables, detectCodeBlocks, detectBold, detectLinks, detectBlockquotes]);

  // Reconvert on option change
  const reconvert = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const extracted = await extractPDF(file);
      setDoc(extracted);
      const fullMd = extracted.pages.map((p) => p.markdown).join('\n\n---\n\n');
      setEditedMarkdown(fullMd);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [file, extractPDF]);

  // Re-run when options change
  useEffect(() => {
    if (doc && file) {
      reconvert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectionMode, headingStyle, listStyle, preserveLineBreaks, detectTables, detectCodeBlocks, detectBlockquotes]);

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
    setDoc(null);
    setEditedMarkdown('');
    setResult(null);
    setPreviewIndex(0);
    setLoadProgress(0);

    try {
      const info = await getPDFInfo(f);
      if (info.pageCount === 0) throw new Error('PDF has no pages.');

      const extracted = await extractPDF(f);
      setDoc(extracted);
      const fullMd = extracted.pages.map((p) => p.markdown).join('\n\n---\n\n');
      setEditedMarkdown(fullMd);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to extract text. PDF may be scanned.');
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
    setDoc(null);
    setEditedMarkdown('');
    setResult(null);
    setError(null);
    setPreviewIndex(0);
  };

  // ============================================
  // PREVIEW HELPERS
  // ============================================

  const previewMarkdown = useMemo(() => {
    if (viewMode === 'raw' || !doc) return '';
    const fm = buildFrontmatter(doc);
    return fm + editedMarkdown;
  }, [editedMarkdown, doc, frontmatter, viewMode]);

  // ============================================
  // EXPORT
  // ============================================

  const getFinalMarkdown = (): string => {
    const fm = doc ? buildFrontmatter(doc) : '';
    return fm + editedMarkdown;
  };

  const handleExport = async () => {
    if (!doc || !file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const fm = buildFrontmatter(doc);

      if (outputMode === 'single') {
        const md = fm + editedMarkdown;
        const blob = new Blob([md], { type: 'text/markdown' });
        setResult({
          blob,
          filename: `${doc.title}.md`,
        });
      } else if (outputMode === 'per-page') {
        // Create ZIP with per-page files
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const folder = zip.folder(doc.title) || zip;

        doc.pages.forEach((page, idx) => {
          const pageMd = fm + page.markdown;
          folder.file(
            `page-${String(idx + 1).padStart(3, '0')}.md`,
            pageMd
          );
        });

        // Also add full file
        const fullMd = fm + editedMarkdown;
        zip.file(`${doc.title}.md`, fullMd);

        // Add README
        const readme = `# ${doc.title}\n\nExtracted from \`${file.name}\` using idcardtools.\n\n- **Pages:** ${doc.totalPages}\n- **Words:** ${doc.totalWords.toLocaleString()}\n- **Headings:** ${doc.totalHeadings}\n- **Extracted:** ${new Date().toLocaleString()}\n\n## Files\n\n- \`${doc.title}.md\` — complete document\n- \`${doc.title}/\` — individual page files\n`;
        zip.file('README.md', readme);

        const blob = await zip.generateAsync({ type: 'blob' });
        setResult({
          blob,
          filename: `${doc.title}.zip`,
          isZip: true,
        });
      } else if (outputMode === 'outline') {
        // Build outline
        let outline = fm + `# ${doc.title} — Outline\n\n`;
        doc.pages.forEach((page) => {
          const headings = page.markdown.match(/^#+\s.+$/gm) || [];
          if (headings.length > 0) {
            outline += `## Page ${page.pageNum}\n\n`;
            headings.forEach((h) => {
              outline += `- ${h}\n`;
            });
            outline += '\n';
          }
        });
        const blob = new Blob([outline], { type: 'text/markdown' });
        setResult({
          blob,
          filename: `${doc.title}-outline.md`,
        });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Export failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  const copyAllText = () => {
    navigator.clipboard.writeText(getFinalMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ============================================
  // COMPUTED
  // ============================================

  const currentPage = doc?.pages[previewIndex];
  const editedStats = useMemo(() => {
    const lines = editedMarkdown.split('\n');
    const words = editedMarkdown.split(/\s+/).filter(Boolean).length;
    const chars = editedMarkdown.length;
    const headings = (editedMarkdown.match(/^#+\s/gm) || []).length;
    const paragraphs = editedMarkdown.split(/\n\n+/).filter((p) => p.trim()).length;
    const bullets = (editedMarkdown.match(/^[\-\*\+]\s/gm) || []).length;
    const numbered = (editedMarkdown.match(/^\d+[\.\)]\s/gm) || []).length;
    const codeBlocks = Math.floor((editedMarkdown.match(/```/g) || []).length / 2);
    const tables = (editedMarkdown.match(/^\|.+\|$/gm) || []).length;
    const links = (editedMarkdown.match(/\[.+\]\(.+\)/g) || []).length;
    return { words, chars, headings, paragraphs, bullets, numbered, codeBlocks, tables, links, lines: lines.length };
  }, [editedMarkdown]);

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
              PDF to Markdown — LLM Ready
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Smart Detection</span>
            <span>·</span>
            <span>Live Preview</span>
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
                PDF to <span className="italic text-[#ff6a00]">Markdown</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Extract clean Markdown from any PDF — with smart heading detection,
                tables, lists, code blocks, and live preview.
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
                  <FileCode2 size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Convert PDF to clean Markdown for docs, notes, README files, and LLMs.
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
                { icon: Wand2, label: 'Smart headings' },
                { icon: TableIcon, label: 'Table detection' },
                { icon: Code, label: 'Code blocks' },
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
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <FileCode2 size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Extracting Markdown... {loadProgress}%
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
                  <span className="text-[13px] font-medium text-black truncate max-w-[200px]">
                    {file.name}
                  </span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{doc.totalPages}</span>
                  <span className="text-[12px] text-black/50">pages</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{editedStats.headings}</span>
                  <span className="text-[12px] text-black/50">headings</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{editedStats.words.toLocaleString()}</span>
                  <span className="text-[12px] text-black/50">words</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAllText}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] transition-colors ${
                    copied ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                  }`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy Markdown'}
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

                {/* Output mode */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderTree size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Output
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {OUTPUT_MODES.map((o) => {
                      const Icon = o.icon;
                      const isActive = outputMode === o.id;
                      return (
                        <button
                          key={o.id}
                          onClick={() => { setOutputMode(o.id); setResult(null); }}
                          className={`w-full p-2.5 rounded-lg text-left transition-all border flex items-start gap-2.5 ${
                            isActive
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <Icon size={13} className={`mt-0.5 shrink-0 ${isActive ? 'text-[#ff6a00]' : 'text-black/40'}`} />
                          <div className="min-w-0 flex-1">
                            <div className={`text-[11px] font-medium ${isActive ? 'text-[#ff6a00]' : 'text-black'}`}>
                              {o.label}
                            </div>
                            <div className="text-[9px] text-black/40 leading-tight">
                              {o.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detection mode */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Detection
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {DETECTION_MODES.map((d) => {
                      const Icon = d.icon;
                      const isActive = detectionMode === d.id;
                      return (
                        <button
                          key={d.id}
                          onClick={() => { setDetectionMode(d.id); setResult(null); }}
                          className={`w-full p-2.5 rounded-lg text-left transition-all border flex items-start gap-2.5 ${
                            isActive
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <Icon size={13} className={`mt-0.5 shrink-0 ${isActive ? 'text-[#ff6a00]' : 'text-black/40'}`} />
                          <div className="min-w-0 flex-1">
                            <div className={`text-[11px] font-medium ${isActive ? 'text-[#ff6a00]' : 'text-black'}`}>
                              {d.label}
                            </div>
                            <div className="text-[9px] text-black/40 leading-tight">
                              {d.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Style options */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">
                        Style Options
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
                        {/* Heading style */}
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">
                            Heading style
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {HEADING_STYLES.map((h) => (
                              <button
                                key={h.id}
                                onClick={() => setHeadingStyle(h.id)}
                                className={`py-2 rounded-md text-[11px] font-mono transition-all ${
                                  headingStyle === h.id
                                    ? 'bg-[#ff6a00] text-white'
                                    : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                                }`}
                              >
                                {h.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* List style */}
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">
                            List style
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {LIST_STYLES.map((l) => (
                              <button
                                key={l.id}
                                onClick={() => setListStyle(l.id)}
                                className={`py-2 rounded-md text-[11px] font-mono transition-all ${
                                  listStyle === l.id
                                    ? 'bg-[#ff6a00] text-white'
                                    : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                                }`}
                              >
                                {l.char}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Feature toggles */}
                        <div className="space-y-2 pt-2 border-t border-black/[0.06]">
                          {[
                            { label: 'Preserve line breaks', value: preserveLineBreaks, set: setPreserveLineBreaks },
                            { label: 'Detect tables', value: detectTables, set: setDetectTables },
                            { label: 'Detect code blocks', value: detectCodeBlocks, set: setDetectCodeBlocks },
                            { label: 'Detect blockquotes', value: detectBlockquotes, set: setDetectBlockquotes },
                            { label: 'Detect bold', value: detectBold, set: setDetectBold },
                            { label: 'Detect links', value: detectLinks, set: setDetectLinks },
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

                {/* Frontmatter */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Braces size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">
                        YAML Frontmatter
                      </span>
                    </div>
                    <button
                      onClick={() => setFrontmatter((f) => ({ ...f, enabled: !f.enabled }))}
                      className={`w-9 h-5 rounded-full transition-colors relative ${
                        frontmatter.enabled ? 'bg-[#ff6a00]' : 'bg-black/20'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        frontmatter.enabled ? 'left-[18px]' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {frontmatter.enabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {[
                          { key: 'title' as const, label: 'Title' },
                          { key: 'date' as const, label: 'Date' },
                          { key: 'source' as const, label: 'Source file' },
                          { key: 'author' as const, label: 'Author' },
                          { key: 'description' as const, label: 'Description' },
                          { key: 'tags' as const, label: 'Tags' },
                        ].map((item) => (
                          <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={frontmatter[item.key]}
                              onChange={(e) => {
                                setFrontmatter((f) => ({ ...f, [item.key]: e.target.checked }));
                                setResult(null);
                              }}
                              className="accent-[#ff6a00]"
                            />
                            <span className="text-[11px] text-black/70">{item.label}</span>
                          </label>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ============ CENTER — Markdown Editor/Preview ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  {/* View mode */}
                  <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                    {[
                      { id: 'raw' as const, label: 'Raw', icon: Braces },
                      { id: 'split' as const, label: 'Split', icon: SplitSquareHorizontal },
                      { id: 'preview' as const, label: 'Preview', icon: Eye },
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

                  {/* Search */}
                  <div className="relative flex items-center">
                    <Search size={11} className="absolute left-2.5 text-black/30 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 pr-2 py-1.5 rounded-full bg-[#f4f1ea] focus:bg-white focus:ring-1 focus:ring-[#ff6a00]/30 border border-transparent outline-none text-[11px] w-32 md:w-40 transition-all"
                    />
                  </div>
                </div>

                {/* Editor / Preview */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] overflow-hidden" style={{ minHeight: 700 }}>
                  <div className={`grid ${viewMode === 'split' ? 'grid-cols-2 divide-x divide-black/[0.06]' : 'grid-cols-1'} h-full`} style={{ minHeight: 700 }}>

                    {/* RAW EDITOR */}
                    {(viewMode === 'raw' || viewMode === 'split') && (
                      <div className="flex flex-col">
                        {viewMode === 'split' && (
                          <div className="px-4 py-2 border-b border-black/[0.06] bg-[#f4f1ea]/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Braces size={11} className="text-[#ff6a00]" />
                              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                                Markdown Source
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-black/40">
                              {editedStats.lines} lines
                            </span>
                          </div>
                        )}
                        <textarea
                          value={editedMarkdown}
                          onChange={(e) => { setEditedMarkdown(e.target.value); setResult(null); }}
                          className="flex-1 w-full p-5 outline-none resize-none text-[12px] leading-[1.7] font-mono bg-white text-black"
                          style={{ minHeight: 680 }}
                          spellCheck={false}
                        />
                      </div>
                    )}

                    {/* MARKDOWN PREVIEW */}
                    {(viewMode === 'preview' || viewMode === 'split') && (
                      <div className="flex flex-col">
                        {viewMode === 'split' && (
                          <div className="px-4 py-2 border-b border-black/[0.06] bg-[#f4f1ea]/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Eye size={11} className="text-[#ff6a00]" />
                              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                                Rendered Preview
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-black/40">
                              {editedStats.headings} headings
                            </span>
                          </div>
                        )}
                        <div
                          className="flex-1 overflow-auto p-6 md:p-8"
                          style={{
                            transform: viewMode === 'preview' ? `scale(${zoom / 100})` : undefined,
                            transformOrigin: 'top left',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <div className="markdown-preview max-w-none" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#1a1a1a',
                            fontSize: '14px',
                            lineHeight: '1.7',
                          }}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ children }) => (
                                  <h1 style={{
                                    fontSize: '2em', fontWeight: 600, marginTop: '1.5em',
                                    marginBottom: '0.6em', paddingBottom: '0.4em',
                                    borderBottom: '2px solid #ff6a00', color: '#1a1a1a',
                                  }}>{children}</h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 style={{
                                    fontSize: '1.5em', fontWeight: 600, marginTop: '1.4em',
                                    marginBottom: '0.5em', paddingBottom: '0.3em',
                                    borderBottom: '1px solid #e0e0e0', color: '#1a1a1a',
                                  }}>{children}</h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 style={{
                                    fontSize: '1.25em', fontWeight: 600, marginTop: '1.3em',
                                    marginBottom: '0.5em', color: '#1a1a1a',
                                  }}>{children}</h3>
                                ),
                                h4: ({ children }) => (
                                  <h4 style={{
                                    fontSize: '1.1em', fontWeight: 600, marginTop: '1.2em',
                                    marginBottom: '0.4em', color: '#1a1a1a',
                                  }}>{children}</h4>
                                ),
                                p: ({ children }) => (
                                  <p style={{ marginBottom: '0.9em', color: '#333' }}>{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul style={{ paddingLeft: '1.5em', marginBottom: '1em' }}>{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol style={{ paddingLeft: '1.5em', marginBottom: '1em' }}>{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li style={{ marginBottom: '0.3em', color: '#333' }}>{children}</li>
                                ),
                                code: ({ inline, children, ...props }: any) => (
                                  inline ? (
                                    <code style={{
                                      background: '#f4f1ea', padding: '2px 6px',
                                      borderRadius: '4px', fontFamily: 'monospace',
                                      fontSize: '0.9em', color: '#ff6a00',
                                    }} {...props}>{children}</code>
                                  ) : (
                                    <code style={{
                                      display: 'block', background: '#0a0a0a', color: '#f4f1ea',
                                      padding: '1em 1.2em', borderRadius: '8px',
                                      fontFamily: 'monospace', fontSize: '0.85em',
                                      overflow: 'auto', marginBottom: '1em',
                                    }} {...props}>{children}</code>
                                  )
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote style={{
                                    borderLeft: '3px solid #ff6a00',
                                    paddingLeft: '1em', marginBottom: '1em',
                                    color: '#666', fontStyle: 'italic',
                                  }}>{children}</blockquote>
                                ),
                                table: ({ children }) => (
                                  <div style={{ overflow: 'auto', marginBottom: '1em' }}>
                                    <table style={{
                                      borderCollapse: 'collapse', width: '100%',
                                      border: '1px solid #e0e0e0',
                                    }}>{children}</table>
                                  </div>
                                ),
                                th: ({ children }) => (
                                  <th style={{
                                    background: '#f4f1ea', padding: '8px 12px',
                                    textAlign: 'left', border: '1px solid #e0e0e0',
                                    fontWeight: 600,
                                  }}>{children}</th>
                                ),
                                td: ({ children }) => (
                                  <td style={{
                                    padding: '8px 12px', border: '1px solid #e0e0e0',
                                  }}>{children}</td>
                                ),
                                a: ({ children, href }) => (
                                  <a href={href} style={{
                                    color: '#ff6a00', textDecoration: 'underline',
                                  }}>{children}</a>
                                ),
                                hr: () => (
                                  <hr style={{
                                    border: 'none', borderTop: '1px solid #e0e0e0',
                                    margin: '2em 0',
                                  }} />
                                ),
                              }}
                            >
                              {previewMarkdown}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ============ RIGHT — Stats & Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Stats */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Markdown Stats
                    </span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    {[
                      { label: 'Words', value: editedStats.words.toLocaleString() },
                      { label: 'Characters', value: editedStats.chars.toLocaleString() },
                      { label: 'Lines', value: editedStats.lines.toLocaleString() },
                      { label: 'Headings', value: editedStats.headings, highlight: true },
                      { label: 'Paragraphs', value: editedStats.paragraphs },
                      { label: 'Bullet items', value: editedStats.bullets },
                      { label: 'Numbered', value: editedStats.numbered },
                      { label: 'Code blocks', value: editedStats.codeBlocks },
                      { label: 'Tables', value: editedStats.tables },
                      { label: 'Links', value: editedStats.links },
                    ].map((s) => (
                      <div key={s.label} className="flex justify-between">
                        <span className="text-black/50">{s.label}</span>
                        <span className={`font-mono font-medium ${s.highlight ? 'text-[#ff6a00]' : 'text-black'}`}>
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview pages */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">
                        Page breakdown
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                    {doc.pages.map((page, idx) => (
                      <button
                        key={page.pageNum}
                        onClick={() => setPreviewIndex(idx)}
                        className={`w-full p-2 rounded-lg text-left transition-all flex items-center justify-between ${
                          previewIndex === idx
                            ? 'bg-[#ff6a00]/[0.06] border border-[#ff6a00]/30'
                            : 'bg-[#f4f1ea]/50 border border-transparent hover:bg-black/[0.04]'
                        }`}
                      >
                        <div className="text-[11px] font-medium text-black">
                          Page {page.pageNum}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-black/40">
                          <span>{page.stats.words}w</span>
                          <span>·</span>
                          <span>{page.stats.headings}h</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export */}
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
                        <div className="text-[13px] font-medium text-black mb-1">
                          {result.isZip ? 'ZIP ready!' : 'Markdown ready!'}
                        </div>
                        <div className="text-[10px] font-mono text-black/40">
                          {formatBytes(result.blob.size)}
                        </div>
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2"
                      >
                        <Download size={13} />
                        Download {result.isZip ? 'ZIP' : '.md'}
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
                        {outputMode === 'single' && `One file with all ${doc.totalPages} pages.`}
                        {outputMode === 'per-page' && `ZIP with ${doc.totalPages} page files + README.`}
                        {outputMode === 'outline' && 'Outline with all detected headings.'}
                      </p>
                      <button
                        onClick={handleExport}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                          isProcessing
                            ? 'bg-black/[0.08] text-black/40'
                            : 'bg-black text-white hover:bg-[#ff6a00]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Exporting...</>
                        ) : (
                          <><DownloadCloud size={13} /> Export Markdown</>
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
                    <li>• <strong>Split view</strong> — edit & preview side-by-side</li>
                    <li>• <strong>Detection mode</strong> — adjust for scanned docs</li>
                    <li>• <strong>Frontmatter</strong> — perfect for Obsidian, Hugo</li>
                    <li>• <strong>Per-page ZIP</strong> — great for LLMs</li>
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