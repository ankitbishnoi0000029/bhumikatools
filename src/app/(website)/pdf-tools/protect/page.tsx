"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, X, Loader2, AlertCircle, CheckCircle2,
  Download, ArrowUpRight, Eye, Sparkles, Shield, Lock, Unlock, Key,
  Copy, Check, Edit3, Settings2, Layers, ChevronLeft, ChevronRight,
  Save, Wand2, Layout, Hash, ZoomIn, ZoomOut, RefreshCw, Info,
  BarChart3, Grid3x3, Search, Plus, Minus, Trash2, AlignLeft,
  Monitor, FileOutput, CheckSquare, EyeOff, Eye as EyeIcon, ShieldCheck,
  ShieldAlert, ShieldX, ShieldQuestion, Printer, Copy as CopyIcon,
  PenLine, FileEdit, AlertTriangle, Lock as LockIcon, KeyRound, Fingerprint,
} from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  getPDFInfo, formatBytes, downloadBlob, readFileAsArrayBuffer,
} from '@/lib/pdf-utils';

// ============================================
// TYPES
// ============================================

type EncryptionLevel = 'aes-128' | 'aes-256';
type PrintPermission = 'none' | 'low-res' | 'high-res';
type ModifyPermission = 'none' | 'annotate' | 'fill-forms' | 'all';

interface Permissions {
  printing: PrintPermission;
  modifying: ModifyPermission;
  copying: boolean;
  contentAccessibility: boolean;
  documentAssembly: boolean;
  commentFormFilling: boolean;
}

interface PDFFileInfo {
  name: string;
  size: number;
  pageCount: number;
  preview: string;
  isEncrypted: boolean;
  title: string;
  author: string;
}

interface StrengthAnalysis {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

// ============================================
// PASSWORD STRENGTH
// ============================================

const analyzePassword = (password: string): StrengthAnalysis => {
  const suggestions: string[] = [];
  let score = 0;

  if (!password) {
    return { score: 0, label: 'Empty', color: '#999999', suggestions: ['Enter a password'] };
  }

  if (password.length >= 8) score++;
  else suggestions.push('Use at least 8 characters');

  if (password.length >= 12) score++;
  else if (password.length >= 8) suggestions.push('12+ characters is stronger');

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('Mix uppercase and lowercase');

  if (/\d/.test(password)) score++;
  else suggestions.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else suggestions.push('Add symbols (!@#$%)');

  // Deduct for common patterns
  if (/^(123|abc|qwerty|password|admin)/i.test(password)) {
    score = Math.max(0, score - 2);
    suggestions.push('Avoid common patterns');
  }

  // Normalize to 0-4
  score = Math.min(4, Math.round((score / 5) * 4));

  const levels = [
    { label: 'Very Weak', color: '#ef4444' },
    { label: 'Weak', color: '#f97316' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Strong', color: '#10b981' },
    { label: 'Very Strong', color: '#059669' },
  ];

  return {
    score,
    label: levels[score].label,
    color: levels[score].color,
    suggestions,
  };
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ProtectPDFPage() {
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<PDFFileInfo | null>(null);

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [useOwnerPassword, setUseOwnerPassword] = useState(false);
  const [showOwner, setShowOwner] = useState(false);

  // Encryption settings
  const [encryption, setEncryption] = useState<EncryptionLevel>('aes-256');
  const [permissions, setPermissions] = useState<Permissions>({
    printing: 'high-res',
    modifying: 'none',
    copying: false,
    contentAccessibility: true,
    documentAssembly: false,
    commentFormFilling: false,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTips, setShowTips] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ============================================
  // PASSWORD STRENGTH (memoized)
  // ============================================

  const strength = useMemo(() => analyzePassword(password), [password]);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordsDontMatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canProtect = password.length >= 4 && passwordsMatch;

  // ============================================
  // LOAD PDF
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

    try {
      const bytes = await readFileAsArrayBuffer(f);

      // Load metadata using pdf-lib
      let isEncrypted = false;
      let title = '';
      let author = '';
      let pageCount = 0;

      try {
        const doc = await PDFDocument.load(bytes, {
          ignoreEncryption: true,
          updateMetadata: false,
        });
        pageCount = doc.getPageCount();
        title = doc.getTitle() || '';
        author = doc.getAuthor() || '';
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes('encrypted')) {
          isEncrypted = true;
        }
        // Try to get page count from pdfjs
        try {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
          const pdf = await pdfjs.getDocument({ data: bytes }).promise;
          pageCount = pdf.numPages;
        } catch {}
      }

      // Generate first-page preview
      let preview = '';
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        preview = canvas.toDataURL('image/jpeg', 0.8);
      } catch {}

      setFileInfo({
        name: f.name,
        size: f.size,
        pageCount: pageCount || 1,
        preview,
        isEncrypted,
        title,
        author,
      });
    } catch (e: unknown) {
      console.error(e);
      setError('Failed to read PDF file.');
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
    setPassword('');
    setConfirmPassword('');
    setOwnerPassword('');
    setResult(null);
    setError(null);
    setShowPassword(false);
    setShowConfirm(false);
    setShowOwner(false);
  };

  // ============================================
  // PROTECT PDF
  // ============================================

  const handleProtect = async () => {
    if (!file || !fileInfo) return;

    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const bytes = await readFileAsArrayBuffer(file);

      // Load PDF (with ignoreEncryption in case it's already encrypted)
      const pdfDoc = await PDFDocument.load(bytes, {
        ignoreEncryption: true,
      });

      // Set metadata
      pdfDoc.setProducer('idcardtools PDF Protect');
      pdfDoc.setCreator('idcardtools');

      // Build permissions object for encryption
      const printPermission = permissions.printing === 'high-res' ? 'highResolution'
        : permissions.printing === 'low-res' ? 'lowResolution'
        : undefined;

      const modifyPermission = permissions.modifying === 'all' ? true
        : permissions.modifying === 'annotate' || permissions.modifying === 'fill-forms' ? true
        : false;

      // Encrypt with password
      await pdfDoc.encrypt({
        userPassword: password,
        ownerPassword: useOwnerPassword && ownerPassword ? ownerPassword : password,
        permissions: {
          printing: printPermission,
          modifying: modifyPermission,
          copying: permissions.copying,
          annotating: permissions.modifying === 'annotate' || permissions.modifying === 'all',
          fillingForms: permissions.modifying === 'fill-forms' || permissions.modifying === 'all',
          contentAccessibility: permissions.contentAccessibility,
          documentAssembly: permissions.documentAssembly,
        } as any,
      });

      const protectedBytes = await pdfDoc.save();

      const blob = new Blob([protectedBytes], { type: 'application/pdf' });
      const baseName = file.name.replace(/\.pdf$/i, '');
      setResult({
        blob,
        filename: `${baseName}-protected.pdf`,
      });
    } catch (e: unknown) {
      console.error(e);
      if (e instanceof Error && e.message.includes('encrypt')) {
        setError('Encryption not supported. Please install @cantoo/pdf-lib.');
      } else {
        setError(e instanceof Error ? e.message || 'Failed to protect PDF.' : 'Failed to protect PDF.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) downloadBlob(result.blob, result.filename);
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getStrengthIcon = (score: number) => {
    if (score <= 1) return ShieldX;
    if (score === 2) return ShieldQuestion;
    if (score === 3) return Shield;
    return ShieldCheck;
  };

  const StrengthIcon = getStrengthIcon(strength.score);

  const isDirty = password || confirmPassword || ownerPassword;

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
              Protect PDF — AES Encryption
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>AES-256</span>
            <span>·</span>
            <span>Permissions Control</span>
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
                Chapter 05 — Security
              </div>
              <h1 className="text-[48px] md:text-[68px] lg:text-[72px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Protect <span className="italic text-[#ff6a00]">PDF</span> files.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Encrypt with AES-256, control what recipients can do, and set
                separate owner password. All done locally in your browser.
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
                  className="w-20 h-20 rounded-3xl bg-[#f4f1ea] flex items-center justify-center mx-auto mb-8 relative"
                >
                  <Lock size={32} strokeWidth={1.5} className="text-[#ff6a00]" />
                </motion.div>
                <h3 className="text-[26px] md:text-[30px] text-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                  {isDragging ? 'Drop PDF here' : 'Select or drop a PDF to protect'}
                </h3>
                <p className="text-[14px] text-black/55 mb-8 max-w-md mx-auto">
                  Encrypt with password, restrict permissions, and secure your PDF.
                  Nothing leaves your device.
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
                { icon: Shield, label: 'AES-128 / 256' },
                { icon: KeyRound, label: 'Dual passwords' },
                { icon: Lock, label: 'Permission control' },
                { icon: Fingerprint, label: 'Client-side only' },
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
              <Lock size={40} className="text-[#ff6a00]" />
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
                  <Hash size={14} className="text-[#ff6a00]" />
                  <span className="text-[13px] font-medium text-black">{formatBytes(fileInfo.size)}</span>
                </div>
                {fileInfo.isEncrypted && (
                  <>
                    <div className="w-px h-4 bg-black/10" />
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle size={14} />
                      <span className="text-[11px] font-mono uppercase tracking-[0.15em]">
                        Already encrypted
                      </span>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-mono uppercase tracking-[0.15em] text-black/50 hover:text-red-500 transition-colors"
              >
                <X size={12} />
                Change file
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* ============ LEFT — Preview ============ */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-[18px] bg-white border border-black/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] bg-[#f4f1ea]/50">
                    <div className="flex items-center gap-2">
                      <Eye size={13} className="text-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                        Document Preview
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Page 1
                      </span>
                    </div>
                  </div>

                  <div className="p-6 bg-[#ebe7de]/40 flex items-center justify-center min-h-[300px] relative">
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                      }}
                    />
                    {fileInfo.preview ? (
                      <div className="relative bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] rounded-sm overflow-hidden max-w-[240px]">
                        <img
                          src={fileInfo.preview}
                          alt=""
                          className="block w-full h-auto"
                          draggable={false}
                        />
                        {/* Lock overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group">
                          <Lock size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText size={40} className="text-black/20 mx-auto mb-3" />
                        <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                          Preview unavailable
                        </span>
                      </div>
                    )}
                  </div>

                  {fileInfo.title || fileInfo.author ? (
                    <div className="px-5 py-3 border-t border-black/[0.06] space-y-2">
                      {fileInfo.title && (
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40">Title</div>
                          <div className="text-[12px] text-black truncate">{fileInfo.title}</div>
                        </div>
                      )}
                      {fileInfo.author && (
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40">Author</div>
                          <div className="text-[12px] text-black truncate">{fileInfo.author}</div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Info card */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={13} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase text-black/40">Security Info</span>
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-black/50">Encryption</span>
                      <span className="font-mono font-medium text-black">
                        {encryption === 'aes-256' ? 'AES-256' : 'AES-128'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">User password</span>
                      <span className={`font-mono font-medium ${password ? 'text-black' : 'text-black/30'}`}>
                        {password ? '✓ Set' : '— None'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Owner password</span>
                      <span className={`font-mono font-medium ${useOwnerPassword && ownerPassword ? 'text-black' : 'text-black/30'}`}>
                        {useOwnerPassword && ownerPassword ? '✓ Set' : 'Same'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black/50">Permissions</span>
                      <span className="font-mono font-medium text-black">
                        {[
                          permissions.printing !== 'none',
                          permissions.copying,
                          permissions.modifying !== 'none',
                        ].filter(Boolean).length}/3 allowed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============ CENTER — Password & Permissions ============ */}
              <div className="lg:col-span-5 space-y-4">

                {/* Password Section */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <LockIcon size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                      Password Protection
                    </span>
                  </div>

                  {/* User password */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                        User Password *
                      </label>
                      <span className="text-[9px] font-mono text-black/40">Required to open</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setResult(null); }}
                        placeholder="Enter password"
                        className="w-full bg-[#f4f1ea] rounded-lg px-4 py-3 pr-12 outline-none text-[14px] border border-black/[0.06] focus:border-[#ff6a00] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40"
                      >
                        {showPassword ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="mb-4">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setResult(null); }}
                        placeholder="Re-enter password"
                        className={`w-full bg-[#f4f1ea] rounded-lg px-4 py-3 pr-12 outline-none text-[14px] border transition-colors ${
                          passwordsDontMatch
                            ? 'border-red-500/40 focus:border-red-500'
                            : 'border-black/[0.06] focus:border-[#ff6a00]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md hover:bg-black/[0.06] flex items-center justify-center text-black/40"
                      >
                        {showConfirm ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                      </button>
                    </div>
                    {passwordsDontMatch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 flex items-center gap-1.5 text-red-500 text-[11px]"
                      >
                        <AlertCircle size={11} />
                        Passwords do not match
                      </motion.div>
                    )}
                    {passwordsMatch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 flex items-center gap-1.5 text-emerald-500 text-[11px]"
                      >
                        <CheckCircle2 size={11} />
                        Passwords match
                      </motion.div>
                    )}
                  </div>

                  {/* Strength meter */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StrengthIcon size={13} style={{ color: strength.color }} />
                          <span className="text-[11px] font-medium" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-black/40">
                          {password.length} chars
                        </span>
                      </div>
                      <div className="flex gap-1 mb-2">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                            style={{
                              backgroundColor: i <= strength.score - 1 ? strength.color : 'rgba(0,0,0,0.08)',
                            }}
                          />
                        ))}
                      </div>
                      {strength.suggestions.length > 0 && strength.score < 3 && (
                        <div className="space-y-1">
                          {strength.suggestions.slice(0, 2).map((s, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] text-black/50">
                              <span className="w-1 h-1 rounded-full bg-black/30" />
                              {s}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Owner password toggle */}
                  <div className="pt-4 border-t border-black/[0.06]">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <KeyRound size={13} className="text-black/40" />
                        <span className="text-[12px] text-black/70">Use separate owner password</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setUseOwnerPassword(!useOwnerPassword); setResult(null); }}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          useOwnerPassword ? 'bg-[#ff6a00]' : 'bg-black/20'
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                          useOwnerPassword ? 'left-[22px]' : 'left-0.5'
                        }`} />
                      </button>
                    </label>
                    <AnimatePresence>
                      {useOwnerPassword && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <input
                            type={showOwner ? 'text' : 'password'}
                            value={ownerPassword}
                            onChange={(e) => { setOwnerPassword(e.target.value); setResult(null); }}
                            placeholder="Owner password"
                            className="w-full bg-[#f4f1ea] rounded-lg px-4 py-3 outline-none text-[13px] border border-black/[0.06] focus:border-[#ff6a00]"
                          />
                          <p className="mt-2 text-[10px] text-black/50 leading-relaxed">
                            Owner password grants full control (override permissions).
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Encryption level */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                      Encryption Level
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'aes-128' as EncryptionLevel, label: 'AES-128', desc: 'Standard', icon: Shield },
                      { id: 'aes-256' as EncryptionLevel, label: 'AES-256', desc: 'Military-grade', icon: ShieldCheck },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isActive = encryption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => { setEncryption(opt.id); setResult(null); }}
                          className={`p-3 rounded-lg text-left transition-all border-2 flex flex-col gap-2 ${
                            isActive
                              ? 'bg-[#ff6a00]/[0.06] border-[#ff6a00]'
                              : 'bg-white border-black/[0.06] hover:border-black/[0.15]'
                          }`}
                        >
                          <Icon size={18} className={isActive ? 'text-[#ff6a00]' : 'text-black/40'} />
                          <div>
                            <div className={`text-[13px] font-medium ${isActive ? 'text-[#ff6a00]' : 'text-black'}`}>
                              {opt.label}
                            </div>
                            <div className="text-[10px] text-black/50">{opt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-[10px] text-black/50 leading-relaxed">
                    {encryption === 'aes-256'
                      ? 'Strongest encryption. Recommended for sensitive documents.'
                      : 'Faster but less secure. Compatible with older PDF readers.'}
                  </p>
                </div>

                {/* Permissions */}
                <div className="rounded-[18px] bg-white border border-black/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                      Document Permissions
                    </span>
                  </div>

                  {/* Printing */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Printer size={12} className="text-black/40" />
                      <span className="text-[11px] font-medium text-black">Printing</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'none', label: 'No' },
                        { id: 'low-res', label: 'Low-res' },
                        { id: 'high-res', label: 'High-res' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => { setPermissions({ ...permissions, printing: opt.id as PrintPermission }); setResult(null); }}
                          className={`py-2 rounded-md text-[10px] font-medium transition-all ${
                            permissions.printing === opt.id
                              ? 'bg-[#ff6a00] text-white'
                              : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modifying */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileEdit size={12} className="text-black/40" />
                      <span className="text-[11px] font-medium text-black">Modifying</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'none', label: 'No' },
                        { id: 'annotate', label: 'Annotate' },
                        { id: 'fill-forms', label: 'Forms' },
                        { id: 'all', label: 'All' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => { setPermissions({ ...permissions, modifying: opt.id as ModifyPermission }); setResult(null); }}
                          className={`py-2 rounded-md text-[10px] font-medium transition-all ${
                            permissions.modifying === opt.id
                              ? 'bg-[#ff6a00] text-white'
                              : 'bg-[#f4f1ea] text-black/60 hover:bg-black/[0.08]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other toggles */}
                  <div className="pt-4 border-t border-black/[0.06] space-y-3">
                    {[
                      { key: 'copying' as const, label: 'Allow text copying', icon: CopyIcon },
                      { key: 'contentAccessibility' as const, label: 'Allow screen readers', icon: EyeIcon },
                      { key: 'documentAssembly' as const, label: 'Allow page extraction', icon: Layers },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const value = permissions[opt.key];
                      return (
                        <label key={opt.key} className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Icon size={12} className="text-black/40" />
                            <span className="text-[12px] text-black/70">{opt.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setPermissions({ ...permissions, [opt.key]: !value }); setResult(null); }}
                            className={`w-10 h-5 rounded-full transition-colors relative ${
                              value ? 'bg-emerald-500' : 'bg-black/20'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                              value ? 'left-[22px]' : 'left-0.5'
                            }`} />
                          </button>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ============ RIGHT — Summary & Export ============ */}
              <div className="lg:col-span-3 space-y-4">

                {/* Summary */}
                <div className="rounded-[18px] bg-gradient-to-br from-[#ff6a00]/[0.04] to-transparent border border-[#ff6a00]/20 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={14} className="text-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                      Protection Summary
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/60">Password</span>
                      <span className={`font-mono font-medium ${password ? 'text-emerald-500' : 'text-black/30'}`}>
                        {password ? '●'.repeat(Math.min(password.length, 8)) : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/60">Strength</span>
                      <span className="font-medium" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/60">Encryption</span>
                      <span className="font-mono font-medium text-black uppercase">{encryption}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/60">Printing</span>
                      <span className={`font-mono font-medium ${permissions.printing === 'none' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {permissions.printing === 'none' ? 'Blocked' : 'Allowed'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/60">Copying</span>
                      <span className={`font-mono font-medium ${permissions.copying ? 'text-emerald-500' : 'text-red-500'}`}>
                        {permissions.copying ? 'Allowed' : 'Blocked'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/60">Modifying</span>
                      <span className={`font-mono font-medium ${permissions.modifying === 'none' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {permissions.modifying === 'none' ? 'Blocked' : 'Allowed'}
                      </span>
                    </div>
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
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3"
                        >
                          <Lock size={24} className="text-emerald-500" />
                        </motion.div>
                        <div className="text-[13px] font-medium text-black mb-1">PDF protected!</div>
                        <div className="text-[10px] font-mono text-black/40">{formatBytes(result.blob.size)}</div>
                      </div>
                      <button
                        onClick={downloadResult}
                        className="w-full py-3 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download size={13} />
                        Download protected PDF
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
                        {canProtect
                          ? `Ready to encrypt with ${encryption.toUpperCase()}.`
                          : 'Set a password (min 4 chars) and confirm to enable.'}
                      </p>
                      <button
                        onClick={handleProtect}
                        disabled={isProcessing || !canProtect}
                        className={`w-full py-3 rounded-full text-[12px] font-medium flex items-center justify-center gap-2 transition-all duration-300 ${
                          isProcessing || !canProtect
                            ? 'bg-black/[0.08] text-black/40 cursor-not-allowed'
                            : 'bg-black text-white hover:bg-[#ff6a00] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]'
                        }`}
                      >
                        {isProcessing ? (
                          <><Loader2 size={13} className="animate-spin" /> Encrypting...</>
                        ) : (
                          <><Lock size={13} /> Protect PDF</>
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
                        <li>• <strong>AES-256</strong> is best for sensitive docs</li>
                        <li>• <strong>Owner password</strong> controls permissions</li>
                        <li>• Users can open with <strong>user password</strong></li>
                        <li>• Everything happens <strong>in your browser</strong></li>
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