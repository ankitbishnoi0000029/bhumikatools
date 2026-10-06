"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  UploadCloud, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Download, RotateCw, Maximize2, Minimize2, X, Search,
  Grid3x3, FileText, Printer, BookOpen, Loader2, AlertCircle,
  ArrowUpRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import required CSS
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PDFReaderProps {
  initialFile?: File | null;
}

export default function PDFReader({ initialFile = null }: PDFReaderProps) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFile = useCallback((selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setFile(selectedFile);
    setPageNumber(1);
    setScale(1.2);
    setRotation(0);
  }, []);

  // Drag and drop handlers
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }, [handleFile]);

  // PDF load success
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError('Failed to load PDF. Please try another file.');
    setIsLoading(false);
    console.error(err);
  }, []);

  // Navigation
  const goToPrevPage = useCallback(() => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  }, [numPages]);

  const goToFirstPage = useCallback(() => setPageNumber(1), []);
  const goToLastPage = useCallback(() => setPageNumber(numPages), [numPages]);

  // Zoom
  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.2, 3)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.2, 0.4)), []);
  const resetZoom = useCallback(() => setScale(1.2), []);

  // Rotate
  const rotate = useCallback(() => setRotation((r) => (r + 90) % 360), []);

  // Download
  const downloadPDF = useCallback(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [file]);

  // Print
  const printPDF = useCallback(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }, [file]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!file) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPrevPage();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToNextPage();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowThumbnails(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [file, goToPrevPage, goToNextPage, zoomIn, zoomOut, toggleFullscreen]);

  // Reset file
  const resetFile = useCallback(() => {
    setFile(null);
    setNumPages(0);
    setPageNumber(1);
    setScale(1.2);
    setRotation(0);
    setError(null);
    setSearchQuery('');
    setShowSearch(false);
    setShowThumbnails(false);
  }, []);

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden">
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
        {/* ==================== TOP META ==================== */}
        <div className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              PDF Reader — {file ? 'Document Loaded' : 'Upload to Begin'}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Free</span>
            <span>·</span>
            <span>Privacy First</span>
          </div>
        </div>

        {/* ==================== HEADING ==================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as any }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              PDF Tools — Read
            </div>
            <h1
              className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Read any
              <br />
              <span className="italic text-[#ff6a00]">PDF</span> file.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Open, read, and navigate PDFs directly in your browser. Zoom, rotate, search,
              print, and download — all without uploads to any server.
            </p>
          </div>
        </motion.div>

        {/* ==================== READER ==================== */}
        {!file ? (
          /* ---------- UPLOAD STATE ---------- */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative p-16 rounded-[22px] bg-white border-2 border-dashed transition-all duration-300 ${
                isDragging
                  ? 'border-[#ff6a00] bg-[#ff6a00]/[0.03] scale-[1.01]'
                  : 'border-black/[0.12] hover:border-[#ff6a00]/40'
              }`}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={onFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="relative z-0 text-center">
                <motion.div
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <UploadCloud size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>

                <h3
                  className="text-[28px] md:text-[32px] leading-tight tracking-tight text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {isDragging ? 'Drop your PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-10 max-w-sm mx-auto font-light">
                  Drag your file into this area, or click to browse from your device.
                  Files are processed in your browser.
                </p>

                <button className="group inline-flex items-center gap-3 px-8 py-3 rounded-full bg-black text-white text-[14px] font-medium hover:bg-[#ff6a00] transition-colors duration-300">
                  <FileText size={15} />
                  Choose PDF file
                  <ArrowUpRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                {error && (
                  <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-[12px]">
                    <AlertCircle size={13} />
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Feature strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              {[
                { icon: BookOpen, label: 'Multi-page' },
                { icon: Search, label: 'Search text' },
                { icon: Grid3x3, label: 'Thumbnails' },
                { icon: Printer, label: 'Print & Save' },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.label} className="flex items-center gap-3 p-4 rounded-[14px] bg-white/60 border border-black/[0.06]">
                    <Icon size={14} className="text-[#ff6a00]" strokeWidth={1.75} />
                    <span className="text-[12px] text-black/70">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* ---------- READER STATE ---------- */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              ref={containerRef}
              className={`relative rounded-[22px] bg-white border border-black/[0.06] overflow-hidden ${
                isFullscreen ? 'h-screen rounded-none' : ''
              }`}
            >
              {/* ---------- TOOLBAR ---------- */}
              <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-black/[0.08] bg-white sticky top-0 z-30">
                {/* Left: File info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-[#ff6a00]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-black truncate max-w-[140px] md:max-w-[240px]">
                      {file.name}
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · {numPages} pages
                    </div>
                  </div>
                </div>

                {/* Center: Page nav */}
                <div className="hidden md:flex items-center gap-1 bg-[#f4f1ea] rounded-full p-1">
                  <button
                    onClick={goToFirstPage}
                    disabled={pageNumber <= 1}
                    className="w-8 h-8 rounded-full hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    aria-label="First page"
                  >
                    <ChevronsLeft size={13} />
                  </button>
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="w-8 h-8 rounded-full hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <div className="flex items-center gap-1.5 px-3 text-[12px] font-mono tracking-wider">
                    <input
                      type="number"
                      value={pageNumber}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= numPages) setPageNumber(val);
                      }}
                      className="w-10 bg-transparent text-center outline-none font-medium"
                      min={1}
                      max={numPages}
                    />
                    <span className="text-black/40">/ {numPages}</span>
                  </div>
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="w-8 h-8 rounded-full hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    aria-label="Next"
                  >
                    <ChevronRight size={13} />
                  </button>
                  <button
                    onClick={goToLastPage}
                    disabled={pageNumber >= numPages}
                    className="w-8 h-8 rounded-full hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    aria-label="Last page"
                  >
                    <ChevronsRight size={13} />
                  </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 flex-1 justify-end">
                  {/* Search */}
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      showSearch ? 'bg-[#ff6a00] text-white' : 'hover:bg-black/[0.05] text-black/60'
                    }`}
                    aria-label="Search"
                  >
                    <Search size={14} />
                  </button>

                  {/* Zoom out */}
                  <button
                    onClick={zoomOut}
                    className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="hidden sm:block text-[11px] font-mono tracking-wider text-black/50 w-10 text-center">
                    {Math.round(scale * 100)}%
                  </span>

                  {/* Zoom in */}
                  <button
                    onClick={zoomIn}
                    className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>

                  {/* Rotate */}
                  <button
                    onClick={rotate}
                    className="w-8 h-8 rounded-lg hover:bg-black/[0.05] flex items-center justify-center text-black/60 transition-colors"
                    aria-label="Rotate"
                  >
                    <RotateCw size={14} />
                  </button>

                  {/* Thumbnails */}
                  <button
                    onClick={() => setShowThumbnails(!showThumbnails)}
                    className={`hidden md:flex w-8 h-8 rounded-lg items-center justify-center transition-colors ${
                      showThumbnails ? 'bg-[#ff6a00] text-white' : 'hover:bg-black/[0.05] text-black/60'
                    }`}
                    aria-label="Thumbnails"
                  >
                    <Grid3x3 size={14} />
                  </button>

                  {/* Print */}
                  <button
                    onClick={printPDF}
                    className="hidden sm:flex w-8 h-8 rounded-lg hover:bg-black/[0.05] items-center justify-center text-black/60 transition-colors"
                    aria-label="Print"
                  >
                    <Printer size={14} />
                  </button>

                  {/* Download */}
                  <button
                    onClick={downloadPDF}
                    className="hidden sm:flex w-8 h-8 rounded-lg hover:bg-black/[0.05] items-center justify-center text-black/60 transition-colors"
                    aria-label="Download"
                  >
                    <Download size={14} />
                  </button>

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="hidden md:flex w-8 h-8 rounded-lg hover:bg-black/[0.05] items-center justify-center text-black/60 transition-colors"
                    aria-label="Fullscreen"
                  >
                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>

                  {/* Close */}
                  <button
                    onClick={resetFile}
                    className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/60 transition-colors ml-1"
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* ---------- SEARCH BAR ---------- */}
              <AnimatePresence>
                {showSearch && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-b border-black/[0.08] bg-[#f4f1ea]/50 overflow-hidden"
                  >
                    <div className="px-6 py-3 flex items-center gap-3">
                      <Search size={14} className="text-black/40 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search text in document..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-[14px] text-black placeholder:text-black/30"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 hover:text-[#ff6a00] transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ---------- MAIN AREA ---------- */}
              <div className="flex relative" style={{ height: isFullscreen ? 'calc(100vh - 120px)' : '80vh' }}>
                {/* Thumbnails Sidebar */}
                <AnimatePresence>
                  {showThumbnails && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 200, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as any }}
                      className="border-r border-black/[0.08] bg-[#f4f1ea]/30 overflow-y-auto overflow-x-hidden shrink-0"
                    >
                      <div className="p-3 space-y-3">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setPageNumber(page)}
                            className={`w-full block rounded-lg overflow-hidden border-2 transition-all ${
                              pageNumber === page
                                ? 'border-[#ff6a00] shadow-[0_0_0_3px_rgba(255,106,0,0.15)]'
                                : 'border-black/[0.06] hover:border-black/20'
                            }`}
                          >
                            <div className="bg-white aspect-[8.5/11] flex items-center justify-center overflow-hidden">
                              <Document file={file}>
                                <Page
                                  pageNumber={page}
                                  width={160}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                              </Document>
                            </div>
                            <div className="bg-white py-1.5 px-2 text-[10px] font-mono uppercase tracking-[0.1em] text-black/50 text-center">
                              Page {page}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PDF Viewer */}
                <div className="flex-1 overflow-auto bg-[#ebe7de]/50 flex justify-center p-6 relative">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#ebe7de]/80 z-20">
                      <div className="flex flex-col items-center gap-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 size={32} className="text-[#ff6a00]" />
                        </motion.div>
                        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
                          Loading document...
                        </span>
                      </div>
                    </div>
                  )}

                  <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=""
                    className="shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]"
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      rotate={rotation}
                      className="bg-white"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                </div>
              </div>

              {/* ---------- BOTTOM PAGE NAV (MOBILE) ---------- */}
              <div className="md:hidden flex items-center justify-between px-4 py-3 border-t border-black/[0.08] bg-white">
                <button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-black/[0.12] text-[12px] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>
                <div className="text-[12px] font-mono tracking-wider text-black/60">
                  {pageNumber} / {numPages}
                </div>
                <button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-black/[0.12] text-[12px] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* ---------- INFO STRIP ---------- */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { n: '01', label: 'Navigation', desc: 'Use arrow keys or buttons to move between pages.' },
                { n: '02', label: 'Zoom & Rotate', desc: 'Adjust to any size. Press +/- keys for quick zoom.' },
                { n: '03', label: 'Privacy', desc: 'Your PDF is never uploaded. Everything is client-side.' },
              ].map((tip, i) => (
                <motion.div
                  key={tip.n}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 + 0.3 }}
                  className="p-6 rounded-[18px] bg-white border border-black/[0.06]"
                >
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff6a00] mb-3">
                    {tip.n}
                  </div>
                  <div
                    className="text-[16px] text-black mb-1.5"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {tip.label}
                  </div>
                  <p className="text-[12px] text-black/55 leading-[1.6] font-light">
                    {tip.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}