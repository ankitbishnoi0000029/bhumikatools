"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UploadCloud, Settings, Download, ArrowUpRight } from 'lucide-react';

const steps = [
  {
    n: '01',
    title: 'Upload your file',
    desc: 'Drag and drop your PDF, Word, Excel, or image. Files up to 5GB supported.',
    icon: UploadCloud,
  },
  {
    n: '02',
    title: 'Choose your tool',
    desc: 'Merge, split, compress, convert, sign, or protect. All in one clean workspace.',
    icon: Settings,
  },
  {
    n: '03',
    title: 'Download instantly',
    desc: 'Your processed file is ready in seconds. No signup, no watermarks, no BS.',
    icon: Download,
  },
];

export const HowItWorks = () => {
  return (
    <section className="relative bg-[#f4f1ea] text-[#0a0a0a] py-24 md:py-32 overflow-hidden">
      
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
        <div className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              How It Works
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>3 Steps</span>
            <span>·</span>
            <span>Under 30 Seconds</span>
          </div>
        </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Chapter 01 — The Process
            </div>
            <h2 
              className="text-[48px] md:text-[68px] lg:text-[76px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Three steps.
              <br />
              That's <span className="italic text-[#ff6a00]">it.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              No accounts, no installations, no learning curve. CyberNexas is 
              designed so anyone can use it — even your grandmother.
            </p>
          </div>
        </motion.div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ 
                  duration: 0.7, 
                  delay: i * 0.15, 
                  ease: "easeOut" 
                }}
                className="group relative p-8 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.18)] transition-all duration-500"
              >
                {/* Number watermark */}
                <div 
                  className="absolute top-6 right-7 text-[64px] leading-none text-black/[0.04] select-none pointer-events-none"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {step.n}
                </div>

                {/* Icon */}
                <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#f4f1ea] flex items-center justify-center mb-8 group-hover:bg-[#ff6a00] transition-all duration-500">
                  <Icon size={20} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                </div>

                {/* Title */}
                <h3 
                  className="relative z-10 text-[22px] leading-tight tracking-tight text-black mb-3"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {step.title}
                </h3>

                {/* Desc */}
                <p className="relative z-10 text-[14px] leading-[1.7] text-black/55 font-light">
                  {step.desc}
                </p>

                {/* Mono label bottom */}
                <div className="relative z-10 mt-8 pt-5 border-t border-black/[0.06] flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 group-hover:text-[#ff6a00] transition-colors">
                    Step {step.n}
                  </span>
                  <ArrowUpRight size={14} className="text-black/30 group-hover:text-[#ff6a00] group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 flex justify-center"
        >
          <Link href="/tools" className="group inline-flex items-center gap-3">
            <span className="relative text-[15px] font-medium text-black pb-1">
              Explore all tools
              <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
            </span>
            <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
              <ArrowUpRight size={15} className="text-black group-hover:text-white transition-colors" />
            </span>
          </Link>
        </motion.div>

      </div>
    </section>
  );
};