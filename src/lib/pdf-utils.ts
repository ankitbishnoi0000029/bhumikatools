// src/lib/pdf-utils.ts
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

// ============================================
// FILE HELPERS
// ============================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createBlobFromBytes(bytes: Uint8Array, type: string): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type });
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function splitPDFByRanges(
  file: File,
  ranges: { from: number; to: number }[]
): Promise<{ name: string; bytes: Uint8Array; pageCount: number }[]> {
  const bytes = await readFileAsArrayBuffer(file);
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();
  const results: { name: string; bytes: Uint8Array; pageCount: number }[] = [];

  for (const range of ranges) {
    const from = Math.max(1, range.from);
    const to = Math.min(totalPages, range.to);
    if (from > to) continue;

    const newDoc = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = from - 1; i < to; i++) indices.push(i);

    const pages = await newDoc.copyPages(source, indices);
    pages.forEach((p) => newDoc.addPage(p));

    results.push({
      name: `pages-${from}-${to}.pdf`,
      bytes: await newDoc.save(),
      pageCount: indices.length,
    });
  }

  return results;
}

export async function splitPDFIndividualPages(
  file: File
): Promise<{ name: string; bytes: Uint8Array; pageCount: number }[]> {
  const bytes = await readFileAsArrayBuffer(file);
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();
  const results: { name: string; bytes: Uint8Array; pageCount: number }[] = [];

  for (let i = 0; i < totalPages; i++) {
    const newDoc = await PDFDocument.create();
    const [page] = await newDoc.copyPages(source, [i]);
    newDoc.addPage(page);

    results.push({
      name: `page-${i + 1}.pdf`,
      bytes: await newDoc.save(),
      pageCount: 1,
    });
  }

  return results;
}

export async function splitPDFEveryNPages(
  file: File,
  n: number
): Promise<{ name: string; bytes: Uint8Array; pageCount: number }[]> {
  const bytes = await readFileAsArrayBuffer(file);
  const source = await PDFDocument.load(bytes);
  const totalPages = source.getPageCount();
  const results: { name: string; bytes: Uint8Array; pageCount: number }[] = [];

  for (let start = 0; start < totalPages; start += n) {
    const end = Math.min(start + n, totalPages);
    const newDoc = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = start; i < end; i++) indices.push(i);

    const pages = await newDoc.copyPages(source, indices);
    pages.forEach((p) => newDoc.addPage(p));

    results.push({
      name: `pages-${start + 1}-${end}.pdf`,
      bytes: await newDoc.save(),
      pageCount: indices.length,
    });
  }

  return results;
}

export async function splitPDFByCustomPages(
  file: File,
  selectedPages: number[],
  groupBy: 'individual' | 'combined' = 'combined'
): Promise<{ name: string; bytes: Uint8Array; pageCount: number }[]> {
  const bytes = await readFileAsArrayBuffer(file);
  const source = await PDFDocument.load(bytes);
  const sorted = [...selectedPages].sort((a, b) => a - b);
  const results: { name: string; bytes: Uint8Array; pageCount: number }[] = [];

  if (groupBy === 'combined') {
    const newDoc = await PDFDocument.create();
    const indices = sorted.map((p) => p - 1);
    const pages = await newDoc.copyPages(source, indices);
    pages.forEach((p) => newDoc.addPage(p));
    results.push({
      name: `selected-${sorted[0]}-${sorted[sorted.length - 1]}.pdf`,
      bytes: await newDoc.save(),
      pageCount: indices.length,
    });
  } else {
    for (const pageNum of sorted) {
      const newDoc = await PDFDocument.create();
      const [page] = await newDoc.copyPages(source, [pageNum - 1]);
      newDoc.addPage(page);
      results.push({
        name: `page-${pageNum}.pdf`,
        bytes: await newDoc.save(),
        pageCount: 1,
      });
    }
  }

  return results;
}

// ============================================
// ZIP DOWNLOAD
// ============================================

export async function downloadAsZip(
  files: { name: string; bytes: Uint8Array }[],
  zipName: string = 'split-pdfs.zip'
): Promise<void> {
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.name, f.bytes));
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipName);
}

// ============================================
// GET ALL PAGE THUMBNAILS
// ============================================

export async function getAllPageThumbnails(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<{ pageNum: number; dataUrl: string }[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const bytes = await readFileAsArrayBuffer(file);
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const thumbs: { pageNum: number; dataUrl: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.4 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    thumbs.push({
      pageNum: i,
      dataUrl: canvas.toDataURL('image/jpeg', 0.7),
    });

    if (onProgress) onProgress(i, pdf.numPages);
  }

  return thumbs;
}

// ============================================
// MERGE WITH ORDER
// ============================================

export async function mergePDFsInOrder(files: File[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return await merged.save();
}

// ============================================
// GET PDF INFO
// ============================================

export async function getPDFInfo(file: File): Promise<{
  pageCount: number;
  fileSize: number;
  title: string;
  firstPagePreview: string;
}> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const bytes = await readFileAsArrayBuffer(file);
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });
  
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  const preview = canvas.toDataURL('image/jpeg', 0.7);

  const meta = await pdf.getMetadata();
  const title = (meta.info as any)?.Title || file.name.replace('.pdf', '');

  return {
    pageCount: pdf.numPages,
    fileSize: file.size,
    title,
    firstPagePreview: preview,
  };
}

// ============================================
// MERGE WITH PREVIEW INFO
// ============================================

export async function mergePDFsWithInfo(files: File[]): Promise<{
  bytes: Uint8Array;
  totalPages: number;
  totalSize: number;
}> {
  const merged = await PDFDocument.create();
  let totalPages = 0;

  for (const file of files) {
    const bytes = await readFileAsArrayBuffer(file);
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
    totalPages += doc.getPageCount();
  }

  const savedBytes = await merged.save();
  return {
    bytes: savedBytes,
    totalPages,
    totalSize: savedBytes.byteLength,
  };
}
// ============================================
// SPLIT
// ============================================

export async function splitPDF(
  file: File,
  ranges: { from: number; to: number }[]
): Promise<Uint8Array[]> {
  const bytes = await readFileAsArrayBuffer(file);
  const source = await PDFDocument.load(bytes);
  const results: Uint8Array[] = [];

  for (const range of ranges) {
    const newDoc = await PDFDocument.create();
    const indices = [];
    for (let i = range.from - 1; i < range.to; i++) indices.push(i);
    const pages = await newDoc.copyPages(source, indices);
    pages.forEach((p) => newDoc.addPage(p));
    results.push(await newDoc.save());
  }
  return results;
}

// ============================================
// ROTATE
// ============================================

export async function rotatePDF(
  file: File,
  rotationDegrees: number,
  pages?: number[]
): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const pagesToRotate = pages || doc.getPageIndices().map((i) => i + 1);

  pagesToRotate.forEach((pageNum) => {
    const page = doc.getPage(pageNum - 1);
    const current = page.getRotation().angle;
    page.setRotation(degrees(current + rotationDegrees));
  });
  return await doc.save();
}

// ============================================
// DELETE PAGES
// ============================================

export async function deletePages(file: File, pagesToDelete: number[]): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  // Sort descending so indices don't shift
  const sorted = [...pagesToDelete].sort((a, b) => b - a);
  sorted.forEach((pageNum) => {
    if (pageNum >= 1 && pageNum <= doc.getPageCount()) {
      doc.removePage(pageNum - 1);
    }
  });
  return await doc.save();
}

// ============================================
// EXTRACT PAGES
// ============================================

export async function extractPages(file: File, pagesToExtract: number[]): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const source = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();
  const indices = pagesToExtract.filter((p) => p >= 1 && p <= source.getPageCount()).map((p) => p - 1);
  const pages = await newDoc.copyPages(source, indices);
  pages.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

// ============================================
// REORDER PAGES
// ============================================

export async function reorderPages(file: File, newOrder: number[]): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const source = await PDFDocument.load(bytes);
  const newDoc = await PDFDocument.create();
  const indices = newOrder.map((p) => p - 1);
  const pages = await newDoc.copyPages(source, indices);
  pages.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
}

// ============================================
// ADD WATERMARK
// ============================================

export async function addWatermark(
  file: File,
  text: string,
  options: {
    opacity?: number;
    fontSize?: number;
    color?: { r: number; g: number; b: number };
    rotation?: number;
  } = {}
): Promise<Uint8Array> {
  const { opacity = 0.3, fontSize = 60, color = { r: 0.6, g: 0.6, b: 0.6 }, rotation = 45 } = options;

  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(text, {
      x: width / 2 - (textWidth / 2) * Math.cos((rotation * Math.PI) / 180),
      y: height / 2 - (textHeight / 2) * Math.sin((rotation * Math.PI) / 180),
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotation),
    });
  });

  return await doc.save();
}

// ============================================
// ADD PAGE NUMBERS
// ============================================

export async function addPageNumbers(
  file: File,
  options: {
    position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
    fontSize?: number;
    startFrom?: number;
    format?: (n: number, total: number) => string;
  } = {}
): Promise<Uint8Array> {
  const {
    position = 'bottom-center',
    fontSize = 12,
    startFrom = 1,
    format = (n, total) => `${n} / ${total}`,
  } = options;

  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, i) => {
    const { width, height } = page.getSize();
    const text = format(i + startFrom, total + startFrom - 1);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const margin = 30;

    let x = width / 2 - textWidth / 2;
    let y = margin;

    if (position.includes('right')) x = width - textWidth - margin;
    if (position.includes('left')) x = margin;
    if (position.startsWith('top')) y = height - margin - fontSize;

    page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) });
  });

  return await doc.save();
}

// ============================================
// PROTECT (Password)
// ============================================
export async function protectPDF(
  file: File,
  password: string,
  options?: {
    ownerPassword?: string;
    encryption?: 'aes-128' | 'aes-256';
    permissions?: {
      printing?: 'none' | 'low-res' | 'high-res';
      copying?: boolean;
      modifying?: boolean;
    };
  }
): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const { PDFDocument: EncryptablePDFDocument } = await import('@cantoo/pdf-lib');
  const doc = await EncryptablePDFDocument.load(bytes, { ignoreEncryption: true });

  doc.encrypt({
    userPassword: password,
    ownerPassword: options?.ownerPassword || password,
    algorithm: options?.encryption === 'aes-128' ? 'AES-128' : 'AES-256',
    permissions: {
      printing: options?.permissions?.printing === 'high-res' ? 'highResolution'
        : options?.permissions?.printing === 'low-res' ? 'lowResolution' : false,
      copying: options?.permissions?.copying ?? false,
      modifying: options?.permissions?.modifying ?? false,
    },
  });

  return await doc.save();
}

// ============================================
// UNLOCK (Remove password)
// ============================================

export async function unlockPDF(file: File, password: string): Promise<Uint8Array> {
  // pdf-lib can load password-protected files with password option
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes, { password, ignoreEncryption: true } as any);
  return await doc.save();
}

// ============================================
// REDACT (Cover with black box)
// ============================================

export async function redactArea(
  file: File,
  areas: { page: number; x: number; y: number; width: number; height: number }[]
): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);

  areas.forEach((area) => {
    const page = doc.getPage(area.page - 1);
    page.drawRectangle({
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      color: rgb(0, 0, 0),
    });
  });

  return await doc.save();
}

// ============================================
// CROP
// ============================================

export async function cropPDF(
  file: File,
  margins: { top: number; right: number; bottom: number; left: number }
): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);

  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    page.setCropBox(
      margins.left,
      margins.bottom,
      width - margins.left - margins.right,
      height - margins.top - margins.bottom
    );
  });

  return await doc.save();
}

// ============================================
// COMPRESS (basic — remove metadata)
// ============================================

export async function compressPDF(file: File): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);

  // Remove metadata
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setProducer('');
  doc.setCreator('');

  return await doc.save({ useObjectStreams: true });
}

// ============================================
// PAGE COUNT
// ============================================

export async function getPageCount(file: File): Promise<number> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

// ============================================
// PDF to Images
// ============================================

export async function pdfToImages(
  file: File,
  format: 'png' | 'jpeg' = 'png',
  scale = 2
): Promise<{ pageNum: number; dataUrl: string }[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const bytes = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const results: { pageNum: number; dataUrl: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    const dataUrl = canvas.toDataURL(
      format === 'jpeg' ? 'image/jpeg' : 'image/png',
      0.95
    );
    results.push({ pageNum: i, dataUrl });
  }
  return results;
}

// ============================================
// Images to PDF
// ============================================

export async function imagesToPDF(
  images: { dataUrl: string; type: string }[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (const img of images) {
    const isPng = img.type.includes('png');
    const base64 = img.dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const embedded = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }

  return await doc.save();
}

// ============================================
// PDF/A conversion (metadata only — real PDF/A needs more)
// ============================================

export async function convertToPdfA(file: File): Promise<Uint8Array> {
  const bytes = await readFileAsArrayBuffer(file);
  const doc = await PDFDocument.load(bytes);
  doc.setProducer('idcardtools');
  doc.setCreator('idcardtools PDF/A Converter');
  doc.setTitle('');
  return await doc.save();
}

// ============================================
// Basic Markdown to PDF
// ============================================

export async function markdownToPDF(markdown: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const lines = markdown.split('\n');
  const pageHeight = 842;
  const pageWidth = 595;
  const margin = 50;
  const lineHeight = 20;
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    if (y < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const isHeading = line.startsWith('#');
    const text = line.replace(/^#+\s*/, '');
    const size = isHeading ? 20 : 12;

    page.drawText(text, {
      x: margin,
      y,
      size,
      font: isHeading ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= lineHeight + (isHeading ? 6 : 0);
  }

  return await doc.save();
}

// ============================================
// Basic HTML to PDF
// ============================================

export async function htmlToPDF(html: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Strip HTML tags for text extraction
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || '';

  const lines = text.split('\n').filter((l) => l.trim());
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const fontSize = 11;
  const lineHeight = 16;
  const maxWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const line of lines) {
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(test, fontSize);

      if (width > maxWidth && currentLine) {
        if (y < margin) {
          page = doc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = test;
      }
    }

    if (currentLine) {
      if (y < margin) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight;
    }
  }

  return await doc.save();
}

// ============================================
// Office to PDF (placeholder — needs backend)
// ============================================

export async function officeToPDF(file: File): Promise<Uint8Array> {
  // Real Word/Excel/PPT to PDF needs server-side processing
  // This creates a placeholder PDF noting the conversion
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);

  page.drawText('Office Document Conversion', {
    x: 50, y: 750, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(`Original: ${file.name}`, {
    x: 50, y: 710, size: 12, font, color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText('This conversion requires server-side processing.', {
    x: 50, y: 680, size: 11, font, color: rgb(0.5, 0.5, 0.5),
  });

  return await doc.save();
}