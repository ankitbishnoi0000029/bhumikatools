"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Layers, Scissors, Minimize, FileOutput, Edit3, 
  Image as ImageIcon, PenTool, Stamp, RotateCw, FileCode2, 
  Lock, Unlock, LayoutList, FileSpreadsheet, Presentation, 
  Wrench, ScanText, ShieldAlert, EyeOff, Crop, FileInput, 
  Brain, Languages, ArrowUpRight, Search, Star, Plus, Minus,
  UploadCloud, Settings, Download, CheckCircle2, Shield, Zap,
  Users, Briefcase, GraduationCap, Building2, Heart, Scale,
  Clock, Infinity, Globe, Cpu, Sparkles, Check, X,
  Trash2, type LucideIcon
} from 'lucide-react';

// --- TOOLS DATA ---
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
  { id: 'organize', title: 'Organize PDF', desc: 'Sort pages however you like. Delete or add pages.', icon: LayoutList, category: 'Organize PDF' },
  { id: 'page-numbers', title: 'Page Numbers', desc: 'Add page numbers with chosen typography and position.', icon: FileText, category: 'Organize PDF' },
  { id: 'crop', title: 'Crop PDF', desc: 'Crop margins or select specific areas of your document.', icon: Crop, category: 'Organize PDF' },
  { id: 'compress', title: 'Compress PDF', desc: 'Reduce file size while optimizing for maximal quality.', icon: Minimize, category: 'Optimize PDF' },
  { id: 'repair', title: 'Repair PDF', desc: 'Repair damaged PDFs and recover corrupted data.', icon: Wrench, category: 'Optimize PDF' },
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

// --- CATEGORIES DEEP DIVE ---
const categoriesDetail = [
  {
    num: '01',
    name: 'Organize PDF',
    slug: 'organize',
    desc: 'Rearrange, reorder, and restructure your documents. Merge multiple PDFs, split large files, rotate pages, or crop unwanted margins.',
    tools: ['Merge', 'Split', 'Rotate', 'Organize', 'Page Numbers', 'Crop'],
    color: '#ff6a00',
  },
  {
    num: '02',
    name: 'Optimize PDF',
    slug: 'optimize',
    desc: 'Reduce file size, repair damaged PDFs, and unlock scanned documents with OCR. Perfect for emailing or archiving large files.',
    tools: ['Compress', 'Repair', 'OCR', 'Scan'],
    color: '#10b981',
  },
  {
    num: '03',
    name: 'Convert PDF',
    slug: 'convert',
    desc: 'Convert PDFs to and from Word, Excel, PowerPoint, JPG, HTML, and Markdown. Preserve formatting with 99% accuracy.',
    tools: ['PDF to Word', 'PDF to Excel', 'Word to PDF', 'JPG to PDF', 'HTML to PDF'],
    color: '#3b82f6',
  },
  {
    num: '04',
    name: 'Edit PDF',
    slug: 'edit',
    desc: 'Add text, images, and annotations. Sign documents electronically. Watermark pages. Create interactive fillable forms.',
    tools: ['Edit', 'Sign', 'Watermark', 'Forms'],
    color: '#a855f7',
  },
  {
    num: '05',
    name: 'PDF Security',
    slug: 'security',
    desc: 'Protect sensitive documents with password encryption. Remove forgotten passwords from your own files. Redact permanently.',
    tools: ['Unlock', 'Protect', 'Redact'],
    color: '#ef4444',
  },
  {
    num: '06',
    name: 'PDF Intelligence',
    slug: 'intelligence',
    desc: 'AI-powered tools: summarize long PDFs in seconds, translate while preserving layout, compare versions side-by-side.',
    tools: ['AI Summarizer', 'Translate', 'Compare'],
    color: '#ec4899',
  },
];

// --- HOW IT WORKS DATA ---
const steps = [
  { n: '01', icon: UploadCloud, title: 'Upload your file', desc: 'Drag and drop your PDF, Word, Excel, or image. Files up to 5GB supported.' },
  { n: '02', icon: Settings, title: 'Choose your tool', desc: 'Merge, split, compress, convert, sign, or protect. All in one workspace.' },
  { n: '03', icon: Download, title: 'Download instantly', desc: 'Your processed file is ready in seconds. No signup, no watermarks.' },
];

// --- FEATURES ---
const features = [
  { icon: Shield, title: 'Privacy first', desc: 'Files auto-delete in 2 hours. Most tools process in your browser — nothing ever leaves your device.' },
  { icon: Zap, title: 'Instant speed', desc: 'Powered by edge servers across India. No queues, no waiting, no rate limits.' },
  { icon: Sparkles, title: 'AI-powered', desc: 'Summarize, translate, and OCR documents using the latest AI models with 99% accuracy.' },
  { icon: Lock, title: 'End-to-end encrypted', desc: 'TLS 1.3 in transit, AES-256 at rest. Same security standard as your bank.' },
  { icon: Globe, title: 'Works everywhere', desc: 'Browser-based. No installs. Windows, Mac, Linux, iOS, Android — all supported.' },
  { icon: Infinity, title: '100% free forever', desc: 'No paywalls, no signups, no watermarks. Always has been, always will be.' },
];

// --- USE CASES ---
const useCases = [
  {
    num: '01',
    icon: Briefcase,
    title: 'For Businesses',
    desc: 'Merge contracts, compress invoices, extract data from receipts, and sign agreements — all without paid software.',
    color: '#ff6a00',
  },
  {
    num: '02',
    icon: GraduationCap,
    title: 'For Students',
    desc: 'Convert lecture notes to PDF, compress assignments, merge project submissions, and translate research papers.',
    color: '#3b82f6',
  },
  {
    num: '03',
    icon: Scale,
    title: 'For Lawyers',
    desc: 'Redact sensitive information, compare contract versions, and organize case files — with airtight privacy.',
    color: '#a855f7',
  },
  {
    num: '04',
    icon: Heart,
    title: 'For Doctors',
    desc: 'Scan patient records, protect medical PDFs with encryption, and extract data from lab reports instantly.',
    color: '#10b981',
  },
  {
    num: '05',
    icon: Building2,
    title: 'For Government',
    desc: 'Process Aadhaar, PAN, and Voter ID documents. OCR support for Hindi, Tamil, and 12+ Indian languages.',
    color: '#ec4899',
  },
  {
    num: '06',
    icon: Users,
    title: 'For Everyone',
    desc: 'Whether you\'re merging 2 files or 200, our tools work the same — fast, free, and beautifully simple.',
    color: '#06b6d4',
  },
];

// --- COMPARISON ---
const comparisonRows = [
  { feature: 'Cost', us: 'Free forever', them: '₹499–999/month' },
  { feature: 'Signup required', us: 'No', them: 'Yes' },
  { feature: 'Watermarks', us: 'None', them: 'On free tier' },
  { feature: 'File size limit', us: '5GB', them: '10–100MB' },
  { feature: 'Files deleted after', us: '2 hours', them: '30+ days' },
  { feature: 'Privacy-first processing', us: 'Yes (browser-based)', them: 'No' },
  { feature: 'Ads', us: 'Zero', them: 'Yes, heavy' },
  { feature: 'AI Summarizer', us: 'Free', them: 'Premium only' },
];

// --- SECURITY PILLARS ---
const securityPillars = [
  { n: '01', icon: Lock, title: 'TLS 1.3 encryption', desc: 'Every file transferred to our servers uses military-grade encryption.' },
  { n: '02', icon: Trash2, title: '2-hour auto-deletion', desc: 'Files are permanently removed within 2 hours by an automated cron job.' },
  { n: '03', icon: EyeOff, title: 'Zero tracking', desc: 'No ad pixels, no third-party analytics, no fingerprinting.' },
  { n: '04', icon: Shield, title: 'UIDAI-compliant', desc: 'All Aadhaar processing follows UIDAI guidelines to the letter.' },
];

// --- REVIEWS DATA ---
const reviews = [
  { id: 1, name: 'Priya Sharma', role: 'Chartered Accountant', location: 'Mumbai, MH', quote: 'I merged over 200 client documents last month. Perfectly formatted every time, and the whole process takes seconds.', initials: 'PS', color: '#ff6a00' },
  { id: 2, name: 'Rajesh Kumar', role: 'Small Business Owner', location: 'Bangalore, KA', quote: 'The AI summarizer saved me hours of reading contracts. What used to take an evening now takes 30 seconds.', initials: 'RK', color: '#10b981' },
  { id: 3, name: 'Anjali Verma', role: 'HR Manager', location: 'Delhi, NCR', quote: 'We process 500+ employee documents every quarter. The bulk PDF tools handle everything flawlessly.', initials: 'AV', color: '#3b82f6' },
  { id: 4, name: 'Mohammed Faisal', role: 'Freelance Designer', location: 'Hyderabad, TS', quote: 'Clean interface, no ads, no signup. I just drag my files in and they get done. Perfect.', initials: 'MF', color: '#a855f7' },
  { id: 5, name: 'Sneha Patel', role: 'Lawyer', location: 'Ahmedabad, GJ', quote: 'The redaction tool is a lifesaver for court filings. It permanently removes sensitive information before I submit.', initials: 'SP', color: '#ec4899' },
  { id: 6, name: 'Arjun Reddy', role: 'Student', location: 'Chennai, TN', quote: 'Free, fast, and no watermarks. I use it for all my assignments and project submissions. Highly recommended.', initials: 'AR', color: '#06b6d4' },
];

// --- FAQS DATA ---
const faqsData: Record<string, { q: string; a: string }[]> = {
  general: [
    { q: 'Is idcardtools really free to use?', a: 'Yes — all PDF tools are 100% free, forever. No signup, no hidden charges, no watermarks. We only charge for the physical PVC card delivery service.' },
    { q: 'Do I need to create an account?', a: 'No account is required. Just upload your file, use the tool, and download the result. We don\'t even ask for your email unless you\'re placing a PVC card order.' },
    { q: 'What file size can I upload?', a: 'Free users can upload files up to 5GB per file. All processing is done on our servers and files are auto-deleted within 2 hours.' },
    { q: 'Do you have mobile apps?', a: 'Not yet — but our entire toolkit works perfectly on mobile browsers (Chrome, Safari, Edge). No installation required.' },
  ],
  privacy: [
    { q: 'Do my files leave my device?', a: 'For most tools (Merge, Split, Compress, Rotate, JPG to PDF), processing happens entirely in your browser — files never leave your device. For cloud-based tools (OCR, AI Summarizer), files are processed on our servers and auto-deleted within 2 hours.' },
    { q: 'How long do you keep my files?', a: 'Files uploaded to our servers are automatically deleted after 2 hours. Browser-based tools never upload anything at all.' },
    { q: 'Do you sell my data?', a: 'Never. We don\'t sell, share, or rent your data to anyone. We don\'t run ads. We don\'t track you across the web.' },
    { q: 'Is my Aadhaar data secure?', a: 'Your E-Aadhaar PDF is encrypted in transit (TLS 1.3), stored encrypted at rest, and permanently deleted within 2 hours. Only you and our printing operator see the file.' },
  ],
  formats: [
    { q: 'What formats do you support?', a: 'PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), JPG, PNG, HTML, and Markdown. Both directions — to and from PDF.' },
    { q: 'Can I convert multiple files at once?', a: 'Yes. Most tools support bulk processing. Just drag multiple files into the upload zone.' },
    { q: 'What happens if a conversion fails?', a: 'If something goes wrong, try again with a smaller file or a different format. If it still fails, email us the file and we\'ll investigate within 24 hours.' },
    { q: 'Can I use this for commercial work?', a: 'Yes. All tools are free for both personal and commercial use. No attribution required. We do not claim any rights over your files.' },
  ],
};

const faqCategories = [
  { id: 'general', label: 'General', count: 4 },
  { id: 'privacy', label: 'Privacy', count: 4 },
  { id: 'formats', label: 'Formats & Files', count: 4 },
];

// --- BLOG POSTS ---
const blogPosts = [
  { id: 'aadhaar-pvc-guide', category: 'Tutorial', title: 'The complete guide to printing your E-Aadhaar on a PVC card', date: 'Oct 12, 2025', readTime: '8 min' },
  { id: 'pdf-privacy', category: 'Privacy', title: 'Why browser-based PDF tools are safer than cloud uploads', date: 'Oct 8, 2025', readTime: '5 min' },
  { id: 'pan-card-guide', category: 'Tutorial', title: 'How to auto-crop your PAN card in under 10 seconds', date: 'Oct 3, 2025', readTime: '4 min' },
];

// --- VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
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
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br from-[#ff6a00]/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          {tool.isNew && (
            <div className="absolute top-5 right-5 text-[9px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] bg-[#ff6a00]/8 border border-[#ff6a00]/20 px-2.5 py-1 rounded-full">New</div>
          )}
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#f4f1ea] flex items-center justify-center mb-6 group-hover:bg-[#ff6a00] transition-all duration-500">
            <Icon size={20} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
          </div>
          <h3 className="relative z-10 text-[19px] font-normal text-black mb-2 tracking-tight leading-tight" style={{ fontFamily: 'Georgia, serif' }}>{tool.title}</h3>
          <p className="relative z-10 text-[13px] text-black/50 leading-[1.65] font-light mb-8 flex-grow">{tool.desc}</p>
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-black/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 group-hover:text-[#ff6a00] transition-colors duration-300">Open Tool</span>
            <div className="w-7 h-7 rounded-full bg-[#f4f1ea] flex items-center justify-center group-hover:bg-[#ff6a00] transition-all duration-500 group-hover:translate-x-0.5">
              <ArrowUpRight size={13} className="text-black/60 group-hover:text-white transition-colors duration-500" />
            </div>
          </div>
          <div className="absolute bottom-3 right-5 text-[9px] font-mono uppercase tracking-[0.2em] text-black/15 group-hover:text-[#ff6a00]/40 transition-colors duration-500">
            № {String(index + 1).padStart(2, '0')}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// Reusable section meta
const SectionMeta = ({ label, right }: { label: string; right: React.ReactNode }) => (
  <div className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]">
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">{label}</span>
    </div>
    <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">{right}</div>
  </div>
);

export default function PdfToolsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaqCat, setActiveFaqCat] = useState('general');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const filteredTools = toolsData.filter(tool => {
    const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const currentFaqs = faqsData[activeFaqCat];

  const toggleFaq = (index: number) => setOpenFaqIndex(openFaqIndex === index ? null : index);
  const handleFaqCatChange = (catId: string) => { setActiveFaqCat(catId); setOpenFaqIndex(0); };

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] overflow-hidden">

      {/* Vertical rules */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      {/* ===================== SECTION 1: HERO ===================== */}
      <section className="relative pt-32 pb-24">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="PDF Tools — 31 Available" right={<><span>100% Free</span><span>·</span><span>No Signup</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-14 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Chapter 02 — The PDF Toolkit</div>
              <h1 className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Every tool for<br />every <span className="italic text-[#ff6a00]">PDF</span> task.
              </h1>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Merge, split, compress, convert, sign, and protect. All tools are free, browser-based, and your files never leave your device.
              </p>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="max-w-2xl mb-10">
            <div className="relative flex items-center border-b border-black/20 focus-within:border-black transition-colors">
              <Search className="text-black/40 mr-3" size={16} />
              <input type="text" placeholder="Search the toolkit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-black w-full placeholder:text-black/30 py-3 text-[15px]" />
              <kbd className="hidden md:block text-[10px] text-black/40 border border-black/15 px-2 py-0.5 font-mono tracking-wider rounded">⌘ K</kbd>
            </div>
          </motion.div>

          {/* Category filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-10 pb-6 border-b border-black/[0.08]">
            {categories.map((category) => {
              const isActive = activeCategory === category.name;
              return (
                <button key={category.name} onClick={() => setActiveCategory(category.name)}
                  className={`relative text-[13px] tracking-tight pb-1 transition-colors duration-300 group ${isActive ? 'text-black' : 'text-black/40 hover:text-black'}`}>
                  <span className="font-medium">{category.label}</span>
                  {isActive ? <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#ff6a00]" />
                    : <span className="absolute -bottom-1 left-0 right-0 h-px bg-black/30 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />}
                  <span className="ml-1.5 text-[10px] font-mono text-black/30">
                    {category.name === 'All' ? toolsData.length : toolsData.filter(t => t.category === category.name).length}
                  </span>
                </button>
              );
            })}
          </motion.div>

          <div className="flex items-center justify-between mb-8 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
            <span>Showing {filteredTools.length} of {toolsData.length}</span>
            {searchQuery && <button onClick={() => setSearchQuery('')} className="hover:text-[#ff6a00] transition-colors">Clear search</button>}
          </div>

          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredTools.map((tool, i) => <ToolCard key={tool.id} tool={tool} index={i} />)}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {filteredTools.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center py-24 rounded-[22px] border border-black/[0.08] bg-white">
                <Search className="mx-auto text-black/20 mb-4" size={32} strokeWidth={1.5} />
                <h3 className="text-xl text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>Nothing found.</h3>
                <p className="text-[13px] text-black/50">No tools match "{searchQuery}" in {activeCategory === 'All' ? 'any category' : activeCategory}.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ===================== SECTION 2: STATS STRIP ===================== */}
      <section className="relative py-16 border-y border-black/[0.08] bg-white">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '2M+', label: 'Active Users' },
              { value: '18M+', label: 'Files Processed' },
              { value: '31', label: 'Free Tools' },
              { value: '4.9★', label: 'Avg. Rating' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }} className="text-center md:text-left">
                <div className="text-[40px] md:text-[52px] leading-none text-black tracking-tight mb-2" style={{ fontFamily: 'Georgia, serif' }}>{stat.value}</div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 3: HOW IT WORKS ===================== */}
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="How It Works" right={<><span>3 Steps</span><span>·</span><span>Under 30 Seconds</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: "easeOut" }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">The Process</div>
              <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Three steps.<br />That's <span className="italic text-[#ff6a00]">it.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                No accounts, no installations, no learning curve. Designed so anyone can use it — even your grandmother.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.7, delay: i * 0.15, ease: "easeOut" }}
                  className="group relative p-8 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.18)] transition-all duration-500">
                  <div className="absolute top-6 right-7 text-[64px] leading-none text-black/[0.04] select-none pointer-events-none" style={{ fontFamily: 'Georgia, serif' }}>{step.n}</div>
                  <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#f4f1ea] flex items-center justify-center mb-8 group-hover:bg-[#ff6a00] transition-all duration-500">
                    <Icon size={20} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                  </div>
                  <h3 className="relative z-10 text-[22px] leading-tight tracking-tight text-black mb-3" style={{ fontFamily: 'Georgia, serif' }}>{step.title}</h3>
                  <p className="relative z-10 text-[14px] leading-[1.7] text-black/55 font-light">{step.desc}</p>
                  <div className="relative z-10 mt-8 pt-5 border-t border-black/[0.06] flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 group-hover:text-[#ff6a00] transition-colors">Step {step.n}</span>
                    <ArrowUpRight size={14} className="text-black/30 group-hover:text-[#ff6a00] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 4: CATEGORIES DEEP DIVE ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="The Six Categories" right={<><span>Organized</span><span>·</span><span>By Purpose</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="mb-20 max-w-3xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">The Categories</div>
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
              Six categories.<br />Thirty-one <span className="italic text-[#ff6a00]">tools.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {categoriesDetail.map((cat, i) => (
              <motion.div key={cat.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                className="group p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 transition-all duration-500">
                <div className="flex items-start justify-between mb-8">
                  <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: cat.color }} />
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">{cat.num}</span>
                </div>
                <h3 className="text-[22px] leading-tight text-black mb-3" style={{ fontFamily: 'Georgia, serif' }}>{cat.name}</h3>
                <p className="text-[13px] leading-[1.7] text-black/55 font-light mb-6">{cat.desc}</p>
                <div className="flex flex-wrap gap-1.5 pt-5 border-t border-black/[0.06]">
                  {cat.tools.map((tool) => (
                    <span key={tool} className="text-[10px] font-mono uppercase tracking-[0.1em] text-black/45 px-2 py-1 rounded-full border border-black/[0.08]">
                      {tool}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 5: FEATURES ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="Why idcardtools" right={<><span>6 Reasons</span><span>·</span><span>Built for Trust</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">The Foundation</div>
              <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Built with<br /><span className="italic text-[#ff6a00]">obsessive</span> care.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Every feature exists because a user asked for it. Every decision is tested against one question — does this make our users' lives easier?
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: i * 0.08 }} className="group p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 transition-all duration-500">
                  <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center mb-6 transition-all duration-500">
                    <Icon size={20} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                  </div>
                  <h3 className="text-[19px] leading-tight text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>{feature.title}</h3>
                  <p className="text-[13px] leading-[1.7] text-black/55 font-light">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 6: USE CASES ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="Built for Every Profession" right={<><span>6 Audiences</span><span>·</span><span>2M+ Users</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="mb-20 max-w-3xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Who Uses idcardtools?</div>
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
              For every<br /><span className="italic text-[#ff6a00]">profession.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {useCases.map((useCase, i) => {
              const Icon = useCase.icon;
              return (
                <motion.div key={useCase.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: i * 0.08 }} className="group relative p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 transition-all duration-500">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500"
                      style={{ backgroundColor: `${useCase.color}15` }}>
                      <Icon size={20} strokeWidth={1.75} style={{ color: useCase.color }} />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">{useCase.num}</span>
                  </div>
                  <h3 className="text-[20px] leading-tight text-black mb-2.5" style={{ fontFamily: 'Georgia, serif' }}>{useCase.title}</h3>
                  <p className="text-[13px] leading-[1.7] text-black/55 font-light">{useCase.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 7: COMPARISON TABLE ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="The Honest Comparison" right={<><span>Us vs. Them</span><span>·</span><span>No Bias</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Why Choose Us</div>
              <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Compared to<br />the <span className="italic text-[#ff6a00]">alternatives.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                We&apos;re not afraid to show you how we stack up against paid tools that cost ₹999/month.
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.7 }} className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 px-6 md:px-8 py-5 border-b border-black/[0.08] bg-[#f4f1ea]/50">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Feature</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff6a00] font-semibold">idcardtools</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Others</div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, i) => (
              <motion.div key={row.feature} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-3 gap-4 px-6 md:px-8 py-5 border-b border-black/[0.06] last:border-0 hover:bg-black/[0.01] transition-colors">
                <div className="text-[13px] text-black/70">{row.feature}</div>
                <div className="flex items-center gap-2 text-[13px] text-black">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span className="font-medium">{row.us}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-black/50">
                  <X size={14} className="text-red-400/60 shrink-0" />
                  <span>{row.them}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===================== SECTION 8: SECURITY PILLARS ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="Security & Privacy" right={<><span>AES-256</span><span>·</span><span>2h Deletion</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="mb-16 max-w-3xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Security First</div>
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
              Your files are<br />your <span className="italic text-[#ff6a00]">business.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {securityPillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <motion.div key={pillar.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.08 }} className="group p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 transition-all duration-500">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-500">
                      <Icon size={20} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">{pillar.n}</span>
                  </div>
                  <h3 className="text-[18px] leading-tight text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>{pillar.title}</h3>
                  <p className="text-[13px] leading-[1.7] text-black/55 font-light">{pillar.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 9: REVIEWS ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="Testimonials" right={<><span>4.9 / 5.0</span><span>·</span><span>2,847 Reviews</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">In Their Words</div>
              <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Trusted by<br /><span className="italic text-[#ff6a00]">professionals</span> everywhere.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md mb-6">
                From chartered accountants to freelance designers, thousands of Indians rely on idcardtools every day.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-[#ff6a00] text-[#ff6a00]" />)}
                </div>
                <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">4.9 · 2,847 Verified</span>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((review, i) => (
              <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="group relative p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.15)] transition-all duration-500 flex flex-col">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, j) => <Star key={j} size={12} className="fill-[#ff6a00] text-[#ff6a00]" />)}
                </div>
                <blockquote className="text-[15px] leading-[1.7] text-black/75 font-light mb-8 flex-grow" style={{ fontFamily: 'Georgia, serif' }}>
                  <span className="text-[#ff6a00] text-[20px] leading-none">"</span>
                  {review.quote}
                  <span className="text-[#ff6a00] text-[20px] leading-none">"</span>
                </blockquote>
                <div className="flex items-center gap-4 pt-5 border-t border-black/[0.06]">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[13px] font-medium shrink-0"
                    style={{ backgroundColor: review.color, fontFamily: 'Georgia, serif' }}>{review.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] text-black mb-0.5 truncate" style={{ fontFamily: 'Georgia, serif' }}>{review.name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/45 truncate">{review.role}</div>
                  </div>
                </div>
                <div className="absolute top-5 right-5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-black/40">Verified</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 10: FAQs ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="Questions & Answers" right={<><span>12 FAQs</span><span>·</span><span>Updated Oct 2025</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Frequently Asked</div>
              <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Answers to your<br /><span className="italic text-[#ff6a00]">curious</span> questions.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
                Everything you might want to know about our tools, privacy, Aadhaar PVC cards, and more.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            <div className="lg:col-span-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="lg:sticky lg:top-32">
                <div className="mb-8">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4">Browse by topic</div>
                  <div className="flex flex-col gap-1">
                    {faqCategories.map((cat) => {
                      const isActive = activeFaqCat === cat.id;
                      return (
                        <button key={cat.id} onClick={() => handleFaqCatChange(cat.id)}
                          className={`flex items-center justify-between py-2.5 text-left text-[14px] transition-colors duration-300 border-b border-black/[0.06] ${isActive ? 'text-[#ff6a00]' : 'text-black/50 hover:text-black'}`}>
                          <span style={{ fontFamily: isActive ? 'Georgia, serif' : 'inherit' }}>{cat.label}</span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/30">{String(cat.count).padStart(2, '0')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="p-6 rounded-[22px] bg-white border border-black/[0.06]">
                  <div className="w-10 h-10 rounded-2xl bg-[#f4f1ea] flex items-center justify-center mb-5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff6a00" strokeWidth="1.75">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-[20px] leading-tight tracking-tight text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    Still have a <span className="italic text-[#ff6a00]">question?</span>
                  </h3>
                  <p className="text-[13px] leading-[1.7] text-black/55 font-light mb-5">Our team typically responds within 2 hours on weekdays.</p>
                  <Link href="/contacts" className="group inline-flex items-center gap-3">
                    <span className="relative text-[13px] font-medium text-black pb-1">
                      Contact support
                      <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
                    </span>
                    <span className="w-7 h-7 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                      <ArrowUpRight size={11} className="text-black group-hover:text-white transition-colors" />
                    </span>
                  </Link>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                <motion.div key={activeFaqCat} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                  className="divide-y divide-black/[0.08] border-t border-black/[0.08]">
                  {currentFaqs.map((faq, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <motion.div key={`${activeFaqCat}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }} className="group">
                        <button onClick={() => toggleFaq(index)} className="w-full text-left py-6 flex items-start gap-6 group">
                          <span className={`shrink-0 text-[11px] font-mono uppercase tracking-[0.2em] mt-1.5 transition-colors duration-300 ${isOpen ? 'text-[#ff6a00]' : 'text-black/30'}`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className={`flex-1 text-[18px] md:text-[22px] leading-[1.35] tracking-[-0.01em] transition-colors duration-300 pr-4 ${isOpen ? 'text-[#ff6a00]' : 'text-black group-hover:text-black/70'}`}
                            style={{ fontFamily: 'Georgia, serif' }}>{faq.q}</span>
                          <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                            isOpen ? 'bg-[#ff6a00] border-[#ff6a00] text-white rotate-180' : 'border-black/15 text-black/60 group-hover:border-black/30'}`}>
                            {isOpen ? <Minus size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
                          </div>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.4 }} className="overflow-hidden">
                              <div className="pb-6 pl-[52px] pr-16">
                                <div className="max-w-[640px] text-[14px] md:text-[15px] leading-[1.75] text-black/60 font-light">{faq.a}</div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 11: BLOG / RESOURCES ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <SectionMeta label="From the Journal" right={<><span>Latest Articles</span><span>·</span><span>Weekly</span></>} />

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Resources</div>
              <h2 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[0.98] tracking-[-0.02em]" style={{ fontFamily: 'Georgia, serif' }}>
                Guides &<br /><span className="italic text-[#ff6a00]">tutorials.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:pb-4">
              <Link href="/blog" className="group inline-flex items-center gap-3">
                <span className="relative text-[15px] font-medium text-black pb-1">
                  View all articles
                  <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
                </span>
                <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                  <ArrowUpRight size={15} className="text-black group-hover:text-white transition-colors" />
                </span>
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {blogPosts.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}>
                <Link href="/blog#articles" className="block group">
                  <div className="p-7 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 transition-all duration-500">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">{post.category}</span>
                    </div>
                    <h3 className="text-[18px] leading-[1.3] text-black mb-6 group-hover:text-[#ff6a00] transition-colors" style={{ fontFamily: 'Georgia, serif' }}>
                      {post.title}
                    </h3>
                    <div className="flex items-center justify-between pt-5 border-t border-black/[0.06] text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      <span>{post.date}</span>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 12: FINAL CTA ===================== */}
      <section className="relative py-24 md:py-32 border-t border-black/[0.08]">
        <div className="container mx-auto px-8 relative max-w-[1400px]">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1 }} className="max-w-4xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-6">Ready to Start?</div>
            <h2 className="text-[52px] md:text-[80px] lg:text-[96px] leading-[0.95] tracking-[-0.03em] mb-10" style={{ fontFamily: 'Georgia, serif' }}>
              Let's get your<br />documents <span className="italic text-[#ff6a00]">sorted.</span>
            </h2>
            <p className="text-[16px] md:text-[18px] leading-[1.7] text-black/60 max-w-xl mb-12 font-light">
              Upload your first file — it takes less than 30 seconds. No account, no cost, no catch. Just tools that work.
            </p>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
              <Link href="/pdf-tools/merge" className="group inline-flex items-center gap-4">
                <span className="relative text-[17px] font-medium text-black pb-1.5">
                  Try a tool now
                  <span className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-black group-hover:bg-[#ff6a00] transition-colors" />
                </span>
                <span className="w-11 h-11 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                  <ArrowUpRight size={17} className="text-black group-hover:text-white transition-colors" />
                </span>
              </Link>
              <Link href="/contacts" className="group inline-flex items-center gap-4">
                <span className="relative text-[17px] text-black/50 hover:text-black transition-colors pb-1.5">Order Aadhaar PVC</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}