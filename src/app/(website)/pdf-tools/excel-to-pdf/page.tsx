"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, FileSpreadsheet, Copy, Check,
  Edit3, Settings2, Table as TableIcon, Layers, ChevronLeft, ChevronRight,
  Save, Wand2, Layout, ZoomIn, ZoomOut, RefreshCw, Info,
  BarChart3, Grid3x3, Search, Plus, Minus, Trash2, RotateCw,
  AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp,
  FileOutput, CheckSquare, ListOrdered, Columns, Rows, Printer,
  FileType, Palette, Hash, Sun, Moon, Maximize2, PenLine,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBytes, downloadBlob } from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface SheetData {
  id: string;
  name: string;
  rows: string[][];
  rowCount: number;
  colCount: number;
  hasHeader: boolean;
  selected: boolean;
}

interface ParsedWorkbook {
  sheets: SheetData[];
  fileName: string;
  totalSheets: number;
}

type PageSize = 'a4' | 'letter' | 'a3' | 'a5' | 'legal';
type Orientation = 'portrait' | 'landscape';
type TableStyle = 'grid' | 'striped' | 'bordered' | 'minimal' | 'rounded';

interface ThemeConfig {
  id: string;
  label: string;
  headerBg: [number, number, number];
  headerText: [number, number, number];
  rowBg: [number, number, number];
  altRowBg: [number, number, number];
  text: [number, number, number];
  border: [number, number, number];
}

const THEMES: ThemeConfig[] = [
  {
    id: 'cream', label: 'Cream Editorial',
    headerBg: [255, 106, 0], headerText: [255, 255, 255],
    rowBg: [255, 255, 255], altRowBg: [250, 245, 235],
    text: [26, 26, 26], border: [220, 215, 205],
  },
  {
    id: 'modern', label: 'Modern Blue',
    headerBg: [59, 130, 246], headerText: [255, 255, 255],
    rowBg: [255, 255, 255], altRowBg: [239, 246, 255],
    text: [30, 41, 59], border: [191, 219, 254],
  },
  {
    id: 'forest', label: 'Forest Green',
    headerBg: [16, 185, 129], headerText: [255, 255, 255],
    rowBg: [255, 255, 255], altRowBg: [236, 253, 245],
    text: [6, 78, 59], border: [167, 243, 208],
  },
  {
    id: 'corporate', label: 'Corporate Gray',
    headerBg: [55, 65, 81], headerText: [255, 255, 255],
    rowBg: [255, 255, 255], altRowBg: [249, 250, 251],
    text: [31, 41, 55], border: [229, 231, 235],
  },
  {
    id: 'vibrant', label: 'Vibrant Pink',
    headerBg: [236, 72, 153], headerText: [255, 255, 255],
    rowBg: [255, 255, 255], altRowBg: [253, 242, 248],
    text: [131, 24, 67], border: [251, 207, 232],
  },
  {
    id: 'mono', label: 'Mono Minimal',
    headerBg: [0, 0, 0], headerText: [255, 255, 255],
    rowBg: [255, 255, 255], altRowBg: [245, 245, 245],
    text: [0, 0, 0], border: [200, 200, 200],
  },
];

const PAGE_SIZES: { id: PageSize; label: string; w: number; h: number }[] = [
  { id: 'a4', label: 'A4', w: 210, h: 297 },
  { id: 'a3', label: 'A3', w: 297, h: 420 },
  { id: 'a5', label: 'A5', w: 148, h: 210 },
  { id: 'letter', label: 'Letter', w: 216, h: 279 },
  { id: 'legal', label: 'Legal', w: 216, h: 356 },
];

const TABLE_STYLES: { id: TableStyle; label: string; desc: string }[] = [
  { id: 'grid', label: 'Grid', desc: 'Full borders, all cells' },
  { id: 'striped', label: 'Striped', desc: 'Alternating rows' },
  { id: 'bordered', label: 'Bordered', desc: 'Outer border only' },
  { id: 'minimal', label: 'Minimal', desc: 'No borders, clean' },
  { id: 'rounded', label: 'Rounded', desc: 'Rounded outer edges' },
];

// ============================================
// COMPONENT
// ============================================

export default function ExcelToPdfPage() {
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [editedSheets, setEditedSheets] = useState<Record<string, SheetData>>({});
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [theme, setTheme] = useState<string>('cream');
  const [tableStyle, setTableStyle] = useState<TableStyle>('grid');
  const [fontSize, setFontSize] = useState(9);
  const [headerFontSize, setHeaderFontSize] = useState(10);
  const [margin, setMargin] = useState(10);
  const [includeSheetTitles, setIncludeSheetTitles] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [includeGridLines, setIncludeGridLines] = useState(true);
  const [fitToPage, setFitToPage] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [showSettings, setShowSettings] = useState(true);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [history, setHistory] = useState<Record<string, SheetData>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // FILE PARSING
  // ============================================

  const parseWorkbook = useCallback(async (file: File): Promise<ParsedWorkbook> => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true, cellNF: false, cellText: false });

    const sheets: SheetData[] = [];

    wb.SheetNames.forEach((sheetName, idx) => {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;

      // Convert to array of arrays
      const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

      // Trim trailing empty rows/cols
      const cleaned = aoa
        .map((row) => row.map((c) => (c === null || c === undefined ? '' : String(c).trim())))
        .filter((row) => row.some((c) => c !== ''));

      if (cleaned.length === 0) return;

      // Normalize column count
      const maxCols = Math.max(...cleaned.map((r) => r.length));
      const normalized = cleaned.map((row) => {
        const padded = [...row];
        while (padded.length < maxCols) padded.push('');
        return padded;
      });

      // Detect header (first row all text, others have numbers OR first row all different)
      let hasHeader = false;
      if (normalized.length > 1) {
        const firstRow = normalized[0];
        const firstRowHasNumbers = firstRow.filter((c) => /^-?\d+\.?\d*$/.test(c)).length;
        const allText = firstRow.every((c) => c !== '' && isNaN(Number(c.replace(/[$,%]/g, ''))));
        if (allText || firstRowHasNumbers === 0) {
          hasHeader = true;
        }
      }

      sheets.push({
        id: `sheet-${idx}-${Date.now()}`,
        name: sheetName,
        rows: normalized,
        rowCount: normalized.length,
        colCount: maxCols,
        hasHeader,
        selected: true,
      });
    });

    return {
      sheets,
      fileName: file.name.replace(/\.(xlsx?|csv)$/i, ''),
      totalSheets: sheets.length,
    };
  }, []);

  // ============================================
  // LOAD
  // ============================================

  const loadFile = useCallback(async (f: File) => {
    const validExt = /\.(xlsx?|csv)$/i.test(f.name);
    if (!validExt) {
      setError('Please select an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setWorkbook(null);
    setEditedSheets({});
    setResult(null);
    setActiveSheetIndex(0);

    try {
      const parsed = await parseWorkbook(f);
      if (parsed.sheets.length === 0) {
        throw new Error('No data found in file.');
      }

      setWorkbook(parsed);
      const initial: Record<string, SheetData> = {};
      parsed.sheets.forEach((s) => { initial[s.id] = s; });
      setEditedSheets(initial);
      setHistory([initial]);
      setHistoryIndex(0);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to parse file.' : 'Failed to parse file.');
    } finally {
      setIsLoading(false);
    }
  }, [parseWorkbook]);

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
    setWorkbook(null);
    setEditedSheets({});
    setResult(null);
    setError(null);
    setActiveSheetIndex(0);
    setHistory([]);
    setHistoryIndex(-1);
  };

  // ============================================
  // EDIT
  // ============================================

  const pushHistory = useCallback((newSheets: Record<string, SheetData>) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, JSON.parse(JSON.stringify(newSheets))];
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const updateCell = (sheetId: string, rowIdx: number, colIdx: number, value: string) => {
    const newSheets = { ...editedSheets };
    const sheet = { ...newSheets[sheetId] };
    const rows = sheet.rows.map((r) => [...r]);
    if (rows[rowIdx]) rows[rowIdx][colIdx] = value;
    sheet.rows = rows;
    newSheets[sheetId] = sheet;
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const toggleHeader = (sheetId: string) => {
    const newSheets = { ...editedSheets };
    newSheets[sheetId] = { ...newSheets[sheetId], hasHeader: !newSheets[sheetId].hasHeader };
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const toggleSheetSelection = (sheetId: string) => {
    const newSheets = { ...editedSheets };
    newSheets[sheetId] = { ...newSheets[sheetId], selected: !newSheets[sheetId].selected };
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const toggleAllSheets = (selected: boolean) => {
    const newSheets = { ...editedSheets };
    Object.keys(newSheets).forEach((k) => {
      newSheets[k] = { ...newSheets[k], selected };
    });
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const renameSheet = (sheetId: string, name: string) => {
    const newSheets = { ...editedSheets };
    newSheets[sheetId] = { ...newSheets[sheetId], name };
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const removeRow = (sheetId: string, rowIdx: number) => {
    const newSheets = { ...editedSheets };
    const sheet = { ...newSheets[sheetId] };
    sheet.rows = sheet.rows.filter((_, i) => i !== rowIdx);
    sheet.rowCount = sheet.rows.length;
    newSheets[sheetId] = sheet;
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const removeColumn = (sheetId: string, colIdx: number) => {
    const newSheets = { ...editedSheets };
    const sheet = { ...newSheets[sheetId] };
    sheet.rows = sheet.rows.map((r) => r.filter((_, i) => i !== colIdx));
    sheet.colCount = Math.max(0, sheet.colCount - 1);
    newSheets[sheetId] = sheet;
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const addRow = (sheetId: string) => {
    const newSheets = { ...editedSheets };
    const sheet = { ...newSheets[sheetId] };
    const emptyRow = Array(sheet.colCount).fill('');
    sheet.rows = [...sheet.rows, emptyRow];
    sheet.rowCount = sheet.rows.length;
    newSheets[sheetId] = sheet;
    setEditedSheets(newSheets);
    setResult(null);
    pushHistory(newSheets);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setEditedSheets(JSON.parse(JSON.stringify(history[i])));
    setResult(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setEditedSheets(JSON.parse(JSON.stringify(history[i])));
    setResult(null);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ============================================
  // BUILD PDF
  // ============================================

  const handleConvert = async () => {
    if (!workbook) return;

    const selectedSheets = Object.values(editedSheets).filter((s) => s.selected);
    if (selectedSheets.length === 0) {
      setError('Select at least one sheet to export.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const pageConfig = PAGE_SIZES.find((p) => p.id === pageSize)!;
      const orientationStr = orientation;

      // Initialize jsPDF
      const doc = new jsPDF({
        orientation: orientationStr,
        unit: 'mm',
        format: [pageConfig.w, pageConfig.h],
        compress: true,
      });

      const pageWidth = orientationStr === 'portrait' ? pageConfig.w : pageConfig.h;
      const pageHeight = orientationStr === 'portrait' ? pageConfig.h : pageConfig.w;

      const themeConfig = THEMES.find((t) => t.id === theme)!;

      // Custom font setup — use Helvetica (default) or Times/Courier
      doc.setFont('helvetica');

      // Title page for multi-sheet
      if (includeMetadata && selectedSheets.length > 1) {
        doc.setFillColor(themeConfig.headerBg[0], themeConfig.headerBg[1], themeConfig.headerBg[2]);
        doc.rect(0, 0, pageWidth, pageHeight / 2, 'F');

        doc.setTextColor(themeConfig.headerText[0], themeConfig.headerText[1], themeConfig.headerText[2]);
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text(workbook.fileName, pageWidth / 2, pageHeight / 3, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `${selectedSheets.length} sheet${selectedSheets.length !== 1 ? 's' : ''} · Exported ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          pageHeight / 3 + 12,
          { align: 'center' }
        );

        doc.addPage([pageConfig.w, pageConfig.h], orientationStr);
      }

      // Process each sheet
      for (let sIdx = 0; sIdx < selectedSheets.length; sIdx++) {
        const sheet = selectedSheets[sIdx];

        if (sIdx > 0 || (sIdx === 0 && includeMetadata && selectedSheets.length > 1)) {
          if (sIdx > 0 || (includeMetadata && selectedSheets.length > 1 && sIdx === 0)) {
            if (sIdx > 0) doc.addPage([pageConfig.w, pageConfig.h], orientationStr);
          }
        }

        const currentY = margin;

        // Sheet title
        if (includeSheetTitles) {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(26, 26, 26);
          doc.text(sheet.name, margin, currentY + 5);

          // Accent line
          doc.setDrawColor(themeConfig.headerBg[0], themeConfig.headerBg[1], themeConfig.headerBg[2]);
          doc.setLineWidth(0.5);
          doc.line(margin, currentY + 7, margin + 20, currentY + 7);
        }

        // Prepare table data
        const bodyData: any[] = [];
        const headData: any[] = [];

        if (sheet.hasHeader && sheet.rows.length > 0) {
          headData.push(sheet.rows[0]);
          bodyData.push(...sheet.rows.slice(1));
        } else {
          bodyData.push(...sheet.rows);
        }

        // Determine column widths (auto-fit)
        const colCount = sheet.colCount;
        const usableWidth = pageWidth - margin * 2;

        // AutoTable styles
        const tableStyles: any = {
          headStyles: {
            fillColor: themeConfig.headerBg,
            textColor: themeConfig.headerText,
            fontStyle: 'bold',
            fontSize: headerFontSize,
            halign: 'left',
            valign: 'middle',
            cellPadding: 2,
          },
          bodyStyles: {
            fontSize: fontSize,
            textColor: themeConfig.text,
            cellPadding: 1.5,
            valign: 'middle',
            overflow: 'linebreak',
          },
          alternateRowStyles: {
            fillColor: themeConfig.altRowBg,
          },
          styles: {
            font: 'helvetica',
            lineColor: themeConfig.border,
            lineWidth: tableStyle === 'minimal' ? 0 : 0.1,
          },
          theme: tableStyle === 'minimal' ? 'plain' : tableStyle === 'bordered' ? 'plain' : 'grid',
          margin: { left: margin, right: margin, bottom: margin + (includePageNumbers ? 5 : 0) },
          startY: includeSheetTitles ? currentY + 12 : currentY,
          tableLineColor: themeConfig.border,
          tableLineWidth: tableStyle === 'minimal' ? 0 : 0.1,
          showHead: sheet.hasHeader ? 'everyPage' : 'never',
          rowPageBreak: 'auto',
          pageBreak: 'auto',
        };

        // For minimal style, remove outer border too
        if (tableStyle === 'minimal') {
          tableStyles.styles.lineWidth = 0;
        }

        // For striped without header, still stripe
        if (tableStyle === 'striped') {
          tableStyles.alternateRowStyles = { fillColor: themeConfig.altRowBg };
        }

        // Build table
        if (headData.length > 0) {
          autoTable(doc, {
            head: headData,
            body: bodyData,
            ...tableStyles,
          });
        } else {
          autoTable(doc, {
            body: bodyData,
            ...tableStyles,
          });
        }
      }

      // Page numbers
      if (includePageNumbers) {
        const pageCount = doc.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
          doc.setPage(p);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(150, 150, 150);
          doc.text(
            `${p} / ${pageCount}`,
            pageWidth - margin,
            pageHeight - margin / 2,
            { align: 'right' }
          );
          doc.text(
            `Generated by idcardtools · ${new Date().toLocaleDateString()}`,
            margin,
            pageHeight - margin / 2
          );
        }
      }

      const blob = doc.output('blob');
      setResult({
        blob,
        filename: `${workbook.fileName}.pdf`,
      });
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'PDF generation failed.' : 'PDF generation failed.');
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

  const sheets = useMemo(() => {
    return Object.values(editedSheets);
  }, [editedSheets]);

  const activeSheet = sheets[activeSheetIndex];

  const stats = useMemo(() => {
    const selected = sheets.filter((s) => s.selected);
    let totalRows = 0;
    let totalCells = 0;
    let maxCols = 0;
    selected.forEach((s) => {
      totalRows += s.rowCount;
      totalCells += s.rowCount * s.colCount;
      maxCols = Math.max(maxCols, s.colCount);
    });
    return {
      total: sheets.length,
      selected: selected.length,
      rows: totalRows,
      cells: totalCells,
      maxCols,
    };
  }, [sheets]);

  const themeConfig = THEMES.find((t) => t.id === theme)!;

  const searchMatch = (text: string) => {
    if (!searchQuery.trim()) return false;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden min-h-screen">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
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
              Excel to PDF — Spreadsheet Conversion
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Multi-Sheet</span>
            <span>·</span>
            <span>6 Themes</span>
          </div>
        </div>

        {/* Heading */}
        {!workbook && !isLoading && (
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
                Excel to <span className="italic text-[#ff6a00]">PDF</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Convert XLSX, XLS, or CSV files into beautifully formatted PDF tables.
                Multi-sheet, 6 themes, editable cells, and live preview.
              </p>
            </div>
          </motion.div>
        )}

        {/* Upload state */}
        {!workbook && !isLoading && (
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
                  <FileSpreadsheet size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop Excel file here' : 'Select or drop an Excel file'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Supports .xlsx, .xls, and .csv files with multiple sheets.
                </p>
                <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium">
                  <UploadCloud size={14} />
                  Choose file
                  <ArrowUpRight size={12} />
                </span>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {['.xlsx', '.xls', '.csv'].map((ext) => (
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
                { icon: Layers, label: 'Multi-sheet' },
                { icon: Palette, label: '6 themes' },
                { icon: TableIcon, label: '5 table styles' },
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
              <FileSpreadsheet size={40} className="text-[#ff6a00]" />
            </motion.div>
            <span className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
              Parsing spreadsheet...
            </span>
          </div>
        )}

        {/* Workspace */}
        {workbook && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-5 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black truncate max-w-[200px]">{workbook.fileName}</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.selected}/{stats.total}</span>
                  <span className="text-[12px] text-black/50">sheets</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Rows size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.rows}</span>
                  <span className="text-[12px] text-black/50">rows</span>
                </div>
                <div className="w-px h-4 bg-black/10" />
                <div className="flex items-center gap-2">
                  <Columns size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.maxCols}</span>
                  <span className="text-[12px] text-black/50">cols</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="w-9 h-9 rounded-lg bg-[#f4f1ea] hover:bg-black/[0.08] disabled:opacity-30 flex items-center justify-center"
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

                {/* Theme */}
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
                        className={`w-full p-2 rounded-lg text-left transition-all border flex items-center gap-2.5 ${
                          theme === t.id
                            ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                            : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                        }`}
                      >
                        <div className="flex gap-1 shrink-0">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: `rgb(${t.headerBg.join(',')})` }} />
                          <div className="w-4 h-4 rounded border border-black/10" style={{ backgroundColor: `rgb(${t.altRowBg.join(',')})` }} />
                        </div>
                        <span className={`text-[11px] font-medium truncate ${theme === t.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table style */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TableIcon size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Table Style</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TABLE_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setTableStyle(s.id); setResult(null); }}
                        className={`p-2 rounded-lg text-left transition-all border ${
                          tableStyle === s.id
                            ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                            : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                        }`}
                      >
                        <div className={`text-[10px] font-medium ${tableStyle === s.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                          {s.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page setup */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Settings2 size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">Page Setup</span>
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
                        {/* Page size */}
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Page size</label>
                          <div className="grid grid-cols-3 gap-1.5">
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
                        </div>

                        {/* Orientation */}
                        <div>
                          <label className="block text-[9px] font-mono uppercase text-black/40 mb-1.5">Orientation</label>
                          <div className="grid grid-cols-2 gap-1.5">
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
                        </div>

                        {/* Margin */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">Margin</label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{margin}mm</span>
                          </div>
                          <input
                            type="range" min={5} max={30}
                            value={margin}
                            onChange={(e) => { setMargin(parseInt(e.target.value)); setResult(null); }}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        {/* Font sizes */}
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">Body font</label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{fontSize}pt</span>
                          </div>
                          <input
                            type="range" min={6} max={16}
                            value={fontSize}
                            onChange={(e) => { setFontSize(parseInt(e.target.value)); setResult(null); }}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-[9px] font-mono uppercase text-black/40">Header font</label>
                            <span className="text-[10px] font-mono text-[#ff6a00]">{headerFontSize}pt</span>
                          </div>
                          <input
                            type="range" min={8} max={20}
                            value={headerFontSize}
                            onChange={(e) => { setHeaderFontSize(parseInt(e.target.value)); setResult(null); }}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>

                        {/* Toggles */}
                        <div className="pt-2 border-t border-black/[0.06] space-y-2">
                          {[
                            { label: 'Sheet titles', value: includeSheetTitles, set: setIncludeSheetTitles },
                            { label: 'Page numbers', value: includePageNumbers, set: setIncludePageNumbers },
                            { label: 'Cover page', value: includeMetadata, set: setIncludeMetadata },
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

                {/* Sheets list */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase text-black/40">
                      Sheets ({sheets.length})
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => toggleAllSheets(true)}
                        className="text-[9px] font-mono uppercase text-[#ff6a00] hover:text-[#ff8a3d]"
                      >
                        All
                      </button>
                      <span className="text-black/20">·</span>
                      <button
                        onClick={() => toggleAllSheets(false)}
                        className="text-[9px] font-mono uppercase text-black/40 hover:text-black"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {sheets.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSheetIndex(idx)}
                        className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                          activeSheetIndex === idx
                            ? 'bg-[#ff6a00]/[0.06] border border-[#ff6a00]/40'
                            : 'bg-[#f4f1ea]/50 border border-transparent hover:bg-black/[0.04]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={s.selected}
                          onChange={(e) => { e.stopPropagation(); toggleSheetSelection(s.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-[#ff6a00]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-black truncate">{s.name}</div>
                          <div className="text-[9px] font-mono uppercase text-black/40">
                            {s.rowCount}×{s.colCount}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ============ CENTER — Preview/Edit ============ */}
              <div className="lg:col-span-6 space-y-4">

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                  <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase transition-all ${
                        viewMode === 'preview' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50'
                      }`}
                    >
                      <Eye size={11} />
                      Preview
                    </button>
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase transition-all ${
                        viewMode === 'edit' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50'
                      }`}
                    >
                      <Edit3 size={11} />
                      Edit
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative flex items-center">
                    <Search size={11} className="absolute left-2.5 text-black/30 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search cells..."
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

                  {activeSheet && viewMode === 'preview' && (
                    <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
                      {/* PDF-page-like container */}
                      <div
                        className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]"
                        style={{
                          width: orientation === 'portrait' ? 595 : 842,
                          minHeight: orientation === 'portrait' ? 842 : 595,
                          padding: `${margin * 3}px`,
                        }}
                      >
                        {/* Sheet title */}
                        {includeSheetTitles && (
                          <div className="mb-4">
                            <div className="text-[18px] font-bold text-black" style={{ fontFamily: 'Helvetica, sans-serif' }}>
                              {activeSheet.name}
                            </div>
                            <div className="w-12 h-[2px] mt-2" style={{ backgroundColor: `rgb(${themeConfig.headerBg.join(',')})` }} />
                          </div>
                        )}

                        {/* Table */}
                        <div className="overflow-auto">
                          <table
                            className="border-collapse w-full"
                            style={{
                              fontSize: `${fontSize}pt`,
                              fontFamily: 'Helvetica, sans-serif',
                              color: `rgb(${themeConfig.text.join(',')})`,
                            }}
                          >
                            <tbody>
                              {activeSheet.rows.map((row, rowIdx) => {
                                const isHeader = activeSheet.hasHeader && rowIdx === 0;
                                const isAlt = !isHeader && tableStyle === 'striped' && rowIdx % 2 === 0;
                                return (
                                  <tr
                                    key={rowIdx}
                                    style={{
                                      backgroundColor: isHeader
                                        ? `rgb(${themeConfig.headerBg.join(',')})`
                                        : isAlt
                                        ? `rgb(${themeConfig.altRowBg.join(',')})`
                                        : `rgb(${themeConfig.rowBg.join(',')})`,
                                    }}
                                  >
                                    {row.map((cell, colIdx) => (
                                      <td
                                        key={colIdx}
                                        className="px-2 py-1.5 align-top"
                                        style={{
                                          border: tableStyle === 'minimal' ? 'none' : `0.5px solid rgb(${themeConfig.border.join(',')})`,
                                          color: isHeader ? `rgb(${themeConfig.headerText.join(',')})` : `rgb(${themeConfig.text.join(',')})`,
                                          fontWeight: isHeader ? 'bold' : 'normal',
                                          backgroundColor: searchMatch(cell) ? '#fef3c7' : 'transparent',
                                          maxWidth: 250,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {cell || '\u00A0'}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit mode */}
                  {activeSheet && viewMode === 'edit' && (
                    <div className="w-full max-w-4xl">
                      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-black/[0.06]">
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <Edit3 size={13} className="text-[#ff6a00]" />
                            <input
                              type="text"
                              value={activeSheet.name}
                              onChange={(e) => renameSheet(activeSheet.id, e.target.value)}
                              className="text-[13px] font-medium text-black bg-transparent outline-none border-b border-transparent focus:border-[#ff6a00] flex-1 min-w-0"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleHeader(activeSheet.id)}
                              className={`px-2 py-1 rounded-md text-[9px] font-mono uppercase tracking-[0.15em] transition-colors ${
                                activeSheet.hasHeader
                                  ? 'bg-[#ff6a00] text-white'
                                  : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.08]'
                              }`}
                            >
                              Header
                            </button>
                          </div>
                        </div>

                        {/* Table edit */}
                        <div className="overflow-auto max-h-[600px]">
                          <table className="border-collapse">
                            <tbody>
                              {activeSheet.rows.map((row, rowIdx) => {
                                const isHeaderRow = activeSheet.hasHeader && rowIdx === 0;
                                return (
                                  <tr key={rowIdx} className="group/row">
                                    <td className="sticky left-0 bg-[#f4f1ea] border border-black/[0.08] w-8 text-center text-[10px] font-mono text-black/40">
                                      {rowIdx + 1}
                                    </td>
                                    {row.map((cell, colIdx) => {
                                      const isEditing = editingCell?.row === rowIdx && editingCell.col === colIdx;
                                      return (
                                        <td
                                          key={colIdx}
                                          className={`border border-black/[0.08] align-top ${
                                            isHeaderRow ? 'bg-[#f4f1ea] font-medium' : 'bg-white'
                                          }`}
                                          style={{ minWidth: 100 }}
                                        >
                                          {isEditing ? (
                                            <input
                                              autoFocus
                                              type="text"
                                              defaultValue={cell}
                                              onBlur={(e) => {
                                                updateCell(activeSheet.id, rowIdx, colIdx, e.target.value);
                                                setEditingCell(null);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  updateCell(activeSheet.id, rowIdx, colIdx, (e.target as HTMLInputElement).value);
                                                  setEditingCell(null);
                                                } else if (e.key === 'Escape') {
                                                  setEditingCell(null);
                                                }
                                              }}
                                              className="w-full px-2 py-1.5 outline-none text-[12px] bg-white border border-[#ff6a00] rounded"
                                            />
                                          ) : (
                                            <div
                                              onClick={() => setEditingCell({ row: rowIdx, col: colIdx })}
                                              className="px-2 py-1.5 text-[12px] cursor-text min-h-[28px] hover:bg-[#ff6a00]/5 transition-colors"
                                            >
                                              {cell || '\u00A0'}
                                            </div>
                                          )}
                                        </td>
                                      );
                                    })}
                                    <td className="border border-black/[0.08] w-8 text-center">
                                      <button
                                        onClick={() => removeRow(activeSheet.id, rowIdx)}
                                        className="w-6 h-6 rounded hover:bg-red-500/10 hover:text-red-500 text-black/20 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr>
                                <td className="border border-black/[0.08] bg-[#f4f1ea]/30"></td>
                                <td colSpan={activeSheet.colCount + 1} className="border border-black/[0.08] bg-[#f4f1ea]/30 p-1">
                                  <button
                                    onClick={() => addRow(activeSheet.id)}
                                    className="w-full py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 hover:text-[#ff6a00] hover:bg-white/60 rounded flex items-center justify-center gap-1 transition-colors"
                                  >
                                    <Plus size={10} /> Add row
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="px-4 py-3 border-t border-black/[0.06] bg-[#f4f1ea]/30 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                          <span>{activeSheet.rowCount} × {activeSheet.colCount}</span>
                          <button
                            onClick={() => {
                              if (activeSheet.colCount > 1) removeColumn(activeSheet.id, activeSheet.colCount - 1);
                            }}
                            className="hover:text-red-500 transition-colors flex items-center gap-1"
                          >
                            <Minus size={10} /> Remove last column
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info bar */}
                {activeSheet && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[18px] bg-white border border-black/[0.06]">
                    <div className="text-[11px] font-mono uppercase text-black/40">
                      Sheet {activeSheetIndex + 1} / {sheets.length} · {activeSheet.name}
                    </div>
                    <div className="text-[10px] font-mono uppercase text-black/40">
                      {activeSheet.rowCount} rows · {activeSheet.colCount} cols
                    </div>
                  </div>
                )}
              </div>

              {/* ============ RIGHT — Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Preview mini-page */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Printer size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">PDF Settings</span>
                  </div>
                  <div className="space-y-2 text-[11px]">
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
                      <span className="text-black/50">Margins</span>
                      <span className="font-mono font-medium text-black">{margin}mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Font size</span>
                      <span className="font-mono font-medium text-black">{fontSize}pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Table style</span>
                      <span className="font-mono font-medium text-black capitalize">{tableStyle}</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Content</span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Sheets</span>
                      <span className="font-mono font-medium text-black">{stats.selected}/{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Rows</span>
                      <span className="font-mono font-medium text-black">{stats.rows.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Cells</span>
                      <span className="font-mono font-medium text-black">{stats.cells.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Max columns</span>
                      <span className="font-mono font-medium text-black">{stats.maxCols}</span>
                    </div>
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
                        {stats.selected} sheet{stats.selected !== 1 ? 's' : ''} · {stats.rows} rows will be exported as PDF.
                      </p>
                      <button
                        onClick={handleConvert}
                        disabled={isProcessing || stats.selected === 0}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                          isProcessing || stats.selected === 0
                            ? 'bg-black/[0.08] text-black/40'
                            : 'bg-black text-white hover:bg-[#ff6a00]'
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
                    <li>• <strong>Landscape</strong> best for wide tables</li>
                    <li>• <strong>Smaller font</strong> fits more columns</li>
                    <li>• <strong>Striped</strong> style improves readability</li>
                    <li>• Uncheck sheets you don't want</li>
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