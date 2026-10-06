"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, Droplet, Copy, Check,
  Edit3, Settings2, Layers, ChevronLeft, ChevronRight, Save,
  ZoomIn, ZoomOut, RefreshCw, Info, Trash2, RotateCw, Type,
  Image as ImageIcon, Eraser, Wand2, Palette, Grid3x3, Maximize2,
  Lock, Unlock, Move, Plus, Minus, AlertTriangle, ScanLine,
  FileSearch, EyeOff, ShieldAlert, Undo2, Redo2, Grid, Anchor,
  AlignLeft, AlignCenter, AlignRight, Play, Pause, type LucideIcon,
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import {
  createBlobFromBytes,
  getPDFInfo, formatBytes, downloadBlob, readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

type Mode = 'add' | 'remove';
type WatermarkType = 'text' | 'image' | 'tile';
type WatermarkPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
type RemovalIntensity = 'light' | 'medium' | 'aggressive' | 'deep';

interface AddOptions {
  type: WatermarkType;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
  customX: number;      // percentage
  customY: number;
  imageDataUrl?: string;
  imageScale: number;
  tileSpacing: number;
  tileAngle: number;
  fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
  bold: boolean;
  italic: boolean;
  applyToAll: boolean;
  pageRange: { from: number; to: number };
}

interface RemoveOptions {
  intensity: RemovalIntensity;
  removeText: boolean;
  removeImages: boolean;
  removeAnnotations: boolean;
  removeMetadata: boolean;
  removeJS: boolean;
  removeEmbeddedFiles: boolean;
  cleanXMP: boolean;
}

interface FilePreview {
  name: string;
  size: number;
  pageCount: number;
  preview: string;
  title: string;
}

// ============================================
// CONSTANTS
// ============================================

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#ff6a00',
];

const POSITIONS: { id: WatermarkPosition; label: string; icon: LucideIcon }[] = [
  { id: 'center', label: 'Center', icon: Anchor },
  { id: 'top-left', label: 'Top Left', icon: AlignLeft },
  { id: 'top-right', label: 'Top Right', icon: AlignRight },
  { id: 'bottom-left', label: 'Bottom Left', icon: AlignLeft },
  { id: 'bottom-right', label: 'Bottom Right', icon: AlignRight },
  { id: 'custom', label: 'Custom', icon: Move },
];

const FONTS: { id: 'Helvetica' | 'TimesRoman' | 'Courier'; label: string; css: string }[] = [
  { id: 'Helvetica', label: 'Sans', css: 'Helvetica, Arial, sans-serif' },
  { id: 'TimesRoman', label: 'Serif', css: '"Times New Roman", Times, serif' },
  { id: 'Courier', label: 'Mono', css: '"Courier New", Courier, monospace' },
];

const INTENSITIES: { id: RemovalIntensity; label: string; desc: string; color: string }[] = [
  { id: 'light', label: 'Light', desc: 'Metadata only', color: '#10b981' },
  { id: 'medium', label: 'Medium', desc: 'Common watermarks', color: '#3b82f6' },
  { id: 'aggressive', label: 'Aggressive', desc: 'Deep clean + annotations', color: '#f59e0b' },
  { id: 'deep', label: 'Deep', desc: 'Rebuild from scratch', color: '#ef4444' },
];

// ============================================
// COMPONENT
// ============================================

export default function WatermarkPage() {
  const [mode, setMode] = useState<Mode>('add');

  // File
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FilePreview | null>(null);

  // Add options
  const [addOpts, setAddOpts] = useState<AddOptions>({
    type: 'text',
    text: 'CONFIDENTIAL',
    fontSize: 60,
    color: '#ff6a00',
    opacity: 0.25,
    rotation: 45,
    position: 'center',
    customX: 50,
    customY: 50,
    imageScale: 20,
    tileSpacing: 150,
    tileAngle: 30,
    fontFamily: 'Helvetica',
    bold: true,
    italic: false,
    applyToAll: true,
    pageRange: { from: 1, to: 1 },
  });

  // Remove options
  const [removeOpts, setRemoveOpts] = useState<RemoveOptions>({
    intensity: 'medium',
    removeText: true,
    removeImages: false,
    removeAnnotations: true,
    removeMetadata: true,
    removeJS: true,
    removeEmbeddedFiles: false,
    cleanXMP: true,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string; stats?: any } | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [previewPage, setPreviewPage] = useState(1);
  const [showTips, setShowTips] = useState(true);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // LOAD FILE
  // ============================================

  const loadPDF = useCallback(async (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFile(f);
    setFileInfo(null);
    setResult(null);
    setPreviewPage(1);

    try {
      const info = await getPDFInfo(f);
      const bytes = await readFileAsArrayBuffer(f);
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.2 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      // Get metadata
      let title = '';
      try {
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        title = doc.getTitle() || '';
      } catch {}

      setFileInfo({
        name: f.name,
        size: f.size,
        pageCount: info.pageCount,
        preview: canvas.toDataURL('image/jpeg', 0.85),
        title,
      });

      // Set page range max
      setAddOpts((prev) => ({
        ...prev,
        pageRange: { from: 1, to: info.pageCount },
      }));
    } catch (e: unknown) {
      console.error(e);
      setError('Failed to read PDF.');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    setFileInfo(null);
    setResult(null);
    setError(null);
    setPreviewPage(1);
  };

  const resetOpts = () => {
    if (mode === 'add') {
      setAddOpts({
        type: 'text',
        text: 'CONFIDENTIAL',
        fontSize: 60,
        color: '#ff6a00',
        opacity: 0.25,
        rotation: 45,
        position: 'center',
        customX: 50,
        customY: 50,
        imageScale: 20,
        tileSpacing: 150,
        tileAngle: 30,
        fontFamily: 'Helvetica',
        bold: true,
        italic: false,
        applyToAll: true,
        pageRange: { from: 1, to: fileInfo?.pageCount || 1 },
      });
    } else {
      setRemoveOpts({
        intensity: 'medium',
        removeText: true,
        removeImages: false,
        removeAnnotations: true,
        removeMetadata: true,
        removeJS: true,
        removeEmbeddedFiles: false,
        cleanXMP: true,
      });
    }
    setResult(null);
  };

  // ============================================
  // IMAGE UPLOAD (for image watermark)
  // ============================================

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAddOpts((prev) => ({ ...prev, imageDataUrl: reader.result as string }));
      setResult(null);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  // ============================================
  // PROCESS — ADD WATERMARK
  // ============================================

  const processAdd = async (): Promise<{ blob: Blob; filename: string; stats: any }> => {
    if (!file) throw new Error('No file');
    if (addOpts.type === 'text' && !addOpts.text.trim()) {
      throw new Error('Watermark text is empty.');
    }
    if (addOpts.type === 'image' && !addOpts.imageDataUrl) {
      throw new Error('Please upload an image.');
    }

    const bytes = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = doc.getPages();

    // Determine pages to apply
    let pagesToApply: number[];
    if (addOpts.applyToAll) {
      pagesToApply = pages.map((_, i) => i);
    } else {
      const from = Math.max(1, addOpts.pageRange.from);
      const to = Math.min(pages.length, addOpts.pageRange.to);
      pagesToApply = [];
      for (let i = from; i <= to; i++) pagesToApply.push(i - 1);
    }

    // Color
    const hexClean = addOpts.color.replace('#', '');
    const colorRgb = {
      r: parseInt(hexClean.slice(0, 2), 16) / 255,
      g: parseInt(hexClean.slice(2, 4), 16) / 255,
      b: parseInt(hexClean.slice(4, 6), 16) / 255,
    };

    // Embed font (for text)
    const fonts = {
      Helvetica: {
        regular: await doc.embedFont(StandardFonts.Helvetica),
        bold: await doc.embedFont(StandardFonts.HelveticaBold),
        italic: await doc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
      },
      TimesRoman: {
        regular: await doc.embedFont(StandardFonts.TimesRoman),
        bold: await doc.embedFont(StandardFonts.TimesRomanBold),
        italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
        boldItalic: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
      },
      Courier: {
        regular: await doc.embedFont(StandardFonts.Courier),
        bold: await doc.embedFont(StandardFonts.CourierBold),
        italic: await doc.embedFont(StandardFonts.CourierOblique),
        boldItalic: await doc.embedFont(StandardFonts.CourierBoldOblique),
      },
    };

    const fontSet = fonts[addOpts.fontFamily];
    const font = addOpts.bold && addOpts.italic ? fontSet.boldItalic
      : addOpts.bold ? fontSet.bold
      : addOpts.italic ? fontSet.italic
      : fontSet.regular;

    // Embed image if needed
    let embeddedImage: any = null;
    if (addOpts.type === 'image' && addOpts.imageDataUrl) {
      const isPng = addOpts.imageDataUrl.startsWith('data:image/png');
      const base64 = addOpts.imageDataUrl.split(',')[1];
      const binary = atob(base64);
      const imgBytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) imgBytes[j] = binary.charCodeAt(j);
      embeddedImage = isPng ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);
    }

    // Apply watermark
    let appliedCount = 0;

    for (const pageIdx of pagesToApply) {
      const page = pages[pageIdx];
      const { width, height } = page.getSize();

      if (addOpts.type === 'text') {
        const fontSize = addOpts.fontSize;
        const textWidth = font.widthOfTextAtSize(addOpts.text, fontSize);

        let x = width / 2 - textWidth / 2;
        let y = height / 2;

        // Position offset
        switch (addOpts.position) {
          case 'center':
            x = width / 2 - textWidth / 2;
            y = height / 2;
            break;
          case 'top-left':
            x = 30;
            y = height - 40;
            break;
          case 'top-right':
            x = width - textWidth - 30;
            y = height - 40;
            break;
          case 'bottom-left':
            x = 30;
            y = 40;
            break;
          case 'bottom-right':
            x = width - textWidth - 30;
            y = 40;
            break;
          case 'custom':
            x = (addOpts.customX / 100) * width - textWidth / 2;
            y = height - (addOpts.customY / 100) * height;
            break;
        }

        page.drawText(addOpts.text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          opacity: addOpts.opacity,
          rotate: degrees(addOpts.rotation),
        });
      } else if (addOpts.type === 'image' && embeddedImage) {
        const imgScale = addOpts.imageScale / 100;
        const imgW = width * imgScale;
        const imgH = (embeddedImage.height / embeddedImage.width) * imgW;

        let x = (width - imgW) / 2;
        let y = (height - imgH) / 2;

        switch (addOpts.position) {
          case 'top-left': x = 30; y = height - imgH - 30; break;
          case 'top-right': x = width - imgW - 30; y = height - imgH - 30; break;
          case 'bottom-left': x = 30; y = 30; break;
          case 'bottom-right': x = width - imgW - 30; y = 30; break;
          case 'custom': x = (addOpts.customX / 100) * width - imgW / 2; y = height - (addOpts.customY / 100) * height - imgH / 2; break;
        }

        page.drawImage(embeddedImage, {
          x,
          y,
          width: imgW,
          height: imgH,
          opacity: addOpts.opacity,
          rotate: degrees(addOpts.rotation),
        });
      } else if (addOpts.type === 'tile') {
        // Tile mode — repeat text or image in a diagonal grid
        const spacing = addOpts.tileSpacing;
        const angle = addOpts.tileAngle;

        if (addOpts.type === 'tile' && addOpts.text) {
          const fontSize = addOpts.fontSize;
          const textWidth = font.widthOfTextAtSize(addOpts.text, fontSize);

          const cols = Math.ceil(width / spacing) + 2;
          const rows = Math.ceil(height / spacing) + 2;

          for (let i = -1; i < cols; i++) {
            for (let j = -1; j < rows; j++) {
              const x = i * spacing;
              const y = j * spacing;
              page.drawText(addOpts.text, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
                opacity: addOpts.opacity,
                rotate: degrees(angle),
              });
            }
          }
        }
      }

      appliedCount++;
    }

    const savedBytes = await doc.save();
    return {
      blob: createBlobFromBytes(savedBytes, 'application/pdf'),
      filename: `${file.name.replace(/\.pdf$/i, '')}-watermarked.pdf`,
      stats: {
        pages: appliedCount,
        total: pages.length,
        type: addOpts.type,
      },
    };
  };

  // ============================================
  // PROCESS — REMOVE WATERMARK
  // ============================================

  const processRemove = async (): Promise<{ blob: Blob; filename: string; stats: any }> => {
    if (!file) throw new Error('No file');

    const bytes = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    let removedItems = {
      annotations: 0,
      metadata: 0,
      jsActions: 0,
      embeddedFiles: 0,
      images: 0,
      textItems: 0,
    };

    const intensity = removeOpts.intensity;

    // 1. Remove Metadata
    if (removeOpts.removeMetadata || intensity !== 'light') {
      try {
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
        doc.setProducer('idcardtools');
        doc.setCreator('idcardtools');
        removedItems.metadata = 5;
      } catch {}
    }

    // 2. Remove via pdf-lib catalog manipulation
    try {
      // Access the raw catalog
      const catalog = (doc as any).catalog;
      const dict = catalog?.get?.(PDFDocument as any);

      // Remove JavaScript actions (OpenAction, AA)
      if (removeOpts.removeJS || intensity === 'aggressive' || intensity === 'deep') {
        try {
          catalog.delete(PDFDocument as any, 'OpenAction');
          catalog.delete(PDFDocument as any, 'AA');
          removedItems.jsActions += 1;
        } catch {}
      }

      // Remove embedded files
      if (removeOpts.removeEmbeddedFiles || intensity === 'aggressive' || intensity === 'deep') {
        try {
          catalog.delete(PDFDocument as any, 'Names');
          catalog.delete(PDFDocument as any, 'EmbeddedFiles');
          removedItems.embeddedFiles += 1;
        } catch {}
      }
    } catch (e) {
      console.warn('Catalog cleanup failed:', e);
    }

    // 3. Remove per-page annotations and widget references
    if (removeOpts.removeAnnotations || intensity !== 'light') {
      const pages = doc.getPages();
      for (const page of pages) {
        try {
          // Access the page node
          const pageNode = (page as any).node;
          if (pageNode) {
            // Delete Annots (annotations, form fields, widget overlays)
            try {
              pageNode.delete(PDFDocument as any, 'Annots');
              removedItems.annotations += 1;
            } catch {}

            // Remove transition/actions
            try {
              pageNode.delete(PDFDocument as any, 'AA');
            } catch {}

            // Remove thumbnails (often contain previews of watermarks)
            try {
              pageNode.delete(PDFDocument as any, 'Thumb');
            } catch {}

            // Remove comments
            if (intensity === 'aggressive' || intensity === 'deep') {
              try {
                pageNode.delete(PDFDocument as any, 'Contents');
              } catch {}
            }
          }
        } catch {}
      }
    }

    // 4. Strip XMP metadata from document
    if (removeOpts.cleanXMP || intensity === 'aggressive' || intensity === 'deep') {
      try {
        const context = (doc as any).context;
        if (context) {
          // Search and remove XMP metadata stream
          const indirectObjects = context.enumerateIndirectObjects();
          for (const [ref, obj] of indirectObjects) {
            if (obj && obj.constructor && obj.constructor.name === 'PDFRawStream') {
              const dict = obj.dict;
              if (dict && dict.get) {
                const type = dict.get(context.obj('Type'));
                const subtype = dict.get(context.obj('Subtype'));
                if (
                  (type && type.toString() === '/Metadata') ||
                  (subtype && subtype.toString() === '/XML')
                ) {
                  try {
                    context.delete(ref);
                    removedItems.metadata += 1;
                  } catch {}
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('XMP cleanup failed:', e);
      }
    }

    // 5. Deep clean — rebuild document with all pages copied fresh
    let finalDoc = doc;

    if (intensity === 'deep') {
      // Create fresh document
      const freshDoc = await PDFDocument.create();
      const pages = doc.getPages();

      // Copy each page (this strips most inline resources that reference watermark)
      const copiedPages = await freshDoc.copyPages(doc, pages.map((_, i) => i));
      copiedPages.forEach((p) => freshDoc.addPage(p));

      // Reset metadata
      freshDoc.setTitle('');
      freshDoc.setAuthor('');
      freshDoc.setSubject('');
      freshDoc.setKeywords([]);
      freshDoc.setProducer('idcardtools');
      freshDoc.setCreator('idcardtools');

      finalDoc = freshDoc;
    }

    const savedBytes = await finalDoc.save({ useObjectStreams: intensity === 'deep' });

    return {
      blob: createBlobFromBytes(savedBytes, 'application/pdf'),
      filename: `${file.name.replace(/\.pdf$/i, '')}-clean.pdf`,
      stats: {
        intensity,
        removedItems,
      },
    };
  };

  // ============================================
  // HANDLE SUBMIT
  // ============================================

  const handleProcess = async () => {
    if (!file || !fileInfo) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const res = mode === 'add' ? await processAdd() : await processRemove();
      setResult(res);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Processing failed.' : 'Processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ============================================
  // RENDER PREVIEW (with live watermark)
  // ============================================

  const previewWatermark = useMemo(() => {
    if (!fileInfo || mode !== 'add') return null;

    const color = addOpts.color;
    const opacity = addOpts.opacity;

    if (addOpts.type === 'text') {
      const positions: Record<string, { top: string; left: string; transform: string }> = {
        'center': { top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${addOpts.rotation}deg)` },
        'top-left': { top: '8%', left: '8%', transform: `rotate(${addOpts.rotation}deg)` },
        'top-right': { top: '8%', left: 'auto', transform: `rotate(${addOpts.rotation}deg)` },
        'bottom-left': { top: 'auto', left: '8%', transform: `rotate(${addOpts.rotation}deg)` },
        'bottom-right': { top: 'auto', left: 'auto', transform: `rotate(${addOpts.rotation}deg)` },
        'custom': { top: `${addOpts.customY}%`, left: `${addOpts.customX}%`, transform: `translate(-50%, -50%) rotate(${addOpts.rotation}deg)` },
      };

      const pos = positions[addOpts.position];
      return {
        isImage: false,
        style: {
          position: 'absolute' as const,
          color,
          opacity,
          fontSize: `${addOpts.fontSize * 0.8}px`,
          fontFamily: FONTS.find((f) => f.id === addOpts.fontFamily)?.css,
          fontWeight: addOpts.bold ? 'bold' : 'normal',
          fontStyle: addOpts.italic ? 'italic' : 'normal',
          whiteSpace: 'nowrap' as const,
          pointerEvents: 'none' as const,
          ...pos,
        } as React.CSSProperties,
      };
    }

    if (addOpts.type === 'image' && addOpts.imageDataUrl) {
      return {
        isImage: true,
        src: addOpts.imageDataUrl,
        style: {
          position: 'absolute' as const,
          width: `${addOpts.imageScale}%`,
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotate(${addOpts.rotation}deg)`,
          opacity,
          pointerEvents: 'none' as const,
        } as React.CSSProperties,
      };
    }

    return null;
  }, [fileInfo, mode, addOpts]);

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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
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
              Watermark — Add / Remove
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Text · Image · Tile</span>
            <span>·</span>
            <span>4 Removal Modes</span>
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
                Chapter 04 — Edit
              </div>
              <h1 className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Watermark <span className="italic text-[#ff6a00]">PDF</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Add text, image, or tiled watermarks with full control — or remove
                existing watermarks, annotations, and metadata.
              </p>
            </div>
          </motion.div>
        )}

        {/* Mode Tabs */}
        {!file && !isLoading && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-white border border-black/[0.06]">
              <button
                onClick={() => setMode('add')}
                className={`py-4 rounded-xl flex items-center justify-center gap-3 transition-all ${
                  mode === 'add'
                    ? 'bg-[#ff6a00] text-white shadow-[0_10px_30px_-10px_rgba(255,106,0,0.5)]'
                    : 'text-black/60 hover:bg-black/[0.04]'
                }`}
              >
                <Plus size={18} />
                <div className="text-left">
                  <div className="text-[14px] font-semibold">Add Watermark</div>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.1em] ${mode === 'add' ? 'text-white/80' : 'text-black/40'}`}>
                    Text · Image · Tile
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('remove')}
                className={`py-4 rounded-xl flex items-center justify-center gap-3 transition-all ${
                  mode === 'remove'
                    ? 'bg-[#ff6a00] text-white shadow-[0_10px_30px_-10px_rgba(255,106,0,0.5)]'
                    : 'text-black/60 hover:bg-black/[0.04]'
                }`}
              >
                <Eraser size={18} />
                <div className="text-left">
                  <div className="text-[14px] font-semibold">Remove Watermark</div>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.1em] ${mode === 'remove' ? 'text-white/80' : 'text-black/40'}`}>
                    Clean · Strip · Deep
                  </div>
                </div>
              </button>
            </div>
          </div>
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
                  {mode === 'add' ? (
                    <Droplet size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                  ) : (
                    <Eraser size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                  )}
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging
                    ? 'Drop PDF here'
                    : mode === 'add'
                    ? 'Select a PDF to watermark'
                    : 'Select a PDF to clean'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  {mode === 'add'
                    ? 'Add text, image, or tiled watermarks to your PDF pages.'
                    : 'Remove watermarks, annotations, and metadata from your PDF.'}
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
              {(mode === 'add'
                ? [
                    { icon: Type, label: 'Text watermark' },
                    { icon: ImageIcon, label: 'Image watermark' },
                    { icon: Grid3x3, label: 'Tiled pattern' },
                    { icon: Eye, label: 'Live preview' },
                  ]
                : [
                    { icon: Eraser, label: 'Strip annotations' },
                    { icon: FileSearch, label: 'Clean metadata' },
                    { icon: EyeOff, label: 'Remove XMP data' },
                    { icon: RefreshCw, label: 'Deep rebuild' },
                  ]
              ).map((f) => {
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
              <Droplet size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Reading PDF...
            </span>
          </div>
        )}

        {/* Workspace */}
        {file && fileInfo && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black truncate max-w-[200px]">
                    {fileInfo.name}
                  </span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{fileInfo.pageCount}</span>
                  <span className="text-[12px] text-black/50">pages</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] font-semibold ${
                    mode === 'add' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                  }`}>
                    {mode === 'add' ? 'ADD MODE' : 'REMOVE MODE'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetOpts}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08] transition-colors"
                  title="Reset options"
                >
                  <RefreshCw size={12} />
                  Reset
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                  Change file
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* ============ LEFT — Options ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* ADD MODE OPTIONS */}
                {mode === 'add' && (
                  <>
                    {/* Watermark type */}
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Droplet size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">Type</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'text' as WatermarkType, label: 'Text', icon: Type },
                          { id: 'image' as WatermarkType, label: 'Image', icon: ImageIcon },
                          { id: 'tile' as WatermarkType, label: 'Tile', icon: Grid3x3 },
                        ].map((t) => {
                          const Icon = t.icon;
                          const isActive = addOpts.type === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => { setAddOpts({ ...addOpts, type: t.id }); setResult(null); }}
                              className={`p-2.5 rounded-lg flex flex-col items-center gap-1.5 transition-all ${
                                isActive
                                  ? 'bg-[#ff6a00] text-white shadow-lg'
                                  : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                              }`}
                            >
                              <Icon size={14} />
                              <span className="text-[10px] font-mono uppercase">{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Text input */}
                    {addOpts.type !== 'image' && (
                      <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Type size={13} className="text-[#ff6a00]" />
                          <span className="text-[10px] font-mono uppercase text-black/40">Text</span>
                        </div>
                        <input
                          type="text"
                          value={addOpts.text}
                          onChange={(e) => { setAddOpts({ ...addOpts, text: e.target.value }); setResult(null); }}
                          placeholder="CONFIDENTIAL"
                          className="w-full bg-[#f4f1ea] rounded-lg px-3 py-2.5 outline-none text-[13px] border border-black/[0.06] focus:border-[#ff6a00] transition-colors mb-3"
                        />

                        {/* Font family */}
                        <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Font</label>
                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                          {FONTS.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => { setAddOpts({ ...addOpts, fontFamily: f.id }); setResult(null); }}
                              className={`py-1.5 rounded-md text-[10px] transition-all ${
                                addOpts.fontFamily === f.id
                                  ? 'bg-[#ff6a00] text-white'
                                  : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                              }`}
                              style={{ fontFamily: f.css }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        {/* Bold / Italic */}
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => { setAddOpts({ ...addOpts, bold: !addOpts.bold }); setResult(null); }}
                            className={`flex-1 py-2 rounded-md font-bold transition-all ${
                              addOpts.bold ? 'bg-[#ff6a00] text-white' : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                            }`}
                          >
                            B
                          </button>
                          <button
                            onClick={() => { setAddOpts({ ...addOpts, italic: !addOpts.italic }); setResult(null); }}
                            className={`flex-1 py-2 rounded-md italic transition-all ${
                              addOpts.italic ? 'bg-[#ff6a00] text-white' : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                            }`}
                          >
                            I
                          </button>
                        </div>

                        {/* Font size */}
                        <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                          <span>Size</span>
                          <span className="text-[#ff6a00]">{addOpts.fontSize}pt</span>
                        </label>
                        <input
                          type="range" min={12} max={200}
                          value={addOpts.fontSize}
                          onChange={(e) => { setAddOpts({ ...addOpts, fontSize: parseInt(e.target.value) }); setResult(null); }}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>
                    )}

                    {/* Image input */}
                    {addOpts.type === 'image' && (
                      <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ImageIcon size={13} className="text-[#ff6a00]" />
                          <span className="text-[10px] font-mono uppercase text-black/40">Image</span>
                        </div>

                        {addOpts.imageDataUrl ? (
                          <div className="space-y-3">
                            <div className="bg-[#f4f1ea] rounded-lg p-3 flex items-center justify-center">
                              <img
                                src={addOpts.imageDataUrl}
                                alt="Watermark"
                                className="max-h-[80px] max-w-full object-contain"
                              />
                            </div>
                            <button
                              onClick={() => imageInputRef.current?.click()}
                              className="w-full py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] font-mono uppercase tracking-[0.15em] hover:bg-black/[0.08]"
                            >
                              Change image
                            </button>
                            <div>
                              <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                                <span>Scale</span>
                                <span className="text-[#ff6a00]">{addOpts.imageScale}%</span>
                              </label>
                              <input
                                type="range" min={5} max={80}
                                value={addOpts.imageScale}
                                onChange={(e) => { setAddOpts({ ...addOpts, imageScale: parseInt(e.target.value) }); setResult(null); }}
                                className="w-full accent-[#ff6a00]"
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full py-6 rounded-lg border-2 border-dashed border-black/[0.12] hover:border-[#ff6a00]/40 flex flex-col items-center gap-2 transition-colors"
                          >
                            <ImageIcon size={20} className="text-black/30" />
                            <span className="text-[11px] text-black/50">Upload image</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Tile options */}
                    {addOpts.type === 'tile' && (
                      <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Grid3x3 size={13} className="text-[#ff6a00]" />
                          <span className="text-[10px] font-mono uppercase text-black/40">Tiling</span>
                        </div>
                        <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                          <span>Spacing</span>
                          <span className="text-[#ff6a00]">{addOpts.tileSpacing}</span>
                        </label>
                        <input
                          type="range" min={50} max={400}
                          value={addOpts.tileSpacing}
                          onChange={(e) => { setAddOpts({ ...addOpts, tileSpacing: parseInt(e.target.value) }); setResult(null); }}
                          className="w-full accent-[#ff6a00] mb-3"
                        />
                        <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                          <span>Angle</span>
                          <span className="text-[#ff6a00]">{addOpts.tileAngle}°</span>
                        </label>
                        <input
                          type="range" min={-90} max={90}
                          value={addOpts.tileAngle}
                          onChange={(e) => { setAddOpts({ ...addOpts, tileAngle: parseInt(e.target.value) }); setResult(null); }}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>
                    )}

                    {/* Color + Opacity */}
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Palette size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">Appearance</span>
                      </div>

                      <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Color</label>
                      <div className="grid grid-cols-5 gap-1.5 mb-3">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => { setAddOpts({ ...addOpts, color: c }); setResult(null); }}
                            className={`aspect-square rounded-md border-2 transition-all ${
                              addOpts.color === c ? 'border-[#ff6a00] scale-110' : 'border-black/[0.08]'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>

                      <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                        <span>Opacity</span>
                        <span className="text-[#ff6a00]">{Math.round(addOpts.opacity * 100)}%</span>
                      </label>
                      <input
                        type="range" min={0.05} max={1} step={0.05}
                        value={addOpts.opacity}
                        onChange={(e) => { setAddOpts({ ...addOpts, opacity: parseFloat(e.target.value) }); setResult(null); }}
                        className="w-full accent-[#ff6a00] mb-3"
                      />

                      <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                        <span>Rotation</span>
                        <span className="text-[#ff6a00]">{addOpts.rotation}°</span>
                      </label>
                      <input
                        type="range" min={-90} max={90}
                        value={addOpts.rotation}
                        onChange={(e) => { setAddOpts({ ...addOpts, rotation: parseInt(e.target.value) }); setResult(null); }}
                        className="w-full accent-[#ff6a00]"
                      />
                    </div>

                    {/* Position */}
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Move size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">Position</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {POSITIONS.slice(0, 5).map((p) => {
                          const Icon = p.icon;
                          const isActive = addOpts.position === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => { setAddOpts({ ...addOpts, position: p.id }); setResult(null); }}
                              className={`p-2 rounded-md flex flex-col items-center gap-1 transition-all ${
                                isActive ? 'bg-[#ff6a00] text-white' : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                              }`}
                              title={p.label}
                            >
                              <Icon size={12} />
                              <span className="text-[7px] font-mono uppercase">{p.label.split('-')[0]}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => { setAddOpts({ ...addOpts, position: 'custom' }); setResult(null); }}
                        className={`w-full py-2 rounded-md text-[10px] font-mono uppercase tracking-[0.15em] mb-3 transition-all ${
                          addOpts.position === 'custom'
                            ? 'bg-[#ff6a00] text-white'
                            : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                        }`}
                      >
                        Custom position
                      </button>

                      {addOpts.position === 'custom' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-2"
                        >
                          <div>
                            <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1">
                              <span>X</span>
                              <span className="text-[#ff6a00]">{addOpts.customX}%</span>
                            </label>
                            <input
                              type="range" min={0} max={100}
                              value={addOpts.customX}
                              onChange={(e) => { setAddOpts({ ...addOpts, customX: parseInt(e.target.value) }); setResult(null); }}
                              className="w-full accent-[#ff6a00]"
                            />
                          </div>
                          <div>
                            <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1">
                              <span>Y</span>
                              <span className="text-[#ff6a00]">{addOpts.customY}%</span>
                            </label>
                            <input
                              type="range" min={0} max={100}
                              value={addOpts.customY}
                              onChange={(e) => { setAddOpts({ ...addOpts, customY: parseInt(e.target.value) }); setResult(null); }}
                              className="w-full accent-[#ff6a00]"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Apply range */}
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase text-black/40">Apply to</span>
                        <button
                          onClick={() => { setAddOpts({ ...addOpts, applyToAll: !addOpts.applyToAll }); setResult(null); }}
                          className={`w-9 h-5 rounded-full transition-colors relative ${
                            addOpts.applyToAll ? 'bg-[#ff6a00]' : 'bg-black/20'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                            addOpts.applyToAll ? 'left-[18px]' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      <AnimatePresence>
                        {!addOpts.applyToAll && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="number" min={1} max={fileInfo.pageCount}
                                value={addOpts.pageRange.from}
                                onChange={(e) => {
                                  const v = Math.max(1, Math.min(fileInfo.pageCount, parseInt(e.target.value) || 1));
                                  setAddOpts({ ...addOpts, pageRange: { from: v, to: Math.max(v, addOpts.pageRange.to) } });
                                  setResult(null);
                                }}
                                className="flex-1 bg-[#f4f1ea] rounded-md px-3 py-1.5 outline-none text-[12px] text-center"
                              />
                              <span className="text-[10px] text-black/40">to</span>
                              <input
                                type="number" min={1} max={fileInfo.pageCount}
                                value={addOpts.pageRange.to}
                                onChange={(e) => {
                                  const v = Math.max(1, Math.min(fileInfo.pageCount, parseInt(e.target.value) || 1));
                                  setAddOpts({ ...addOpts, pageRange: { from: Math.min(v, addOpts.pageRange.from), to: v } });
                                  setResult(null);
                                }}
                                className="flex-1 bg-[#f4f1ea] rounded-md px-3 py-1.5 outline-none text-[12px] text-center"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {/* REMOVE MODE OPTIONS */}
                {mode === 'remove' && (
                  <>
                    {/* Intensity */}
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Eraser size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">Clean Intensity</span>
                      </div>
                      <div className="space-y-1.5">
                        {INTENSITIES.map((i) => (
                          <button
                            key={i.id}
                            onClick={() => { setRemoveOpts({ ...removeOpts, intensity: i.id }); setResult(null); }}
                            className={`w-full p-2.5 rounded-lg text-left transition-all border ${
                              removeOpts.intensity === i.id
                                ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                                : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} />
                              <div className={`text-[11px] font-medium ${removeOpts.intensity === i.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                                {i.label}
                              </div>
                            </div>
                            <div className="text-[9px] text-black/40 mt-0.5 ml-4">{i.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* What to remove */}
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Settings2 size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">What to remove</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { key: 'removeText' as const, label: 'Text overlays', desc: 'Tiled watermark text' },
                          { key: 'removeImages' as const, label: 'Image stamps', desc: 'Image watermarks' },
                          { key: 'removeAnnotations' as const, label: 'Annotations', desc: 'Comments, stamps, markups' },
                          { key: 'removeMetadata' as const, label: 'Metadata', desc: 'Title, author, subject' },
                          { key: 'removeJS' as const, label: 'JavaScript', desc: 'Embedded scripts' },
                          { key: 'removeEmbeddedFiles' as const, label: 'Embedded files', desc: 'Attachments' },
                          { key: 'cleanXMP' as const, label: 'XMP data', desc: 'Extended metadata' },
                        ].map((opt) => (
                          <label key={opt.key} className="flex items-start justify-between cursor-pointer py-1">
                            <div>
                              <div className="text-[11px] text-black/80 font-medium">{opt.label}</div>
                              <div className="text-[9px] text-black/40">{opt.desc}</div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setRemoveOpts({ ...removeOpts, [opt.key]: !removeOpts[opt.key] });
                                setResult(null);
                              }}
                              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
                                removeOpts[opt.key] ? 'bg-emerald-500' : 'bg-black/20'
                              }`}
                            >
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                removeOpts[opt.key] ? 'left-[18px]' : 'left-0.5'
                              }`} />
                            </button>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="rounded-[18px] bg-amber-500/[0.08] border border-amber-500/20 p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[11px] font-medium text-amber-900 mb-1">Note</div>
                          <p className="text-[10px] text-amber-800/80 leading-relaxed">
                            Watermarks embedded as vector paths cannot be removed without
                            re-rendering. Use "Deep" intensity for best results.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ============ CENTER — Preview ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-1 bg-[#f4f1ea] rounded-lg p-1">
                    <button
                      onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                      disabled={previewPage <= 1}
                      className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="px-2 text-[12px] font-mono">{previewPage} / {fileInfo.pageCount}</span>
                    <button
                      onClick={() => setPreviewPage(Math.min(fileInfo.pageCount, previewPage + 1))}
                      disabled={previewPage >= fileInfo.pageCount}
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
                </div>

                {/* Preview */}
                <div className="rounded-[18px] bg-[#ebe7de]/40 border border-black/[0.06] p-6 min-h-[700px] flex items-start justify-center overflow-auto relative">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                    }}
                  />

                  <div
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <div className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] rounded-sm overflow-hidden max-w-[500px]">
                      <img
                        src={fileInfo.preview}
                        alt=""
                        className="block w-full h-auto pointer-events-none select-none"
                        draggable={false}
                      />

                      {/* Live watermark preview (ADD mode only) */}
                      {mode === 'add' && previewWatermark && (
                        <>
                          {previewWatermark.isImage ? (
                            <img
                              src={previewWatermark.src}
                              alt=""
                              style={previewWatermark.style}
                            />
                          ) : (
                            <div style={previewWatermark.style}>
                              {addOpts.text}
                            </div>
                          )}
                        </>
                      )}

                      {/* Remove mode overlay */}
                      {mode === 'remove' && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur text-white text-[10px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5 shadow-lg">
                            <Eraser size={11} />
                            Clean mode
                          </div>
                        </div>
                      )}

                      {/* Add mode badge */}
                      {mode === 'add' && (
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur text-white text-[10px] font-mono uppercase tracking-[0.15em] flex items-center gap-1.5 shadow-lg">
                          <Eye size={11} />
                          Live preview
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info bar */}
                <div className="flex items-center justify-between p-4 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="text-[11px] font-mono uppercase text-black/40">
                    {mode === 'add'
                      ? `${addOpts.applyToAll ? 'All' : `Pages ${addOpts.pageRange.from}-${addOpts.pageRange.to}`}`
                      : `Intensity: ${removeOpts.intensity}`}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-black/40">
                    {mode === 'add' ? `${addOpts.type} watermark` : 'Clean PDF'}
                  </div>
                </div>
              </div>

              {/* ============ RIGHT — Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Summary */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Summary</span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    {mode === 'add' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-black/50">Type</span>
                          <span className="font-mono font-medium text-black capitalize">{addOpts.type}</span>
                        </div>
                        {addOpts.type !== 'image' && (
                          <div className="flex justify-between">
                            <span className="text-black/50">Text</span>
                            <span className="font-mono font-medium text-black truncate max-w-[100px]">
                              {addOpts.text || '—'}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-black/50">Opacity</span>
                          <span className="font-mono font-medium text-black">
                            {Math.round(addOpts.opacity * 100)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/50">Rotation</span>
                          <span className="font-mono font-medium text-black">{addOpts.rotation}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/50">Pages</span>
                          <span className="font-mono font-medium text-black">
                            {addOpts.applyToAll ? fileInfo.pageCount : `${addOpts.pageRange.from}-${addOpts.pageRange.to}`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-black/50">Intensity</span>
                          <span className="font-mono font-medium text-black capitalize">{removeOpts.intensity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/50">Annotations</span>
                          <span className={`font-mono font-medium ${removeOpts.removeAnnotations ? 'text-emerald-500' : 'text-black/40'}`}>
                            {removeOpts.removeAnnotations ? 'Remove' : 'Keep'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/50">Metadata</span>
                          <span className={`font-mono font-medium ${removeOpts.removeMetadata ? 'text-emerald-500' : 'text-black/40'}`}>
                            {removeOpts.removeMetadata ? 'Remove' : 'Keep'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/50">XMP data</span>
                          <span className={`font-mono font-medium ${removeOpts.cleanXMP ? 'text-emerald-500' : 'text-black/40'}`}>
                            {removeOpts.cleanXMP ? 'Remove' : 'Keep'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-black/50">JavaScript</span>
                          <span className={`font-mono font-medium ${removeOpts.removeJS ? 'text-emerald-500' : 'text-black/40'}`}>
                            {removeOpts.removeJS ? 'Remove' : 'Keep'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Save */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Save size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Export</span>
                  </div>

                  {result ? (
                    <div className="space-y-3">
                      <div className="text-center py-3">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
                            mode === 'add' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                          }`}
                        >
                          {mode === 'add' ? (
                            <CheckCircle2 size={24} className="text-emerald-500" />
                          ) : (
                            <Sparkles size={24} className="text-blue-500" />
                          )}
                        </motion.div>
                        <div className="text-[13px] font-medium text-black mb-1">
                          {mode === 'add' ? 'Watermarked!' : 'PDF cleaned!'}
                        </div>
                        <div className="text-[10px] font-mono text-black/40">
                          {formatBytes(result.blob.size)}
                        </div>
                        {result.stats && (
                          <div className="text-[10px] text-black/50 mt-2">
                            {mode === 'add'
                              ? `${result.stats.pages} of ${result.stats.total} pages`
                              : `Intensity: ${result.stats.intensity}`}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2 transition-colors"
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
                        {mode === 'add'
                          ? `Add ${addOpts.type} watermark to ${addOpts.applyToAll ? 'all pages' : `${addOpts.pageRange.from}-${addOpts.pageRange.to}`}.`
                          : `Clean PDF using "${removeOpts.intensity}" intensity.`}
                      </p>
                      <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                          isProcessing
                            ? 'bg-black/[0.08] text-black/40'
                            : mode === 'add'
                            ? 'bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-[0_10px_30px_-10px_rgba(220,38,38,0.5)]'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            {mode === 'add' ? 'Adding...' : 'Cleaning...'}
                          </>
                        ) : (
                          <>
                            {mode === 'add' ? <Droplet size={13} /> : <Eraser size={13} />}
                            {mode === 'add' ? 'Add Watermark' : 'Remove Watermark'}
                          </>
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
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <Info size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">Tips</span>
                    </div>
                    {showTips ? <ChevronLeft size={12} className="rotate-90 text-black/40" /> : <ChevronRight size={12} className="text-black/40" />}
                  </button>
                  <AnimatePresence>
                    {showTips && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 text-[11px] text-black/60 leading-relaxed overflow-hidden"
                      >
                        {mode === 'add' ? (
                          <>
                            <li>• <strong>Tile mode</strong> best for full-page watermarks</li>
                            <li>• <strong>Opacity 20-30%</strong> keeps text readable</li>
                            <li>• <strong>Rotation 45°</strong> looks professional</li>
                            <li>• <strong>Image watermark</strong> for logos</li>
                          </>
                        ) : (
                          <>
                            <li>• <strong>Deep</strong> rebuilds the PDF</li>
                            <li>• <strong>Aggressive</strong> removes most overlays</li>
                            <li>• Vector-embedded watermarks may persist</li>
                            <li>• Try multiple intensities</li>
                          </>
                        )}
                      </motion.ul>
                    )}
                  </AnimatePresence>
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