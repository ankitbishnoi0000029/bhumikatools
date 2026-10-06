"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export const FinalCta = () => {
  return (
    <section className="relative bg-[#f4f1ea] text-[#0a0a0a] py-24 md:py-32 overflow-hidden border-t border-black/[0.08]">
      
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
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              Ready to Start?
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>No Signup</span>
            <span>·</span>
            <span>No Credit Card</span>
          </div>
        </div>

        {/* Big statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <h2 
            className="text-[52px] md:text-[80px] lg:text-[100px] leading-[0.95] tracking-[-0.03em] mb-10"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Let's get your
            <br />
            documents <span className="italic text-[#ff6a00]">sorted.</span>
          </h2>

          <p className="text-[16px] md:text-[18px] leading-[1.7] text-black/60 max-w-xl mb-12 font-light">
            Upload your first file — it takes less than 30 seconds. No account, 
            no cost, no catch. Just tools that work.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
            <Link href="/tools" className="group inline-flex items-center gap-4">
              <span className="relative text-[17px] font-medium text-black pb-1.5">
                Explore the toolkit
                <span className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-black group-hover:bg-[#ff6a00] transition-colors" />
              </span>
              <span className="w-11 h-11 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                <ArrowUpRight size={17} className="text-black group-hover:text-white transition-colors" />
              </span>
            </Link>

            <Link href="/aadhaar-pvc" className="group inline-flex items-center gap-4">
              <span className="relative text-[17px] text-black/50 hover:text-black transition-colors pb-1.5">
                Order Aadhaar PVC
              </span>
            </Link>
          </div>
        </motion.div>

        {/* Bottom stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-24 pt-10 border-t border-black/[0.12] grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { n: '01', label: 'Active Users', value: '2M+' },
            { n: '02', label: 'Files Processed', value: '18M+' },
            { n: '03', label: 'Cards Delivered', value: '50K+' },
            { n: '04', label: 'Countries', value: '14' },
          ].map((stat) => (
            <div key={stat.n} className="flex flex-col gap-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
                {stat.n}
              </div>
              <div 
                className="text-[28px] md:text-[34px] text-black leading-none tracking-tight"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};