"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, FileInput, Copy, Check,
  Edit3, Settings2, Layers, ChevronLeft, ChevronRight, Save,
  ZoomIn, ZoomOut, RefreshCw, Info, Trash2, Type, CheckSquare,
  Circle as CircleIcon, ChevronDown, Calendar, Hash, Mail,
  Phone, User, MapPin, Plus, Minus, MousePointer2,
  Move, Undo2, Redo2, FileSignature, PenTool, AlertTriangle,
  FileCheck, Wand2, AlignLeft, type LucideIcon,
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createBlobFromBytes, getPDFInfo, formatBytes, downloadBlob, readFileAsArrayBuffer } from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

type Mode = 'fill' | 'create';
type FieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'date' | 'multiline' | 'signature';

interface ExistingField {
  id: string;
  name: string;
  type: FieldType;
  value: string | boolean;
  required: boolean;
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
  options?: string[];
  readonly?: boolean;
}

interface NewField {
  id: string;
  name: string;
  type: FieldType;
  label: string;
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  borderColor: string;
  backgroundColor: string;
  required: boolean;
  options?: string[];
  defaultValue?: string;
  maxLength?: number;
  multiline?: boolean;
}

interface PageData {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

// ============================================
// CONSTANTS
// ============================================

const FIELD_TYPES: { id: FieldType; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'text', label: 'Text', icon: Type, desc: 'Single-line text' },
  { id: 'multiline', label: 'Multiline', icon: AlignLeft, desc: 'Multi-line text' },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare, desc: 'Yes/No toggle' },
  { id: 'radio', label: 'Radio', icon: CircleIcon, desc: 'Single choice' },
  { id: 'dropdown', label: 'Dropdown', icon: ChevronDown, desc: 'Select option' },
  { id: 'date', label: 'Date', icon: Calendar, desc: 'Date picker' },
  { id: 'signature', label: 'Signature', icon: PenTool, desc: 'Sign here' },
];

const QUICK_TEMPLATES = [
  { id: 'name', label: 'Full Name', icon: User, fieldType: 'text' as FieldType },
  { id: 'email', label: 'Email', icon: Mail, fieldType: 'text' as FieldType },
  { id: 'phone', label: 'Phone', icon: Phone, fieldType: 'text' as FieldType },
  { id: 'address', label: 'Address', icon: MapPin, fieldType: 'multiline' as FieldType },
  { id: 'date', label: 'Date', icon: Calendar, fieldType: 'date' as FieldType },
  { id: 'number', label: 'Number', icon: Hash, fieldType: 'text' as FieldType },
  { id: 'signature', label: 'Signature', icon: FileSignature, fieldType: 'signature' as FieldType },
  { id: 'consent', label: 'I Agree', icon: CheckSquare, fieldType: 'checkbox' as FieldType },
];

const COLORS = ['#0a0a0a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// ============================================
// MAIN COMPONENT
// ============================================

export default function FormsPage() {
  const [mode, setMode] = useState<Mode>('fill');

  // File
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PageData[]>([]);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [currentPage, setCurrentPage] = useState(1);

  // Fields
  const [existingFields, setExistingFields] = useState<ExistingField[]>([]);
  const [newFields, setNewFields] = useState<NewField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // History — track NEW FIELDS only (existing field values are not part of undo/redo)
  const [history, setHistory] = useState<NewField[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // UI
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [draggingField, setDraggingField] = useState<{ id: string; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const [resizingField, setResizingField] = useState<{ id: string; startX: number; startY: number; startW: number; startH: number; startFX: number; startFY: number; handle: string } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-clear messages
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!file) return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isInput) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !isInput) {
        e.preventDefault();
        redo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldId && !isInput && mode === 'create') {
        e.preventDefault();
        removeNewField(selectedFieldId);
      }
      if (e.key === 'Escape') {
        setSelectedFieldId(null);
      }
      // Nudge selected field with arrow keys
      if (selectedFieldId && !isInput && mode === 'create' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2 : 0.5;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        const f = newFields.find((x) => x.id === selectedFieldId);
        if (!f) return;
        const updated = newFields.map((x) =>
          x.id === selectedFieldId
            ? { ...x, x: Math.max(0, Math.min(100 - x.width, x.x + dx)), y: Math.max(0, Math.min(100 - x.height, x.y + dy)) }
            : x
        );
        setNewFields(updated);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [file, selectedFieldId, mode, newFields, history, historyIndex]);

  // ============================================
  // HISTORY — Fixed
  // ============================================

  const pushHistory = useCallback((fields: NewField[]) => {
    // Deep clone to prevent mutations
    const snapshot = JSON.parse(JSON.stringify(fields));
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, snapshot];
      // Keep only last 30 states
      return next.length > 30 ? next.slice(-30) : next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setNewFields(JSON.parse(JSON.stringify(history[i])));
    setSelectedFieldId(null);
    setResult(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setNewFields(JSON.parse(JSON.stringify(history[i])));
    setSelectedFieldId(null);
    setResult(null);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ============================================
  // RENDER PAGE
  // ============================================

  const renderPage = useCallback(async (f: File, pageNum: number): Promise<PageData> => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    const origViewport = page.getViewport({ scale: 1.0 });

    return {
      pageNum,
      dataUrl: canvas.toDataURL('image/jpeg', 0.9),
      width: origViewport.width,
      height: origViewport.height,
    };
  }, []);

  // ============================================
  // EXTRACT EXISTING FIELDS
  // ============================================

  const extractExistingFields = useCallback(async (f: File): Promise<ExistingField[]> => {
    const bytes = await readFileAsArrayBuffer(f);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();
    const fields = form.getFields();
    const extracted: ExistingField[] = [];

    // Build page reference map
    const pageRefMap = new Map<any, number>();
    for (let i = 0; i < doc.getPageCount(); i++) {
      pageRefMap.set(doc.getPage(i).ref, i + 1);
    }

    fields.forEach((field, idx) => {
      try {
        const name = field.getName();
        const ctorName = field.constructor.name;

        // Find page this field belongs to
        let pageNum = 1;
        let x = 10, y = 10, w = 25, h = 4;

        try {
          const widgets = (field as any).acroField?.getWidgets?.() || [];
          if (widgets.length > 0) {
            const widget = widgets[0];
            const pageRef = widget.P?.();
            if (pageRef && pageRefMap.has(pageRef)) {
              pageNum = pageRefMap.get(pageRef)!;
            }

            const rect = widget.getRectangle?.();
            if (rect) {
              const page = doc.getPage(pageNum - 1);
              const { width: pw, height: ph } = page.getSize();
              x = (rect.x / pw) * 100;
              y = ((ph - rect.y - rect.height) / ph) * 100;
              w = (rect.width / pw) * 100;
              h = (rect.height / ph) * 100;
            }
          }
        } catch {}

        let type: FieldType = 'text';
        let value: string | boolean = '';
        let options: string[] | undefined;

        if (ctorName.includes('PDFTextField')) {
          type = (field as any).isMultiline?.() ? 'multiline' : 'text';
          value = (field as any).getText?.() || '';
        } else if (ctorName.includes('PDFCheckBox')) {
          type = 'checkbox';
          value = (field as any).isChecked?.() || false;
        } else if (ctorName.includes('PDFRadioGroup')) {
          type = 'radio';
          value = (field as any).getSelected?.() || '';
          options = (field as any).getOptions?.() || [];
        } else if (ctorName.includes('PDFDropdown') || ctorName.includes('PDFOptionList')) {
          type = 'dropdown';
          const selected = (field as any).getSelected?.() || [];
          value = selected[0] || '';
          options = (field as any).getOptions?.() || [];
        }

        extracted.push({
          id: `existing-${idx}-${name}`,
          name,
          type,
          value,
          required: (field as any).isRequired?.() || false,
          readonly: (field as any).isReadOnly?.() || false,
          pageNum,
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
          width: Math.max(w, 10),
          height: Math.max(h, 3),
          options,
        });
      } catch (e) {
        console.warn('Failed to extract field:', e);
      }
    });

    return extracted;
  }, []);

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
    setPages([]);
    setExistingFields([]);
    setNewFields([]);
    setHistory([]);
    setHistoryIndex(-1);
    setResult(null);
    setCurrentPage(1);
    setSelectedFieldId(null);

    try {
      const info = await getPDFInfo(f);
      setPageCount(info.pageCount);

      // Extract existing fields
      const fields = await extractExistingFields(f);
      setExistingFields(fields);

      // Auto-select appropriate mode
      setMode(fields.length > 0 ? 'fill' : 'create');

      // Render first page
      const pageData = await renderPage(f, 1);
      setPages([pageData]);
      setPageSize({ width: pageData.width, height: pageData.height });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to load PDF.' : 'Failed to load PDF.');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [extractExistingFields, renderPage]);

  const goToPage = async (pageNum: number) => {
    if (!file || pageNum < 1 || pageNum > pageCount) return;
    setIsLoading(true);
    try {
      const existing = pages.find((p) => p.pageNum === pageNum);
      if (!existing) {
        const rendered = await renderPage(file, pageNum);
        setPages((prev) => [...prev, rendered].sort((a, b) => a.pageNum - b.pageNum));
      }
      setCurrentPage(pageNum);
      // Keep selection if field exists on new page
      if (selectedFieldId) {
        const f = newFields.find((x) => x.id === selectedFieldId);
        if (f && f.pageNum !== pageNum) {
          setSelectedFieldId(null);
        }
      }
    } catch (e) {
      setError('Failed to load page.');
    } finally {
      setIsLoading(false);
    }
  };

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
    setPageCount(0);
    setPages([]);
    setExistingFields([]);
    setNewFields([]);
    setHistory([]);
    setHistoryIndex(-1);
    setResult(null);
    setError(null);
    setCurrentPage(1);
    setSelectedFieldId(null);
  };

  // ============================================
  // FILL MODE — Update field value
  // ============================================

  const updateExistingFieldValue = (id: string, value: string | boolean) => {
    setExistingFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
    setResult(null);
  };

  // ============================================
  // CREATE MODE — New field management
  // ============================================

  const addNewField = (type: FieldType, templateLabel?: string) => {
    const id = `field-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const config = FIELD_TYPES.find((t) => t.id === type)!;

    // Generate unique name
    let counter = newFields.length + 1;
    let name = `field_${counter}`;
    while (newFields.some((f) => f.name === name)) {
      counter++;
      name = `field_${counter}`;
    }

    const newField: NewField = {
      id,
      name,
      type,
      label: templateLabel || config.label,
      pageNum: currentPage,
      x: 15,
      y: 30 + ((newFields.length * 8) % 60),
      width: type === 'checkbox' ? 5 : 35,
      height: type === 'multiline' ? 8 : type === 'checkbox' ? 3 : 5,
      fontSize: 11,
      color: '#0a0a0a',
      borderColor: '#9ca3af',
      backgroundColor: '#ffffff',
      required: false,
      multiline: type === 'multiline',
    };

    if (type === 'dropdown' || type === 'radio') {
      newField.options = ['Option 1', 'Option 2', 'Option 3'];
    }

    const updated = [...newFields, newField];
    setNewFields(updated);
    setSelectedFieldId(id);
    pushHistory(updated);
    setResult(null);
  };

  // Returns updated array — allows proper history push
  const updateNewField = useCallback((id: string, updates: Partial<NewField>): NewField[] => {
    const updated = newFields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    setNewFields(updated);
    setResult(null);
    return updated;
  }, [newFields]);

  const commitHistory = useCallback(() => {
    pushHistory(newFields);
  }, [newFields, pushHistory]);

  const removeNewField = (id: string) => {
    const updated = newFields.filter((f) => f.id !== id);
    setNewFields(updated);
    setSelectedFieldId(null);
    pushHistory(updated);
    setResult(null);
  };

  // ============================================
  // CANVAS INTERACTION
  // ============================================

  const getRelativeCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (!('clientX' in e)) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (mode !== 'create') return;
    const coords = getRelativeCoords(e);
    if (!coords) return;

    // Check if clicked on existing new field (reverse order — topmost first)
    const pageFields = newFields.filter((f) => f.pageNum === currentPage);
    for (let i = pageFields.length - 1; i >= 0; i--) {
      const f = pageFields[i];
      if (
        coords.x >= f.x &&
        coords.x <= f.x + f.width &&
        coords.y >= f.y &&
        coords.y <= f.y + f.height
      ) {
        setSelectedFieldId(f.id);
        setDraggingField({
          id: f.id,
          offsetX: coords.x - f.x,
          offsetY: coords.y - f.y,
          moved: false,
        });
        return;
      }
    }

    setSelectedFieldId(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const coords = getRelativeCoords(e);
    if (!coords) return;

    if (draggingField) {
      const f = newFields.find((x) => x.id === draggingField.id);
      if (!f) return;

      const newX = Math.max(0, Math.min(100 - f.width, coords.x - draggingField.offsetX));
      const newY = Math.max(0, Math.min(100 - f.height, coords.y - draggingField.offsetY));

      // Mark as moved if moved > 0.2%
      const wasMoved = draggingField.moved || Math.abs(newX - f.x) > 0.2 || Math.abs(newY - f.y) > 0.2;

      setDraggingField({ ...draggingField, moved: wasMoved });
      updateNewField(draggingField.id, { x: newX, y: newY });
    }

    if (resizingField) {
      const f = newFields.find((x) => x.id === resizingField.id);
      if (!f) return;

      const dx = coords.x - resizingField.startX;
      const dy = coords.y - resizingField.startY;

      let newW = resizingField.startW;
      let newH = resizingField.startH;
      let newX = resizingField.startFX;
      let newY = resizingField.startFY;

      // Right edge
      if (resizingField.handle.includes('r')) {
        newW = Math.max(3, resizingField.startW + dx);
      }
      // Left edge
      if (resizingField.handle.includes('l')) {
        newW = Math.max(3, resizingField.startW - dx);
        newX = resizingField.startFX + (resizingField.startW - newW);
      }
      // Bottom edge
      if (resizingField.handle.includes('b')) {
        newH = Math.max(2, resizingField.startH + dy);
      }
      // Top edge
      if (resizingField.handle.includes('t')) {
        newH = Math.max(2, resizingField.startH - dy);
        newY = resizingField.startFY + (resizingField.startH - newH);
      }

      // Clamp to canvas bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newW = Math.min(100 - newX, newW);
      newH = Math.min(100 - newY, newH);

      updateNewField(resizingField.id, { width: newW, height: newH, x: newX, y: newY });
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingField) {
      if (draggingField.moved) pushHistory(newFields);
      setDraggingField(null);
    }
    if (resizingField) {
      pushHistory(newFields);
      setResizingField(null);
    }
  };

  const startResize = (handle: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedFieldId) return;
    const f = newFields.find((x) => x.id === selectedFieldId);
    if (!f) return;

    setResizingField({
      id: f.id,
      startX: getRelativeCoords(e)?.x || f.x,
      startY: getRelativeCoords(e)?.y || f.y,
      startW: f.width,
      startH: f.height,
      startFX: f.x,
      startFY: f.y,
      handle,
    });
  };

  // ============================================
  // BUILD PDF
  // ============================================

  const buildPDF = async () => {
    if (!file) throw new Error('No file');
    const bytes = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      return {
        r: parseInt(clean.slice(0, 2), 16) / 255,
        g: parseInt(clean.slice(2, 4), 16) / 255,
        b: parseInt(clean.slice(4, 6), 16) / 255,
      };
    };

    // FILL MODE
    if (mode === 'fill') {
      for (const field of existingFields) {
        try {
          const pdfField = form.getField(field.name);
          const ctor = pdfField.constructor.name;

          if (ctor.includes('PDFTextField')) {
            (pdfField as any).setText(String(field.value || ''));
          } else if (ctor.includes('PDFCheckBox')) {
            if (field.value) (pdfField as any).check();
            else (pdfField as any).uncheck();
          } else if (ctor.includes('PDFRadioGroup')) {
            if (field.value) (pdfField as any).select(String(field.value));
          } else if (ctor.includes('PDFDropdown')) {
            if (field.value) (pdfField as any).select(String(field.value));
          }
        } catch (e) {
          console.warn('Fill failed:', field.name, e);
        }
      }
    }

    // CREATE MODE
    if (mode === 'create' && newFields.length > 0) {
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pdfPages = doc.getPages();

      for (const f of newFields) {
        const page = pdfPages[f.pageNum - 1];
        if (!page) continue;

        const { width: pw, height: ph } = page.getSize();
        const xPt = (f.x / 100) * pw;
        const yPt = ph - (f.y / 100) * ph - (f.height / 100) * ph;
        const wPt = (f.width / 100) * pw;
        const hPt = (f.height / 100) * ph;

        const borderRgb = hexToRgb(f.borderColor);
        const bgRgb = hexToRgb(f.backgroundColor);
        const textRgb = hexToRgb(f.color);

        // Draw label above
        if (f.label && f.type !== 'checkbox') {
          try {
            page.drawText(f.label, {
              x: xPt,
              y: yPt + hPt + 2,
              size: 8,
              font,
              color: rgb(textRgb.r, textRgb.g, textRgb.b),
              opacity: 0.8,
            });
          } catch {}
        }

        try {
          if (f.type === 'text' || f.type === 'date' || f.type === 'signature') {
            const textField = form.createTextField(f.name);
            if (f.defaultValue) textField.setText(f.defaultValue);
            if (f.maxLength) textField.setMaxLength(f.maxLength);
            textField.addToPage(page, {
              x: xPt, y: yPt, width: wPt, height: hPt,
              borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
              backgroundColor: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
              textColor: rgb(textRgb.r, textRgb.g, textRgb.b),
              borderWidth: 0.75,
            });
          } else if (f.type === 'multiline') {
            const textField = form.createTextField(f.name);
            textField.enableMultiline();
            if (f.defaultValue) textField.setText(f.defaultValue);
            textField.addToPage(page, {
              x: xPt, y: yPt, width: wPt, height: hPt,
              borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
              backgroundColor: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
              textColor: rgb(textRgb.r, textRgb.g, textRgb.b),
              borderWidth: 0.75,
            });
          } else if (f.type === 'checkbox') {
            const cb = form.createCheckBox(f.name);
            if (f.defaultValue === 'true') cb.check();
            cb.addToPage(page, {
              x: xPt, y: yPt, width: wPt, height: hPt,
              borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
              backgroundColor: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
              borderWidth: 0.75,
            });
          } else if (f.type === 'dropdown') {
            const dd = form.createDropdown(f.name);
            if (f.options && f.options.length > 0) {
              dd.setOptions(f.options);
              dd.select(f.options[0]);
            }
            dd.addToPage(page, {
              x: xPt, y: yPt, width: wPt, height: hPt,
              borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
              backgroundColor: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
              textColor: rgb(textRgb.r, textRgb.g, textRgb.b),
              borderWidth: 0.75,
            });
          } else if (f.type === 'radio') {
            const radio = form.createRadioGroup(f.name);
            if (f.options && f.options.length > 0) {
              const optW = wPt / f.options.length;
              f.options.forEach((opt, idx) => {
                radio.addOptionToPage(opt, page, {
                  x: xPt + idx * optW,
                  y: yPt,
                  width: optW,
                  height: hPt,
                  borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
                  backgroundColor: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
                });
              });
            }
          }
        } catch (e) {
          console.warn('Field creation failed:', f.name, e);
        }
      }
    }

    const savedBytes = await doc.save();
    return createBlobFromBytes(savedBytes, 'application/pdf');
  };

  const handleSave = async () => {
    if (!file) return;

    if (mode === 'fill' && existingFields.length === 0) {
      setError('No form fields detected. Switch to Create mode.');
      return;
    }
    if (mode === 'create' && newFields.length === 0) {
      setError('Please add at least one field.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const blob = await buildPDF();
      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        blob,
        filename: mode === 'fill' ? `${baseName}-filled.pdf` : `${baseName}-with-forms.pdf`,
      });
      setSuccess(mode === 'fill' ? 'Form filled!' : 'Form fields added!');
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

  const copyAllValues = () => {
    const text = existingFields
      .filter((f) => f.value !== '' && f.value !== false)
      .map((f) => `${f.name}: ${f.value}`)
      .join('\n');
    if (!text) {
      setError('No values to copy.');
      return;
    }
    navigator.clipboard.writeText(text);
    setSuccess('Field values copied!');
  };

  // ============================================
  // COMPUTED
  // ============================================

  const currentPageData = pages.find((p) => p.pageNum === currentPage);
  const pageExistingFields = existingFields.filter((f) => f.pageNum === currentPage);
  const pageNewFields = newFields.filter((f) => f.pageNum === currentPage);
  const selectedField = newFields.find((f) => f.id === selectedFieldId);

  const fieldStats = useMemo(() => {
    const filled = existingFields.filter((f) => f.value !== '' && f.value !== false).length;
    return {
      existing: existingFields.length,
      new: newFields.length,
      filled,
    };
  }, [existingFields, newFields]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleInputChange} className="hidden" />

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
              PDF Forms — Fill or Create
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Auto-detect fields</span>
            <span>·</span>
            <span>Interactive</span>
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
                PDF <span className="italic text-[#ff6a00]">Forms</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Fill interactive PDF forms, or create new fillable fields from scratch.
                Text, checkboxes, dropdowns, dates — all supported.
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
                  <FileInput size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Auto-detect existing form fields, or add new fillable fields.
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
                { icon: FileCheck, label: 'Detect fields' },
                { icon: Type, label: 'Text fields' },
                { icon: CheckSquare, label: 'Checkboxes' },
                { icon: ChevronDown, label: 'Dropdowns' },
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
              <FileInput size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Analyzing form fields...
            </span>
          </div>
        )}

        {/* Workspace */}
        {file && !isLoading && (
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
                  <span className="text-[13px] font-medium text-black">{pageCount}</span>
                  <span className="text-[12px] text-black/50">pages</span>
                </div>
                {mode === 'fill' && fieldStats.existing > 0 && (
                  <>
                    <div className="w-px h-4 bg-black/10" />
                    <div className="flex items-center gap-2">
                      <FileCheck size={14} className="text-[#ff6a00]" />
                      <span className="text-[13px] font-medium text-black">{fieldStats.filled}/{fieldStats.existing}</span>
                      <span className="text-[12px] text-black/50">filled</span>
                    </div>
                  </>
                )}
                {mode === 'create' && fieldStats.new > 0 && (
                  <>
                    <div className="w-px h-4 bg-black/10" />
                    <div className="flex items-center gap-2">
                      <Plus size={14} className="text-[#ff6a00]" />
                      <span className="text-[13px] font-medium text-black">{fieldStats.new}</span>
                      <span className="text-[12px] text-black/50">added</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={14} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 size={14} />
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

              {/* ============ LEFT SIDEBAR ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Mode tabs */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-2">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setMode('fill')}
                      className={`py-3 rounded-lg flex flex-col items-center gap-1.5 transition-all ${
                        mode === 'fill'
                          ? 'bg-[#ff6a00] text-white shadow-lg'
                          : existingFields.length === 0
                          ? 'bg-[#f4f1ea] text-black/30 cursor-not-allowed'
                          : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                      }`}
                      disabled={existingFields.length === 0}
                      title={existingFields.length === 0 ? 'No form fields in this PDF' : ''}
                    >
                      <Edit3 size={15} />
                      <span className="text-[10px] font-mono uppercase">Fill Form</span>
                    </button>
                    <button
                      onClick={() => setMode('create')}
                      className={`py-3 rounded-lg flex flex-col items-center gap-1.5 transition-all ${
                        mode === 'create'
                          ? 'bg-[#ff6a00] text-white shadow-lg'
                          : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                      }`}
                    >
                      <Wand2 size={15} />
                      <span className="text-[10px] font-mono uppercase">Create</span>
                    </button>
                  </div>
                </div>

                {/* FILL MODE banner */}
                {mode === 'fill' && (
                  <div className={`rounded-[18px] p-4 border ${
                    existingFields.length > 0
                      ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                      : 'bg-amber-500/[0.08] border-amber-500/20'
                  }`}>
                    <div className="flex items-start gap-2">
                      {existingFields.length > 0 ? (
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-[11px] font-medium mb-1 ${existingFields.length > 0 ? 'text-emerald-900' : 'text-amber-900'}`}>
                          {existingFields.length} field{existingFields.length !== 1 ? 's' : ''} detected
                        </div>
                        <p className={`text-[10px] leading-relaxed ${existingFields.length > 0 ? 'text-emerald-800/80' : 'text-amber-800/80'}`}>
                          Fill in the fields. Values save to the PDF.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* FILL MODE — Field list */}
                {mode === 'fill' && existingFields.length > 0 && (
                  <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileCheck size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">Fields</span>
                      </div>
                      <button
                        onClick={copyAllValues}
                        className="text-[9px] font-mono uppercase text-[#ff6a00] hover:text-[#ff8a3d] flex items-center gap-1"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {existingFields.map((field) => (
                        <div
                          key={field.id}
                          className={`p-3 rounded-lg border transition-all ${
                            selectedFieldId === field.id
                              ? 'border-[#ff6a00]/40 bg-[#ff6a00]/[0.04]'
                              : 'border-black/[0.06] bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {field.type === 'text' || field.type === 'multiline' ? (
                              <Type size={11} className="text-[#ff6a00] shrink-0" />
                            ) : field.type === 'checkbox' ? (
                              <CheckSquare size={11} className="text-[#ff6a00] shrink-0" />
                            ) : field.type === 'radio' ? (
                              <CircleIcon size={11} className="text-[#ff6a00] shrink-0" />
                            ) : field.type === 'dropdown' ? (
                              <ChevronDown size={11} className="text-[#ff6a00] shrink-0" />
                            ) : (
                              <Hash size={11} className="text-[#ff6a00] shrink-0" />
                            )}
                            <span className="text-[10px] font-mono text-black/40 truncate flex-1" title={field.name}>
                              {field.name}
                            </span>
                            <span className="text-[9px] font-mono text-black/30 shrink-0">
                              P{field.pageNum}
                            </span>
                          </div>

                          {field.type === 'checkbox' ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.value === true}
                                onChange={(e) => {
                                  updateExistingFieldValue(field.id, e.target.checked);
                                  if (field.pageNum !== currentPage) goToPage(field.pageNum);
                                }}
                                className="accent-[#ff6a00] w-4 h-4"
                              />
                              <span className="text-[11px] text-black/60">
                                {field.value ? 'Checked' : 'Unchecked'}
                              </span>
                            </label>
                          ) : field.type === 'dropdown' || field.type === 'radio' ? (
                            <select
                              value={String(field.value || '')}
                              onChange={(e) => {
                                updateExistingFieldValue(field.id, e.target.value);
                                if (field.pageNum !== currentPage) goToPage(field.pageNum);
                              }}
                              className="w-full bg-[#f4f1ea] rounded-md px-2 py-1.5 outline-none text-[11px] border border-black/[0.06] focus:border-[#ff6a00] transition-colors"
                            >
                              <option value="">— Select —</option>
                              {(field.options || []).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={String(field.value || '')}
                              onChange={(e) => updateExistingFieldValue(field.id, e.target.value)}
                              onFocus={() => {
                                setSelectedFieldId(field.id);
                                if (field.pageNum !== currentPage) goToPage(field.pageNum);
                              }}
                              placeholder="Enter value..."
                              className="w-full bg-[#f4f1ea] rounded-md px-2 py-1.5 outline-none text-[11px] border border-black/[0.06] focus:border-[#ff6a00] transition-colors"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CREATE MODE — Field types */}
                {mode === 'create' && (
                  <>
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">Add Field</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {FIELD_TYPES.map((t) => {
                          const Icon = t.icon;
                          return (
                            <button
                              key={t.id}
                              onClick={() => addNewField(t.id)}
                              className="p-2.5 rounded-lg bg-[#f4f1ea] hover:bg-[#ff6a00]/10 hover:border-[#ff6a00]/40 border border-transparent flex flex-col items-start gap-1.5 transition-all text-left group"
                              title={t.desc}
                            >
                              <Icon size={14} className="text-black/60 group-hover:text-[#ff6a00]" />
                              <span className="text-[10px] font-mono uppercase text-black/70 group-hover:text-[#ff6a00]">
                                {t.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick templates */}
                    <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                      <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="w-full flex items-center justify-between mb-3"
                      >
                        <div className="flex items-center gap-2">
                          <Wand2 size={13} className="text-[#ff6a00]" />
                          <span className="text-[10px] font-mono uppercase text-black/40">Templates</span>
                        </div>
                        {showTemplates ? <Minus size={12} /> : <Plus size={12} />}
                      </button>
                      {showTemplates && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {QUICK_TEMPLATES.map((t) => {
                            const Icon = t.icon;
                            return (
                              <button
                                key={t.id}
                                onClick={() => addNewField(t.fieldType, t.label)}
                                className="p-2.5 rounded-lg bg-[#f4f1ea] hover:bg-[#ff6a00]/10 border border-transparent hover:border-[#ff6a00]/40 flex flex-col items-start gap-1.5 transition-all text-left group"
                              >
                                <Icon size={12} className="text-black/60 group-hover:text-[#ff6a00]" />
                                <span className="text-[9px] text-black/70 group-hover:text-[#ff6a00] leading-tight">
                                  {t.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Added fields list */}
                    {newFields.length > 0 && (
                      <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono uppercase text-black/40">
                            Added ({newFields.length})
                          </span>
                          <button
                            onClick={() => { setNewFields([]); pushHistory([]); setResult(null); }}
                            className="text-[9px] font-mono uppercase text-red-500 hover:text-red-600"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                          {newFields.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setSelectedFieldId(f.id);
                                if (f.pageNum !== currentPage) goToPage(f.pageNum);
                              }}
                              className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                                selectedFieldId === f.id
                                  ? 'bg-[#ff6a00]/[0.06] border border-[#ff6a00]/40'
                                  : 'bg-[#f4f1ea]/50 border border-transparent hover:bg-black/[0.04]'
                              }`}
                            >
                              <Type size={11} className="text-black/50 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-medium text-black truncate">{f.label}</div>
                                <div className="text-[8px] font-mono uppercase text-black/40">
                                  {f.type} · P{f.pageNum}
                                </div>
                              </div>
                              <span
                                onClick={(e) => { e.stopPropagation(); removeNewField(f.id); }}
                                className="w-5 h-5 rounded hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/30 shrink-0 cursor-pointer"
                              >
                                <X size={10} />
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ============ CENTER — Canvas ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-1 bg-[#f4f1ea] rounded-lg p-1">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="px-2 text-[12px] font-mono">{currentPage} / {pageCount}</span>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= pageCount}
                      className="w-7 h-7 rounded-md hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] flex items-center justify-center transition-colors">
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-[11px] font-mono w-10 text-center">{zoom}%</span>
                    <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="w-8 h-8 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] flex items-center justify-center transition-colors">
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
                      backgroundSize: '20px 20px',
                    }}
                  />

                  <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
                    {currentPageData ? (
                      <div
                        ref={canvasRef}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] rounded-sm overflow-hidden"
                        style={{
                          width: 595,
                          height: (pageSize.height / pageSize.width) * 595,
                          cursor: mode === 'create' ? (draggingField ? 'grabbing' : 'crosshair') : 'default',
                        }}
                      >
                        <img
                          src={currentPageData.dataUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full pointer-events-none select-none"
                          draggable={false}
                        />

                        {/* Existing field hotspots (FILL mode) */}
                        {mode === 'fill' && pageExistingFields.map((f) => (
                          <div
                            key={f.id}
                            className={`absolute rounded-sm border-2 pointer-events-none transition-all ${
                              selectedFieldId === f.id
                                ? 'border-[#ff6a00] bg-[#ff6a00]/10'
                                : f.value !== '' && f.value !== false
                                ? 'border-blue-500/50 bg-blue-500/[0.08]'
                                : 'border-emerald-500/40 bg-emerald-500/[0.06]'
                            }`}
                            style={{
                              left: `${f.x}%`,
                              top: `${f.y}%`,
                              width: `${f.width}%`,
                              height: `${f.height}%`,
                            }}
                          >
                            <div className="absolute -top-3 left-0 text-[7px] font-mono uppercase tracking-wider text-white px-1 py-0.5 rounded whitespace-nowrap max-w-full overflow-hidden"
                              style={{
                                backgroundColor: f.value !== '' && f.value !== false ? '#3b82f6' : '#10b981'
                              }}>
                              {f.name.slice(0, 20)}
                            </div>
                          </div>
                        ))}

                        {/* New fields (CREATE mode) */}
                        {mode === 'create' && pageNewFields.map((f) => {
                          const isSelected = selectedFieldId === f.id;
                          return (
                            <div
                              key={f.id}
                              className="absolute"
                              style={{
                                left: `${f.x}%`,
                                top: `${f.y}%`,
                                width: `${f.width}%`,
                                height: `${f.height}%`,
                                cursor: draggingField?.id === f.id ? 'grabbing' : 'grab',
                                zIndex: isSelected ? 10 : 5,
                              }}
                            >
                              {/* Label above field */}
                              {f.type !== 'checkbox' && (
                                <div
                                  className="absolute -top-4 left-0 text-[8px] font-mono text-black/60 whitespace-nowrap"
                                  style={{ fontFamily: 'Helvetica, sans-serif' }}
                                >
                                  {f.label}
                                </div>
                              )}

                              {/* Field box */}
                              <div
                                className={`w-full h-full rounded-sm flex items-center ${
                                  isSelected ? 'ring-2 ring-[#ff6a00] ring-offset-1' : ''
                                }`}
                                style={{
                                  border: `1.5px dashed ${f.borderColor}`,
                                  backgroundColor: f.backgroundColor,
                                  padding: '2px 4px',
                                  fontSize: `${f.fontSize * 0.9}px`,
                                  color: f.color,
                                  fontFamily: 'Helvetica, sans-serif',
                                }}
                              >
                                {f.type === 'checkbox' ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-3 h-3 border border-gray-400 rounded-sm" />
                                  </div>
                                ) : f.type === 'dropdown' ? (
                                  <div className="w-full flex items-center justify-between">
                                    <span className="text-black/40 text-[10px] truncate">{f.options?.[0] || 'Select'}</span>
                                    <ChevronDown size={9} className="text-black/40 shrink-0" />
                                  </div>
                                ) : f.type === 'radio' ? (
                                  <div className="w-full flex items-center gap-1">
                                    {f.options?.slice(0, 3).map((opt, idx) => (
                                      <div key={idx} className="flex items-center gap-0.5">
                                        <div className="w-2 h-2 rounded-full border border-gray-400" />
                                        <span className="text-[7px] text-black/60">{opt.slice(0, 3)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-black/40 text-[10px] truncate">{f.label}</span>
                                )}
                              </div>

                              {/* Resize handles (all 4 corners) */}
                              {isSelected && (
                                <>
                                  <div
                                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                                    onMouseDown={startResize('tl')}
                                    style={{ zIndex: 20 }}
                                  />
                                  <div
                                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                                    onMouseDown={startResize('tr')}
                                    style={{ zIndex: 20 }}
                                  />
                                  <div
                                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
                                    onMouseDown={startResize('bl')}
                                    style={{ zIndex: 20 }}
                                  />
                                  <div
                                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[#ff6a00] rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                                    onMouseDown={startResize('br')}
                                    style={{ zIndex: 20 }}
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-20">
                        <Loader2 size={40} className="text-[#ff6a00] animate-spin mx-auto" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="text-[11px] font-mono uppercase text-black/40">
                    {mode === 'fill'
                      ? `${pageExistingFields.length} field${pageExistingFields.length !== 1 ? 's' : ''} on page ${currentPage}`
                      : `${pageNewFields.length} field${pageNewFields.length !== 1 ? 's' : ''} on page ${currentPage}`}
                  </div>
                  <div className="text-[10px] font-mono uppercase text-black/40">
                    Mode: <span className="text-[#ff6a00] font-semibold">{mode === 'fill' ? 'Fill' : 'Create'}</span>
                  </div>
                </div>
              </div>

              {/* ============ RIGHT — Field settings & export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Selected field editor (CREATE mode only) */}
                {mode === 'create' && selectedField && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[18px] bg-white border-2 border-[#ff6a00]/40 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Edit3 size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] font-semibold">
                          Edit Field
                        </span>
                      </div>
                      <button
                        onClick={() => removeNewField(selectedField.id)}
                        className="w-6 h-6 rounded-md hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/30 transition-colors"
                        title="Delete (Del)"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Field ID</label>
                    <input
                      type="text"
                      value={selectedField.name}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\w_]/g, '_');
                        updateNewField(selectedField.id, { name: value });
                      }}
                      onBlur={commitHistory}
                      className="w-full bg-[#f4f1ea] rounded-md px-2 py-1.5 outline-none text-[11px] border border-black/[0.06] focus:border-[#ff6a00] mb-3 font-mono"
                    />

                    <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Label</label>
                    <input
                      type="text"
                      value={selectedField.label}
                      onChange={(e) => updateNewField(selectedField.id, { label: e.target.value })}
                      onBlur={commitHistory}
                      className="w-full bg-[#f4f1ea] rounded-md px-2 py-1.5 outline-none text-[11px] border border-black/[0.06] focus:border-[#ff6a00] mb-3"
                    />

                    <label className="flex justify-between text-[9px] font-mono uppercase text-black/40 mb-1.5">
                      <span>Font size</span>
                      <span className="text-[#ff6a00]">{selectedField.fontSize}pt</span>
                    </label>
                    <input
                      type="range" min={8} max={20}
                      value={selectedField.fontSize}
                      onChange={(e) => updateNewField(selectedField.id, { fontSize: parseInt(e.target.value) })}
                      onMouseUp={commitHistory}
                      className="w-full accent-[#ff6a00] mb-3"
                    />

                    <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Border</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            const updated = updateNewField(selectedField.id, { borderColor: c });
                            pushHistory(updated);
                          }}
                          className={`w-5 h-5 rounded-md border-2 transition-all ${
                            selectedField.borderColor === c ? 'border-[#ff6a00] scale-110' : 'border-black/[0.08]'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    {(selectedField.type === 'dropdown' || selectedField.type === 'radio') && (
                      <>
                        <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Options</label>
                        <div className="space-y-1 mb-3">
                          {(selectedField.options || []).map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(selectedField.options || [])];
                                  newOpts[idx] = e.target.value;
                                  updateNewField(selectedField.id, { options: newOpts });
                                }}
                                onBlur={commitHistory}
                                className="flex-1 bg-[#f4f1ea] rounded-md px-2 py-1 outline-none text-[10px] border border-black/[0.06] focus:border-[#ff6a00]"
                              />
                              <button
                                onClick={() => {
                                  const newOpts = (selectedField.options || []).filter((_, i) => i !== idx);
                                  const updated = updateNewField(selectedField.id, { options: newOpts });
                                  pushHistory(updated);
                                }}
                                className="w-6 h-6 rounded hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center text-black/30 shrink-0 transition-colors"
                              >
                                <Minus size={10} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newOpts = [...(selectedField.options || []), `Option ${(selectedField.options?.length || 0) + 1}`];
                              const updated = updateNewField(selectedField.id, { options: newOpts });
                              pushHistory(updated);
                            }}
                            className="w-full py-1.5 rounded-md bg-[#f4f1ea] hover:bg-black/[0.08] text-[10px] font-mono uppercase flex items-center justify-center gap-1 transition-colors"
                          >
                            <Plus size={10} /> Add Option
                          </button>
                        </div>
                      </>
                    )}

                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-black/[0.06]">
                      <span className="text-[11px] text-black/70">Required field</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = updateNewField(selectedField.id, { required: !selectedField.required });
                          pushHistory(updated);
                        }}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          selectedField.required ? 'bg-[#ff6a00]' : 'bg-black/20'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                          selectedField.required ? 'left-[18px]' : 'left-0.5'
                        }`} />
                      </button>
                    </label>
                  </motion.div>
                )}

                {/* Export panel */}
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
                          className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"
                        >
                          <CheckCircle2 size={24} className="text-emerald-500" />
                        </motion.div>
                        <div className="text-[13px] font-medium text-black mb-1">
                          {mode === 'fill' ? 'Form filled!' : 'Fields added!'}
                        </div>
                        <div className="text-[10px] font-mono text-black/40">{formatBytes(result.blob.size)}</div>
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
                        className="w-full py-2.5 rounded-full border border-black/[0.12] text-[11px] hover:bg-black/[0.03] transition-colors"
                      >
                        Keep editing
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] text-black/50 mb-4 leading-relaxed">
                        {mode === 'fill'
                          ? `${fieldStats.filled} of ${fieldStats.existing} fields filled.`
                          : `${newFields.length} new field${newFields.length !== 1 ? 's' : ''} to add.`}
                      </p>
                      <button
                        onClick={handleSave}
                        disabled={isProcessing}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                          isProcessing
                            ? 'bg-black/[0.08] text-black/40'
                            : 'bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Processing...</>
                        ) : (
                          <><Save size={13} /> {mode === 'fill' ? 'Save Filled PDF' : 'Create Form PDF'}</>
                        )}
                      </button>
                    </>
                  )}

                  {error && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-[11px]">
                      <AlertCircle size={12} /> {error}
                    </div>
                  )}
                  {success && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[11px]">
                      <CheckCircle2 size={12} /> {success}
                    </div>
                  )}
                </div>

                {/* Shortcuts */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="text-[10px] font-mono uppercase text-black/40 mb-3">Shortcuts</div>
                  <div className="space-y-2 text-[11px]">
                    {[
                      { k: 'Ctrl+Z', v: 'Undo' },
                      { k: 'Ctrl+Y', v: 'Redo' },
                      { k: 'Del', v: 'Delete field' },
                      { k: 'Esc', v: 'Deselect' },
                      { k: 'Arrows', v: 'Nudge (Shift: 2%)' },
                    ].map((s) => (
                      <div key={s.k} className="flex justify-between">
                        <span className="text-black/50">{s.v}</span>
                        <kbd className="px-2 py-0.5 rounded bg-[#f4f1ea] text-[10px] font-mono text-black/60">{s.k}</kbd>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="text-[10px] font-mono uppercase text-black/40 mb-3">Tips</div>
                  <ul className="space-y-2 text-[11px] text-black/60 leading-relaxed">
                    {mode === 'fill' ? (
                      <>
                        <li>• Fields auto-detected from AcroForm</li>
                        <li>• Click field to jump to its page</li>
                        <li>• Copy all values with one click</li>
                      </>
                    ) : (
                      <>
                        <li>• Click type to add a field</li>
                        <li>• Drag to reposition on page</li>
                        <li>• Corner dots to resize</li>
                      </>
                    )}
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