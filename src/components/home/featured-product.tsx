"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Truck, ShieldCheck, Sparkles } from 'lucide-react';

const productFeatures = [
  { icon: ShieldCheck, title: 'UIDAI-compliant', desc: 'Exact same layout, logo, and QR code as your E-Aadhaar.' },
  { icon: Truck, title: '24-hour dispatch', desc: 'Printed and shipped within 24 hours of order confirmation.' },
  { icon: Sparkles, title: '600-micron PVC', desc: 'Same material as your bank cards. Waterproof and tear-proof.' },
];

export const FeaturedProduct = () => {
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
              Featured Service
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>From ₹99</span>
            <span>·</span>
            <span>50,000+ Delivered</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* LEFT: Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="lg:col-span-6 relative"
          >
            {/* Image frame — gallery style */}
            <div className="relative bg-white p-3 border border-black/[0.1] rounded-[22px]">
              <div className="relative overflow-hidden rounded-[14px] aspect-[4/3]">
                <Image
                  src="/aadhaar-to-pvc.png"
                  alt="E-Aadhaar to PVC card"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Caption */}
            <div className="mt-5 flex items-start gap-4 text-[12px] text-black/50 leading-[1.7] max-w-md">
              <span className="font-mono uppercase tracking-wider text-black/40 shrink-0 mt-0.5 text-[10px]">
                Fig. 02
              </span>
              <p>
                Paper E-Aadhaar transformed into a 600-micron PVC card. The QR code, 
                photo, and Aadhaar number remain perfectly legible.
              </p>
            </div>
          </motion.div>

          {/* RIGHT: Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-6"
          >
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Most Popular
            </div>

            <h2 
              className="text-[40px] md:text-[56px] lg:text-[64px] leading-[1.02] tracking-[-0.02em] mb-8"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Print your E-Aadhaar
              <br />
              on a <span className="italic text-[#ff6a00]">PVC card.</span>
            </h2>

            <p className="text-[15px] md:text-[17px] leading-[1.7] text-black/60 max-w-lg mb-10 font-light">
              Turn your digital or paper E-Aadhaar into a durable, pocket-sized 
              card. Same information, form factor that survives your wallet.
            </p>

            {/* Product features */}
            <div className="space-y-5 mb-10">
              {productFeatures.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-2xl bg-white border border-black/[0.08] flex items-center justify-center">
                      <Icon size={16} strokeWidth={1.75} className="text-[#ff6a00]" />
                    </div>
                    <div>
                      <div 
                        className="text-[15px] text-black mb-0.5"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {feature.title}
                      </div>
                      <div className="text-[13px] text-black/55 font-light leading-[1.6]">
                        {feature.desc}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pricing row */}
            <div className="flex items-end gap-6 mb-10 pb-10 border-b border-black/[0.12]">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-1">
                  Starting at
                </div>
                <div 
                  className="text-[32px] leading-none text-black"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  ₹99
                  <span className="text-[14px] text-black/50 ml-2 font-sans">/ card</span>
                </div>
              </div>
              <div className="pb-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-1">
                  Bulk orders
                </div>
                <div className="text-[14px] text-black/70">
                  From ₹79 (10+ cards)
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/aadhaar-pvc" className="group inline-flex items-center gap-3">
                <span className="relative text-[15px] font-medium text-black pb-1">
                  Order now
                  <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
                </span>
                <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                  <ArrowUpRight size={15} className="text-black group-hover:text-white transition-colors" />
                </span>
              </Link>

              <Link href="/sample" className="group inline-flex items-center gap-3">
                <span className="relative text-[15px] text-black/50 hover:text-black transition-colors pb-1">
                  View sample card
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};