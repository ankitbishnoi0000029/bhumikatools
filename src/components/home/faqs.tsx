"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, ArrowUpRight, MessageCircle } from 'lucide-react';

const faqCategories = [
  { id: 'general', label: 'General', count: 4 },
  { id: 'aadhaar', label: 'Aadhaar PVC', count: 4 },
  { id: 'tools', label: 'PDF Tools', count: 4 },
  { id: 'privacy', label: 'Privacy & Security', count: 3 },
];

const faqsData: Record<string, { q: string; a: string }[]> = {
  general: [
    {
      q: 'Is CyberNexas really free to use?',
      a: 'Yes — all our PDF tools are 100% free, forever. No signup, no hidden charges, no watermarks. We only charge for the physical E-Aadhaar PVC card delivery service (from ₹99).',
    },
    {
      q: 'Do I need to create an account?',
      a: 'No account is required. Just upload your file, use the tool, and download the result. We don\'t even ask for your email unless you\'re placing a PVC card order.',
    },
    {
      q: 'What file size can I upload?',
      a: 'Free users can upload files up to 5GB per file. For PVC card orders, your E-Aadhaar PDF just needs to be under 20MB (which every official E-Aadhaar PDF is).',
    },
    {
      q: 'Do you have mobile apps?',
      a: 'Not yet — but our entire toolkit works perfectly on mobile browsers (Chrome, Safari, Edge). No installation required. Just open, upload, and go.',
    },
  ],
  aadhaar: [
    {
      q: 'Is it legal to print E-Aadhaar on a PVC card?',
      a: 'Yes, completely legal. UIDAI officially permits printing E-Aadhaar on PVC cards as long as the layout, logo, and QR code remain unaltered. Our prints are 100% compliant with UIDAI specifications.',
    },
    {
      q: 'How long does delivery take?',
      a: 'Standard delivery is 3-5 business days across India. Express delivery (24-48 hours) is available in metro cities for an additional charge. All orders come with tracking.',
    },
    {
      q: 'How is my PVC Aadhaar different from the original paper one?',
      a: 'It contains the exact same information, QR code, and layout as your E-Aadhaar. The only difference is the material — 600-micron PVC (same as bank cards) instead of paper. It\'s waterproof, tear-proof, and pocket-sized.',
    },
    {
      q: 'Can I order in bulk for my team or family?',
      a: 'Absolutely. We offer special pricing for orders of 10+ cards. Email us at hello@cybernexas.com with the quantity and we\'ll send you a custom quote within 24 hours.',
    },
  ],
  tools: [
    {
      q: 'Do my files leave my device?',
      a: 'For most tools (Merge, Split, Compress, Rotate, JPG to PDF), processing happens entirely in your browser — files never leave your device. For cloud-based tools (OCR, AI Summarizer), files are processed on our servers and auto-deleted within 2 hours.',
    },
    {
      q: 'What formats do you support?',
      a: 'PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), JPG, PNG, HTML, and Markdown. Both directions — to and from PDF.',
    },
    {
      q: 'Can I use this for commercial work?',
      a: 'Yes. All tools are free for both personal and commercial use. No attribution required. We do not claim any rights over your files.',
    },
    {
      q: 'What happens if a conversion fails?',
      a: 'If something goes wrong, try again with a smaller file or a different format. If it still fails, email us the file and we\'ll investigate within 24 hours. Your files are always auto-deleted after processing.',
    },
  ],
  privacy: [
    {
      q: 'How long do you keep my files?',
      a: 'Files uploaded to our servers (for OCR, AI, or PVC orders) are automatically deleted after 2 hours. Browser-based tools never upload anything at all.',
    },
    {
      q: 'Do you sell my data?',
      a: 'Never. We don\'t sell, share, or rent your data to anyone. We don\'t run ads. We don\'t track you across the web. Our only revenue is the small fee we charge for physical PVC card deliveries.',
    },
    {
      q: 'Is my Aadhaar data secure?',
      a: 'Your E-Aadhaar PDF is encrypted in transit (TLS 1.3), stored encrypted at rest, and permanently deleted within 2 hours of your PVC card being printed. Only you and our printing operator see the file. We never store biometric data.',
    },
  ],
};

export const Faqs = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setOpenIndex(0);
  };

  const currentFaqs = faqsData[activeCategory];

  return (
    <section className="relative bg-[#f4f1ea] text-[#0a0a0a] py-24 md:py-32 overflow-hidden">
      
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
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              Questions & Answers
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>15 FAQs</span>
            <span>·</span>
            <span>Updated Oct 2025</span>
          </div>
        </motion.div>

        {/* ===== HEADING ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Chapter 05 — Frequently Asked
            </div>
            <h2 
              className="text-[48px] md:text-[68px] lg:text-[76px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Answers to your
              <br />
              <span className="italic text-[#ff6a00]">curious</span> questions.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Everything you might want to know about our tools, privacy, 
              Aadhaar PVC cards, and more. Still curious? Just ask.
            </p>
          </div>
        </motion.div>

        {/* ===== CATEGORY TABS ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-14 pb-6 border-b border-black/[0.08]"
        >
          {faqCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`relative text-[13px] tracking-tight pb-1 transition-colors duration-300 group ${
                  isActive ? 'text-black' : 'text-black/40 hover:text-black'
                }`}
              >
                <span className="font-medium">{cat.label}</span>
                {isActive ? (
                  <motion.span 
                    layoutId="activeFaqTab"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-[#ff6a00]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                ) : (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-black/30 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                )}
                <span className="ml-1.5 text-[10px] font-mono text-black/30">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ===== MAIN LAYOUT: LEFT INFO + RIGHT FAQ LIST ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          
          {/* LEFT: Sticky support card */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="lg:sticky lg:top-32"
            >
              <div className="p-8 rounded-[22px] bg-white border border-black/[0.06]">
                <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] flex items-center justify-center mb-6">
                  <MessageCircle size={20} strokeWidth={1.75} className="text-[#ff6a00]" />
                </div>

                <h3 
                  className="text-[24px] leading-tight tracking-tight text-black mb-3"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Still have a <span className="italic text-[#ff6a00]">question?</span>
                </h3>
                
                <p className="text-[14px] leading-[1.7] text-black/55 font-light mb-8">
                  Our team typically responds within 2 hours on weekdays. 
                  We are real humans, based in India.
                </p>

                <Link 
                  href="/contact" 
                  className="group inline-flex items-center gap-3"
                >
                  <span className="relative text-[14px] font-medium text-black pb-1">
                    Contact support
                    <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
                  </span>
                  <span className="w-8 h-8 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                    <ArrowUpRight size={13} className="text-black group-hover:text-white transition-colors" />
                  </span>
                </Link>

                {/* Divider */}
                <div className="my-8 h-px bg-black/[0.08]" />

                {/* Contact rows */}
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-1.5">
                      Email
                    </div>
                    <a 
                      href="mailto:hello@cybernexas.com" 
                      className="text-[14px] text-black hover:text-[#ff6a00] transition-colors"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      hello@cybernexas.com
                    </a>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-1.5">
                      Response time
                    </div>
                    <p className="text-[14px] text-black/70" style={{ fontFamily: 'Georgia, serif' }}>
                      Under 2 hours
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: FAQ Accordion */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="divide-y divide-black/[0.08] border-t border-black/[0.08]"
              >
                {currentFaqs.map((faq, index) => {
                  const isOpen = openIndex === index;
                  return (
                    <motion.div
                      key={`${activeCategory}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.05,
                        ease: "easeOut" 
                      }}
                      className="group"
                    >
                      {/* Question row */}
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full text-left py-6 flex items-start gap-6 group"
                      >
                        {/* Number */}
                        <span className={`shrink-0 text-[11px] font-mono uppercase tracking-[0.2em] mt-1.5 transition-colors duration-300 ${
                          isOpen ? 'text-[#ff6a00]' : 'text-black/30'
                        }`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        {/* Question */}
                        <span 
                          className={`flex-1 text-[18px] md:text-[22px] leading-[1.35] tracking-[-0.01em] transition-colors duration-300 pr-4 ${
                            isOpen ? 'text-[#ff6a00]' : 'text-black group-hover:text-black/70'
                          }`}
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {faq.q}
                        </span>

                        {/* Toggle icon */}
                        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          isOpen 
                            ? 'bg-[#ff6a00] border-[#ff6a00] text-white rotate-180' 
                            : 'border-black/15 text-black/60 group-hover:border-black/30'
                        }`}>
                          {isOpen ? (
                            <Minus size={14} strokeWidth={2} />
                          ) : (
                            <Plus size={14} strokeWidth={2} />
                          )}
                        </div>
                      </button>

                      {/* Answer */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ 
                              duration: 0.4, 
                              ease: "easeOut" 
                            }}
                            className="overflow-hidden"
                          >
                            <div className="pb-6 pl-[52px] pr-16">
                              <div className="max-w-[640px] text-[14px] md:text-[15px] leading-[1.75] text-black/60 font-light">
                                {faq.a}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Bottom mini CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 pt-8 border-t border-black/[0.08] flex flex-wrap items-center gap-x-8 gap-y-4"
            >
              <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
                Popular questions
              </span>
              <div className="flex flex-wrap gap-3">
                {['Is it free?', 'Delivery time', 'Is Aadhaar legal?', 'File deletion'].map((tag) => (
                  <span 
                    key={tag}
                    className="text-[12px] text-black/60 px-3 py-1 rounded-full border border-black/[0.1] hover:border-[#ff6a00] hover:text-[#ff6a00] transition-colors cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
};