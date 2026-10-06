"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Calendar, Clock } from 'lucide-react';

const categories = ['All', 'Tutorials', 'Industry', 'Privacy', 'Product Updates'];

const featuredPost = {
  id: 'aadhaar-pvc-guide',
  category: 'Tutorials',
  title: 'The complete guide to printing your E-Aadhaar on a PVC card',
  excerpt: 'Everything you need to know — from downloading your E-Aadhaar PDF, to choosing the right PVC material, to UIDAI compliance rules.',
  author: 'Team idcardtools',
  date: 'Oct 12, 2025',
  readTime: '8 min read',
  color: '#ff6a00',
};

const posts = [
  {
    id: 'pdf-privacy',
    category: 'Privacy',
    title: 'Why browser-based PDF tools are safer than cloud uploads',
    excerpt: 'Most tools upload your files to their servers. We explain why that\'s risky and how browser-based processing works.',
    author: 'Priya Sharma',
    date: 'Oct 8, 2025',
    readTime: '5 min read',
    color: '#10b981',
  },
  {
    id: 'pan-card-guide',
    category: 'Tutorials',
    title: 'How to auto-crop your PAN card in under 10 seconds',
    excerpt: 'A step-by-step guide to using our AI-powered ID card cropper for perfect PAN card prints.',
    author: 'Team idcardtools',
    date: 'Oct 3, 2025',
    readTime: '4 min read',
    color: '#3b82f6',
  },
  {
    id: 'ai-ocr',
    category: 'Product Updates',
    title: 'Introducing AI-powered OCR for scanned documents',
    excerpt: 'Turn any scanned document into searchable, editable text — with support for Hindi, Tamil, and 12 other Indian languages.',
    author: 'Team idcardtools',
    date: 'Sep 28, 2025',
    readTime: '6 min read',
    color: '#a855f7',
  },
  {
    id: 'digital-india',
    category: 'Industry',
    title: 'The future of digital identity in India: 2026 and beyond',
    excerpt: 'From Aadhaar to DigiLocker, India is leading the world in digital public infrastructure. Here\'s what\'s coming next.',
    author: 'Rajesh Kumar',
    date: 'Sep 22, 2025',
    readTime: '10 min read',
    color: '#ec4899',
  },
  {
    id: 'merge-pdf-guide',
    category: 'Tutorials',
    title: 'How to merge 100 PDFs without paying a single rupee',
    excerpt: 'Forget expensive subscriptions. Here\'s how to merge unlimited PDFs for free, forever.',
    author: 'Team idcardtools',
    date: 'Sep 15, 2025',
    readTime: '5 min read',
    color: '#ff6a00',
  },
  {
    id: 'bulk-orders',
    category: 'Product Updates',
    title: 'Bulk PVC card printing — now with custom company branding',
    excerpt: 'Offices and businesses can now order employee ID cards printed on the same premium PVC material.',
    author: 'Team idcardtools',
    date: 'Sep 10, 2025',
    readTime: '3 min read',
    color: '#06b6d4',
  },
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredPosts = activeCategory === 'All'
    ? posts
    : posts.filter((p) => p.category === activeCategory);

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-32 pb-24 overflow-hidden">

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
              Journal — Notes & Guides
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>{posts.length + 1} Articles</span>
            <span>·</span>
            <span>Weekly Updates</span>
          </div>
        </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-20 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Chapter 08 — From the Journal
            </div>
            <h1 
              className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Writing about
              <br />
              <span className="italic text-[#ff6a00]">documents.</span>
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Tutorials, industry news, privacy deep-dives, and product updates. 
              Written by humans who actually use these tools.
            </p>
          </div>
        </motion.div>

        {/* FEATURED POST */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <Link href="/blog#articles" className="block group">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-8 md:p-10 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-1 hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.15)] transition-all duration-500">
              
              {/* Left: Featured tag */}
              <div className="lg:col-span-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff6a00]">
                      Featured Article
                    </span>
                  </div>
                  <div 
                    className="text-[13px] text-black/40"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {featuredPost.category}
                  </div>
                </div>

                {/* Meta bottom */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 lg:mt-0">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    <Calendar size={11} />
                    {featuredPost.date}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    <Clock size={11} />
                    {featuredPost.readTime}
                  </div>
                </div>
              </div>

              {/* Right: Content */}
              <div className="lg:col-span-8">
                <h2 
                  className="text-[28px] md:text-[36px] lg:text-[42px] leading-[1.1] tracking-[-0.02em] text-black mb-5 group-hover:text-[#ff6a00] transition-colors"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {featuredPost.title}
                </h2>
                <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 font-light mb-8 max-w-2xl">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-mono uppercase tracking-[0.15em] text-black/50">
                    By {featuredPost.author}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-black group-hover:text-[#ff6a00] transition-colors">
                      Read article
                    </span>
                    <span className="w-8 h-8 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                      <ArrowUpRight size={13} className="text-black group-hover:text-white transition-colors" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Category filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-12 pb-6 border-b border-black/[0.08]"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative text-[13px] tracking-tight pb-1 transition-colors duration-300 group ${
                  isActive ? 'text-black' : 'text-black/40 hover:text-black'
                }`}
              >
                <span className="font-medium">{cat}</span>
                {isActive && (
                  <motion.span
                    layoutId="activeBlogTab"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-[#ff6a00]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {!isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-black/30 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Posts grid */}
        <div id="articles" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
            >
              <Link href="/blog#articles" className="block h-full outline-none group">
                <div className="relative flex flex-col h-full p-7 rounded-[22px] bg-white border border-black/[0.06] group-hover:border-[#ff6a00]/40 group-hover:-translate-y-1 group-hover:shadow-[0_20px_50px_-15px_rgba(255,106,0,0.15)] transition-all duration-500 overflow-hidden">

                  {/* Color accent */}
                  <div 
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                    style={{ backgroundColor: post.color }}
                  />

                  {/* Category */}
                  <div className="relative z-10 flex items-center gap-2 mb-8">
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: post.color }}
                    />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/50">
                      {post.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 
                    className="relative z-10 text-[20px] leading-[1.25] tracking-tight text-black mb-3 group-hover:text-[#ff6a00] transition-colors"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="relative z-10 text-[13px] leading-[1.7] text-black/55 font-light mb-8 flex-grow">
                    {post.excerpt}
                  </p>

                  {/* Meta bottom */}
                  <div className="relative z-10 pt-5 border-t border-black/[0.06] flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      {post.date}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-black/40">
                      <Clock size={10} />
                      {post.readTime}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {filteredPosts.length === 0 && (
          <div className="py-24 text-center border border-black/[0.08] rounded-[22px] bg-white">
            <div className="text-[20px] text-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              No articles yet.
            </div>
            <p className="text-[13px] text-black/50">
              We&apos;re writing something new — check back soon.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}