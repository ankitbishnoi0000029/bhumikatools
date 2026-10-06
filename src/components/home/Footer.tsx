"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const footerColumns = [
  {
    label: 'Explore',
    links: [
      { name: 'Home', href: '/' },
      { name: 'PDF Tools', href: '/pdf-tools' },
      { name: 'Free PDF Tools', href: '/pdf-tools' },
      { name: 'Blog', href: '/blog' },
    ],
  },
  {
    label: 'Products',
    links: [
      { name: 'E-Aadhaar to PVC', href: '/contacts' },
      { name: 'Merge PDF', href: '/pdf-tools/merge' },
      { name: 'Compress PDF', href: '/pdf-tools/compress' },
      { name: 'PDF to Word', href: '/pdf-tools/pdf-word' },
    ],
  },
  {
    label: 'Company',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact', href: '/contacts' },
      { name: 'Careers', href: '/contacts' },
      { name: 'Press enquiries', href: '/contacts' },
    ],
  },
];

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com' },
  { name: 'Instagram', href: 'https://instagram.com' },
  { name: 'LinkedIn', href: 'https://linkedin.com' },
  { name: 'GitHub', href: 'https://github.com' },
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#f4f1ea] text-[#0a0a0a] overflow-hidden">
      
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
        <div className="flex items-center justify-between py-6 border-b border-black/[0.12]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              Index
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>End of Page</span>
            <span>·</span>
            <span>{process.env.NEXT_PUBLIC_NAME}</span>
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 py-20">
          
          {/* ===== LEFT: BIG STATEMENT ===== */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              {/* Logo — matches header */}
              <Link href="/" className="inline-flex items-center gap-3 group mb-10">
                <div className="relative w-9 h-9 flex items-center justify-center">
                  <svg 
                    viewBox="0 0 40 40" 
                    className="absolute inset-0 w-full h-full text-black"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  >
                    <path d="M20 3 L35 11.5 L35 28.5 L20 37 L5 28.5 L5 11.5 Z" />
                  </svg>
                  <span 
                    className="relative z-10 text-[15px] font-semibold text-[#ff6a00] italic"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    N
                  </span>
                </div>
                <div className="flex flex-col leading-none">
                  <div className="flex items-baseline">
                    <span className="text-[15px] font-semibold tracking-tight text-black">
                      {process.env.NEXT_PUBLIC_NAME}
                    </span>
                 
                  </div>
                  <span className="text-[7.5px] font-mono uppercase tracking-[0.22em] text-black/40 mt-1">
                    Secure · Innovate · Succeed
                  </span>
                </div>
              </Link>

              {/* Big editorial headline */}
              <h2 
                className="text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.02em] text-black mb-8 max-w-md"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Beautiful tools for your <span className="italic text-[#ff6a00]">digital</span> documents.
              </h2>

              <p className="text-[14px] leading-[1.7] text-black/55 max-w-md mb-10 font-light">
                Merge, convert, print, and protect — everything you need in one clean, 
                private, browser-based toolkit.
              </p>

              {/* Contact CTA row */}
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-2">
                    Email
                  </div>
                  <a 
                    href="mailto:hello@{process.env.NEXT_PUBLIC_NAME}.com" 
                    className="text-[15px] text-black hover:text-[#ff6a00] transition-colors"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    hello@{process.env.NEXT_PUBLIC_NAME}.com
                  </a>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-2">
                    Phone
                  </div>
                  <a 
                    href="tel:+919876543210" 
                    className="text-[15px] text-black hover:text-[#ff6a00] transition-colors"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    +91 98765 43210
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* ===== RIGHT: LINK COLUMNS ===== */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12">
            {footerColumns.map((column, colIndex) => (
              <motion.div
                key={column.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: colIndex * 0.1, ease: "easeOut" }}
              >
                {/* Column label with number */}
                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-black/[0.12]">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
                    0{colIndex + 1}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/60">
                    {column.label}
                  </span>
                </div>

                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link 
                        href={link.href}
                        className="group inline-flex items-center gap-1.5 text-[14px] text-black/60 hover:text-black transition-colors"
                      >
                        <span className="relative pb-0.5">
                          {link.name}
                          <span className="absolute left-0 right-0 bottom-0 h-px bg-[#ff6a00] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                        </span>
                        <ArrowUpRight 
                          size={11} 
                          className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300 text-[#ff6a00]" 
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ===== BOTTOM BAR ===== */}
        <div className="border-t border-black/[0.12]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-8">
            
            {/* Copyright */}
            <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 order-2 md:order-1">
              <span>&copy; {currentYear}</span>
              <span>·</span>
              <span>{process.env.NEXT_PUBLIC_NAME}</span>
              <span>·</span>
              <span>All Rights Reserved</span>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-5 order-1 md:order-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50 hover:text-[#ff6a00] transition-colors"
                >
                  {social.name}
                </a>
              ))}
            </div>

            {/* Legal links */}
            <div className="flex items-center gap-5 order-3">
              <Link 
                href="/privacy" 
                className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors"
              >
                Privacy
              </Link>
              <Link 
                href="/terms" 
                className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50 hover:text-black transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>

        {/* ===== SUPER BOTTOM — big brand mark ===== */}
        <div className="relative pt-6 pb-10 overflow-hidden">
          <div 
            className="text-[80px] md:text-[140px] lg:text-[180px] leading-[0.85] font-normal tracking-[-0.04em] text-black/[0.05] select-none pointer-events-none whitespace-nowrap"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {process.env.NEXT_PUBLIC_NAME}
          </div>
        </div>

      </div>
    </footer>
  );
};