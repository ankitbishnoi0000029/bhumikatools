"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, FileSpreadsheet, Copy, Check,
  Edit3, Settings2, Table as TableIcon, Layers, ChevronLeft, ChevronRight,
  Save, Wand2, Layout, Hash, ZoomIn, ZoomOut, RefreshCw, Info,
  BarChart3, Grid3x3, Search, Plus, Minus, Trash2, RotateCw,
  AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp,
  FileOutput, CheckSquare, ListOrdered, Columns, Rows, Move,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getPDFInfo, formatBytes, downloadBlob, readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

interface TableCell {
  value: string;
  type: 'text' | 'number' | 'date' | 'empty';
  align?: 'left' | 'center' | 'right';
}

interface DetectedTable {
  id: string;
  pageNum: number;
  name: string;
  rows: TableCell[][];
  rowCount: number;
  colCount: number;
  hasHeader: boolean;
}

interface PageContent {
  pageNum: number;
  rawLines: string[];
  tables: DetectedTable[];
}

interface ExtractedExcel {
  pages: PageContent[];
  allTables: DetectedTable[];
  totalPages: number;
  totalRows: number;
  totalTables: number;
  title: string;
}

type OutputMode = 'multi-sheet' | 'single-sheet' | 'per-table' | 'csv-bundle';
type SheetStructure = 'auto' | 'one-per-table' | 'one-per-page' | 'combined';

interface SheetStats {
  tables: number;
  rows: number;
  cols: number;
  cells: number;
}

// ============================================
// COMPONENT
// ============================================

export default function PdfToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [excel, setExcel] = useState<ExtractedExcel | null>(null);
  const [editedTables, setEditedTables] = useState<Record<string, DetectedTable>>({});
  const [outputMode, setOutputMode] = useState<OutputMode>('multi-sheet');
  const [sheetStructure, setSheetStructure] = useState<SheetStructure>('one-per-table');
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [autoDetectHeaders, setAutoDetectHeaders] = useState(true);
  const [detectNumbers, setDetectNumbers] = useState(true);
  const [minColumns, setMinColumns] = useState(2);
  const [minRows, setMinRows] = useState(2);
  const [columnSplitTolerance, setColumnSplitTolerance] = useState(8);

  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [activeTableIndex, setActiveTableIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [editingCell, setEditingCell] = useState<{ tableId: string; row: number; col: number } | null>(null);
  const [history, setHistory] = useState<Record<string, DetectedTable>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // TABLE DETECTION
  // ============================================

  const detectTables = useCallback((
    pageNum: number,
    lines: string[]
  ): DetectedTable[] => {
    const tables: DetectedTable[] = [];
    let currentTable: string[][] = [];
    let tableStart = 0;

    // Helper: check if a line is a "table row" - has multiple columns separated by spaces
    const parseLineIntoColumns = (line: string): string[] => {
      // Try splitting on multiple spaces (2+) first
      let cols = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);

      // If only 1 column, try splitting on | or tab
      if (cols.length < 2) {
        cols = line.split(/[|\t]/).map((c) => c.trim()).filter(Boolean);
      }

      // If still 1, try single space with number detection
      if (cols.length < 2 && /\d/.test(line)) {
        // Look for number boundaries
        const parts = line.split(/\s+/);
        // Group words that belong together by proximity heuristics
        if (parts.length >= 2) {
          cols = parts;
        }
      }

      return cols;
    };

    const isTableRow = (line: string): boolean => {
      if (!line.trim()) return false;
      const cols = parseLineIntoColumns(line);
      return cols.length >= minColumns;
    };

    const flushTable = () => {
      if (currentTable.length >= minRows) {
        // Validate column count consistency
        const colCounts = currentTable.map((r) => r.length);
        const maxCols = Math.max(...colCounts);
        const minCols = Math.min(...colCounts);

        // Pad rows with fewer columns
        const normalizedRows = currentTable.map((row) => {
          const padded = [...row];
          while (padded.length < maxCols) padded.push('');
          return padded;
        });

        // Detect headers
        let hasHeader = false;
        let headerRow: string[] = [];

        if (autoDetectHeaders && normalizedRows.length > 1) {
          // Heuristic: first row has more text, fewer numbers
          const firstRow = normalizedRows[0];
          const firstRowHasNumbers = firstRow.filter((c) => /^\d+$/.test(c)).length;
          const firstRowAllText = firstRow.every((c) => c && !/^\d+\.?\d*$/.test(c));

          if (firstRowAllText || firstRowHasNumbers === 0) {
            // Check if other rows have numbers
            const otherRowsHaveNumbers = normalizedRows.slice(1).some((r) =>
              r.some((c) => /^\d+\.?\d*$/.test(c))
            );
            if (otherRowsHaveNumbers) {
              hasHeader = true;
              headerRow = firstRow;
            }
          }
        }

        // Convert to TableCell format
        const cells: TableCell[][] = normalizedRows.map((row, rowIdx) =>
          row.map((cell) => {
            const trimmed = cell.trim();
            let type: TableCell['type'] = 'text';

            if (!trimmed) {
              type = 'empty';
            } else if (detectNumbers && /^-?\d+\.?\d*$/.test(trimmed)) {
              type = 'number';
            } else if (/^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(trimmed)) {
              type = 'date';
            }

            return { value: trimmed, type };
          })
        );

        tables.push({
          id: `table-${pageNum}-${tables.length}-${Date.now()}`,
          pageNum,
          name: `Page ${pageNum} - Table ${tables.length + 1}`,
          rows: cells,
          rowCount: cells.length,
          colCount: maxCols,
          hasHeader,
        });
      }
      currentTable = [];
      tableStart = -1;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isTableRow(line)) {
        if (currentTable.length === 0) {
          tableStart = i;
        }
        const cols = parseLineIntoColumns(line);
        currentTable.push(cols);
      } else {
        // Not a table row — flush current table if any
        if (currentTable.length > 0) {
          flushTable();
        }
      }
    }

    // Flush last table
    if (currentTable.length > 0) {
      flushTable();
    }

    return tables;
  }, [minColumns, minRows, autoDetectHeaders, detectNumbers]);

  // ============================================
  // EXTRACT PDF
  // ============================================

  const extractPDF = useCallback(async (f: File): Promise<ExtractedExcel> => {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const bytes = await readFileAsArrayBuffer(f);
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: PageContent[] = [];
    const allTables: DetectedTable[] = [];
    let totalRows = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Group text items by line (y position)
      const lineMap = new Map<number, any[]>();
      (textContent.items as any[]).forEach((item) => {
        if (!item.str) return;
        const tx = item.transform;
        const y = tx[5];
        const key = Math.round(y / 3) * 3;
        if (!lineMap.has(key)) lineMap.set(key, []);
        lineMap.get(key)!.push(item);
      });

      // Build lines with proper spacing
      const sortedLines: string[] = [];
      Array.from(lineMap.entries())
        .sort((a, b) => b[0] - a[0])
        .forEach(([_, items]) => {
          items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);

          let lineText = '';
          let prevEnd = 0;
          items.forEach((it: any, idx: number) => {
            if (idx > 0) {
              const x = it.transform[4];
              const gap = x - prevEnd;
              // Use multiple spaces for wider gaps (indicates column boundary)
              if (gap > columnSplitTolerance) {
                lineText += '   '; // 3 spaces = column separator
              } else if (gap > 3 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
                lineText += ' ';
              }
            }
            lineText += it.str;
            prevEnd = it.transform[4] + (it.width || 0);
          });

          const trimmed = lineText.trim();
          if (trimmed) sortedLines.push(trimmed);
        });

      // Detect tables in this page
      const tables = detectTables(i, sortedLines);
      totalRows += tables.reduce((sum, t) => sum + t.rowCount, 0);
      allTables.push(...tables);

      pages.push({
        pageNum: i,
        rawLines: sortedLines,
        tables,
      });

      setLoadProgress(Math.round((i / pdf.numPages) * 100));
    }

    return {
      pages,
      allTables,
      totalPages: pdf.numPages,
      totalRows,
      totalTables: allTables.length,
      title: f.name.replace(/\.pdf$/i, ''),
    };
  }, [detectTables, columnSplitTolerance]);

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
    setExcel(null);
    setEditedTables({});
    setResult(null);
    setActiveTableIndex(0);
    setLoadProgress(0);
    setHistory([]);
    setHistoryIndex(-1);

    try {
      const info = await getPDFInfo(f);
      if (info.pageCount === 0) throw new Error('PDF has no pages.');

      const extracted = await extractPDF(f);
      setExcel(extracted);
      const initial: Record<string, DetectedTable> = {};
      extracted.allTables.forEach((t) => { initial[t.id] = t; });
      setEditedTables(initial);
      setHistory([initial]);
      setHistoryIndex(0);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message || 'Failed to extract. PDF may be scanned.' : 'Failed to extract. PDF may be scanned.');
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
    setExcel(null);
    setEditedTables({});
    setResult(null);
    setError(null);
    setActiveTableIndex(0);
  };

  // ============================================
  // EDIT
  // ============================================

  const pushHistory = useCallback((newTables: Record<string, DetectedTable>) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, JSON.parse(JSON.stringify(newTables))];
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const updateCell = (tableId: string, row: number, col: number, value: string) => {
    const newTables = { ...editedTables };
    const table = { ...newTables[tableId] };
    const rows = table.rows.map((r) => [...r]);
    if (rows[row] && rows[row][col]) {
      const trimmed = value.trim();
      let type: TableCell['type'] = 'text';
      if (!trimmed) type = 'empty';
      else if (detectNumbers && /^-?\d+\.?\d*$/.test(trimmed)) type = 'number';
      rows[row][col] = { value: trimmed, type };
    }
    table.rows = rows;
    newTables[tableId] = table;
    setEditedTables(newTables);
    setResult(null);
    pushHistory(newTables);
  };

  const toggleHeader = (tableId: string) => {
    const newTables = { ...editedTables };
    newTables[tableId] = { ...newTables[tableId], hasHeader: !newTables[tableId].hasHeader };
    setEditedTables(newTables);
    setResult(null);
    pushHistory(newTables);
  };

  const addRow = (tableId: string) => {
    const newTables = { ...editedTables };
    const table = { ...newTables[tableId] };
    const newRow = Array(table.colCount).fill('').map(() => ({ value: '', type: 'empty' as const }));
    table.rows = [...table.rows, newRow];
    table.rowCount = table.rows.length;
    newTables[tableId] = table;
    setEditedTables(newTables);
    setResult(null);
    pushHistory(newTables);
  };

  const addColumn = (tableId: string) => {
    const newTables = { ...editedTables };
    const table = { ...newTables[tableId] };
    table.rows = table.rows.map((r) => [...r, { value: '', type: 'empty' as const }]);
    table.colCount += 1;
    newTables[tableId] = table;
    setEditedTables(newTables);
    setResult(null);
    pushHistory(newTables);
  };

  const removeRow = (tableId: string, rowIdx: number) => {
    const newTables = { ...editedTables };
    const table = { ...newTables[tableId] };
    table.rows = table.rows.filter((_, i) => i !== rowIdx);
    table.rowCount = table.rows.length;
    newTables[tableId] = table;
    setEditedTables(newTables);
    setResult(null);
    pushHistory(newTables);
  };

  const removeColumn = (tableId: string, colIdx: number) => {
    const newTables = { ...editedTables };
    const table = { ...newTables[tableId] };
    table.rows = table.rows.map((r) => r.filter((_, i) => i !== colIdx));
    table.colCount = Math.max(0, table.colCount - 1);
    newTables[tableId] = table;
    setEditedTables(newTables);
    setResult(null);
    pushHistory(newTables);
  };

  const renameTable = (tableId: string, name: string) => {
    const newTables = { ...editedTables };
    newTables[tableId] = { ...newTables[tableId], name };
    setEditedTables(newTables);
    setResult(null);
    pushHistory(newTables);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setEditedTables(JSON.parse(JSON.stringify(history[i])));
    setResult(null);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setEditedTables(JSON.parse(JSON.stringify(history[i])));
    setResult(null);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const copyTableAsCSV = (tableId: string) => {
    const table = editedTables[tableId];
    if (!table) return;
    const csv = table.rows
      .map((row) => row.map((c) => {
        const v = c.value.replace(/"/g, '""');
        return /[,"\n]/.test(v) ? `"${v}"` : v;
      }).join(','))
      .join('\n');
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ============================================
  // BUILD XLSX
  // ============================================

  const buildWorkbook = (): XLSX.WorkBook => {
    if (!excel) throw new Error('No data');

    const wb = XLSX.utils.book_new();

    const tables = Object.keys(editedTables)
      .sort((a, b) => {
        const ta = editedTables[a];
        const tb = editedTables[b];
        if (ta.pageNum !== tb.pageNum) return ta.pageNum - tb.pageNum;
        return ta.name.localeCompare(tb.name);
      })
      .map((k) => editedTables[k]);

    const tablesToExport = tables.filter((t) => t.rowCount >= 1 && t.colCount >= 1);

    if (tablesToExport.length === 0) {
      // Fallback: dump all text
      const ws = XLSX.utils.aoa_to_sheet(
        excel.pages.flatMap((p) => [
          [`Page ${p.pageNum}`],
          ...p.rawLines.map((l) => [l]),
          [''],
        ])
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Text Content');
      return wb;
    }

    if (sheetStructure === 'one-per-table' || outputMode === 'multi-sheet') {
      // One sheet per table
      tablesToExport.forEach((table, idx) => {
        const aoa: any[][] = table.rows.map((row) => row.map((c) => {
          if (c.type === 'number' && c.value) {
            const n = Number(c.value);
            return isNaN(n) ? c.value : n;
          }
          return c.value;
        }));

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Sheet name (max 31 chars)
        let sheetName = table.name.slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
        if (!sheetName) sheetName = `Table ${idx + 1}`;

        // Ensure unique name
        let finalName = sheetName;
        let suffix = 1;
        while (wb.SheetNames.includes(finalName)) {
          finalName = `${sheetName.slice(0, 28)}_${suffix++}`;
        }

        XLSX.utils.book_append_sheet(wb, ws, finalName);
      });
    } else if (sheetStructure === 'one-per-page' || outputMode === 'single-sheet') {
      // Group by page
      const byPage = new Map<number, DetectedTable[]>();
      tablesToExport.forEach((t) => {
        if (!byPage.has(t.pageNum)) byPage.set(t.pageNum, []);
        byPage.get(t.pageNum)!.push(t);
      });

      Array.from(byPage.entries())
        .sort((a, b) => a[0] - b[0])
        .forEach(([pageNum, pageTables]) => {
          const aoa: any[][] = [];
          pageTables.forEach((table, tidx) => {
            if (tidx > 0) aoa.push(['']);
            aoa.push([table.name]);
            aoa.push([]);
            table.rows.forEach((row) => {
              aoa.push(row.map((c) => {
                if (c.type === 'number' && c.value) {
                  const n = Number(c.value);
                  return isNaN(n) ? c.value : n;
                }
                return c.value;
              }));
            });
          });

          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const sheetName = `Page ${pageNum}`.slice(0, 31);
          let finalName = sheetName;
          let suffix = 1;
          while (wb.SheetNames.includes(finalName)) {
            finalName = `Page ${pageNum}_${suffix++}`;
          }
          XLSX.utils.book_append_sheet(wb, ws, finalName);
        });
    } else if (sheetStructure === 'combined') {
      // All combined into one sheet
      const aoa: any[][] = [];
      tablesToExport.forEach((table, tidx) => {
        if (tidx > 0) {
          aoa.push(['']);
          aoa.push(['']);
        }
        aoa.push([`▼ ${table.name} (Page ${table.pageNum})`]);
        aoa.push([]);
        table.rows.forEach((row) => {
          aoa.push(row.map((c) => {
            if (c.type === 'number' && c.value) {
              const n = Number(c.value);
              return isNaN(n) ? c.value : n;
            }
            return c.value;
          }));
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, 'All Tables');
    }

    return wb;
  };

  const buildCSVBundle = async (): Promise<Blob> => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder(excel?.title || 'export') || zip;

    Object.keys(editedTables).forEach((id) => {
      const table = editedTables[id];
      const csv = table.rows
        .map((row) => row.map((c) => {
          const v = c.value.replace(/"/g, '""');
          return /[,"\n]/.test(v) ? `"${v}"` : v;
        }).join(','))
        .join('\n');
      const safeName = table.name.replace(/[^a-zA-Z0-9-_]/g, '_') + '.csv';
      folder.file(safeName, csv);
    });

    return await zip.generateAsync({ type: 'blob' });
  };

  const handleConvert = async () => {
    if (!excel) return;
    setIsProcessing(true);
    setError(null);

    try {
      if (outputMode === 'csv-bundle') {
        const blob = await buildCSVBundle();
        setResult({ blob, filename: `${excel.title}-csv.zip` });
      } else {
        const wb = buildWorkbook();
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        setResult({ blob, filename: `${excel.title}.xlsx` });
      }
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

  const tables = useMemo(() => {
    return Object.keys(editedTables)
      .sort((a, b) => {
        const ta = editedTables[a];
        const tb = editedTables[b];
        if (ta.pageNum !== tb.pageNum) return ta.pageNum - tb.pageNum;
        return ta.name.localeCompare(tb.name);
      })
      .map((k) => editedTables[k]);
  }, [editedTables]);

  const activeTable = tables[activeTableIndex];

  const stats = useMemo<SheetStats>(() => {
    let totalRows = 0;
    let totalCells = 0;
    let maxCols = 0;
    tables.forEach((t) => {
      totalRows += t.rowCount;
      totalCells += t.rowCount * t.colCount;
      maxCols = Math.max(maxCols, t.colCount);
    });
    return { tables: tables.length, rows: totalRows, cols: maxCols, cells: totalCells };
  }, [tables]);

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
              PDF to Excel — Smart Table Detection
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Auto Table Detect</span>
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
                PDF to <span className="italic text-[#ff6a00]">Excel</span>.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Extract tables from PDFs automatically. Edit cells, adjust columns,
                and export as real .xlsx with multiple sheets.
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
                  <FileSpreadsheet size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Auto-detect tables, edit cells inline, export as multi-sheet Excel.
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
                { icon: TableIcon, label: 'Auto table detect' },
                { icon: Edit3, label: 'Inline editing' },
                { icon: Layers, label: 'Multi-sheet' },
                { icon: FileSpreadsheet, label: 'Real .xlsx' },
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
              Detecting tables... {loadProgress}%
            </span>
            <div className="mt-4 w-64 h-1 rounded-full bg-black/[0.06] overflow-hidden">
              <motion.div className="h-full bg-[#ff6a00]" animate={{ width: `${loadProgress}%` }} transition={{ duration: 0.2 }} />
            </div>
          </div>
        )}

        {/* Workspace */}
        {file && excel && !isLoading && (
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
                  <TableIcon size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{stats.tables}</span>
                  <span className="text-[12px] text-black/50">tables</span>
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
                  <span className="text-[13px] font-medium text-black">{stats.cols}</span>
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

            {tables.length === 0 ? (
              /* No tables detected */
              <div className="rounded-[18px] bg-white border border-black/[0.06] p-12 text-center">
                <AlertCircle size={40} className="text-black/20 mx-auto mb-4" />
                <h3 className="text-[20px] text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  No tables detected
                </h3>
                <p className="text-[13px] text-black/50 mb-6 max-w-md mx-auto">
                  This PDF might not have structured tables, or the text is scanned.
                  Adjust detection settings or try lower thresholds.
                </p>
                <button
                  onClick={() => { setMinColumns(1); setMinRows(2); loadPDF(file); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] transition-colors"
                >
                  <RefreshCw size={13} />
                  Retry with lower thresholds
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* ============ LEFT — Settings ============ */}
                <div className="lg:col-span-3 space-y-4">

                  {/* Sheet structure */}
                  <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Layout size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">Sheet Structure</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { id: 'one-per-table' as SheetStructure, label: 'One per Table', desc: 'Each table → own sheet' },
                        { id: 'one-per-page' as SheetStructure, label: 'One per Page', desc: 'All tables from page → sheet' },
                        { id: 'combined' as SheetStructure, label: 'Combined', desc: 'All data in one sheet' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSheetStructure(s.id); setResult(null); }}
                          className={`w-full p-2.5 rounded-lg text-left transition-all border ${
                            sheetStructure === s.id
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <div className={`text-[11px] font-medium ${sheetStructure === s.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                            {s.label}
                          </div>
                          <div className="text-[9px] text-black/40">{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detection settings */}
                  <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                    <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wand2 size={13} className="text-[#ff6a00]" />
                        <span className="text-[10px] font-mono uppercase text-black/40">Detection</span>
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
                          <div>
                            <div className="flex justify-between mb-1.5">
                              <label className="text-[9px] font-mono uppercase text-black/40">Min columns</label>
                              <span className="text-[10px] font-mono text-[#ff6a00]">{minColumns}</span>
                            </div>
                            <input
                              type="range" min={1} max={10}
                              value={minColumns}
                              onChange={(e) => { setMinColumns(parseInt(e.target.value)); setResult(null); }}
                              className="w-full accent-[#ff6a00]"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1.5">
                              <label className="text-[9px] font-mono uppercase text-black/40">Min rows</label>
                              <span className="text-[10px] font-mono text-[#ff6a00]">{minRows}</span>
                            </div>
                            <input
                              type="range" min={1} max={10}
                              value={minRows}
                              onChange={(e) => { setMinRows(parseInt(e.target.value)); setResult(null); }}
                              className="w-full accent-[#ff6a00]"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1.5">
                              <label className="text-[9px] font-mono uppercase text-black/40">Column gap</label>
                              <span className="text-[10px] font-mono text-[#ff6a00]">{columnSplitTolerance}pt</span>
                            </div>
                            <input
                              type="range" min={2} max={30}
                              value={columnSplitTolerance}
                              onChange={(e) => { setColumnSplitTolerance(parseInt(e.target.value)); setResult(null); }}
                              className="w-full accent-[#ff6a00]"
                            />
                          </div>
                          <div className="pt-2 border-t border-black/[0.06] space-y-2">
                            {[
                              { label: 'Auto-detect headers', value: autoDetectHeaders, set: setAutoDetectHeaders },
                              { label: 'Detect number cells', value: detectNumbers, set: setDetectNumbers },
                              { label: 'Preserve formatting', value: preserveFormatting, set: setPreserveFormatting },
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

                  {/* Tables list */}
                  <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                    <div className="text-[10px] font-mono uppercase text-black/40 mb-3">
                      Tables ({tables.length})
                    </div>
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {tables.map((t, idx) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTableIndex(idx)}
                          className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center gap-2 ${
                            activeTableIndex === idx
                              ? 'bg-[#ff6a00]/[0.06] border border-[#ff6a00]/40'
                              : 'bg-[#f4f1ea]/50 border border-transparent hover:bg-black/[0.04]'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-mono ${
                            activeTableIndex === idx ? 'bg-[#ff6a00] text-white' : 'bg-white text-black/40'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-medium text-black truncate">{t.name}</div>
                            <div className="text-[9px] font-mono uppercase text-black/40">
                              {t.rowCount}×{t.colCount} {t.hasHeader ? '· header' : ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ============ CENTER — Table Preview ============ */}
                <div className="lg:col-span-6 space-y-4">

                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-[18px] bg-white border border-black/[0.06]">
                    <div className="flex items-center gap-0.5 p-1 rounded-lg bg-[#f4f1ea]">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase transition-all ${
                          viewMode === 'table' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50'
                        }`}
                      >
                        <TableIcon size={11} />
                        Table
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-mono uppercase transition-all ${
                          viewMode === 'grid' ? 'bg-white shadow-sm text-[#ff6a00]' : 'text-black/50'
                        }`}
                      >
                        <Grid3x3 size={11} />
                        Grid
                      </button>
                    </div>

                    {viewMode === 'table' && (
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

                    {/* Single table view */}
                    {viewMode === 'table' && activeTable && (
                      <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                        <div className="bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] rounded-lg overflow-hidden">
                          {/* Table header */}
                          <div className="px-4 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50 flex items-center justify-between">
                            <input
                              type="text"
                              value={activeTable.name}
                              onChange={(e) => renameTable(activeTable.id, e.target.value)}
                              className="text-[13px] font-medium text-black bg-transparent outline-none border-b border-transparent focus:border-[#ff6a00] flex-1 min-w-0"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleHeader(activeTable.id)}
                                className={`px-2 py-1 rounded-md text-[9px] font-mono uppercase tracking-[0.15em] transition-colors ${
                                  activeTable.hasHeader
                                    ? 'bg-[#ff6a00] text-white'
                                    : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.08]'
                                }`}
                              >
                                Header
                              </button>
                              <button
                                onClick={() => copyTableAsCSV(activeTable.id)}
                                className={`px-2 py-1 rounded-md text-[9px] font-mono uppercase tracking-[0.15em] transition-colors ${
                                  copied ? 'bg-emerald-500/10 text-emerald-600' : 'bg-black/[0.04] text-black/50 hover:bg-black/[0.08]'
                                }`}
                              >
                                {copied ? '✓' : 'CSV'}
                              </button>
                            </div>
                          </div>

                          {/* Table */}
                          <div className="overflow-auto max-h-[600px]">
                            <table className="border-collapse">
                              <tbody>
                                {activeTable.rows.map((row, rowIdx) => {
                                  const isHeaderRow = activeTable.hasHeader && rowIdx === 0;
                                  return (
                                    <tr key={rowIdx} className="group/row">
                                      {/* Row number */}
                                      <td className="sticky left-0 bg-[#f4f1ea] border border-black/[0.08] w-8 text-center text-[10px] font-mono text-black/40">
                                        {rowIdx + 1}
                                      </td>
                                      {row.map((cell, colIdx) => {
                                        const isEditing = editingCell?.tableId === activeTable.id && editingCell.row === rowIdx && editingCell.col === colIdx;
                                        return (
                                          <td
                                            key={colIdx}
                                            className={`border border-black/[0.08] align-top ${
                                              isHeaderRow
                                                ? 'bg-[#f4f1ea] font-medium text-black'
                                                : cell.type === 'number'
                                                ? 'bg-blue-50/30 text-right font-mono'
                                                : 'bg-white'
                                            }`}
                                            style={{ minWidth: 100 }}
                                          >
                                            {isEditing ? (
                                              <input
                                                autoFocus
                                                type="text"
                                                defaultValue={cell.value}
                                                onBlur={(e) => {
                                                  updateCell(activeTable.id, rowIdx, colIdx, e.target.value);
                                                  setEditingCell(null);
                                                }}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    updateCell(activeTable.id, rowIdx, colIdx, (e.target as HTMLInputElement).value);
                                                    setEditingCell(null);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingCell(null);
                                                  }
                                                }}
                                                className="w-full px-2 py-1.5 outline-none text-[12px] bg-white border border-[#ff6a00] rounded"
                                              />
                                            ) : (
                                              <div
                                                onClick={() => setEditingCell({ tableId: activeTable.id, row: rowIdx, col: colIdx })}
                                                className="px-2 py-1.5 text-[12px] cursor-text min-h-[28px] hover:bg-[#ff6a00]/5 transition-colors"
                                              >
                                                {cell.value || '\u00A0'}
                                              </div>
                                            )}
                                          </td>
                                        );
                                      })}
                                      {/* Remove row */}
                                      <td className="border border-black/[0.08] w-8 text-center">
                                        <button
                                          onClick={() => removeRow(activeTable.id, rowIdx)}
                                          className="w-6 h-6 rounded hover:bg-red-500/10 hover:text-red-500 text-black/20 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {/* Add row */}
                                <tr>
                                  <td className="border border-black/[0.08] bg-[#f4f1ea]/30"></td>
                                  <td colSpan={activeTable.colCount + 1} className="border border-black/[0.08] bg-[#f4f1ea]/30 p-1">
                                    <button
                                      onClick={() => addRow(activeTable.id)}
                                      className="w-full py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 hover:text-[#ff6a00] hover:bg-white/60 rounded flex items-center justify-center gap-1 transition-colors"
                                    >
                                      <Plus size={10} /> Add row
                                    </button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Footer controls */}
                          <div className="px-4 py-3 border-t border-black/[0.06] bg-[#f4f1ea]/30 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                            <span>{activeTable.rowCount} × {activeTable.colCount}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => addColumn(activeTable.id)}
                                className="hover:text-[#ff6a00] transition-colors flex items-center gap-1"
                              >
                                <Plus size={10} /> Add column
                              </button>
                              <span>·</span>
                              <button
                                onClick={() => {
                                  if (activeTable.colCount > 1) removeColumn(activeTable.id, activeTable.colCount - 1);
                                }}
                                className="hover:text-red-500 transition-colors flex items-center gap-1"
                              >
                                <Minus size={10} /> Remove column
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Grid view - all tables */}
                    {viewMode === 'grid' && (
                      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tables.map((t, idx) => (
                          <button
                            key={t.id}
                            onClick={() => { setActiveTableIndex(idx); setViewMode('table'); }}
                            className={`p-4 rounded-lg border-2 text-left transition-all hover:scale-[1.02] bg-white ${
                              activeTableIndex === idx ? 'border-[#ff6a00] shadow-lg' : 'border-black/[0.08]'
                            }`}
                          >
                            <div className="text-[12px] font-medium text-black mb-1 truncate">{t.name}</div>
                            <div className="text-[10px] font-mono uppercase text-black/40 mb-3">
                              {t.rowCount} × {t.colCount}
                            </div>
                            <div className="text-[9px] font-mono text-black/30 leading-tight overflow-hidden" style={{ maxHeight: 80 }}>
                              {t.rows.slice(0, 3).map((row, ri) => (
                                <div key={ri} className="truncate">
                                  {row.map((c) => c.value).join(' · ')}
                                </div>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ============ RIGHT — Export ============ */}
                <div className="lg:col-span-3 space-y-4">

                  {/* Output mode */}
                  <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileOutput size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">Output</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { id: 'multi-sheet' as OutputMode, label: 'Excel (.xlsx)', desc: 'Multi-sheet workbook' },
                        { id: 'csv-bundle' as OutputMode, label: 'CSV Bundle (.zip)', desc: 'One CSV per table' },
                      ].map((o) => (
                        <button
                          key={o.id}
                          onClick={() => { setOutputMode(o.id); setResult(null); }}
                          className={`w-full p-2.5 rounded-lg text-left transition-all border ${
                            outputMode === o.id
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]/40'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <div className={`text-[11px] font-medium ${outputMode === o.id ? 'text-[#ff6a00]' : 'text-black'}`}>
                            {o.label}
                          </div>
                          <div className="text-[9px] text-black/40">{o.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase text-black/40">Stats</span>
                    </div>
                    <div className="space-y-2 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-black/50">Tables</span>
                        <span className="font-mono font-medium text-black">{stats.tables}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/50">Total rows</span>
                        <span className="font-mono font-medium text-black">{stats.rows.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/50">Max columns</span>
                        <span className="font-mono font-medium text-black">{stats.cols}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/50">Total cells</span>
                        <span className="font-mono font-medium text-black">{stats.cells.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-black/[0.06]">
                        <span className="text-black/50">Sheets</span>
                        <span className="font-mono font-medium text-[#ff6a00]">
                          {sheetStructure === 'one-per-table' ? stats.tables :
                           sheetStructure === 'one-per-page' ? new Set(tables.map((t) => t.pageNum)).size :
                           1}
                        </span>
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
                          <div className="text-[13px] font-medium text-black mb-1">
                            {outputMode === 'csv-bundle' ? 'ZIP ready!' : 'Excel ready!'}
                          </div>
                          <div className="text-[10px] font-mono text-black/40">{formatBytes(result.blob.size)}</div>
                        </div>
                        <button
                          onClick={downloadResult}
                          className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2"
                        >
                          <Download size={13} />
                          Download
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
                          {stats.tables} table{stats.tables !== 1 ? 's' : ''} · {stats.rows} rows will be exported.
                        </p>
                        <button
                          onClick={handleConvert}
                          disabled={isProcessing}
                          className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-colors ${
                            isProcessing ? 'bg-black/[0.08] text-black/40' : 'bg-black text-white hover:bg-[#ff6a00]'
                          }`}
                        >
                          {isProcessing ? (
                            <><Loader2 size={13} className="animate-spin" /> Converting...</>
                          ) : (
                            <><Sparkles size={13} /> Convert to Excel</>
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
                      <li>• Click any cell to <strong>edit inline</strong></li>
                      <li>• <strong>Toggle header</strong> to bold first row</li>
                      <li>• Adjust <strong>column gap</strong> if columns merge</li>
                      <li>• Scanned PDFs need OCR first</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
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