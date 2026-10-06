"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Shield, Lock, Eye, Trash2, Database, Cookie, UserCheck } from 'lucide-react';

const sections = [
  { id: 'overview', label: 'Overview', num: '01' },
  { id: 'collect', label: 'What we collect', num: '02' },
  { id: 'use', label: 'How we use it', num: '03' },
  { id: 'storage', label: 'Storage & deletion', num: '04' },
  { id: 'sharing', label: 'Sharing', num: '05' },
  { id: 'cookies', label: 'Cookies', num: '06' },
  { id: 'rights', label: 'Your rights', num: '07' },
  { id: 'contact', label: 'Contact', num: '08' },
];

const highlights = [
  { icon: Trash2, label: '2-hour deletion', desc: 'Every file you upload is permanently deleted within 2 hours.' },
  { icon: Lock, label: 'End-to-end encryption', desc: 'TLS 1.3 in transit, AES-256 at rest.' },
  { icon: Eye, label: 'Zero tracking', desc: 'No ads, no third-party analytics, no data sold.' },
  { icon: UserCheck, label: 'You own your data', desc: 'Always. We claim no rights over your files.' },
];

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('overview');

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
              Legal — Privacy Policy
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Last Updated</span>
            <span>·</span>
            <span>Oct 15, 2025</span>
          </div>
        </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-16 items-end"
        >
          <div className="lg:col-span-7">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">
              Chapter L.01 — Your Privacy
            </div>
            <h1 
              className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Privacy,
              <br />
              in plain <span className="italic text-[#ff6a00]">English.</span>
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              We wrote this policy to be read, not skimmed. No legal jargon, 
              no hidden clauses. Just the facts about how we handle your data.
            </p>
          </div>
        </motion.div>

        {/* Highlights grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20"
        >
          {highlights.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="group p-6 rounded-[22px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-0.5 transition-all duration-500"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center mb-5 transition-all duration-500">
                  <Icon size={16} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                </div>
                <div 
                  className="text-[16px] text-black mb-1.5"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {item.label}
                </div>
                <div className="text-[12px] text-black/55 leading-[1.65] font-light">
                  {item.desc}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Main: sidebar + content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">

          {/* Sidebar — table of contents */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-32">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-5 pb-3 border-b border-black/[0.08]">
                Contents
              </div>
              <nav className="flex flex-col">
                {sections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={() => setActiveSection(section.id)}
                      className={`group flex items-center justify-between py-2.5 text-[13px] transition-colors duration-300 ${
                        isActive ? 'text-[#ff6a00]' : 'text-black/50 hover:text-black'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono uppercase tracking-[0.15em] transition-colors ${
                          isActive ? 'text-[#ff6a00]' : 'text-black/30'
                        }`}>
                          {section.num}
                        </span>
                        <span>{section.label}</span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="activeSectionIndicator"
                          className="w-1 h-1 rounded-full bg-[#ff6a00]"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-9 max-w-3xl">

            <Section id="overview" num="01" title="Overview">
              <p>
                idcardtools (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a free, browser-based document 
                toolkit based in Bangalore, India. We provide PDF tools, ID card 
                printing, and AI-powered document processing.
              </p>
              <p>
                This policy explains what data we collect, why we collect it, how 
                long we keep it, and what rights you have. It applies to everyone 
                who visits idcardtools.com.
              </p>
              <p className="text-black/70 italic">
                The short version: we don&apos;t sell your data, we don&apos;t run ads, and 
                we delete your files within 2 hours.
              </p>
            </Section>

            <Section id="collect" num="02" title="What we collect">
              <p>We collect the bare minimum needed to run our service:</p>
              <List items={[
                { term: 'Files you upload', def: 'Only for tools that require server processing (OCR, AI Summarizer, PVC card printing). Browser-based tools never upload anything.' },
                { term: 'Account information', def: 'If you sign up, we store your name and email. Passwords are hashed with bcrypt.' },
                { term: 'Order information', def: 'For PVC card orders: shipping address, phone number, and payment confirmation (no card details).' },
                { term: 'Basic usage logs', def: 'IP address, browser type, and error logs — used only to prevent abuse and fix bugs. Deleted after 30 days.' },
              ]} />
              <p className="text-black/70">
                We do <strong className="text-black">not</strong> collect: browsing history, 
                device fingerprints, location beyond city-level, or any data from your files.
              </p>
            </Section>

            <Section id="use" num="03" title="How we use it">
              <p>Your data is used for exactly four purposes:</p>
              <List items={[
                { term: 'To deliver the service', def: 'Process your files, print your cards, and ship your orders.' },
                { term: 'To communicate', def: 'Order updates, security alerts, and (rarely) product announcements — with a one-click unsubscribe.' },
                { term: 'To keep the platform safe', def: 'Detect abuse, prevent spam, and protect our infrastructure.' },
                { term: 'To improve the product', def: 'Anonymized, aggregated statistics only. Never tied to your identity.' },
              ]} />
            </Section>

            <Section id="storage" num="04" title="Storage & deletion">
              <p>
                Every file you upload to idcardtools is automatically and permanently 
                deleted within <strong className="text-black">2 hours</strong> of processing.
                This is not a marketing promise — it&apos;s enforced by an automated cron job that 
                runs every 15 minutes.
              </p>
              <p>
                Account data (name, email, hashed password) is retained as long as your 
                account is active. You can delete your account at any time from the 
                settings page, and all associated data is purged within 7 days.
              </p>
              <Callout>
                Browser-based tools (Merge, Split, Compress, Rotate, JPG to PDF) never 
                send your files to our servers. Everything happens locally in your browser.
              </Callout>
            </Section>

            <Section id="sharing" num="05" title="Sharing your data">
              <p>
                We share data with exactly three types of third parties — all vetted, 
                all necessary to run the service:
              </p>
              <List items={[
                { term: 'Payment processors', def: 'Razorpay and Stripe handle payments. We never see your card details.' },
                { term: 'Cloud infrastructure', def: 'AWS Mumbai region for file processing. Files are encrypted at rest.' },
                { term: 'Shipping partners', def: 'Delhivery and India Post receive only your name, address, and phone for card delivery.' },
              ]} />
              <p className="text-black/70">
                We do <strong className="text-black">not</strong> sell your data. We do 
                <strong className="text-black"> not</strong> share your data with advertisers, 
                data brokers, or any government agency unless legally compelled.
              </p>
            </Section>

            <Section id="cookies" num="06" title="Cookies">
              <p>
                We use only the cookies required to keep you logged in and to protect 
                against CSRF attacks. No tracking cookies. No third-party pixels. No 
                advertising IDs.
              </p>
              <p>
                If you disable cookies in your browser, you can still use every tool on 
                this site — you just won&apos;t be able to stay logged in.
              </p>
            </Section>

            <Section id="rights" num="07" title="Your rights">
              <p>Under Indian data protection law, you have the right to:</p>
              <List items={[
                { term: 'Access', def: 'Request a copy of all data we hold about you.' },
                { term: 'Correct', def: 'Fix any incorrect information in your account.' },
                { term: 'Delete', def: 'Delete your account and all associated data at any time.' },
                { term: 'Export', def: 'Download your order history and account data as JSON or CSV.' },
                { term: 'Object', def: 'Opt out of any non-essential communication.' },
              ]} />
              <p>
                To exercise any of these rights, email us at{' '}
                <a href="mailto:privacy@idcardtools.com" className="text-black underline hover:text-[#ff6a00] transition-colors">
                  privacy@idcardtools.com
                </a>
                . We respond within 7 business days.
              </p>
            </Section>

            <Section id="contact" num="08" title="Contact">
              <p>
                Questions about this policy? Reach out to our Data Protection Officer:
              </p>
              <div className="mt-6 p-6 rounded-[18px] bg-white border border-black/[0.06]">
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-2">
                  Data Protection Officer
                </div>
                <div 
                  className="text-[18px] text-black mb-3"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  idcardtools — Legal Team
                </div>
                <div className="space-y-1.5 text-[13px] text-black/60">
                  <div>Indiranagar, Bangalore 560038</div>
                  <div>Karnataka, India</div>
                  <div className="pt-2">
                    <a href="mailto:privacy@idcardtools.com" className="text-black underline hover:text-[#ff6a00] transition-colors">
                      privacy@idcardtools.com
                    </a>
                  </div>
                </div>
              </div>
            </Section>

            <div className="mt-16 pt-8 border-t border-black/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
                Last Updated · October 15, 2025
              </div>
              <div className="flex items-center gap-6">
                <Link href="/terms" className="text-[12px] text-black/50 hover:text-black transition-colors">
                  Read Terms →
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-16 scroll-mt-32"
    >
      <div className="flex items-baseline gap-5 mb-6 pb-4 border-b border-black/[0.08]">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#ff6a00]">
          {num}
        </span>
        <h2 
          className="text-[28px] md:text-[34px] leading-tight tracking-tight text-black"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-5 text-[15px] leading-[1.75] text-black/70 font-light">
        {children}
      </div>
    </motion.section>
  );
}

function List({ items }: { items: { term: string; def: string }[] }) {
  return (
    <ul className="space-y-4 pt-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 pb-4 border-b border-black/[0.05] last:border-0">
          <span className="shrink-0 text-[11px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] mt-1">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <div 
              className="text-[15px] text-black mb-1"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {item.term}
            </div>
            <div className="text-[14px] leading-[1.7] text-black/60 font-light">
              {item.def}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mt-6 p-5 pl-6 rounded-r-[14px] bg-white border-l-2 border-[#ff6a00]">
      <div className="text-[13px] leading-[1.7] text-black/70 italic">
        {children}
      </div>
    </div>
  );
}