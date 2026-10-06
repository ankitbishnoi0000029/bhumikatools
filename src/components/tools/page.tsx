"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Layers, Scissors, Minimize, FileOutput, Edit3, 
  Image as ImageIcon, PenTool, Stamp, RotateCw, FileCode2, 
  Lock, Unlock, LayoutList, FileSpreadsheet, Presentation, 
  Wrench, ScanText, ShieldAlert, EyeOff, Crop, FileInput, 
  Brain, Languages, ArrowUpRight, Search, type LucideIcon
} from 'lucide-react';

// --- DATA ---
type Tool = {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  category: string;
  isNew?: boolean;
};

const toolsData: Tool[] = [
  { id: 'merge', title: 'Merge PDF', desc: 'Combine PDFs in the order you want.', icon: Layers, category: 'Organize PDF' },
  { id: 'split', title: 'Split PDF', desc: 'Separate one page or a whole set into independent files.', icon: Scissors, category: 'Organize PDF' },
  { id: 'rotate', title: 'Rotate PDF', desc: 'Rotate your PDFs the way you need them.', icon: RotateCw, category: 'Organize PDF' },
  { id: 'organize', title: 'Organize PDF', desc: 'Sort pages however you like. Delete or add at convenience.', icon: LayoutList, category: 'Organize PDF' },
  { id: 'page-numbers', title: 'Page Numbers', desc: 'Add page numbers with chosen typography and position.', icon: FileText, category: 'Organize PDF' },
  { id: 'crop', title: 'Crop PDF', desc: 'Crop margins or select specific areas of your document.', icon: Crop, category: 'Organize PDF' },
  { id: 'compress', title: 'Compress PDF', desc: 'Reduce file size while optimizing for maximal quality.', icon: Minimize, category: 'Optimize PDF' },
  { id: 'repair', title: 'Repair PDF', desc: 'Repair a damaged PDF and recover data from corruption.', icon: Wrench, category: 'Optimize PDF' },
  { id: 'ocr', title: 'OCR PDF', desc: 'Convert scanned PDFs into searchable and selectable text.', icon: ScanText, category: 'Optimize PDF' },
  { id: 'scan', title: 'Scan to PDF', desc: 'Capture scans from your phone and send to browser.', icon: FileInput, category: 'Optimize PDF' },
  { id: 'pdf-word', title: 'PDF to Word', desc: 'Convert PDFs into editable DOC and DOCX documents.', icon: FileOutput, category: 'Convert PDF' },
  { id: 'pdf-ppt', title: 'PDF to PowerPoint', desc: 'Turn PDFs into editable PPT and PPTX slideshows.', icon: Presentation, category: 'Convert PDF' },
  { id: 'pdf-excel', title: 'PDF to Excel', desc: 'Pull data straight from PDFs into Excel spreadsheets.', icon: FileSpreadsheet, category: 'Convert PDF' },
  { id: 'word-pdf', title: 'Word to PDF', desc: 'Make DOC and DOCX files easy to read as PDF.', icon: FileText, category: 'Convert PDF' },
  { id: 'ppt-pdf', title: 'PowerPoint to PDF', desc: 'Make PPT and PPTX slideshows easy to view.', icon: Presentation, category: 'Convert PDF' },
  { id: 'excel-pdf', title: 'Excel to PDF', desc: 'Make Excel spreadsheets easy to read as PDF.', icon: FileSpreadsheet, category: 'Convert PDF' },
  { id: 'pdf-jpg', title: 'PDF to JPG', desc: 'Convert each PDF page into a JPG or extract images.', icon: ImageIcon, category: 'Convert PDF' },
  { id: 'jpg-pdf', title: 'JPG to PDF', desc: 'Convert JPG images to PDF with adjustable margins.', icon: ImageIcon, category: 'Convert PDF' },
  { id: 'html-pdf', title: 'HTML to PDF', desc: 'Convert webpages in HTML to PDF with one click.', icon: FileCode2, category: 'Convert PDF' },
  { id: 'pdf-a', title: 'PDF to PDF/A', desc: 'Transform PDF to the ISO-standardized archival format.', icon: FileText, category: 'Convert PDF' },
  { id: 'pdf-md', title: 'PDF to Markdown', desc: 'Turn PDFs into Markdown for notes, docs, and LLMs.', icon: FileCode2, category: 'Convert PDF', isNew: true },
  { id: 'edit', title: 'Edit PDF', desc: 'Add text, images, shapes, or freehand annotations.', icon: Edit3, category: 'Edit PDF' },
  { id: 'sign', title: 'Sign PDF', desc: 'Sign yourself or request e-signatures from others.', icon: PenTool, category: 'Edit PDF' },
  { id: 'watermark', title: 'Watermark', desc: 'Stamp an image or text over your PDF in seconds.', icon: Stamp, category: 'Edit PDF' },
  { id: 'forms', title: 'PDF Forms', desc: 'Create interactive fillable PDFs or fill forms yourself.', icon: FileInput, category: 'Edit PDF', isNew: true },
  { id: 'unlock', title: 'Unlock PDF', desc: 'Remove PDF password security on your own PDFs.', icon: Unlock, category: 'PDF Security' },
  { id: 'protect', title: 'Protect PDF', desc: 'Encrypt PDF documents to prevent unauthorized access.', icon: Lock, category: 'PDF Security' },
  { id: 'redact', title: 'Redact PDF', desc: 'Permanently remove sensitive information from a PDF.', icon: EyeOff, category: 'PDF Security' },
  { id: 'compare', title: 'Compare PDF', desc: 'Side-by-side comparison to spot changes between versions.', icon: ShieldAlert, category: 'PDF Intelligence' },
  { id: 'ai-summarizer', title: 'AI Summarizer', desc: 'Generate concise summaries from articles and essays.', icon: Brain, category: 'PDF Intelligence', isNew: true },
  { id: 'translate', title: 'Translate PDF', desc: 'Translate PDFs with AI while preserving layout.', icon: Languages, category: 'PDF Intelligence', isNew: true },
];

const categories = [
  { name: 'All', label: 'All' },
  { name: 'Organize PDF', label: 'Organize' },
  { name: 'Optimize PDF', label: 'Optimize' },
  { name: 'Convert PDF', label: 'Convert' },
  { name: 'Edit PDF', label: 'Edit' },
  { name: 'PDF Security', label: 'Security' },
  { name: 'PDF Intelligence', label: 'Intelligence' },
];

// --- VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: "easeOut" as const }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

// --- TOOL CARD ---
const ToolCard = ({ tool, index }: { tool: Tool; index: number }) => {
  const Icon = tool.icon;

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Link
        href={
          tool.id === "pdf-ppt"
            ? "/pdf-tools/pdf-to-powerpoint"
            : tool.id === "pdf-excel"
              ? "/pdf-tools/pdf-to-excel"
              : tool.id === "excel-pdf"
                ? "/pdf-tools/excel-to-pdf"
                : ["crop", "pdf-a", "ai-summarizer"].includes(tool.id)
                  ? "/pdf-tools"
                  : `/pdf-tools/${tool.id}`
        }
        className="block h-full outline-none group"
      >
        <div className="relative flex flex-col h-full p-7 rounded-[22px] bg-white border border-black/[0.06] transition-all duration-500 ease-out group-hover:border-[#ff6a00]/40 group-hover:-translate-y-1 group-hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.18)] overflow-hidden">
          
          {/* Soft gradient wash top-right (appears on hover) */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br from-[#ff6a00]/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {/* New badge — soft pill */}
          {tool.isNew && (
            <div className="absolute top-5 right-5 text-[9px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] bg-[#ff6a00]/8 border border-[#ff6a00]/20 px-2.5 py-1 rounded-full">
              New
            </div>
          )}

          {/* Icon — rounded square with soft bg */}
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#f4f1ea] flex items-center justify-center mb-6 group-hover:bg-[#ff6a00] transition-all duration-500">
            <Icon 
              size={20} 
              strokeWidth={1.75} 
              className="text-black/70 group-hover:text-white transition-colors duration-500" 
            />
          </div>

          {/* Title — serif */}
          <h3 
            className="relative z-10 text-[19px] font-normal text-black mb-2 tracking-tight leading-tight"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {tool.title}
          </h3>

          {/* Description */}
          <p className="relative z-10 text-[13px] text-black/50 leading-[1.65] font-light mb-8 flex-grow">
            {tool.desc}
          </p>

          {/* Bottom row */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-black/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 group-hover:text-[#ff6a00] transition-colors duration-300">
              Open Tool
            </span>
            <div className="w-7 h-7 rounded-full bg-[#f4f1ea] flex items-center justify-center group-hover:bg-[#ff6a00] transition-all duration-500 group-hover:translate-x-0.5">
              <ArrowUpRight 
                size={13} 
                className="text-black/60 group-hover:text-white transition-colors duration-500" 
              />
            </div>
          </div>

          {/* Small index number — bottom left corner */}
          <div className="absolute bottom-3 right-5 text-[9px] font-mono uppercase tracking-[0.2em] text-black/15 group-hover:text-[#ff6a00]/40 transition-colors duration-500">
            № {String(index + 1).padStart(2, '0')}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = toolsData.filter(tool => {
    const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
    const matchesSearch = 
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 relative">
      
      {/* Fine vertical rules — editorial grid */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      <div className="container mx-auto px-8 relative max-w-[1400px]">
        
        {/* ===== TOP META ROW ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              Tool Index
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>{toolsData.length} Tools</span>
            <span>·</span>
            <span>100% Free</span>
          </div>
        </motion.div>

        {/* ===== HEADING ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Chapter 02 — The Toolkit
            </div>
            <h1 
              className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Every tool for
              <br />
              every <span className="italic text-[#ff6a00]">PDF</span> task.
            </h1>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Merge, split, compress, convert, sign, and protect. All tools are free, 
              browser-based, and your files never leave your device.
            </p>
          </div>
        </motion.div>

        {/* ===== SEARCH BAR ===== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mb-12"
        >
          <div className="relative flex items-center border-b border-black/20 focus-within:border-black transition-colors">
            <Search className="text-black/40 mr-3" size={16} />
            <input 
              type="text" 
              placeholder="Search the toolkit..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-black w-full placeholder:text-black/30 py-3 text-[15px]"
            />
            <kbd className="hidden md:block text-[10px] text-black/40 border border-black/15 px-2 py-0.5 font-mono tracking-wider rounded">
              ⌘ K
            </kbd>
          </div>
        </motion.div>

        {/* ===== CATEGORY FILTERS ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-12 pb-6 border-b border-black/[0.08]"
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.name;
            return (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`relative text-[13px] tracking-tight pb-1 transition-colors duration-300 group ${
                  isActive ? 'text-black' : 'text-black/40 hover:text-black'
                }`}
              >
                <span className="font-medium">{category.label}</span>
                {isActive ? (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#ff6a00]" />
                ) : (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-black/30 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                )}
                <span className="ml-1.5 text-[10px] font-mono text-black/30">
                  {category.name === 'All' 
                    ? toolsData.length 
                    : toolsData.filter(t => t.category === category.name).length}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ===== RESULTS INFO ===== */}
        <div className="flex items-center justify-between mb-8 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
          <span>
            Showing {filteredTools.length} of {toolsData.length}
          </span>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="hover:text-[#ff6a00] transition-colors"
            >
              Clear search
            </button>
          )}
        </div>

        {/* ===== TOOLS GRID ===== */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filteredTools.map((tool, i) => (
              <ToolCard key={tool.id} tool={tool} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* ===== EMPTY STATE ===== */}
        <AnimatePresence>
          {filteredTools.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-24 rounded-[22px] border border-black/[0.08] bg-white"
            >
              <Search className="mx-auto text-black/20 mb-4" size={32} strokeWidth={1.5} />
              <h3 
                className="text-xl text-black mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Nothing found.
              </h3>
              <p className="text-[13px] text-black/50">
                No tools match &quot;{searchQuery}&quot; in {activeCategory === 'All' ? 'any category' : activeCategory}.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== FOOTER CTA ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-24 pt-10 border-t border-black/[0.12] flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
              Need something else?
            </div>
            <h3 
              className="text-[28px] md:text-[36px] leading-tight tracking-tight text-black max-w-lg"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Can&apos;t find the tool you&apos;re <span className="italic">looking</span> for?
            </h3>
          </div>
          <Link href="/contacts" className="group inline-flex items-center gap-3 self-start md:self-end">
            <span className="relative text-[15px] font-medium text-black pb-1">
              Request a tool
              <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
            </span>
            <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
              <ArrowUpRight size={15} className="text-black group-hover:text-white transition-colors" />
            </span>
          </Link>
        </motion.div>

      </div>
    </div>
  );
}