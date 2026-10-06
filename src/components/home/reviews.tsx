"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Star, Quote } from 'lucide-react';

const reviews = [
  {
    id: 1,
    name: 'Priya Sharma',
    role: 'Chartered Accountant',
    location: 'Mumbai, MH',
    rating: 5,
    quote: 'I printed over 200 E-Aadhaar PVC cards for my clients last month. The quality is exactly like a bank card — nobody can tell the difference. Delivered in 24 hours, every single time.',
    initials: 'PS',
    color: '#ff6a00',
  },
  {
    id: 2,
    name: 'Rajesh Kumar',
    role: 'Small Business Owner',
    location: 'Bangalore, KA',
    rating: 5,
    quote: 'The AI summarizer saved me hours of reading contracts. What used to take an entire evening now takes 30 seconds. And the merged PDFs come out perfectly formatted.',
    initials: 'RK',
    color: '#10b981',
  },
  {
    id: 3,
    name: 'Anjali Verma',
    role: 'HR Manager',
    location: 'Delhi, NCR',
    rating: 5,
    quote: 'We process 500+ employee documents every quarter. The bulk PDF tools handle everything flawlessly. The privacy features mean I never worry about sensitive data leaving our office.',
    initials: 'AV',
    color: '#3b82f6',
  },
  {
    id: 4,
    name: 'Mohammed Faisal',
    role: 'Freelance Designer',
    location: 'Hyderabad, TS',
    rating: 5,
    quote: 'Clean interface, no ads, no signup. I just drag my files in and they get done. The PVC Aadhaar card service alone is worth it — mine looks better than the original paper version.',
    initials: 'MF',
    color: '#a855f7',
  },
  {
    id: 5,
    name: 'Sneha Patel',
    role: 'Lawyer',
    location: 'Ahmedabad, GJ',
    rating: 5,
    quote: 'The redaction tool is a lifesaver for court filings. It permanently removes sensitive information before I submit. I recommend this to every junior in my chamber.',
    initials: 'SP',
    color: '#ec4899',
  },
];

export const Reviews = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const goTo = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    setAutoPlay(false);
  };

  const next = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    setAutoPlay(false);
  };

  const prev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    setAutoPlay(false);
  };

  const current = reviews[currentIndex];

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
              Testimonials
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>4.9 / 5.0</span>
            <span>·</span>
            <span>2,847 Reviews</span>
          </div>
        </motion.div>

        {/* ===== HEADING ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Chapter 04 — In Their Words
            </div>
            <h2 
              className="text-[48px] md:text-[68px] lg:text-[76px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Trusted by
              <br />
              <span className="italic text-[#ff6a00]">professionals</span> everywhere.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md mb-8">
              From chartered accountants to freelance designers, thousands 
              of Indians rely on CyberNexas every day.
            </p>

            {/* Star rating summary */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-[#ff6a00] text-[#ff6a00]" />
                ))}
              </div>
              <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                4.9 · 2,847 Verified
              </span>
            </div>
          </div>
        </motion.div>

        {/* ===== MAIN REVIEW ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-16">
          
          {/* LEFT: Big quote mark */}
          <div className="lg:col-span-3 hidden lg:block">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="sticky top-32"
            >
              <Quote 
                size={120} 
                strokeWidth={0.75} 
                className="text-black/10 mb-6" 
              />
              <div 
                className="text-[13px] text-black/50 leading-[1.7]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Every review is from a <span className="italic">verified</span> customer who actually used our tools.
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Review slider */}
          <div className="lg:col-span-9">
            <div className="relative min-h-[340px] md:min-h-[280px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={current.id}
                  custom={direction}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {/* Star row */}
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(current.rating)].map((_, i) => (
                      <Star key={i} size={13} className="fill-[#ff6a00] text-[#ff6a00]" />
                    ))}
                  </div>

                  {/* Big quote */}
                  <blockquote 
                    className="text-[24px] md:text-[32px] lg:text-[36px] leading-[1.3] tracking-[-0.01em] text-black mb-10 max-w-[820px]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    <span className="text-[#ff6a00]">"</span>
                    {current.quote}
                    <span className="text-[#ff6a00]">"</span>
                  </blockquote>

                  {/* Author row */}
                  <div className="flex items-center gap-5">
                    {/* Avatar — initials in colored circle */}
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[15px] font-medium tracking-tight shrink-0"
                      style={{ 
                        backgroundColor: current.color,
                        fontFamily: 'Georgia, serif'
                      }}
                    >
                      {current.initials}
                    </div>

                    <div className="flex-1">
                      <div className="text-[17px] text-black mb-0.5" style={{ fontFamily: 'Georgia, serif' }}>
                        {current.name}
                      </div>
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                        {current.role} · {current.location}
                      </div>
                    </div>

                    {/* Verified badge */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-black/[0.12] rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/60">
                        Verified
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ===== NAVIGATION ===== */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-black/[0.12]">
              
              {/* Dots / index numbers */}
              <div className="flex items-center gap-3">
                {reviews.map((review, i) => (
                  <button
                    key={review.id}
                    onClick={() => goTo(i)}
                    className="group relative flex items-center gap-2"
                    aria-label={`Go to review ${i + 1}`}
                  >
                    <span 
                      className={`text-[10px] font-mono uppercase tracking-[0.15em] transition-colors ${
                        i === currentIndex ? 'text-[#ff6a00]' : 'text-black/30 group-hover:text-black/60'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {i === currentIndex && (
                      <motion.span
                        layoutId="activeReview"
                        className="absolute -bottom-1 left-0 right-0 h-px bg-[#ff6a00]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Arrow buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={prev}
                  className="w-10 h-10 rounded-full border border-black/[0.15] flex items-center justify-center text-black/60 hover:bg-black hover:text-white hover:border-black transition-all duration-300"
                  aria-label="Previous review"
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  onClick={next}
                  className="w-10 h-10 rounded-full border border-black/[0.15] flex items-center justify-center text-black/60 hover:bg-black hover:text-white hover:border-black transition-all duration-300"
                  aria-label="Next review"
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM MARQUEE — NAMES TICKER ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="pt-10 border-t border-black/[0.08] overflow-hidden"
        >
          <div className="flex items-center gap-8 whitespace-nowrap text-[11px] font-mono uppercase tracking-[0.2em] text-black/30">
            {[
              'Chartered Accountant',
              'Lawyer',
              'HR Manager',
              'Small Business Owner',
              'Freelance Designer',
              'Student',
              'Government Officer',
              'Doctor',
              'Engineer',
              'Tax Consultant',
            ].map((role, i) => (
              <React.Fragment key={role}>
                <span>{role}</span>
                <span className="text-[#ff6a00]">·</span>
              </React.Fragment>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  );
};