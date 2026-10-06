"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2, Download, ArrowUpRight, Type, Image as ImageIcon, Square, Circle as CircleIcon, Pen, Highlighter, Eraser, MousePointer2, Undo2, Redo2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Trash2, Save, Bold, Italic, Stamp, Signature, Minus, Droplet, EyeOff, Eye as EyeIcon, Edit3, FileEdit, TextCursor, Copy, AlignLeft, AlignCenter, AlignRight, Lock, Unlock, Move, Layers as LayersIcon, Plus, type LucideIcon } from "lucide-react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { createBlobFromBytes, getPDFInfo, formatBytes, downloadBlob, readFileAsArrayBuffer } from "@/lib/pdf-utils";

// ============================================
// CONSTANTS
// ============================================

const CANVAS_WIDTH = 595; // px display width

// ============================================
// TYPES
// ============================================

type ToolType = "select" | "editexisting" | "text" | "image" | "rect" | "circle" | "line" | "highlight" | "pen" | "signature" | "watermark" | "stamp" | "eraser";

interface BaseElement {
  id: string;
  type: ToolType;
  pageNum: number;
  x: number;
  y: number;
  rotation?: number;
}

interface ExistingTextElement extends Omit<BaseElement, "type"> {
  type: "existingText";
  originalContent: string;
  content: string;
  fontSize: number;
  color: string;
  fontFamily: "Helvetica" | "TimesRoman" | "Courier";
  bold: boolean;
  italic: boolean;
  width: number;
  height: number;
  originalX: number;
  originalY: number;
  modified: boolean;
  deleted: boolean;
}

interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontSize: number;
  color: string;
  fontFamily: "Helvetica" | "TimesRoman" | "Courier";
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  width?: number;
}

interface ImageElement extends BaseElement {
  type: "image";
  dataUrl: string;
  width: number;
  height: number;
}

interface ShapeElement extends BaseElement {
  type: "rect" | "circle" | "line";
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity?: number;
}

interface HighlightElement extends BaseElement {
  type: "highlight";
  width: number;
  height: number;
  color: string;
  opacity: number;
}

interface PenElement extends BaseElement {
  type: "pen";
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

interface SignatureElement extends BaseElement {
  type: "signature";
  dataUrl: string;
  width: number;
  height: number;
}

interface WatermarkElement extends BaseElement {
  type: "watermark";
  content: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
}

interface StampElement extends BaseElement {
  type: "stamp";
  content: string;
  color: string;
}

type EditorElement = TextElement | ImageElement | ShapeElement | HighlightElement | PenElement | SignatureElement | WatermarkElement | StampElement | ExistingTextElement;

interface ToolConfig {
  id: ToolType;
  label: string;
  icon: LucideIcon;
  group: "existing" | "basic" | "shapes" | "annotate" | "insert";
}

const TOOLS: ToolConfig[] = [
  { id: "editexisting", label: "Edit Text", icon: Edit3, group: "existing" },
  { id: "select", label: "Select", icon: MousePointer2, group: "basic" },
  { id: "text", label: "Add Text", icon: Type, group: "basic" },
  { id: "eraser", label: "Delete", icon: Eraser, group: "basic" },
  { id: "rect", label: "Rect", icon: Square, group: "shapes" },
  { id: "circle", label: "Circle", icon: CircleIcon, group: "shapes" },
  { id: "line", label: "Line", icon: Minus, group: "shapes" },
  { id: "highlight", label: "Highlight", icon: Highlighter, group: "annotate" },
  { id: "pen", label: "Draw", icon: Pen, group: "annotate" },
  { id: "image", label: "Image", icon: ImageIcon, group: "insert" },
  { id: "signature", label: "Sign", icon: Signature, group: "insert" },
  { id: "stamp", label: "Stamp", icon: Stamp, group: "insert" },
  { id: "watermark", label: "Watermark", icon: Droplet, group: "insert" },
];

const COLORS = ["#000000", "#ffffff", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#ff6a00"];

const FONT_FAMILIES = [
  { id: "Helvetica" as const, label: "Sans", css: "Helvetica, Arial, sans-serif" },
  { id: "TimesRoman" as const, label: "Serif", css: '"Times New Roman", Times, serif' },
  { id: "Courier" as const, label: "Mono", css: '"Courier New", Courier, monospace' },
];

const STAMPS = ["APPROVED", "DRAFT", "CONFIDENTIAL", "PAID", "REVIEWED", "URGENT"];

// ============================================
// COMPONENT
// ============================================

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageImage, setPageImage] = useState<string>("");
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [currentPage, setCurrentPage] = useState(1);

  const [elements, setElements] = useState<EditorElement[]>([]);
  const [existingTexts, setExistingTexts] = useState<ExistingTextElement[]>([]);

  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [activeTool, setActiveTool] = useState<ToolType>("editexisting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [showExistingText, setShowExistingText] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isLocked, setIsLocked] = useState(false);

  // Active editing state (for inline edit)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  // Resize state
  const [resizing, setResizing] = useState<{
    id: string;
    handle: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    isExisting: boolean;
  } | null>(null);

  // Tool options
  const [textOptions, setTextOptions] = useState({
    fontSize: 20,
    color: "#000000",
    fontFamily: "Helvetica" as "Helvetica" | "TimesRoman" | "Courier",
    bold: false,
    italic: false,
    align: "left" as "left" | "center" | "right",
  });
  const [shapeOptions, setShapeOptions] = useState({
    strokeColor: "#ef4444",
    fillColor: "transparent",
    strokeWidth: 2,
    opacity: 1,
  });
  const [highlightOptions, setHighlightOptions] = useState({ color: "#fde047", opacity: 0.4 });
  const [penOptions, setPenOptions] = useState({ color: "#ef4444", strokeWidth: 3 });
  const [watermarkOptions, setWatermarkOptions] = useState({
    content: "CONFIDENTIAL",
    fontSize: 60,
    color: "#000000",
    opacity: 0.15,
    rotation: 45,
  });
  const [stampOptions, setStampOptions] = useState({ content: "APPROVED", color: "#10b981" });

  // Canvas interaction
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
    isExisting: boolean;
  } | null>(null);
  const [penDrawing, setPenDrawing] = useState<PenElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showSigPad, setShowSigPad] = useState(false);
  const [isDrawingSig, setIsDrawingSig] = useState(false);

  // Visual scale factor (PDF pt -> canvas px)
  const visualScale = CANVAS_WIDTH / pageSize.width;
  const canvasHeight = pageSize.height * visualScale;

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const selectedElement = elements.find((el) => el.id === selectedId);
  const selectedExistingText = existingTexts.find((t) => t.id === selectedId);

  useEffect(() => {
    if (selectedExistingText && activeTool !== "editexisting") {
      setActiveTool("editexisting");
    }
  }, [selectedExistingText?.id]);

  // ============================================
  // HISTORY
  // ============================================

  const pushHistory = useCallback(
    (newElements: EditorElement[]) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const next = [...sliced, JSON.parse(JSON.stringify(newElements))];
        return next.slice(-50);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex],
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => {
    if (!canUndo) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setElements(JSON.parse(JSON.stringify(history[i])));
    setSelectedId(null);
  };

  const redo = () => {
    if (!canRedo) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setElements(JSON.parse(JSON.stringify(history[i])));
    setSelectedId(null);
  };

  // ============================================
  // TEXT EXTRACTION
  // ============================================

  const extractTextFromPage = useCallback(async (f: File, pageNum: number) => {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items: ExistingTextElement[] = [];

    textContent.items.forEach((item: any, idx: number) => {
      if (!item.str || !item.str.trim()) return;

      const tx = item.transform;
      const x = tx[4];
      const y = tx[5];
      const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;

      const baselineFromTopPct = 100 - (y / viewport.height) * 100;
      const fontSizePct = (fontSize / viewport.height) * 100;
      const textTopPct = baselineFromTopPct - fontSizePct * 0.95;
      const textHeightPct = fontSizePct * 1.4;

      const px = (x / viewport.width) * 100;
      const measuredWidth = item.width || fontSize * item.str.length * 0.55;
      const widthPct = (measuredWidth / viewport.width) * 100 + 1.5;

      items.push({
        id: `ext-${pageNum}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: "existingText",
        pageNum,
        x: Math.max(0, px - 0.5),
        y: Math.max(0, textTopPct),
        originalX: Math.max(0, px - 0.5),
        originalY: Math.max(0, textTopPct),
        content: item.str,
        originalContent: item.str,
        fontSize: Math.round(fontSize),
        color: "#000000",
        fontFamily: "Helvetica",
        bold: false,
        italic: false,
        width: Math.max(widthPct, 3),
        height: Math.max(textHeightPct, 1.8),
        modified: false,
        deleted: false,
      });
    });

    return items;
  }, []);

  // ============================================
  // LOAD PDF
  // ============================================

  const renderPage = useCallback(async (f: File, pageNum: number) => {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    const origViewport = page.getViewport({ scale: 1.0 });
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      width: origViewport.width,
      height: origViewport.height,
    };
  }, []);

  const loadPDF = useCallback(
    async (f: File) => {
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        setError("Please select a PDF file.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setFile(f);
      setElements([]);
      setExistingTexts([]);
      setHistory([]);
      setHistoryIndex(-1);
      setCurrentPage(1);
      setSelectedId(null);
      setResult(null);
      setLoadProgress(0);

      try {
        const info = await getPDFInfo(f);
        setPageCount(info.pageCount);

        const rendered = await renderPage(f, 1);
        setPageImage(rendered.dataUrl);
        setPageSize({ width: rendered.width, height: rendered.height });
        setLoadProgress(60);

        const texts = await extractTextFromPage(f, 1);
        setExistingTexts(texts);
        setLoadProgress(100);

        setHistory([[]]);
        setHistoryIndex(0);
        setActiveTool("editexisting");
      } catch (e) {
        console.error(e);
        setError("Failed to load PDF. The file may be corrupted.");
        setFile(null);
      } finally {
        setIsLoading(false);
      }
    },
    [renderPage, extractTextFromPage],
  );

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
    setPageImage("");
    setPageCount(0);
    setElements([]);
    setExistingTexts([]);
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentPage(1);
    setSelectedId(null);
    setResult(null);
    setError(null);
  };

  const goToPage = async (pageNum: number) => {
    if (!file || pageNum < 1 || pageNum > pageCount) return;
    setIsLoading(true);
    try {
      const rendered = await renderPage(file, pageNum);
      setPageImage(rendered.dataUrl);
      setPageSize({ width: rendered.width, height: rendered.height });
      setCurrentPage(pageNum);
      setSelectedId(null);

      const alreadyExtracted = existingTexts.some((t) => t.pageNum === pageNum);
      if (!alreadyExtracted) {
        const texts = await extractTextFromPage(file, pageNum);
        setExistingTexts((prev) => [...prev, ...texts]);
      }
    } catch (e) {
      setError("Failed to load page.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // CANVAS INTERACTION
  // ============================================

  const getRelativeCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (!("clientX" in e)) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const findElementAt = (coords: { x: number; y: number }) => {
    const pad = 1.5;
    const textHit = existingTexts
      .filter((t) => t.pageNum === currentPage && !t.deleted)
      .reverse()
      .find((t) => coords.x >= t.x - pad && coords.x <= t.x + t.width + pad && coords.y >= t.y - pad && coords.y <= t.y + t.height + pad);
    if (textHit) return { element: textHit, isExisting: true };

    const el = elements
      .slice()
      .reverse()
      .find((e) => {
        const w = ("width" in e && (e as any).width) || 15;
        const h = ("height" in e && (e as any).height) || 5;
        return coords.x >= e.x && coords.x <= e.x + w && coords.y >= e.y && coords.y <= e.y + h && e.pageNum === currentPage;
      });
    if (el) return { element: el, isExisting: false };
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;

    // Eraser
    if (activeTool === "eraser") {
      const hit = findElementAt(coords);
      if (hit) {
        if (hit.isExisting) {
          setExistingTexts((prev) => prev.map((t) => (t.id === hit.element.id ? { ...t, deleted: true, modified: true } : t)));
        } else {
          const updated = elements.filter((el) => el.id !== hit.element.id);
          setElements(updated);
          pushHistory(updated);
        }
      }
      return;
    }

    // Select / Edit existing
    if (activeTool === "select" || activeTool === "editexisting") {
      const hit = findElementAt(coords);
      if (hit) {
        setSelectedId(hit.element.id);
        setDragging({
          id: hit.element.id,
          offsetX: coords.x - hit.element.x,
          offsetY: coords.y - hit.element.y,
          isExisting: hit.isExisting,
        });
      } else {
        setSelectedId(null);
      }
      return;
    }

    // Pen
    if (activeTool === "pen") {
      const newPen: PenElement = {
        id: `pen-${Date.now()}`,
        type: "pen",
        pageNum: currentPage,
        x: coords.x,
        y: coords.y,
        points: [coords],
        color: penOptions.color,
        strokeWidth: penOptions.strokeWidth,
      };
      setPenDrawing(newPen);
      return;
    }

    // Watermark
    if (activeTool === "watermark") {
      const newWm: WatermarkElement = {
        id: `wm-${Date.now()}`,
        type: "watermark",
        pageNum: currentPage,
        x: 50,
        y: 50,
        content: watermarkOptions.content,
        fontSize: watermarkOptions.fontSize,
        color: watermarkOptions.color,
        opacity: watermarkOptions.opacity,
        rotation: watermarkOptions.rotation,
      };
      const updated = [...elements, newWm];
      setElements(updated);
      pushHistory(updated);
      setActiveTool("select");
      return;
    }

    // Text
    if (activeTool === "text") {
      const newText: TextElement = {
        id: `text-${Date.now()}`,
        type: "text",
        pageNum: currentPage,
        x: coords.x,
        y: coords.y,
        content: "Double-click to edit",
        fontSize: textOptions.fontSize,
        color: textOptions.color,
        fontFamily: textOptions.fontFamily,
        bold: textOptions.bold,
        italic: textOptions.italic,
        align: textOptions.align,
      };
      const updated = [...elements, newText];
      setElements(updated);
      pushHistory(updated);
      setSelectedId(newText.id);
      setActiveTool("select");
      return;
    }

    // Stamp
    if (activeTool === "stamp") {
      const newStamp: StampElement = {
        id: `stamp-${Date.now()}`,
        type: "stamp",
        pageNum: currentPage,
        x: coords.x - 10,
        y: coords.y - 4,
        content: stampOptions.content,
        color: stampOptions.color,
      };
      const updated = [...elements, newStamp];
      setElements(updated);
      pushHistory(updated);
      setActiveTool("select");
      return;
    }

    setDrawStart(coords);
    setDrawEnd(coords);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const coords = getRelativeCoords(e);
    if (!coords) return;

    if (penDrawing) {
      setPenDrawing({ ...penDrawing, points: [...penDrawing.points, coords] });
      return;
    }

    if (resizing) {
      const dx = coords.x - resizing.startX;
      const dy = coords.y - resizing.startY;
      if (resizing.isExisting) {
        setExistingTexts((prev) =>
          prev.map((t) => {
            if (t.id !== resizing.id) return t;
            let newW = t.width,
              newH = t.height;
            if (resizing.handle.includes("r")) newW = Math.max(2, resizing.startW + dx);
            if (resizing.handle.includes("l")) {
              newW = Math.max(2, resizing.startW - dx);
            }
            if (resizing.handle.includes("b")) newH = Math.max(1.5, resizing.startH + dy);
            if (resizing.handle.includes("t")) {
              newH = Math.max(1.5, resizing.startH - dy);
            }
            return { ...t, width: newW, height: newH, modified: true };
          }),
        );
      } else {
        setElements((prev) =>
          prev.map((el) => {
            if (el.id !== resizing.id) return el;
            if (!("width" in el && "height" in el)) return el;
            let newW = (el as any).width,
              newH = (el as any).height;
            if (resizing.handle.includes("r")) newW = Math.max(2, resizing.startW + dx);
            if (resizing.handle.includes("l")) {
              newW = Math.max(2, resizing.startW - dx);
            }
            if (resizing.handle.includes("b")) newH = Math.max(1.5, resizing.startH + dy);
            if (resizing.handle.includes("t")) {
              newH = Math.max(1.5, resizing.startH - dy);
            }
            return { ...el, width: newW, height: newH } as any;
          }),
        );
      }
      return;
    }

    if (dragging) {
      if (dragging.isExisting) {
        setExistingTexts((prev) => prev.map((t) => (t.id === dragging.id ? { ...t, x: coords.x - dragging.offsetX, y: coords.y - dragging.offsetY, modified: true } : t)));
      } else {
        setElements((prev) => prev.map((el) => (el.id === dragging.id ? { ...el, x: coords.x - dragging.offsetX, y: coords.y - dragging.offsetY } : el)));
      }
      return;
    }

    if (drawStart) setDrawEnd(coords);
  };

  const handleCanvasMouseUp = () => {
    if (penDrawing) {
      const updated = [...elements, penDrawing];
      setElements(updated);
      pushHistory(updated);
      setPenDrawing(null);
      return;
    }

    if (resizing) {
      setResizing(null);
      pushHistory(elements);
      return;
    }

    if (dragging) {
      if (!dragging.isExisting) pushHistory(elements);
      setDragging(null);
      return;
    }

    if (drawStart && drawEnd && activeTool !== "select" && activeTool !== "editexisting") {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const width = Math.abs(drawEnd.x - drawStart.x);
      const height = Math.abs(drawEnd.y - drawStart.y);

      if (width < 1 || height < 1) {
        setDrawStart(null);
        setDrawEnd(null);
        return;
      }

      let newEl: EditorElement | null = null;

      if (activeTool === "rect") {
        newEl = {
          id: `rect-${Date.now()}`,
          type: "rect",
          pageNum: currentPage,
          x,
          y,
          width,
          height,
          strokeColor: shapeOptions.strokeColor,
          fillColor: shapeOptions.fillColor,
          strokeWidth: shapeOptions.strokeWidth,
          opacity: shapeOptions.opacity,
        };
      } else if (activeTool === "circle") {
        newEl = {
          id: `circle-${Date.now()}`,
          type: "circle",
          pageNum: currentPage,
          x,
          y,
          width,
          height,
          strokeColor: shapeOptions.strokeColor,
          fillColor: shapeOptions.fillColor,
          strokeWidth: shapeOptions.strokeWidth,
          opacity: shapeOptions.opacity,
        };
      } else if (activeTool === "line") {
        newEl = {
          id: `line-${Date.now()}`,
          type: "line",
          pageNum: currentPage,
          x: drawStart.x,
          y: drawStart.y,
          width: drawEnd.x - drawStart.x,
          height: drawEnd.y - drawStart.y,
          strokeColor: shapeOptions.strokeColor,
          fillColor: "transparent",
          strokeWidth: shapeOptions.strokeWidth,
        };
      } else if (activeTool === "highlight") {
        newEl = {
          id: `hl-${Date.now()}`,
          type: "highlight",
          pageNum: currentPage,
          x,
          y,
          width,
          height,
          color: highlightOptions.color,
          opacity: highlightOptions.opacity,
        };
      }

      if (newEl) {
        const updated = [...elements, newEl];
        setElements(updated);
        pushHistory(updated);
        setActiveTool("select");
      }
      setDrawStart(null);
      setDrawEnd(null);
    }
  };

  // Resize handle down
  const startResize = (handle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedElement && !selectedExistingText) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;

    if (selectedExistingText) {
      setResizing({
        id: selectedExistingText.id,
        handle,
        startX: coords.x,
        startY: coords.y,
        startW: selectedExistingText.width,
        startH: selectedExistingText.height,
        isExisting: true,
      });
    } else if (selectedElement && "width" in selectedElement && "height" in selectedElement) {
      setResizing({
        id: selectedElement.id,
        handle,
        startX: coords.x,
        startY: coords.y,
        startW: (selectedElement as any).width,
        startH: (selectedElement as any).height,
        isExisting: false,
      });
    }
  };

  // ============================================
  // UPDATE
  // ============================================

  const updateExistingText = (id: string, updates: Partial<ExistingTextElement>) => {
    setExistingTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates, modified: true } : t)));
  };

  const updateElement = (id: string, updates: Partial<EditorElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...updates } as any) : el)));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    if (!imgFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const width = 30;
        const height = (30 / aspect) * (pageSize.width / pageSize.height);

        const newImg: ImageElement = {
          id: `img-${Date.now()}`,
          type: "image",
          pageNum: currentPage,
          x: 35,
          y: 40,
          dataUrl: reader.result as string,
          width,
          height,
        };
        const updated = [...elements, newImg];
        setElements(updated);
        pushHistory(updated);
        setActiveTool("select");
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(imgFile);
    e.target.value = "";
  };

  // ============================================
  // SIGNATURE
  // ============================================

  const startSigDraw = (e: React.MouseEvent) => {
    setIsDrawingSig(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const sigDraw = (e: React.MouseEvent) => {
    if (!isDrawingSig || !sigCanvasRef.current) return;
    const rect = sigCanvasRef.current.getBoundingClientRect();
    const ctx = sigCanvasRef.current.getContext("2d")!;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endSigDraw = () => setIsDrawingSig(false);

  const saveSignature = () => {
    if (!sigCanvasRef.current) return;
    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    const newSig: SignatureElement = {
      id: `sig-${Date.now()}`,
      type: "signature",
      pageNum: currentPage,
      x: 60,
      y: 80,
      dataUrl,
      width: 25,
      height: 10,
    };
    const updated = [...elements, newSig];
    setElements(updated);
    pushHistory(updated);
    setShowSigPad(false);
    setActiveTool("select");
    const ctx = sigCanvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
  };

  const clearSigPad = () => {
    if (!sigCanvasRef.current) return;
    const ctx = sigCanvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
  };

  // ============================================
  // OPERATIONS
  // ============================================

  const deleteSelected = () => {
    if (!selectedId) return;
    const isExisting = existingTexts.some((t) => t.id === selectedId);
    if (isExisting) {
      setExistingTexts((prev) => prev.map((t) => (t.id === selectedId ? { ...t, deleted: true, modified: true } : t)));
    } else {
      const updated = elements.filter((el) => el.id !== selectedId);
      setElements(updated);
      pushHistory(updated);
    }
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    const newEl = { ...el, id: `${el.type}-${Date.now()}`, x: el.x + 3, y: el.y + 3 };
    const updated = [...elements, newEl];
    setElements(updated);
    pushHistory(updated);
    setSelectedId(newEl.id);
  };

  const bringToFront = () => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    const updated = [...elements.filter((e) => e.id !== selectedId), el];
    setElements(updated);
    pushHistory(updated);
  };

  const sendToBack = () => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    const updated = [el, ...elements.filter((e) => e.id !== selectedId)];
    setElements(updated);
    pushHistory(updated);
  };

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!file) return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedId && !isInput) {
        e.preventDefault();
        duplicateSelected();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !isInput) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setActiveTool("select");
        setInlineEditingId(null);
      }
      // Arrow keys to nudge
      if (selectedId && !isInput && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.5;
        const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
        const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
        const isExisting = existingTexts.some((t) => t.id === selectedId);
        if (isExisting) {
          setExistingTexts((prev) => prev.map((t) => (t.id === selectedId ? { ...t, x: t.x + dx, y: t.y + dy, modified: true } : t)));
        } else {
          setElements((prev) => prev.map((el) => (el.id === selectedId ? { ...el, x: el.x + dx, y: el.y + dy } : el)));
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [file, selectedId, canUndo, canRedo]);

  // ============================================
  // SAVE PDF (unchanged logic - just fixed fonts)
  // ============================================

  const buildPDF = async () => {
    if (!file) throw new Error("No file");

    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const sourceBytes = await readFileAsArrayBuffer(file);
    const sourcePdf = await pdfjs.getDocument({ data: sourceBytes }).promise;
    const newDoc = await PDFDocument.create();
    const pdfLibSource = await PDFDocument.load(sourceBytes);

    const fonts = {
      Helvetica: {
        regular: await newDoc.embedFont(StandardFonts.Helvetica),
        bold: await newDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await newDoc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await newDoc.embedFont(StandardFonts.HelveticaBoldOblique),
      },
      TimesRoman: {
        regular: await newDoc.embedFont(StandardFonts.TimesRoman),
        bold: await newDoc.embedFont(StandardFonts.TimesRomanBold),
        italic: await newDoc.embedFont(StandardFonts.TimesRomanItalic),
        boldItalic: await newDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
      },
      Courier: {
        regular: await newDoc.embedFont(StandardFonts.Courier),
        bold: await newDoc.embedFont(StandardFonts.CourierBold),
        italic: await newDoc.embedFont(StandardFonts.CourierOblique),
        boldItalic: await newDoc.embedFont(StandardFonts.CourierBoldOblique),
      },
    };

    for (let i = 1; i <= sourcePdf.numPages; i++) {
      const pageNum = i;
      const pdfPage = await sourcePdf.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale: 2.5 });
      const origViewport = pdfPage.getViewport({ scale: 1.0 });
      const pw = origViewport.width;
      const ph = origViewport.height;

      const pageTexts = existingTexts.filter((t) => t.pageNum === pageNum);
      const hasTextEdits = pageTexts.some((t) => t.modified || t.deleted);
      const pageEls = elements.filter((el) => el.pageNum === pageNum);

      if (hasTextEdits) {
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await pdfPage.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        ctx.fillStyle = "#ffffff";
        const scaleX = canvas.width / 100;
        const scaleY = canvas.height / 100;

        pageTexts.forEach((t) => {
          if (t.modified || t.deleted) {
            const padX = 3.0,
              padY = 2.0;
            const x = Math.max(0, t.originalX - padX) * scaleX;
            const y = Math.max(0, t.originalY - padY) * scaleY;
            const w = (t.width + padX * 2) * scaleX;
            const h = (t.height + padY * 2) * scaleY;
            ctx.fillRect(x, y, w, h);
          }
        });

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const base64 = dataUrl.split(",")[1];
        const binary = atob(base64);
        const imgBytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) imgBytes[j] = binary.charCodeAt(j);

        const embedded = await newDoc.embedJpg(imgBytes);
        const newPage = newDoc.addPage([pw, ph]);
        newPage.drawImage(embedded, { x: 0, y: 0, width: pw, height: ph });

        for (const t of pageTexts) {
          if (t.deleted) continue;
          if (!t.content.trim()) continue;
          const fontSet = fonts[t.fontFamily];
          const font = t.bold && t.italic ? fontSet.boldItalic : t.bold ? fontSet.bold : t.italic ? fontSet.italic : fontSet.regular;
          const colorRgb = hexToRgb(t.color);
          const pdfX = (t.x / 100) * pw;
          const pdfY = ph - (t.y / 100) * ph - t.fontSize * 1.05;
          const lines = t.content.split("\n");
          lines.forEach((line, idx) => {
            newPage.drawText(line, {
              x: pdfX,
              y: pdfY - idx * t.fontSize * 1.2,
              size: t.fontSize,
              font,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
            });
          });
        }
      } else {
        const [copied] = await newDoc.copyPages(pdfLibSource, [pageNum - 1]);
        newDoc.addPage(copied);
      }

      const pdfPages = newDoc.getPages();
      const currentPdfPage = pdfPages[pdfPages.length - 1];

      for (const el of pageEls) {
        const pdfX = (el.x / 100) * pw;
        const pdfY = ph - (el.y / 100) * ph;

        if (el.type === "text") {
          const fontSet = fonts[el.fontFamily];
          const font = el.bold && el.italic ? fontSet.boldItalic : el.bold ? fontSet.bold : el.italic ? fontSet.italic : fontSet.regular;
          const textWidth = font.widthOfTextAtSize(el.content, el.fontSize);
          let drawX = pdfX;
          if (el.align === "center") drawX = pdfX - textWidth / 2;
          else if (el.align === "right") drawX = pdfX - textWidth;
          const colorRgb = hexToRgb(el.color);
          const lines = el.content.split("\n");
          lines.forEach((line, lineIdx) => {
            currentPdfPage.drawText(line, {
              x: drawX,
              y: pdfY - el.fontSize - lineIdx * (el.fontSize * 1.2),
              size: el.fontSize,
              font,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
            });
          });
        }

        if (el.type === "image" || el.type === "signature") {
          const dataUrl = el.dataUrl;
          const isPng = dataUrl.startsWith("data:image/png");
          const base64 = dataUrl.split(",")[1];
          const binary = atob(base64);
          const imgBytes = new Uint8Array(binary.length);
          for (let j = 0; j < binary.length; j++) imgBytes[j] = binary.charCodeAt(j);
          const embedded = isPng ? await newDoc.embedPng(imgBytes) : await newDoc.embedJpg(imgBytes);
          const w = (el.width / 100) * pw;
          const h = (el.height / 100) * ph;
          currentPdfPage.drawImage(embedded, { x: pdfX, y: pdfY - h, width: w, height: h });
        }

        if (el.type === "rect") {
          const w = (el.width / 100) * pw;
          const h = (el.height / 100) * ph;
          const srgb = hexToRgb(el.strokeColor);
          currentPdfPage.drawRectangle({
            x: pdfX,
            y: pdfY - h,
            width: w,
            height: h,
            borderColor: rgb(srgb.r, srgb.g, srgb.b),
            borderWidth: el.strokeWidth,
            color:
              el.fillColor !== "transparent"
                ? (() => {
                    const f = hexToRgb(el.fillColor);
                    return rgb(f.r, f.g, f.b);
                  })()
                : undefined,
            opacity: el.opacity ?? 1,
          });
        }

        if (el.type === "circle") {
          const w = (el.width / 100) * pw;
          const h = (el.height / 100) * ph;
          const srgb = hexToRgb(el.strokeColor);
          currentPdfPage.drawEllipse({
            x: pdfX + w / 2,
            y: pdfY - h / 2,
            xScale: w / 2,
            yScale: h / 2,
            borderColor: rgb(srgb.r, srgb.g, srgb.b),
            borderWidth: el.strokeWidth,
            color:
              el.fillColor !== "transparent"
                ? (() => {
                    const f = hexToRgb(el.fillColor);
                    return rgb(f.r, f.g, f.b);
                  })()
                : undefined,
            opacity: el.opacity ?? 1,
          });
        }

        if (el.type === "line") {
          const srgb = hexToRgb(el.strokeColor);
          currentPdfPage.drawLine({
            start: { x: pdfX, y: pdfY },
            end: { x: pdfX + (el.width / 100) * pw, y: pdfY - (el.height / 100) * ph },
            thickness: el.strokeWidth,
            color: rgb(srgb.r, srgb.g, srgb.b),
          });
        }

        if (el.type === "highlight") {
          const w = (el.width / 100) * pw;
          const h = (el.height / 100) * ph;
          const rgb2 = hexToRgb(el.color);
          currentPdfPage.drawRectangle({
            x: pdfX,
            y: pdfY - h,
            width: w,
            height: h,
            color: rgb(rgb2.r, rgb2.g, rgb2.b),
            opacity: el.opacity,
          });
        }

        if (el.type === "pen") {
          const srgb = hexToRgb(el.color);
          for (let k = 1; k < el.points.length; k++) {
            const p1 = el.points[k - 1];
            const p2 = el.points[k];
            currentPdfPage.drawLine({
              start: { x: (p1.x / 100) * pw, y: ph - (p1.y / 100) * ph },
              end: { x: (p2.x / 100) * pw, y: ph - (p2.y / 100) * ph },
              thickness: el.strokeWidth,
              color: rgb(srgb.r, srgb.g, srgb.b),
            });
          }
        }

        if (el.type === "watermark") {
          const font = fonts.Helvetica.bold;
          const crgb = hexToRgb(el.color);
          const textWidth = font.widthOfTextAtSize(el.content, el.fontSize);
          currentPdfPage.drawText(el.content, {
            x: pw / 2 - textWidth / 2,
            y: ph / 2,
            size: el.fontSize,
            font,
            color: rgb(crgb.r, crgb.g, crgb.b),
            opacity: el.opacity,
            rotate: degrees(el.rotation),
          });
        }

        if (el.type === "stamp") {
          const font = fonts.Helvetica.bold;
          const crgb = hexToRgb(el.color);
          const fontSize = 24;
          const text = el.content;
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const padding = 12;
          const boxW = textWidth + padding * 2;
          const boxH = fontSize + padding * 1.5;
          currentPdfPage.drawRectangle({
            x: pdfX,
            y: pdfY - boxH,
            width: boxW,
            height: boxH,
            borderColor: rgb(crgb.r, crgb.g, crgb.b),
            borderWidth: 3,
            color: rgb(1, 1, 1),
            opacity: 0.9,
          });
          currentPdfPage.drawText(text, {
            x: pdfX + padding,
            y: pdfY - boxH + padding * 0.6,
            size: fontSize,
            font,
            color: rgb(crgb.r, crgb.g, crgb.b),
          });
        }
      }
    }

    return await newDoc.save();
  };

  const handleSave = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    try {
      const bytes = await buildPDF();
      const blob = createBlobFromBytes(bytes, "application/pdf");
      const baseName = file.name.replace(/\.pdf$/i, "");
      setResult({ blob, filename: `${baseName}-edited.pdf` });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || "Failed to save PDF." : "Failed to save PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  function hexToRgb(hex: string) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return {
      r: ((bigint >> 16) & 255) / 255,
      g: ((bigint >> 8) & 255) / 255,
      b: (bigint & 255) / 255,
    };
  }

  const pageElements = elements.filter((el) => el.pageNum === currentPage);
  const pageExistingTexts = existingTexts.filter((t) => t.pageNum === currentPage);
  const isEditMode = activeTool === "editexisting";

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
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Edit PDF — Real Text Editor</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Click any text to edit</span>
            <span>·</span>
            <span>Client-side</span>
          </div>
        </div>

        {!file && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Chapter 04 — Edit</div>
              <h1
                className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Complete <span className="italic text-[#ff6a00]">PDF</span> editor.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">Extract and edit existing text, add new content, shapes, images, and signatures. Real PDF output.</p>
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
              className={`relative p-16 rounded-[22px] bg-white border-2 border-dashed transition-all cursor-pointer ${isDragging ? "border-[#ff6a00] bg-[#ff6a00]/[0.03] scale-[1.01]" : "border-black/[0.12] hover:border-[#ff6a00]/40"}`}
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8">
                  <FileEdit
                    size={32}
                    strokeWidth={1.5}
                    className="text-[#ff6a00]"
                  />
                </div>
                <h3
                  className="text-[26px] md:text-[30px] text-black mb-4"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {isDragging ? "Drop PDF here" : "Select or drop a PDF to edit"}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">Open any PDF — extract existing text, edit it directly, add new content, and save.</p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <UploadCloud size={14} /> Choose PDF file <ArrowUpRight size={12} />
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
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2
              size={40}
              className="text-[#ff6a00] animate-spin"
            />
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">Extracting PDF text... {loadProgress}%</span>
            <div className="mt-4 w-64 h-1 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div
                className="h-full bg-[#ff6a00]"
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        )}

        {/* EDITOR */}
        {file && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* ============ LEFT SIDEBAR ============ */}
            <div className="lg:col-span-3 space-y-4">
              {/* File info */}
              <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f4f1ea] flex items-center justify-center shrink-0">
                    <FileText
                      size={14}
                      className="text-[#ff6a00]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-black truncate">{file.name}</div>
                    <div className="text-[10px] font-mono uppercase text-black/40">
                      {pageCount} pages · {pageExistingTexts.length} text
                    </div>
                  </div>
                </div>
                <button
                  onClick={reset}
                  className="w-full py-2 rounded-lg text-[10px] font-mono uppercase text-black/40 hover:text-red-500 hover:bg-red-500/5 transition-colors"
                >
                  Close file
                </button>
              </div>

              {/* ============ TEXT EDIT PANEL (existing + new) ============ */}
              {(selectedExistingText || (selectedElement && selectedElement.type === "text")) && (
                <div className="rounded-[18px] bg-white border-2 border-[#ff6a00]/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TextCursor
                      size={14}
                      className="text-[#ff6a00]"
                    />
                    <span className="text-[10px] font-mono uppercase text-[#ff6a00] font-semibold">{selectedExistingText ? "Editing existing text" : "Editing text"}</span>
                  </div>

                  {/* Content */}
                  <textarea
                    value={selectedExistingText ? selectedExistingText.content : (selectedElement as TextElement).content}
                    onChange={(e) => {
                      if (selectedExistingText) updateExistingText(selectedExistingText.id, { content: e.target.value });
                      else if (selectedElement) updateElement(selectedElement.id, { content: e.target.value } as any);
                    }}
                    rows={3}
                    className="w-full bg-[#f4f1ea] rounded-lg px-3 py-2 outline-none text-[13px] border border-black/[0.06] focus:border-[#ff6a00] resize-none mb-3"
                  />

                  {/* Size + Align */}
                  <div className="mb-3">
                    <label className="flex items-center justify-between text-[9px] font-mono uppercase text-black/40 mb-2">
                      <span>Font Size</span>
                      <span className="text-[#ff6a00] font-bold">{selectedExistingText ? selectedExistingText.fontSize : (selectedElement as TextElement)?.fontSize}pt</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const cur = selectedExistingText ? selectedExistingText.fontSize : (selectedElement as TextElement)?.fontSize || 16;
                          const v = Math.max(6, cur - 2);
                          if (selectedExistingText) updateExistingText(selectedExistingText.id, { fontSize: v });
                          else if (selectedElement) updateElement(selectedElement.id, { fontSize: v } as any);
                        }}
                        className="w-7 h-7 rounded-md bg-[#f4f1ea] hover:bg-black/[0.08] flex items-center justify-center"
                      >
                        <Minus size={11} />
                      </button>
                      <input
                        type="range"
                        min={6}
                        max={120}
                        value={selectedExistingText ? selectedExistingText.fontSize : (selectedElement as TextElement)?.fontSize || 16}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (selectedExistingText) updateExistingText(selectedExistingText.id, { fontSize: v });
                          else if (selectedElement) updateElement(selectedElement.id, { fontSize: v } as any);
                        }}
                        className="flex-1 accent-[#ff6a00]"
                      />
                      <button
                        onClick={() => {
                          const cur = selectedExistingText ? selectedExistingText.fontSize : (selectedElement as TextElement)?.fontSize || 16;
                          const v = Math.min(120, cur + 2);
                          if (selectedExistingText) updateExistingText(selectedExistingText.id, { fontSize: v });
                          else if (selectedElement) updateElement(selectedElement.id, { fontSize: v } as any);
                        }}
                        className="w-7 h-7 rounded-md bg-[#f4f1ea] hover:bg-black/[0.08] flex items-center justify-center"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Font family */}
                  <div className="mb-3">
                    <label className="block text-[9px] font-mono uppercase text-black/40 mb-2">Font Family</label>
                    <div className="grid grid-cols-3 gap-1">
                      {FONT_FAMILIES.map((f) => {
                        const cur = selectedExistingText ? selectedExistingText.fontFamily : (selectedElement as TextElement)?.fontFamily || "Helvetica";
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              if (selectedExistingText) updateExistingText(selectedExistingText.id, { fontFamily: f.id });
                              else if (selectedElement) updateElement(selectedElement.id, { fontFamily: f.id } as any);
                            }}
                            className={`py-1.5 rounded-md text-[11px] transition-all ${cur === f.id ? "bg-[#ff6a00] text-white" : "bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]"}`}
                            style={{ fontFamily: f.css }}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bold/Italic + Align */}
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    <button
                      onClick={() => {
                        const cur = selectedExistingText ? selectedExistingText.bold : (selectedElement as TextElement)?.bold;
                        if (selectedExistingText) updateExistingText(selectedExistingText.id, { bold: !cur });
                        else if (selectedElement) updateElement(selectedElement.id, { bold: !cur } as any);
                      }}
                      className={`py-1.5 rounded-md flex items-center justify-center ${(selectedExistingText ? selectedExistingText.bold : (selectedElement as TextElement)?.bold) ? "bg-[#ff6a00] text-white" : "bg-[#f4f1ea] text-black/60"}`}
                    >
                      <Bold size={11} />
                    </button>
                    <button
                      onClick={() => {
                        const cur = selectedExistingText ? selectedExistingText.italic : (selectedElement as TextElement)?.italic;
                        if (selectedExistingText) updateExistingText(selectedExistingText.id, { italic: !cur });
                        else if (selectedElement) updateElement(selectedElement.id, { italic: !cur } as any);
                      }}
                      className={`py-1.5 rounded-md flex items-center justify-center ${(selectedExistingText ? selectedExistingText.italic : (selectedElement as TextElement)?.italic) ? "bg-[#ff6a00] text-white" : "bg-[#f4f1ea] text-black/60"}`}
                    >
                      <Italic size={11} />
                    </button>
                    {(["left", "center", "right"] as const).map((a) => {
                      const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                      const cur = (selectedElement as TextElement)?.align || "left";
                      return (
                        <button
                          key={a}
                          onClick={() => selectedElement && updateElement(selectedElement.id, { align: a } as any)}
                          disabled={!!selectedExistingText}
                          className={`py-1.5 rounded-md flex items-center justify-center transition-all ${!selectedExistingText && cur === a ? "bg-[#ff6a00] text-white" : "bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]"} ${selectedExistingText ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          <Icon size={11} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Color */}
                  <div className="mb-3">
                    <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Color</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {COLORS.map((c) => {
                        const cur = selectedExistingText ? selectedExistingText.color : (selectedElement as TextElement)?.color;
                        return (
                          <button
                            key={c}
                            onClick={() => {
                              if (selectedExistingText) updateExistingText(selectedExistingText.id, { color: c });
                              else if (selectedElement) updateElement(selectedElement.id, { color: c } as any);
                            }}
                            className={`aspect-square rounded-md border-2 transition-all ${cur === c ? "border-[#ff6a00] scale-110" : "border-black/[0.08]"}`}
                            style={{ backgroundColor: c }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-black/[0.06]">
                    {selectedExistingText ? (
                      <>
                        <button
                          onClick={() => {
                            updateExistingText(selectedExistingText.id, {
                              content: selectedExistingText.originalContent,
                              x: selectedExistingText.originalX,
                              y: selectedExistingText.originalY,
                              modified: false,
                              deleted: false,
                              fontSize: Math.round(selectedExistingText.fontSize),
                              color: "#000000",
                              bold: false,
                              italic: false,
                            });
                          }}
                          className="flex-1 py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] hover:bg-black/[0.08]"
                        >
                          Revert
                        </button>
                        <button
                          onClick={() => {
                            updateExistingText(selectedExistingText.id, { deleted: true });
                            setSelectedId(null);
                          }}
                          className="flex-1 py-2 rounded-md bg-red-500/10 text-red-500 text-[10px] hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={duplicateSelected}
                          className="flex-1 py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px] hover:bg-black/[0.08]"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={deleteSelected}
                          className="flex-1 py-2 rounded-md bg-red-500/10 text-red-500 text-[10px] hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* SHAPE OPTIONS PANEL */}
              {selectedElement && (selectedElement.type === "rect" || selectedElement.type === "circle" || selectedElement.type === "line") && (
                <div className="rounded-[18px] bg-white border-2 border-[#ff6a00]/40 p-4">
                  <div className="text-[10px] font-mono uppercase text-[#ff6a00] font-semibold mb-3">Shape Options</div>

                  {/* Stroke color */}
                  <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Stroke</label>
                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateElement(selectedElement.id, { strokeColor: c } as any)}
                        className={`aspect-square rounded-md border-2 ${(selectedElement as ShapeElement).strokeColor === c ? "border-[#ff6a00] scale-110" : "border-black/[0.08]"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>

                  {/* Fill */}
                  {selectedElement.type !== "line" && (
                    <>
                      <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Fill</label>
                      <div className="grid grid-cols-6 gap-1.5 mb-3">
                        <button
                          onClick={() => updateElement(selectedElement.id, { fillColor: "transparent" } as any)}
                          className={`aspect-square rounded-md border-2 flex items-center justify-center text-[10px] ${(selectedElement as ShapeElement).fillColor === "transparent" ? "border-[#ff6a00]" : "border-black/[0.08]"}`}
                        >
                          <X size={10} />
                        </button>
                        {COLORS.slice(0, 5).map((c) => (
                          <button
                            key={c}
                            onClick={() => updateElement(selectedElement.id, { fillColor: c } as any)}
                            className={`aspect-square rounded-md border-2 ${(selectedElement as ShapeElement).fillColor === c ? "border-[#ff6a00] scale-110" : "border-black/[0.08]"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Stroke width */}
                  <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                    <span>Width</span>
                    <span className="text-[#ff6a00]">{(selectedElement as ShapeElement).strokeWidth}px</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={(selectedElement as ShapeElement).strokeWidth}
                    onChange={(e) => updateElement(selectedElement.id, { strokeWidth: parseInt(e.target.value) } as any)}
                    className="w-full accent-[#ff6a00] mb-3"
                  />

                  {/* Opacity */}
                  <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                    <span>Opacity</span>
                    <span className="text-[#ff6a00]">{Math.round(((selectedElement as ShapeElement).opacity ?? 1) * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={((selectedElement as ShapeElement).opacity ?? 1) * 100}
                    onChange={(e) => updateElement(selectedElement.id, { opacity: parseInt(e.target.value) / 100 } as any)}
                    className="w-full accent-[#ff6a00] mb-3"
                  />

                  <div className="flex gap-2 pt-3 border-t border-black/[0.06]">
                    <button
                      onClick={duplicateSelected}
                      className="flex-1 py-2 rounded-md bg-[#f4f1ea] text-black/60 text-[10px]"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={deleteSelected}
                      className="flex-1 py-2 rounded-md bg-red-500/10 text-red-500 text-[10px]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Text Overlays toggle */}
              <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                <div className="text-[10px] font-mono uppercase text-black/40 mb-3">Text Overlays</div>
                <button
                  onClick={() => setShowExistingText(!showExistingText)}
                  className={`w-full py-2.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-2 ${showExistingText ? "bg-[#ff6a00] text-white" : "bg-[#f4f1ea] text-black/60"}`}
                >
                  {showExistingText ? <EyeIcon size={12} /> : <EyeOff size={12} />}
                  {showExistingText ? "Hide text" : "Show text"}
                </button>
              </div>

              {/* Tools */}
              <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                <div className="text-[10px] font-mono uppercase text-black/40 mb-3">Tools</div>

                {(["existing", "basic", "shapes", "annotate", "insert"] as const).map((group) => (
                  <div
                    key={group}
                    className="mb-4 last:mb-0"
                  >
                    <div className="text-[9px] font-mono uppercase text-black/30 mb-2 px-1 capitalize">{group === "existing" ? "Edit Existing" : group}</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TOOLS.filter((t) => t.group === group).map((tool) => {
                        const Icon = tool.icon;
                        const isActive = activeTool === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              if (tool.id === "image") imageInputRef.current?.click();
                              else if (tool.id === "signature") setShowSigPad(true);
                              else setActiveTool(tool.id);
                            }}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${isActive ? "bg-[#ff6a00] text-white shadow-lg" : "bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]"}`}
                          >
                            <Icon size={14} />
                            <span className="text-[7px] font-mono uppercase">{tool.label.slice(0, 6)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lock toggle */}
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`w-full py-2.5 rounded-lg text-[11px] font-mono uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 ${isLocked ? "bg-red-500/10 text-red-500 border border-red-500/30" : "bg-white border border-black/[0.06] text-black/60"}`}
              >
                {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                {isLocked ? "Locked" : "Unlocked"}
              </button>
            </div>

            {/* ============ CENTER — CANVAS ============ */}
            <div className="lg:col-span-6 space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                  >
                    <Redo2 size={14} />
                  </button>
                  <div className="w-px h-5 bg-black/10 mx-1" />
                  <button
                    onClick={duplicateSelected}
                    disabled={!selectedId}
                    className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                    title="Duplicate (Ctrl+D)"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={!selectedId}
                    className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30 flex items-center justify-center"
                    title="Delete (Del)"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-[#f4f1ea] rounded-lg p-1">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className="px-2 text-[12px] font-mono">
                    {currentPage} / {pageCount}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= pageCount}
                    className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 flex items-center justify-center"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

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
              </div>

              {/* Canvas */}
              <div className="rounded-[18px] bg-[#ebe7de]/40 border border-black/[0.06] p-6 min-h-[700px] flex items-start justify-center overflow-auto relative">
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                    backgroundSize: "20px 20px",
                  }}
                />

                <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", transition: "transform 0.2s" }}>
                  <div
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] rounded-sm overflow-hidden"
                    style={{
                      width: CANVAS_WIDTH,
                      height: canvasHeight,
                      cursor: isLocked ? "not-allowed" : activeTool === "editexisting" ? "crosshair" : activeTool === "select" ? "default" : activeTool === "text" ? "text" : "crosshair",
                    }}
                  >
                    <img
                      src={pageImage}
                      alt=""
                      className="absolute inset-0 w-full h-full pointer-events-none select-none"
                      draggable={false}
                    />

                    {/* ========== EXISTING TEXT OVERLAYS (FIXED!) ========== */}
                    {showExistingText &&
                      pageExistingTexts
                        .filter((t) => !t.deleted)
                        .map((t) => {
                          const isSelected = selectedId === t.id;
                          const isEdited = t.modified;
                          const isInlineEditing = inlineEditingId === t.id;

                          return (
                            <div
                              key={t.id}
                              style={{
                                position: "absolute",
                                left: `${t.x}%`,
                                top: `${t.y}%`,
                                minWidth: `${t.width}%`,
                                minHeight: `${t.height}%`,
                                color: isSelected || isEdited ? t.color : "transparent",
                                // ✅ FIXED: Use px instead of % for fontSize
                                fontSize: `${t.fontSize * visualScale}px`,
                                fontFamily: FONT_FAMILIES.find((f) => f.id === t.fontFamily)?.css || "Helvetica, Arial, sans-serif",
                                fontWeight: t.bold ? "bold" : "normal",
                                fontStyle: t.italic ? "italic" : "normal",
                                lineHeight: 1.15,
                                whiteSpace: "pre-wrap",
                                padding: "1px 3px",
                                outline: isSelected ? "2px solid #ff6a00" : isEdited ? "2px dashed #10b981" : isEditMode ? "1.5px dashed rgba(255,106,0,0.5)" : "none",
                                outlineOffset: 1,
                                background: isSelected || isEdited ? "#ffffff" : isEditMode ? "rgba(255,245,230,0.9)" : "transparent",
                                cursor: isEditMode ? "move" : "pointer",
                                userSelect: "none",
                                zIndex: 15,
                                pointerEvents: "auto",
                                transition: "background 0.15s, outline 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected && !isEdited) {
                                  e.currentTarget.style.background = "rgba(255,106,0,0.2)";
                                  e.currentTarget.style.outline = "1.5px solid #ff6a00";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected && !isEdited) {
                                  e.currentTarget.style.background = isEditMode ? "rgba(255,245,230,0.9)" : "transparent";
                                  e.currentTarget.style.outline = isEditMode ? "1.5px dashed rgba(255,106,0,0.5)" : "none";
                                }
                              }}
                              onDoubleClick={() => setInlineEditingId(t.id)}
                            >
                              {isInlineEditing ? (
                                <textarea
                                  autoFocus
                                  value={t.content}
                                  onChange={(e) => updateExistingText(t.id, { content: e.target.value })}
                                  onBlur={() => setInlineEditingId(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") setInlineEditingId(null);
                                  }}
                                  style={{
                                    background: "white",
                                    border: "2px solid #ff6a00",
                                    outline: "none",
                                    padding: "2px 4px",
                                    fontSize: `${t.fontSize * visualScale}px`,
                                    fontFamily: FONT_FAMILIES.find((f) => f.id === t.fontFamily)?.css,
                                    color: t.color,
                                    minWidth: 100,
                                    minHeight: 20,
                                  }}
                                />
                              ) : (
                                t.content
                              )}

                              {/* Resize handles when selected */}
                              {isSelected && (
                                <>
                                  <div
                                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-se-resize"
                                    onMouseDown={startResize("br")}
                                    style={{ zIndex: 100 }}
                                  />
                                  <div
                                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-nw-resize"
                                    onMouseDown={startResize("tl")}
                                    style={{ zIndex: 100 }}
                                  />
                                  <div
                                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-ne-resize"
                                    onMouseDown={startResize("tr")}
                                    style={{ zIndex: 100 }}
                                  />
                                  <div
                                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-sw-resize"
                                    onMouseDown={startResize("bl")}
                                    style={{ zIndex: 100 }}
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}

                    {/* ========== NEW ELEMENTS ========== */}
                    {pageElements.map((el) => {
                      const isSelected = selectedId === el.id;
                      const style: React.CSSProperties = {
                        position: "absolute",
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        cursor: isLocked ? "not-allowed" : activeTool === "select" || activeTool === "editexisting" ? "move" : "default",
                        zIndex: 5,
                      };

                      if (el.type === "text") {
                        const isInlineEditing = inlineEditingId === el.id;
                        return (
                          <div
                            key={el.id}
                            style={{
                              ...style,
                              color: el.color,
                              // ✅ FIXED: Use px not %
                              fontSize: `${el.fontSize * visualScale}px`,
                              fontFamily: FONT_FAMILIES.find((f) => f.id === el.fontFamily)?.css || "Helvetica, Arial, sans-serif",
                              fontWeight: el.bold ? "bold" : "normal",
                              fontStyle: el.italic ? "italic" : "normal",
                              textAlign: el.align,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.15,
                              padding: isSelected ? 2 : 0,
                              outline: isSelected ? "1.5px dashed #ff6a00" : "none",
                              outlineOffset: 2,
                              userSelect: "none",
                              zIndex: 10,
                            }}
                            onDoubleClick={() => setInlineEditingId(el.id)}
                          >
                            {isInlineEditing ? (
                              <textarea
                                autoFocus
                                value={el.content}
                                onChange={(e) => updateElement(el.id, { content: e.target.value } as any)}
                                onBlur={() => setInlineEditingId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setInlineEditingId(null);
                                }}
                                style={{
                                  background: "white",
                                  border: "2px solid #ff6a00",
                                  outline: "none",
                                  padding: "2px 4px",
                                  fontSize: `${el.fontSize * visualScale}px`,
                                  fontFamily: FONT_FAMILIES.find((f) => f.id === el.fontFamily)?.css,
                                  color: el.color,
                                  minWidth: 100,
                                  minHeight: 20,
                                  textAlign: el.align,
                                }}
                              />
                            ) : (
                              el.content
                            )}

                            {isSelected && (
                              <div
                                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-se-resize"
                                style={{ zIndex: 100 }}
                              />
                            )}
                          </div>
                        );
                      }

                      if (el.type === "image" || el.type === "signature") {
                        return (
                          <div
                            key={el.id}
                            style={{
                              ...style,
                              width: `${el.width}%`,
                              height: `${el.height}%`,
                              outline: isSelected ? "1.5px dashed #ff6a00" : "none",
                              outlineOffset: 2,
                            }}
                          >
                            <img
                              src={el.dataUrl}
                              alt=""
                              draggable={false}
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                            {isSelected && (
                              <>
                                <div
                                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-se-resize"
                                  onMouseDown={startResize("br")}
                                  style={{ zIndex: 100 }}
                                />
                                <div
                                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-nw-resize"
                                  onMouseDown={startResize("tl")}
                                  style={{ zIndex: 100 }}
                                />
                              </>
                            )}
                          </div>
                        );
                      }

                      if (el.type === "rect") {
                        return (
                          <div
                            key={el.id}
                            style={{
                              ...style,
                              width: `${el.width}%`,
                              height: `${el.height}%`,
                              border: `${el.strokeWidth * 0.7}px solid ${el.strokeColor}`,
                              background: el.fillColor !== "transparent" ? el.fillColor : "transparent",
                              opacity: el.opacity ?? 1,
                              outline: isSelected ? "1.5px dashed #ff6a00" : "none",
                              outlineOffset: 2,
                            }}
                          >
                            {isSelected && (
                              <>
                                <div
                                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-se-resize"
                                  onMouseDown={startResize("br")}
                                  style={{ zIndex: 100 }}
                                />
                                <div
                                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-nw-resize"
                                  onMouseDown={startResize("tl")}
                                  style={{ zIndex: 100 }}
                                />
                              </>
                            )}
                          </div>
                        );
                      }

                      if (el.type === "circle") {
                        return (
                          <div
                            key={el.id}
                            style={{
                              ...style,
                              width: `${el.width}%`,
                              height: `${el.height}%`,
                              border: `${el.strokeWidth * 0.7}px solid ${el.strokeColor}`,
                              background: el.fillColor !== "transparent" ? el.fillColor : "transparent",
                              borderRadius: "50%",
                              opacity: el.opacity ?? 1,
                              outline: isSelected ? "1.5px dashed #ff6a00" : "none",
                              outlineOffset: 2,
                            }}
                          />
                        );
                      }

                      if (el.type === "line") {
                        const length = Math.sqrt(el.width * el.width + el.height * el.height);
                        const angle = Math.atan2(el.height, el.width) * (180 / Math.PI);
                        return (
                          <div
                            key={el.id}
                            style={{
                              position: "absolute",
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              width: `${length}%`,
                              height: 0,
                              borderTop: `${el.strokeWidth * 0.7}px solid ${el.strokeColor}`,
                              transform: `rotate(${angle}deg)`,
                              transformOrigin: "0 0",
                              outline: isSelected ? "1.5px dashed #ff6a00" : "none",
                            }}
                          />
                        );
                      }

                      if (el.type === "highlight") {
                        return (
                          <div
                            key={el.id}
                            style={{
                              ...style,
                              width: `${el.width}%`,
                              height: `${el.height}%`,
                              background: el.color,
                              opacity: el.opacity,
                              mixBlendMode: "multiply",
                              outline: isSelected ? "1.5px dashed #ff6a00" : "none",
                            }}
                          />
                        );
                      }

                      if (el.type === "pen") {
                        const pts = el.points;
                        if (pts.length < 2) return null;
                        return (
                          <svg
                            key={el.id}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}
                          >
                            <polyline
                              points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                              fill="none"
                              stroke={el.color}
                              strokeWidth={el.strokeWidth * 0.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>
                        );
                      }

                      if (el.type === "stamp") {
                        return (
                          <div
                            key={el.id}
                            style={{
                              ...style,
                              border: `3px solid ${el.color}`,
                              color: el.color,
                              padding: "6px 12px",
                              fontFamily: "Helvetica, sans-serif",
                              fontWeight: "bold",
                              fontSize: 18,
                              letterSpacing: "0.05em",
                              borderRadius: 6,
                              background: "rgba(255,255,255,0.9)",
                              transform: "rotate(-8deg)",
                              outline: isSelected ? "1.5px dashed #ff6a00" : "none",
                            }}
                          >
                            {el.content}
                          </div>
                        );
                      }

                      if (el.type === "watermark") {
                        return (
                          <div
                            key={el.id}
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: "50%",
                              transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
                              color: el.color,
                              opacity: el.opacity,
                              fontSize: el.fontSize * visualScale,
                              fontFamily: "Helvetica, sans-serif",
                              fontWeight: "bold",
                              whiteSpace: "nowrap",
                              pointerEvents: "none",
                              zIndex: 5,
                            }}
                          >
                            {el.content}
                          </div>
                        );
                      }

                      return null;
                    })}

                    {/* Draw previews */}
                    {drawStart && drawEnd && activeTool === "rect" && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${Math.min(drawStart.x, drawEnd.x)}%`,
                          top: `${Math.min(drawStart.y, drawEnd.y)}%`,
                          width: `${Math.abs(drawEnd.x - drawStart.x)}%`,
                          height: `${Math.abs(drawEnd.y - drawStart.y)}%`,
                          border: `${shapeOptions.strokeWidth}px dashed ${shapeOptions.strokeColor}`,
                          pointerEvents: "none",
                          zIndex: 20,
                        }}
                      />
                    )}

                    {drawStart && drawEnd && activeTool === "circle" && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${Math.min(drawStart.x, drawEnd.x)}%`,
                          top: `${Math.min(drawStart.y, drawEnd.y)}%`,
                          width: `${Math.abs(drawEnd.x - drawStart.x)}%`,
                          height: `${Math.abs(drawEnd.y - drawStart.y)}%`,
                          border: `${shapeOptions.strokeWidth}px dashed ${shapeOptions.strokeColor}`,
                          borderRadius: "50%",
                          pointerEvents: "none",
                          zIndex: 20,
                        }}
                      />
                    )}

                    {drawStart && drawEnd && activeTool === "highlight" && (
                      <div
                        style={{
                          position: "absolute",
                          left: `${Math.min(drawStart.x, drawEnd.x)}%`,
                          top: `${Math.min(drawStart.y, drawEnd.y)}%`,
                          width: `${Math.abs(drawEnd.x - drawStart.x)}%`,
                          height: `${Math.abs(drawEnd.y - drawStart.y)}%`,
                          background: highlightOptions.color,
                          opacity: highlightOptions.opacity,
                          mixBlendMode: "multiply",
                          pointerEvents: "none",
                          zIndex: 20,
                        }}
                      />
                    )}

                    {penDrawing && penDrawing.points.length > 1 && (
                      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 20 }}>
                        <polyline
                          points={penDrawing.points.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke={penDrawing.color}
                          strokeWidth={penDrawing.strokeWidth * 0.5}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Info bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[18px] bg-white border border-black/[0.06]">
                <div className="text-[11px] font-mono uppercase text-black/40">
                  Page {currentPage} · {pageElements.length} new · {pageExistingTexts.filter((t) => !t.deleted).length} existing
                </div>
                <div className="text-[10px] font-mono uppercase text-black/40">{selectedId ? `Selected: ${existingTexts.some((t) => t.id === selectedId) ? "existing text" : selectedElement?.type}` : "No selection"}</div>
              </div>
            </div>

            {/* ============ RIGHT SIDEBAR ============ */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Save
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
                      <div className="text-[13px] font-medium text-black mb-1">PDF saved!</div>
                      <div className="text-[10px] font-mono text-black/40">{formatBytes(result.blob.size)}</div>
                    </div>
                    <button
                      onClick={downloadResult}
                      className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2"
                    >
                      <Download size={13} /> Download PDF
                    </button>
                    <button
                      onClick={() => setResult(null)}
                      className="w-full py-2.5 rounded-full border border-black/[0.12] text-[11px]"
                    >
                      Keep editing
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-black/50 mb-4 leading-relaxed">Saves existing text edits and all new elements.</p>
                    <button
                      onClick={handleSave}
                      disabled={isProcessing}
                      className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 ${isProcessing ? "bg-black/[0.08] text-black/40" : "bg-black text-white hover:bg-[#ff6a00]"}`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2
                            size={13}
                            className="animate-spin"
                          />{" "}
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={13} /> Save PDF
                        </>
                      )}
                    </button>
                  </>
                )}

                {error && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[11px]">
                    <AlertCircle size={12} /> {error}
                  </div>
                )}
              </div>

              <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                <div className="text-[10px] font-mono uppercase text-black/40 mb-3">How to edit</div>
                <ol className="space-y-2 text-[11px] text-black/60 list-decimal list-inside">
                  <li>
                    Existing text shows with <span className="text-[#ff6a00]">dashed border</span>
                  </li>
                  <li>Click any text to select</li>
                  <li>
                    <strong>Double-click</strong> to edit inline
                  </li>
                  <li>Or edit in left panel</li>
                  <li>
                    Drag <span className="text-[#ff6a00]">corners</span> to resize
                  </li>
                  <li>Save PDF to apply</li>
                </ol>
              </div>

              <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                <div className="text-[10px] font-mono uppercase text-black/40 mb-3">Shortcuts</div>
                <div className="space-y-2 text-[11px]">
                  {[
                    { k: "Ctrl+Z", v: "Undo" },
                    { k: "Ctrl+Y", v: "Redo" },
                    { k: "Ctrl+D", v: "Duplicate" },
                    { k: "Del", v: "Delete" },
                    { k: "Esc", v: "Deselect" },
                    { k: "Arrows", v: "Nudge (Shift: 2%)" },
                    { k: "Dbl-click", v: "Inline edit" },
                  ].map((s) => (
                    <div
                      key={s.k}
                      className="flex justify-between"
                    >
                      <span className="text-black/50">{s.v}</span>
                      <kbd className="px-2 py-0.5 rounded bg-[#f4f1ea] text-[10px] font-mono">{s.k}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Signature modal */}
        <AnimatePresence>
          {showSigPad && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSigPad(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
              >
                <div className="pointer-events-auto bg-white rounded-[22px] p-6 max-w-md w-full shadow-2xl">
                  <div className="flex justify-between mb-4">
                    <div
                      className="text-[14px] font-medium"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      Draw your signature
                    </div>
                    <button
                      onClick={() => setShowSigPad(false)}
                      className="w-7 h-7 rounded-lg hover:bg-black/[0.06] flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="rounded-[14px] border-2 border-dashed border-black/[0.12] bg-[#f4f1ea]/40 p-2 mb-4">
                    <canvas
                      ref={sigCanvasRef}
                      width={400}
                      height={180}
                      className="w-full bg-white rounded-lg cursor-crosshair"
                      onMouseDown={startSigDraw}
                      onMouseMove={sigDraw}
                      onMouseUp={endSigDraw}
                      onMouseLeave={endSigDraw}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={clearSigPad}
                      className="flex-1 py-2.5 rounded-full border border-black/[0.12] text-[12px]"
                    >
                      Clear
                    </button>
                    <button
                      onClick={saveSignature}
                      className="flex-1 py-2.5 rounded-full bg-black text-white text-[12px] hover:bg-[#ff6a00]"
                    >
                      Add signature
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
