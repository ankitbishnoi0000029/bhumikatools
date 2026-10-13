"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2, Download, RefreshCw, ArrowUpRight, Eye, Sparkles, FileOutput, FileType, FileCode2, Copy, Check, Info, type LucideIcon, Layers, Image as ImageIcon, Gauge, Maximize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Settings2, Hash, BarChart3, Shield, Zap } from "lucide-react";
import { Document, Packer, Paragraph, ImageRun, AlignmentType, PageBreak } from "docx";
import { formatBytes, downloadBlob, readFileAsArrayBuffer } from "@/lib/pdf-utils";

// ============================================
// TYPES
// ============================================

interface RenderedPage {
  pageNum: number;
  dataUrl: string;
  /** Base dimensions in PDF points (1pt = 1/72 inch) — at scale 1 */
  widthPt: number;
  heightPt: number;
  /** Rendered pixel dimensions (at chosen scale) */
  widthPx: number;
  heightPx: number;
}

interface RenderedDoc {
  pages: RenderedPage[];
  pageCount: number;
  title: string;
  /** Page size in PDF points (assumed uniform across pages) */
  pageWidthPt: number;
  pageHeightPt: number;
}

type OutputFormat = "docx" | "pdf";
type ImageFormat = "png" | "jpg";

const FORMAT_OPTIONS: { id: OutputFormat; label: string; ext: string; mime: string; desc: string; icon: LucideIcon }[] = [
  { id: "docx", label: "Word (.docx)", ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", desc: "Exact layout", icon: FileType },
  { id: "pdf", label: "PDF (.pdf)", ext: "pdf", mime: "application/pdf", desc: "As-is copy", icon: FileOutput },
];

// ============================================
// HELPERS
// ============================================

const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** PDF points → DOCX pixels (at 96 DPI) */
const PT_TO_PX = 96 / 72;

// ============================================
// COMPONENT
// ============================================

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<RenderedDoc | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("docx");
  const [imageFormat, setImageFormat] = useState<ImageFormat>("png");
  const [scale, setScale] = useState(2); // 1x, 1.5x, 2x, 3x
  const [imageQuality, setImageQuality] = useState(0.9);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [zoom, setZoom] = useState(70);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4500);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // PDF → IMAGE RENDERING
  // ============================================

  const renderPdf = useCallback(async (f: File, renderScale: number, fmt: ImageFormat, quality: number): Promise<RenderedDoc> => {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;

    const pages: RenderedPage[] = [];
    let pageWidthPt = 0;
    let pageHeightPt = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: renderScale });

      if (i === 1) {
        pageWidthPt = baseViewport.width;
        pageHeightPt = baseViewport.height;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported in this browser.");

      // white background — PDFs are usually transparent, Word needs white
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      const dataUrl = fmt === "jpg" ? canvas.toDataURL("image/jpeg", quality) : canvas.toDataURL("image/png");

      pages.push({
        pageNum: i,
        dataUrl,
        widthPt: baseViewport.width,
        heightPt: baseViewport.height,
        widthPx: canvas.width,
        heightPx: canvas.height,
      });

      // free memory
      page.cleanup();

      setLoadProgress(Math.round((i / pdf.numPages) * 100));
    }

    return {
      pages,
      pageCount: pdf.numPages,
      title: f.name.replace(/\.pdf$/i, ""),
      pageWidthPt,
      pageHeightPt,
    };
  }, []);

  // ============================================
  // LOAD PDF
  // ============================================

  const loadPDF = useCallback(
    async (f: File) => {
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        setError("Please select a PDF file.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setFile(f);
      setDoc(null);
      setResult(null);
      setPreviewIndex(0);
      setLoadProgress(0);

      try {
        const rendered = await renderPdf(f, scale, imageFormat, imageQuality);
        setDoc(rendered);
      } catch (e: unknown) {
        console.error(e);
        setError(e instanceof Error ? e.message || "Failed to read the PDF." : "Failed to read the PDF. It may be corrupted.");
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [renderPdf, scale, imageFormat, imageQuality],
  );

  // re-render if user changes quality/format AFTER loading
  const rerender = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setLoadProgress(0);
    try {
      const rendered = await renderPdf(file, scale, imageFormat, imageQuality);
      setDoc(rendered);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to re-render.");
    } finally {
      setIsLoading(false);
    }
  }, [file, renderPdf, scale, imageFormat, imageQuality]);

  // ============================================
  // INPUT HANDLERS
  // ============================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadPDF(e.target.files[0]);
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) loadPDF(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setFile(null);
    setDoc(null);
    setResult(null);
    setError(null);
    setPreviewIndex(0);
  };

  // ============================================
  // BUILD DOCX (EXACT LAYOUT — one image per page)
  // ============================================

  const buildDocx = async (): Promise<Blob> => {
    if (!doc) throw new Error("No document");

    const pageWidthTwips = Math.round(doc.pageWidthPt * 20);
    const pageHeightTwips = Math.round(doc.pageHeightPt * 20);

    const children: Paragraph[] = [];

    doc.pages.forEach((p, i) => {
      const displayW = Math.round(p.widthPt * PT_TO_PX);
      const displayH = Math.round(p.heightPt * PT_TO_PX);

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: dataUrlToBytes(p.dataUrl),
              transformation: { width: displayW, height: displayH },
              type: imageFormat === "png" ? "png" : "jpg",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0, line: 0 },
          pageBreakBefore: i > 0,
        }),
      );
    });

    const document = new Document({
      creator: "idcardtools",
      title: doc.title,
      description: "Converted from PDF by idcardtools — exact layout preserved",
      sections: [
        {
          properties: {
            page: {
              size: { width: pageWidthTwips, height: pageHeightTwips },
              // zero margins so the image fills the page exactly
              margin: { top: 0, right: 0, bottom: 0, left: 0 },
            },
          },
          children,
        },
      ],
    });

    return await Packer.toBlob(document);
  };

  // ============================================
  // BUILD PDF (rebuild from rendered images)
  // ============================================

  const buildPdf = async (): Promise<Blob> => {
    if (!doc) throw new Error("No document");

    // dynamic import so we don't pay the cost unless used
    const { jsPDF } = await import("jspdf");

    const pdf = new jsPDF({
      unit: "pt",
      format: [doc.pageWidthPt, doc.pageHeightPt],
      orientation: doc.pageWidthPt > doc.pageHeightPt ? "landscape" : "portrait",
    });

    doc.pages.forEach((p, i) => {
      if (i > 0) pdf.addPage([doc.pageWidthPt, doc.pageHeightPt], doc.pageWidthPt > doc.pageHeightPt ? "landscape" : "portrait");
      pdf.addImage(p.dataUrl, imageFormat === "png" ? "PNG" : "JPEG", 0, 0, doc.pageWidthPt, doc.pageHeightPt);
    });

    return pdf.output("blob");
  };

  // ============================================
  // CONVERT
  // ============================================

  const handleConvert = async () => {
    if (!doc) return;
    setIsProcessing(true);
    setError(null);
    try {
      let blob: Blob;
      const fmt = FORMAT_OPTIONS.find((f) => f.id === outputFormat)!;

      if (outputFormat === "docx") {
        blob = await buildDocx();
      } else {
        blob = await buildPdf();
      }

      setResult({ blob, filename: `${doc.title}.${fmt.ext}` });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Conversion failed.");
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
  const estimatedSize = useMemo(() => {
    if (!doc) return 0;
    // sum of base64 length approximations
    return doc.pages.reduce((acc, p) => acc + p.dataUrl.length * 0.75, 0);
  }, [doc]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-16 pb-24 overflow-hidden min-h-screen">
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
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">PDF to Word — Exact Layout</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>100% Fidelity</span>
            <span>·</span>
            <span>Zero Changes</span>
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
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Chapter 03 — Convert</div>
              <h1
                className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                PDF to <span className="italic text-[#ff6a00]">Word</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">Every page rendered exactly as it appears in the PDF and embedded into a Word document. What you see is what you get — no reformatting, no reflow, no surprises.</p>
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
              className={`relative p-16 rounded-[22px] bg-white border-2 border-dashed transition-all cursor-pointer ${isDragging ? "border-[#ff6a00] bg-[#ff6a00]/[0.03] scale-[1.01]" : "border-black/[0.12] hover:border-[#ff6a00]/40"}`}
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: isDragging ? -8 : 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8"
                >
                  <FileOutput
                    size={32}
                    strokeWidth={1.5}
                    className="text-[#ff6a00]"
                  />
                </motion.div>
                <h3
                  className="text-[26px] md:text-[30px] text-black mb-4"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {isDragging ? "Drop PDF here" : "Select or drop a PDF"}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">Each PDF page is rendered as an image and embedded into Word — the result looks exactly like the original PDF.</p>
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
                { icon: Eye, label: "Exact same look" },
                { icon: Shield, label: "100% offline" },
                { icon: Zap, label: "Instant convert" },
                { icon: FileType, label: "Real DOCX" },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 p-4 rounded-[14px] bg-white/60 border border-black/[0.06]"
                  >
                    <Icon
                      size={14}
                      className="text-[#ff6a00]"
                      strokeWidth={1.75}
                    />
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
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <FileOutput
                size={40}
                className="text-[#ff6a00]"
              />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">Rendering pages... {loadProgress}%</span>
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <FileText
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black max-w-[200px] truncate">{file.name}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">{doc.pageCount}</span>
                  <span className="text-[12px] text-black/50">pages</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Hash
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">
                    {Math.round(doc.pageWidthPt)}×{Math.round(doc.pageHeightPt)}
                  </span>
                  <span className="text-[12px] text-black/50">pt</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <BarChart3
                    size={14}
                    className="text-[#ff6a00]"
                  />
                  <span className="text-[13px] font-medium text-black">{formatBytes(estimatedSize)}</span>
                  <span className="text-[12px] text-black/50">est. output</span>
                </div>
              </div>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
              >
                <X size={12} />
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* ============ LEFT — Settings ============ */}
              <div className="lg:col-span-3 space-y-4">
                {/* Output format */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileType
                      size={13}
                      className="text-[#ff6a00]"
                    />
                    <span className="text-[10px] font-mono uppercase text-black/40">Output</span>
                  </div>
                  <div className="space-y-1.5">
                    {FORMAT_OPTIONS.map((f) => {
                      const Icon = f.icon;
                      const isActive = outputFormat === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            setOutputFormat(f.id);
                            setResult(null);
                          }}
                          className={`w-full p-3 rounded-lg text-left transition-all border flex items-center gap-3 ${isActive ? "bg-[#ff6a00]/[0.06] border-[#ff6a00]/40" : "bg-white border-black/[0.06] hover:border-black/[0.15]"}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-[#ff6a00] text-white" : "bg-[#f4f1ea] text-black/50"}`}>
                            <Icon size={13} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[12px] font-medium truncate ${isActive ? "text-[#ff6a00]" : "text-black"}`}>{f.label}</div>
                            <div className="text-[9px] font-mono uppercase text-black/40">{f.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Image quality */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Gauge
                      size={13}
                      className="text-[#ff6a00]"
                    />
                    <span className="text-[10px] font-mono uppercase text-black/40">Rendering</span>
                  </div>

                  {/* Image format */}
                  <div className="mb-4">
                    <div className="text-[9px] font-mono uppercase text-black/40 mb-2">Image format</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["png", "jpg"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => {
                            setImageFormat(fmt);
                            setResult(null);
                          }}
                          className={`py-2 rounded-lg text-[11px] font-medium border transition-colors ${imageFormat === fmt ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-[#ff6a00]"}`}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-black/40 leading-relaxed">PNG = sharpest for text. JPG = smaller file size.</p>
                  </div>

                  {/* Scale */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono uppercase text-black/40">Resolution</span>
                      <span className="text-[10px] font-mono text-[#ff6a00]">{scale}×</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 1.5, 2, 3].map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setScale(s);
                            setResult(null);
                          }}
                          className={`py-1.5 rounded-md text-[10.5px] font-medium border transition-colors ${scale === s ? "bg-black text-white border-black" : "bg-white text-black/70 border-black/[0.1] hover:border-[#ff6a00]"}`}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-black/40 leading-relaxed">Higher = sharper output but larger file.</p>
                  </div>

                  {/* JPEG quality */}
                  {imageFormat === "jpg" && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono uppercase text-black/40">JPEG quality</span>
                        <span className="text-[10px] font-mono text-[#ff6a00]">{Math.round(imageQuality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={1}
                        step={0.05}
                        value={imageQuality}
                        onChange={(e) => {
                          setImageQuality(parseFloat(e.target.value));
                          setResult(null);
                        }}
                        className="w-full accent-[#ff6a00]"
                      />
                    </div>
                  )}

                  {file && (scale !== 2 || imageFormat !== "png" || imageQuality !== 0.9) && (
                    <button
                      onClick={rerender}
                      className="w-full mt-3 py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] hover:bg-black/[0.08] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={11} />
                      Apply & re-render
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="rounded-[18px] bg-[#ff6a00]/[0.06] border border-[#ff6a00]/20 p-4">
                  <div className="flex items-start gap-2">
                    <Info
                      size={12}
                      className="text-[#ff6a00] shrink-0 mt-0.5"
                    />
                    <p className="text-[11px] text-black/65 leading-relaxed">
                      Each page is embedded as a high-resolution image inside the Word file. The visual result is <strong>identical</strong> to the PDF — nothing reflows or gets reformatted.
                    </p>
                  </div>
                </div>
              </div>

              {/* ============ CENTER — Preview ============ */}
              <div className="lg:col-span-6 space-y-4">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <Eye
                      size={13}
                      className="text-[#ff6a00]"
                    />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">Page preview</span>
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

                  {/* Zoom */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoom((z) => Math.max(30, z - 10))}
                      className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-[11px] font-mono w-10 text-center">{zoom}%</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(150, z + 10))}
                      className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>

                {/* Preview area */}
                <div className="rounded-[18px] bg-[#ebe7de]/40 border border-black/[0.06] p-6 min-h-[700px] flex items-start justify-center overflow-auto relative">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                      backgroundSize: "20px 20px",
                    }}
                  />
                  {currentPage && (
                    <div
                      style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "top center",
                        transition: "transform 0.2s",
                      }}
                    >
                      <img
                        src={currentPage.dataUrl}
                        alt={`Page ${currentPage.pageNum}`}
                        className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] block"
                        style={{
                          width: Math.round(currentPage.widthPt * 1.5),
                          height: Math.round(currentPage.heightPt * 1.5),
                          objectFit: "contain",
                        }}
                        draggable={false}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* ============ RIGHT — Export ============ */}
              <div className="lg:col-span-3 space-y-4">
                {/* Doc info */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info
                      size={13}
                      className="text-[#ff6a00]"
                    />
                    <span className="text-[10px] font-mono uppercase text-black/40">Document info</span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Pages</span>
                      <span className="font-mono font-medium text-black">{doc.pageCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Page size</span>
                      <span className="font-mono font-medium text-black">
                        {Math.round(doc.pageWidthPt)} × {Math.round(doc.pageHeightPt)} pt
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Resolution</span>
                      <span className="font-mono font-medium text-black">{scale}×</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Output</span>
                      <span className="font-mono font-medium text-[#ff6a00]">{FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.ext.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Save panel */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles
                      size={14}
                      className="text-[#ff6a00]"
                    />
                    <span className="text-[10px] font-mono uppercase text-black/40">Export</span>
                  </div>

                  {result ? (
                    <div className="space-y-3">
                      <div className="text-center py-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle2
                            size={22}
                            className="text-emerald-500"
                          />
                        </div>
                        <div className="text-[13px] font-medium text-black mb-1">Ready to download</div>
                        <div className="text-[10px] font-mono text-black/40">{formatBytes(result.blob.size)}</div>
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2 transition-colors"
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
                        {doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""} will be embedded as images into {FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.label}.
                      </p>
                      <button
                        onClick={handleConvert}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${isProcessing ? "bg-black/[0.08] text-black/40" : "bg-black text-white hover:bg-[#ff6a00]"}`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2
                              size={13}
                              className="animate-spin"
                            />{" "}
                            Building...
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} /> Convert to {FORMAT_OPTIONS.find((f) => f.id === outputFormat)?.ext.toUpperCase()}
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
                  <div className="text-[10px] font-mono uppercase text-black/40 mb-3">Tips</div>
                  <ul className="space-y-2 text-[11px] text-black/60 leading-relaxed">
                    <li>
                      • <strong>PNG</strong> keeps text razor-sharp
                    </li>
                    <li>
                      • <strong>2× scale</strong> is ideal for most PDFs
                    </li>
                    <li>
                      • Use <strong>JPG</strong> for smaller files
                    </li>
                    <li>• Every page keeps its original dimensions</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Back link */}
        <div className="mt-16 text-center">
          <Link
            href="/pdf-tools"
            className="group inline-flex items-center gap-3"
          >
            <span className="relative text-[14px] font-medium text-black pb-1">
              Back to all tools
              <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
            </span>
            <span className="w-8 h-8 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all">
              <ArrowUpRight
                size={13}
                className="text-black group-hover:text-white transition-colors"
              />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
