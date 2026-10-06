"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Sparkles, Users, Shield, Zap, Heart } from 'lucide-react';

const values = [
  { n: '01', icon: Shield, title: 'Privacy by default', desc: 'Your files are never stored longer than necessary. Most tools run entirely in your browser.' },
  { n: '02', icon: Zap, title: 'Speed obsessed', desc: 'Every millisecond counts. We optimize aggressively so you get results instantly.' },
  { n: '03', icon: Heart, title: 'Free forever', desc: 'No paywalls, no ads, no watermarks. All tools remain free for personal and commercial use.' },
  { n: '04', icon: Users, title: 'Built for India', desc: 'Designed for Indian documents — Aadhaar, PAN, Voter ID, DL, and 100+ other formats.' },
];

const timeline = [
  { year: '2023', title: 'The idea', desc: 'Started as a side project to help a friend print their E-Aadhaar on a PVC card.' },
  { year: '2024', title: 'First 10,000 users', desc: 'Word spread through WhatsApp groups. We hit 10K users within 6 months.' },
  { year: '2025', title: 'The full toolkit', desc: 'Expanded to 30+ tools, AI-powered OCR, and shipped over 50,000 PVC cards.' },
  { year: 'Now', title: '2M+ users', desc: 'Serving millions across India with privacy-first document tools.' },
];

const stats = [
  { value: '2M+', label: 'Active Users' },
  { value: '18M+', label: 'Files Processed' },
  { value: '50K+', label: 'Cards Delivered' },
  { value: '0', label: 'Data Sold' },
];

export default function AboutPage() {
  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden">

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
              About idcardtools
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Since 2023</span>
            <span>·</span>
            <span>Made in India</span>
          </div>
        </div>

        {/* Hero heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl mb-24"
        >
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-6">
            Our Story
          </div>
          <h1 
            className="text-[48px] md:text-[72px] lg:text-[88px] leading-[0.98] tracking-[-0.02em] mb-10"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            We make documents
            <br />
            <span className="italic text-[#ff6a00]">simple</span> for everyone.
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.7] text-black/60 max-w-2xl font-light">
            idcardtools started with a simple frustration: why does something as mundane as 
            printing an Aadhaar card require so many hoops? We set out to build the tools we 
            wished existed — fast, private, free, and beautiful.
          </p>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-16 mb-16 border-b border-black/[0.12]"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex flex-col gap-2"
            >
              <div 
                className="text-[40px] md:text-[52px] leading-none text-black tracking-tight"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Values grid */}
        <div className="mb-24">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-4">
            What we believe
          </div>
          <h2 
            className="text-[36px] md:text-[48px] leading-tight tracking-tight mb-12 max-w-2xl"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Four principles behind <span className="italic">everything</span> we build.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  className="group p-8 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.15)] transition-all duration-500"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-500">
                      <Icon size={20} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
                      {value.n}
                    </span>
                  </div>
                  <h3 
                    className="text-[22px] leading-tight tracking-tight text-black mb-3"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {value.title}
                  </h3>
                  <p className="text-[14px] leading-[1.7] text-black/55 font-light">
                    {value.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-24">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-4">
            The Journey
          </div>
          <h2 
            className="text-[36px] md:text-[48px] leading-tight tracking-tight mb-12 max-w-2xl"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            From a side project to <span className="italic text-[#ff6a00]">millions.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                className="relative pt-6 border-t-2 border-black/[0.12] group hover:border-[#ff6a00] transition-colors duration-500"
              >
                <div 
                  className="text-[32px] leading-none text-black mb-4"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {item.year}
                </div>
                <h3 className="text-[16px] text-black mb-2 font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="text-[13px] leading-[1.65] text-black/55 font-light">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="pt-10 border-t border-black/[0.12] flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
              Join us
            </div>
            <h3 
              className="text-[28px] md:text-[36px] leading-tight tracking-tight text-black max-w-lg"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Ready to see what we've <span className="italic">built?</span>
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href="/tools" className="group inline-flex items-center gap-3">
              <span className="relative text-[15px] font-medium text-black pb-1">
                Explore tools
                <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
              </span>
              <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                <ArrowUpRight size={15} className="text-black group-hover:text-white transition-colors" />
              </span>
            </Link>
            <Link href="/contact" className="group inline-flex items-center gap-3">
              <span className="relative text-[15px] text-black/50 hover:text-black transition-colors pb-1">
                Get in touch
              </span>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}