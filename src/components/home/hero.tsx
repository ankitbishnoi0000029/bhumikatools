"use client";

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative min-h-screen bg-[#f4f1ea] text-[#0a0a0a] overflow-hidden mt-24 container mx-auto">
      
      {/* Fine vertical rules (editorial grid) */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.06]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.06]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.06]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.06]" />
        </div>
      </div>

        
        {/* ===== TOP META ROW ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-between pb-6 mb-16 border-b border-black/[0.12]"
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              E-Aadhaar → PVC Print Service
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Est. 2024</span>
            <span>·</span>
            <span>India</span>
          </div>
        </motion.div>

        {/* ===== MAIN GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          
          {/* ===== LEFT: HEADLINE & CONTENT (7 cols) ===== */}
          <div className="lg:col-span-7 flex flex-col">
            
            {/* Issue number */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-6"
            >
              № 01 — Digital Identity
            </motion.div>

            {/* Big Serif Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-[52px] md:text-[72px] lg:text-[88px] leading-[0.98] tracking-[-0.02em] mb-10"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Your Aadhaar,
              <br />
              <span className="italic text-[#ff6a00]">printed</span> the way
              <br />
              it <span className="italic">deserves</span> to be.
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-[17px] md:text-[18px] leading-[1.65] text-black/70 max-w-[560px] mb-10"
            >
              Turn your digital E-Aadhaar into a premium PVC card — the size of a credit card, 
              the quality of a bank card. Waterproof, durable, delivered to your door in 24 hours.
            </motion.p>

            {/* Two column text */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-12 max-w-[640px]"
            >
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3 pb-3 border-b border-black/[0.1]">
                  Material
                </div>
                <p className="text-[14px] leading-[1.7] text-black/70">
                  600-micron PVC, same grade as bank cards. Will not fade, tear, or peel.
                </p>
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3 pb-3 border-b border-black/[0.1]">
                  Delivery
                </div>
                <p className="text-[14px] leading-[1.7] text-black/70">
                  Printed and dispatched within 24 hours. Tracked shipping across India.
                </p>
              </div>
            </motion.div>

            {/* CTA Row */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex flex-wrap items-center gap-x-10 gap-y-4 mt-auto"
            >
              <Link href="/upload" className="group inline-flex items-center gap-3">
                <span className="relative text-[15px] font-medium text-black pb-1">
                  Start your order
                  <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors duration-300" />
                </span>
                <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                  <ArrowUpRight size={15} className="text-black group-hover:text-white transition-colors" />
                </span>
              </Link>

              <Link href="/sample" className="group inline-flex items-center gap-3">
                <span className="relative text-[15px] font-medium text-black/50 pb-1 hover:text-black transition-colors">
                  View a sample
                  <span className="absolute left-0 right-0 bottom-0 h-px bg-black/20 group-hover:bg-black transition-colors duration-300" />
                </span>
              </Link>
            </motion.div>
          </div>

          {/* ===== RIGHT: IMAGE (5 cols) ===== */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative"
          >
            {/* Image frame — like a gallery print */}
            <div className="relative bg-white p-3 border border-black/[0.1] shadow-[0_2px_0_rgba(0,0,0,0.04)]">
              <div className="relative overflow-hidden aspect-[4/3]">
                <Image
                  src="/aadhaar-to-pvc.png"
                  alt="E-Aadhaar to PVC card"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Caption below image — like a museum label */}
            <div className="mt-4 flex items-start gap-3 text-[12px] text-black/50 leading-[1.6]">
              <span className="font-mono uppercase tracking-wider text-black/40 shrink-0 mt-0.5">
                Fig. 01
              </span>
              <p>
                The transformation. Paper E-Aadhaar on the left, our printed PVC card on the right. 
                Same information, form factor that survives your wallet.
              </p>
            </div>

            {/* Small stamp/mark on top right of image */}
            <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-[#ff6a00] text-white flex items-center justify-center text-[10px] font-mono uppercase tracking-widest text-center leading-tight rotate-12">
              100%<br />Secure
            </div>
          </motion.div>
        </div>

        {/* ===== BOTTOM: DATA ROW ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-24 pt-8 border-t border-black/[0.12]"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: '01', label: 'Prints delivered', value: '50,000+' },
              { n: '02', label: 'Average rating', value: '4.9 / 5' },
              { n: '03', label: 'Dispatch time', value: '24 hours' },
              { n: '04', label: 'Order value', value: 'From ₹99' },
            ].map((item, i) => (
              <div key={item.label} className="flex flex-col gap-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
                  {item.n}
                </div>
                <div 
                  className="text-[22px] md:text-[26px] text-black leading-none tracking-tight"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {item.value}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

    </section>
  );
};