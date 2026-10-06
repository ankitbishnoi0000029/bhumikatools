"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, Camera, Smartphone, Printer,
  ScanLine, GripVertical, Trash2, RotateCw, RotateCcw, Sliders,
  Sun, Contrast, Droplet, Crop, Wand2, FileImage, FilePlus2,
  ChevronLeft, ChevronRight, Grid3x3, Maximize2, RefreshCw,
  Check, Palette, Hash, Image as ImageIcon, ZoomIn, ZoomOut,
  Files, Copy, LayoutGrid,
  Save, type LucideIcon,
} from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import { createBlobFromBytes, formatBytes, downloadBlob } from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface ScannedPage {
  id: string;
  dataUrl: string;
  originalDataUrl: string; // for filter reset
  width: number;
  height: number;
  rotation: number;
  filter: FilterType;
  brightness: number; // 0-200 (100 = normal)
  contrast: number;   // 0-200 (100 = normal)
  saturation: number; // 0-200 (100 = normal)
  isBW: boolean;
}

type FilterType = 'original' | 'grayscale' | 'bw' | 'magic' | 'vivid' | 'soft';
type PageSize = 'a4' | 'letter' | 'a5' | 'original';
type Orientation = 'portrait' | 'landscape' | 'auto';

// ============================================
// FILTER CONFIG
// ============================================

const FILTERS: { id: FilterType; label: string; css: string; icon: LucideIcon }[] = [
  { id: 'original', label: 'Original', css: 'none', icon: ImageIcon },
  { id: 'magic', label: 'Magic Color', css: 'contrast(130%) saturate(140%) brightness(105%)', icon: Wand2 },
  { id: 'grayscale', label: 'Grayscale', css: 'grayscale(100%) contrast(115%)', icon: Droplet },
  { id: 'bw', label: 'B & W', css: 'grayscale(100%) contrast(180%) brightness(110%)', icon: Contrast },
  { id: 'vivid', label: 'Vivid', css: 'saturate(160%) contrast(115%)', icon: Sparkles },
  { id: 'soft', label: 'Soft', css: 'brightness(105%) contrast(95%) saturate(90%)', icon: Sun },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ScanToPdfPage() {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [quality, setQuality] = useState(92);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [showSettings, setShowSettings] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-clear error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // IMAGE PROCESSING HELPERS
  // ============================================

  const processImage = useCallback(async (file: File): Promise<ScannedPage | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
          resolve({
            id: `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            dataUrl,
            originalDataUrl: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            rotation: 0,
            filter: 'magic', // default auto-enhance
            brightness: 100,
            contrast: 100,
            saturation: 100,
            isBW: false,
          });
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, []);

  // ============================================
  // HANDLE FILE UPLOAD
  // ============================================

  const handleFiles = useCallback(async (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) {
      setError('Please select image files.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newPages: ScannedPage[] = [];
      for (const file of arr) {
        const page = await processImage(file);
        if (page) newPages.push(page);
      }
      if (newPages.length > 0) {
        setPages((prev) => [...prev, ...newPages]);
        setResult(null);
      } else {
        setError('Failed to load images.');
      }
    } catch (e) {
      setError('Failed to process images.');
    } finally {
      setIsLoading(false);
    }
  }, [processImage]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  // ============================================
  // CAMERA (LIVE)
  // ============================================

  const openLiveCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      setError('Camera access denied. Please use file upload instead.');
      setShowCamera(false);
    }
  };

  const closeLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const img = new window.Image();
    img.onload = () => {
      const newPage: ScannedPage = {
        id: `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        dataUrl,
        originalDataUrl: dataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        rotation: 0,
        filter: 'magic',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        isBW: false,
      };
      setPages((prev) => [...prev, newPage]);
      setResult(null);
    };
    img.src = dataUrl;
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ============================================
  // PAGE OPERATIONS
  // ============================================

  const removePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setResult(null);
  };

  const updatePage = (id: string, updates: Partial<ScannedPage>) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    setResult(null);
  };

  const rotatePage = (id: string, dir: 1 | -1) => {
    setPages((prev) => prev.map((p) =>
      p.id === id ? { ...p, rotation: (p.rotation + dir * 90 + 360) % 360 } : p
    ));
    setResult(null);
  };

  const duplicatePage = (id: string) => {
    const original = pages.find((p) => p.id === id);
    if (!original) return;
    const newPage: ScannedPage = {
      ...original,
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    const idx = pages.findIndex((p) => p.id === id);
    const updated = [...pages.slice(0, idx + 1), newPage, ...pages.slice(idx + 1)];
    setPages(updated);
    setResult(null);
  };

  const clearAll = () => {
    setPages([]);
    setResult(null);
    setActiveIndex(0);
  };

  const applyFilterToAll = (filter: FilterType) => {
    setPages((prev) => prev.map((p) => ({ ...p, filter })));
    setResult(null);
  };

  const applyRotationToAll = (dir: 1 | -1) => {
    setPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + dir * 90 + 360) % 360 })));
    setResult(null);
  };

  const activePage = pages[activeIndex] || null;

  // ============================================
  // BUILD PDF
  // ============================================

  const buildPDF = async () => {
    if (pages.length === 0) throw new Error('No pages to process');

    const doc = await PDFDocument.create();

    const PAGE_SIZES = {
      a4: { w: 595.28, h: 841.89 },
      letter: { w: 612, h: 792 },
      a5: { w: 419.53, h: 595.28 },
    };

    for (const page of pages) {
      // Process image through canvas with filters
      const processedDataUrl = await applyFiltersToImage(page);
      
      // Convert to bytes
      const isPng = processedDataUrl.startsWith('data:image/png');
      const base64 = processedDataUrl.split(',')[1];
      const binary = atob(base64);
      const imgBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i);

      const embedded = isPng
        ? await doc.embedPng(imgBytes)
        : await doc.embedJpg(imgBytes);

      // Determine image dimensions considering rotation
      const isRotated = page.rotation % 180 !== 0;
      const imgW = isRotated ? embedded.height : embedded.width;
      const imgH = isRotated ? embedded.width : embedded.height;

      // Determine page size
      let pageW: number;
      let pageH: number;

      if (pageSize === 'original') {
        pageW = imgW;
        pageH = imgH;
      } else {
        const size = PAGE_SIZES[pageSize];
        pageW = size.w;
        pageH = size.h;

        // Auto orientation
        if (orientation === 'landscape' || (orientation === 'auto' && imgW > imgH)) {
          [pageW, pageH] = [pageH, pageW];
        }
      }

      const newPage = doc.addPage([pageW, pageH]);

      // Fit image in page with margins
      const margin = 20;
      const availW = pageW - margin * 2;
      const availH = pageH - margin * 2;

      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;

      newPage.drawImage(embedded, {
        x,
        y,
        width: drawW,
        height: drawH,
        rotate: page.rotation ? undefined : undefined, // rotation baked into dataUrl
      });
    }

    const bytes = await doc.save();
    return bytes;
  };

  // Apply filters by rendering to canvas
  const applyFiltersToImage = (page: ScannedPage): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        // Calculate rotated dimensions
        const isRotated = page.rotation % 180 !== 0;
        const w = isRotated ? img.height : img.width;
        const h = isRotated ? img.width : img.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Apply rotation
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((page.rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Apply CSS-like filters manually via pixel manipulation
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const filterCss = FILTERS.find((f) => f.id === page.filter)?.css || 'none';

        // Extract filter values from CSS
        const brightnessMatch = filterCss.match(/brightness\((\d+)%\)/);
        const contrastMatch = filterCss.match(/contrast\((\d+)%\)/);
        const saturateMatch = filterCss.match(/saturate\((\d+)%\)/);
        const isGrayscale = filterCss.includes('grayscale');

        const brightnessVal = brightnessMatch ? parseInt(brightnessMatch[1]) / 100 : 1;
        const contrastVal = contrastMatch ? parseInt(contrastMatch[1]) / 100 : 1;
        const saturateVal = saturateMatch ? parseInt(saturateMatch[1]) / 100 : 1;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Apply brightness
          r *= brightnessVal;
          g *= brightnessVal;
          b *= brightnessVal;

          // Apply contrast
          r = ((r / 255 - 0.5) * contrastVal + 0.5) * 255;
          g = ((g / 255 - 0.5) * contrastVal + 0.5) * 255;
          b = ((b / 255 - 0.5) * contrastVal + 0.5) * 255;

          // Apply saturation
          if (saturateVal !== 1) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * saturateVal;
            g = gray + (g - gray) * saturateVal;
            b = gray + (b - gray) * saturateVal;
          }

          // Apply grayscale
          if (isGrayscale) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray;
            g = gray;
            b = gray;
          }

          // Clamp
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', quality / 100));
      };
      img.src = page.originalDataUrl;
    });
  };

  const handleSave = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const bytes = await buildPDF();
      const blob = createBlobFromBytes(bytes, 'application/pdf');
      setResult({
        blob,
        filename: `scan-${Date.now()}.pdf`,
      });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to create PDF.' : 'Failed to create PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ============================================
  // GET CSS FILTER FOR PREVIEW
  // ============================================

  const getFilterCss = (page: ScannedPage) => {
    let base = FILTERS.find((f) => f.id === page.filter)?.css || 'none';
    // Add manual brightness/contrast/saturation
    const extras: string[] = [];
    if (page.brightness !== 100) extras.push(`brightness(${page.brightness}%)`);
    if (page.contrast !== 100) extras.push(`contrast(${page.contrast}%)`);
    if (page.saturation !== 100) extras.push(`saturate(${page.saturation}%)`);
    if (extras.length === 0) return base;
    return base === 'none' ? extras.join(' ') : `${base} ${extras.join(' ')}`;
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />
      {/* Mobile camera input (opens native camera) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileInput}
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
              Scan — Camera · Printer · Files
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Mobile + Desktop</span>
            <span>·</span>
            <span>Auto Enhance</span>
          </div>
        </div>

        {/* Heading */}
        {pages.length === 0 && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
                Chapter 03 — Scan
              </div>
              <h1 className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Scan to <span className="italic text-[#ff6a00]">PDF</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Capture documents with your phone, printer scanner, or any camera. Auto-enhance, reorder, and export as a clean PDF.
              </p>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* UPLOAD STATE */}
        {/* ============================================ */}
        {pages.length === 0 && !isLoading && (
          <div className="max-w-4xl mx-auto">
            {/* Three input methods */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Camera live */}
              <motion.button
                onClick={openLiveCamera}
                whileHover={{ y: -4 }}
                className="group relative p-6 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.2)] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center mb-5 transition-all">
                  <Camera size={22} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-[17px] text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  Live Camera
                </h3>
                <p className="text-[12px] text-black/55 leading-[1.6] font-light mb-4">
                  Use device camera for real-time scanning with preview.
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-[#ff6a00]">
                  Open Camera <ArrowUpRight size={11} />
                </span>
              </motion.button>

              {/* Mobile camera (native) */}
              <motion.button
                onClick={() => cameraInputRef.current?.click()}
                whileHover={{ y: -4 }}
                className="group relative p-6 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.2)] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center mb-5 transition-all">
                  <Smartphone size={22} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-[17px] text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  Phone Camera
                </h3>
                <p className="text-[12px] text-black/55 leading-[1.6] font-light mb-4">
                  Opens native camera on mobile. Best quality capture.
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-[#ff6a00]">
                  Take Photo <ArrowUpRight size={11} />
                </span>
              </motion.button>

              {/* File upload (printer scanner saves to file) */}
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ y: -4 }}
                className="group relative p-6 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.2)] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center mb-5 transition-all">
                  <Printer size={22} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-[17px] text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  Upload Scans
                </h3>
                <p className="text-[12px] text-black/55 leading-[1.6] font-light mb-4">
                  From printer scanner, gallery, or any image file.
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-[#ff6a00]">
                  Choose Files <ArrowUpRight size={11} />
                </span>
              </motion.button>
            </div>

            {/* Drag & drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative p-12 rounded-[22px] bg-white border-2 border-dashed transition-all cursor-pointer ${
                isDragging ? 'border-[#ff6a00] bg-[#ff6a00]/[0.03] scale-[1.01]' : 'border-black/[0.12] hover:border-[#ff6a00]/40'
              }`}
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-16 h-16 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-6"
                >
                  <UploadCloud size={26} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[20px] text-black mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop images here' : 'Drag & drop scanned images'}
                </h3>
                <p className="text-[13px] text-black/50 mb-6 max-w-sm mx-auto">
                  JPG, PNG, WebP — combine multiple pages into one PDF.
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <FilePlus2 size={14} />
                  Select Images
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

            {/* Features strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Wand2, label: 'Auto enhance' },
                { icon: Crop, label: 'Multi-page PDF' },
                { icon: Sliders, label: 'Custom filters' },
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

        {/* ============================================ */}
        {/* LOADING */}
        {/* ============================================ */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
              <ScanLine size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Processing images...
            </span>
          </div>
        )}

        {/* ============================================ */}
        {/* WORKSPACE — Pages loaded */}
        {/* ============================================ */}
        {pages.length > 0 && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <Files size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{pages.length}</span>
                  <span className="text-[12px] text-black/50">page{pages.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <FileImage size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">
                    {pageSize === 'original' ? 'Original size' : pageSize.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50 hover:text-black'
                    }`}
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('single')}
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                      viewMode === 'single' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50 hover:text-black'
                    }`}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={12} />
                  Clear all
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* ============ LEFT — Pages list ============ */}
              <div className="lg:col-span-3 space-y-4">
                {/* Add more */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4 space-y-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-lg bg-[#ff6a00] text-white text-[11px] font-medium hover:bg-[#ff8a3d] transition-colors flex items-center justify-center gap-2"
                  >
                    <FilePlus2 size={13} />
                    Add pages
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2.5 rounded-lg bg-[#f4f1ea] text-black/60 text-[10px] font-mono uppercase tracking-[0.1em] hover:bg-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Smartphone size={11} />
                      Phone
                    </button>
                    <button
                      onClick={openLiveCamera}
                      className="py-2.5 rounded-lg bg-[#f4f1ea] text-black/60 text-[10px] font-mono uppercase tracking-[0.1em] hover:bg-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Camera size={11} />
                      Live
                    </button>
                  </div>
                </div>

                {/* Global filters */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="text-[10px] font-mono uppercase text-black/40 mb-3">
                    Apply to all pages
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {FILTERS.map((f) => {
                      const Icon = f.icon;
                      return (
                        <button
                          key={f.id}
                          onClick={() => applyFilterToAll(f.id)}
                          className="aspect-square rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] flex flex-col items-center justify-center gap-1 transition-colors"
                          title={f.label}
                        >
                          <Icon size={13} className="text-black/60" />
                          <span className="text-[7px] font-mono uppercase text-black/50">
                            {f.label.slice(0, 5)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyRotationToAll(-1)}
                      className="py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] hover:bg-black/[0.08] transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={11} /> All left
                    </button>
                    <button
                      onClick={() => applyRotationToAll(1)}
                      className="py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] hover:bg-black/[0.08] transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCw size={11} /> All right
                    </button>
                  </div>
                </div>

                {/* Pages thumbnails */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="text-[10px] font-mono uppercase text-black/40 mb-3">
                    Pages — Drag to reorder
                  </div>
                  <Reorder.Group
                    axis="y"
                    values={pages}
                    onReorder={(newOrder) => { setPages(newOrder); setResult(null); }}
                    className="space-y-2 max-h-[500px] overflow-y-auto pr-1"
                  >
                    {pages.map((page, idx) => (
                      <Reorder.Item
                        key={page.id}
                        value={page}
                        className="group cursor-grab active:cursor-grabbing"
                        whileDrag={{ scale: 1.03, zIndex: 20 }}
                      >
                        <div
                          onClick={() => setActiveIndex(idx)}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                            activeIndex === idx
                              ? 'border-[#ff6a00]/40 bg-[#ff6a00]/[0.04] shadow-sm'
                              : 'border-black/[0.06] hover:border-black/[0.12]'
                          }`}
                        >
                          <GripVertical size={14} className="text-black/20 shrink-0" />
                          <div className="shrink-0 w-10 h-12 rounded-md overflow-hidden bg-[#f4f1ea] border border-black/[0.06] relative">
                            <img
                              src={page.dataUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              style={{
                                transform: `rotate(${page.rotation}deg)`,
                                filter: getFilterCss(page),
                              }}
                              draggable={false}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-medium text-black">
                              Page {idx + 1}
                            </div>
                            <div className="text-[9px] font-mono uppercase text-black/40">
                              {page.width}×{page.height}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                            className="w-6 h-6 rounded-md hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/30 transition-colors shrink-0"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              </div>

              {/* ============ CENTER — Preview ============ */}
              <div className="lg:col-span-6 space-y-4">
                {/* Preview toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => activePage && rotatePage(activePage.id, -1)}
                      disabled={!activePage}
                      className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => activePage && rotatePage(activePage.id, 1)}
                      disabled={!activePage}
                      className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      onClick={() => activePage && duplicatePage(activePage.id)}
                      disabled={!activePage}
                      className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-[#f4f1ea] rounded-lg p-1">
                    <button
                      onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                      disabled={activeIndex <= 0}
                      className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="px-2 text-[12px] font-mono">{activeIndex + 1} / {pages.length}</span>
                    <button
                      onClick={() => setActiveIndex(Math.min(pages.length - 1, activeIndex + 1))}
                      disabled={activeIndex >= pages.length - 1}
                      className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoom((z) => Math.max(30, z - 10))}
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
                </div>

                {/* Preview canvas */}
                <div className="rounded-[18px] bg-[#ebe7de]/40 border border-black/[0.06] p-6 min-h-[600px] flex items-center justify-center overflow-auto relative">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                    }}
                  />
                  {activePage && (
                    <div
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'center',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <div className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] rounded-sm overflow-hidden max-w-[500px]">
                        <img
                          src={activePage.dataUrl}
                          alt=""
                          className="block w-full h-auto"
                          style={{
                            transform: `rotate(${activePage.rotation}deg)`,
                            filter: getFilterCss(activePage),
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info bar */}
                <div className="flex items-center justify-between p-4 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="text-[11px] font-mono uppercase text-black/40">
                    {activePage ? `${activePage.width} × ${activePage.height} px` : '—'}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-black/40">
                    Filter: {FILTERS.find((f) => f.id === activePage?.filter)?.label || '—'}
                  </div>
                </div>
              </div>

              {/* ============ RIGHT — Options & Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Active page filters */}
                {activePage && (
                  <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sliders size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">
                        Page Filters
                      </span>
                    </div>

                    {/* Filter presets */}
                    <div className="grid grid-cols-3 gap-1.5 mb-4">
                      {FILTERS.map((f) => {
                        const Icon = f.icon;
                        const isActive = activePage.filter === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => updatePage(activePage.id, { filter: f.id })}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                              isActive
                                ? 'bg-[#ff6a00] text-white shadow-lg'
                                : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                            }`}
                          >
                            <Icon size={13} />
                            <span className="text-[7px] font-mono uppercase">
                              {f.label.slice(0, 5)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Manual adjustments */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-mono uppercase text-black/40">
                            Brightness
                          </label>
                          <span className="text-[10px] font-mono text-[#ff6a00]">
                            {activePage.brightness}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={150}
                          value={activePage.brightness}
                          onChange={(e) => updatePage(activePage.id, { brightness: parseInt(e.target.value) })}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-mono uppercase text-black/40">
                            Contrast
                          </label>
                          <span className="text-[10px] font-mono text-[#ff6a00]">
                            {activePage.contrast}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={200}
                          value={activePage.contrast}
                          onChange={(e) => updatePage(activePage.id, { contrast: parseInt(e.target.value) })}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[9px] font-mono uppercase text-black/40">
                            Saturation
                          </label>
                          <span className="text-[10px] font-mono text-[#ff6a00]">
                            {activePage.saturation}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={200}
                          value={activePage.saturation}
                          onChange={(e) => updatePage(activePage.id, { saturation: parseInt(e.target.value) })}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>
                      <button
                        onClick={() => updatePage(activePage.id, {
                          filter: 'original',
                          brightness: 100,
                          contrast: 100,
                          saturation: 100,
                        })}
                        className="w-full py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] hover:bg-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw size={11} />
                        Reset filters
                      </button>
                    </div>
                  </div>
                )}

                {/* PDF Settings */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      PDF Settings
                    </span>
                  </div>

                  {/* Page size */}
                  <label className="block text-[9px] font-mono uppercase text-black/40 mb-2">
                    Page size
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {(['a4', 'letter', 'a5', 'original'] as PageSize[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setPageSize(s)}
                        className={`py-2 rounded-md text-[11px] font-medium transition-all ${
                          pageSize === s
                            ? 'bg-[#ff6a00] text-white'
                            : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                        }`}
                      >
                        {s === 'original' ? 'Original' : s.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Orientation */}
                  {pageSize !== 'original' && (
                    <>
                      <label className="block text-[9px] font-mono uppercase text-black/40 mb-2">
                        Orientation
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {(['auto', 'portrait', 'landscape'] as Orientation[]).map((o) => (
                          <button
                            key={o}
                            onClick={() => setOrientation(o)}
                            className={`py-2 rounded-md text-[10px] font-mono uppercase transition-all ${
                              orientation === o
                                ? 'bg-[#ff6a00] text-white'
                                : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                            }`}
                          >
                            {o.slice(0, 4)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Quality */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9px] font-mono uppercase text-black/40">
                        Image quality
                      </label>
                      <span className="text-[10px] font-mono text-[#ff6a00]">{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value))}
                      className="w-full accent-[#ff6a00]"
                    />
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
                        <div className="text-[13px] font-medium text-black mb-1">PDF created!</div>
                        <div className="text-[10px] font-mono text-black/40">
                          {formatBytes(result.blob.size)}
                        </div>
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
                        Keep editing
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-black/50 mb-4 leading-relaxed">
                        {pages.length} page{pages.length !== 1 ? 's' : ''} will be combined into one PDF.
                      </p>
                      <button
                        onClick={handleSave}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                          isProcessing
                            ? 'bg-black/[0.08] text-black/40'
                            : 'bg-black text-white hover:bg-[#ff6a00]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Creating PDF...</>
                        ) : (
                          <><Save size={13} /> Create PDF</>
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
                    Pro tips
                  </div>
                  <ul className="space-y-2 text-[11px] text-black/60 leading-relaxed">
                    <li>• <strong>Magic Color</strong> filter best for documents</li>
                    <li>• Use <strong>B & W</strong> for text-only pages</li>
                    <li>• Drag pages to reorder before export</li>
                    <li>• Photo capture best in bright light</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================ */}
        {/* LIVE CAMERA MODAL */}
        {/* ============================================ */}
        <AnimatePresence>
          {showCamera && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex flex-col"
              >
                {/* Top bar */}
                <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur">
                  <div className="text-white text-[12px] font-mono uppercase tracking-[0.15em]">
                    Scan Document
                  </div>
                  <button
                    onClick={closeLiveCamera}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Video */}
                <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />

                  {/* Scan frame overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-8 md:inset-16 border-2 border-white/40 rounded-lg">
                      {/* Corner brackets */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#ff6a00] rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#ff6a00] rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#ff6a00] rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#ff6a00] rounded-br-lg" />
                    </div>
                    {/* Hint text */}
                    <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-16 text-white/60 text-[11px] font-mono uppercase tracking-[0.15em] text-center">
                      Align document inside frame
                    </div>
                  </div>
                </div>

                {/* Bottom controls */}
                <div className="p-6 bg-black/80 backdrop-blur flex items-center justify-center gap-8">
                  <button
                    onClick={switchCamera}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    title="Switch camera"
                  >
                    <RefreshCw size={18} />
                  </button>

                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full bg-white border-4 border-white/30 flex items-center justify-center relative group"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#ff6a00] group-hover:scale-95 transition-transform flex items-center justify-center">
                      <Camera size={22} className="text-white" />
                    </div>
                  </button>

                  <button
                    onClick={closeLiveCamera}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    title="Done"
                  >
                    <Check size={18} />
                  </button>
                </div>

                {pages.length > 0 && (
                  <div className="pb-4 px-4 text-center">
                    <span className="text-white/60 text-[11px] font-mono uppercase tracking-[0.15em]">
                      {pages.length} page{pages.length !== 1 ? 's' : ''} captured
                    </span>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Back link */}
        {pages.length === 0 && (
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
        )}
      </div>
    </div>
  );
}