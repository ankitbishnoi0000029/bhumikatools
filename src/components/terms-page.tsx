"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileCheck, Scale, AlertTriangle, Ban, RefreshCw, Gavel, UserCheck, Wallet } from 'lucide-react';

const sections = [
  { id: 'acceptance', label: 'Acceptance', num: '01' },
  { id: 'service', label: 'The Service', num: '02' },
  { id: 'account', label: 'Your Account', num: '03' },
  { id: 'acceptable', label: 'Acceptable Use', num: '04' },
  { id: 'payment', label: 'Payments & Refunds', num: '05' },
  { id: 'ip', label: 'Intellectual Property', num: '06' },
  { id: 'liability', label: 'Liability', num: '07' },
  { id: 'termination', label: 'Termination', num: '08' },
  { id: 'changes', label: 'Changes', num: '09' },
  { id: 'law', label: 'Governing Law', num: '10' },
];

const keyPoints = [
  { icon: FileCheck, label: 'Free to use', desc: 'All digital tools are free, forever. Only PVC card orders are paid.' },
  { icon: UserCheck, label: 'You own your files', desc: 'We claim no rights over anything you upload or create.' },
  { icon: Ban, label: 'No abuse', desc: 'Don&apos;t use our tools for illegal or malicious purposes.' },
  { icon: RefreshCw, label: 'Refund policy', desc: 'Full refunds within 24 hours if we haven&apos;t printed your card yet.' },
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');

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
              Legal — Terms of Service
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Effective</span>
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
              Chapter L.02 — The Rules
            </div>
            <h1 
              className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Terms,
              <br />
              without the <span className="italic text-[#ff6a00]">tricks.</span>
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              By using idcardtools, you agree to these terms. They&apos;re written to 
              be fair — to you, to us, and to every other user on the platform.
            </p>
          </div>
        </motion.div>

        {/* Key points grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20"
        >
          {keyPoints.map((item, i) => {
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

          {/* Sidebar */}
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
                          layoutId="activeTermsIndicator"
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

            {/* Intro */}
            <div className="mb-14 p-6 rounded-[18px] bg-white border border-black/[0.06]">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                Plain English Summary
              </div>
              <p className="text-[15px] leading-[1.7] text-black/70">
                Use our tools responsibly. Don&apos;t upload anything illegal. You own your 
                files, we own our code. We&apos;re not liable if something goes wrong. 
                Disputes are resolved under Indian law. That&apos;s it — full details below.
              </p>
            </div>

            <Section id="acceptance" num="01" title="Acceptance of Terms">
              <p>
                By accessing or using idcardtools.com (&quot;the Service&quot;), you agree to 
                be bound by these Terms of Service. If you do not agree, please do not 
                use the Service.
              </p>
              <p>
                You must be at least 13 years old to use idcardtools. If you are under 18, 
                you confirm that you have permission from a parent or legal guardian.
              </p>
            </Section>

            <Section id="service" num="02" title="The Service">
              <p>
                idcardtools provides browser-based document processing tools (PDF merge, 
                split, compress, convert, OCR, AI summarization) and a paid PVC card 
                printing and delivery service for E-Aadhaar and other ID cards.
              </p>
              <p>
                Digital tools are <strong className="text-black">free of charge</strong> 
                {' '}and always will be. The PVC card service is a paid service with pricing 
                listed on the respective product pages.
              </p>
              <Callout>
                The Service is provided &quot;as is&quot; and &quot;as available&quot;. We may add, modify, 
                or discontinue features at any time without prior notice.
              </Callout>
            </Section>

            <Section id="account" num="03" title="Your Account">
              <p>
                You don&apos;t need an account to use most tools. If you choose to create one:
              </p>
              <List items={[
                { term: 'Keep it secure', def: 'You are responsible for maintaining the confidentiality of your password.' },
                { term: 'Be accurate', def: 'Provide truthful information. Fake accounts will be terminated.' },
                { term: 'One person, one account', def: 'Don\'t share credentials or create accounts for bots.' },
                { term: 'Notify us', def: 'If you suspect unauthorized access, email us immediately.' },
              ]} />
            </Section>

            <Section id="acceptable" num="04" title="Acceptable Use">
              <p>You agree <strong className="text-black">not</strong> to use idcardtools to:</p>
              <List items={[
                { term: 'Process illegal content', def: 'Anything that violates Indian law, including CSAM, pirated material, or forged documents.' },
                { term: 'Forge identity documents', def: 'Our tools process your own legitimate documents. Fraudulent reproduction is strictly prohibited.' },
                { term: 'Abuse the infrastructure', def: 'No DDoS attempts, scraping at scale, or using the Service to attack third parties.' },
                { term: 'Reverse-engineer', def: 'No decompiling, disassembling, or attempting to extract source code.' },
                { term: 'Resell the service', def: 'You may not rebrand, resell, or white-label idcardtools without written permission.' },
              ]} />
              <p className="text-black/70">
                We reserve the right to suspend or terminate accounts that violate these 
                rules, with or without notice.
              </p>
            </Section>

            <Section id="payment" num="05" title="Payments & Refunds">
              <p>
                PVC card orders are processed through Razorpay and Stripe. Prices are in 
                Indian Rupees (INR) and include GST where applicable.
              </p>
              <List items={[
                { term: 'Refunds', def: 'Full refund if you cancel before printing begins (usually within 2 hours of order). No refunds after dispatch.' },
                { term: 'Failed delivery', def: 'If your card is lost in transit, we re-print and re-ship at no extra cost.' },
                { term: 'Bulk orders', def: 'Custom pricing applies. Payment terms are agreed separately in writing.' },
                { term: 'Chargebacks', def: 'Please contact us before initiating a chargeback. We resolve 99% of issues within 24 hours.' },
              ]} />
            </Section>

            <Section id="ip" num="06" title="Intellectual Property">
              <p>
                The idcardtools name, logo, code, design system, and content are owned by 
                idcardtools and protected by Indian and international copyright law.
              </p>
              <p>
                <strong className="text-black">Your files remain yours.</strong> We claim 
                absolutely no rights, license, or ownership over anything you upload or 
                produce using our tools. Once your file is deleted (within 2 hours), it is 
                gone forever.
              </p>
              <Callout>
                Any feedback, feature requests, or suggestions you send us become our 
                property — but only because we need the freedom to implement them without 
                future claims. We&apos;ll always credit you publicly if you want.
              </Callout>
            </Section>

            <Section id="liability" num="07" title="Limitation of Liability">
              <p>
                To the maximum extent permitted by law, idcardtools is provided &quot;as is&quot; 
                without warranties of any kind — express or implied.
              </p>
              <p>
                We are not liable for any indirect, incidental, special, or consequential 
                damages arising from your use of the Service, including (but not limited to) 
                data loss, business interruption, or loss of profits.
              </p>
              <p>
                Our total liability to you, for any claim related to the Service, will 
                not exceed the amount you paid us in the 6 months preceding the claim — 
                or ₹5,000, whichever is greater.
              </p>
            </Section>

            <Section id="termination" num="08" title="Termination">
              <p>
                You can stop using idcardtools at any time. You can delete your account 
                from the settings page — all your data will be purged within 7 days.
              </p>
              <p>
                We may suspend or terminate your access if you violate these Terms, if 
                required by law, or if we discontinue the Service entirely. We&apos;ll always 
                try to give you reasonable notice.
              </p>
            </Section>

            <Section id="changes" num="09" title="Changes to These Terms">
              <p>
                We may update these Terms from time to time. When we make material changes, 
                we&apos;ll notify you by email (if you have an account) and post a prominent 
                notice on the website at least <strong className="text-black">14 days</strong> 
                {' '}before the changes take effect.
              </p>
              <p>
                Continuing to use the Service after changes take effect constitutes 
                acceptance of the updated Terms.
              </p>
            </Section>

            <Section id="law" num="10" title="Governing Law">
              <p>
                These Terms are governed by the laws of India. Any dispute arising from 
                your use of idcardtools will be subject to the exclusive jurisdiction of 
                the courts in <strong className="text-black">Bangalore, Karnataka</strong>.
              </p>
              <p>
                Before pursuing legal action, we ask that you contact us first at{' '}
                <a href="mailto:legal@idcardtools.com" className="text-black underline hover:text-[#ff6a00] transition-colors">
                  legal@idcardtools.com
                </a>
                . We resolve almost every dispute within 7 business days.
              </p>
            </Section>

            {/* Contact card */}
            <div className="mt-16 p-8 rounded-[22px] bg-white border border-black/[0.06]">
              <div className="flex items-start gap-5">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#f4f1ea] flex items-center justify-center">
                  <Gavel size={18} strokeWidth={1.75} className="text-[#ff6a00]" />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-2">
                    Legal Contact
                  </div>
                  <div 
                    className="text-[20px] text-black mb-3"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Have a legal question?
                  </div>
                  <p className="text-[14px] text-black/60 leading-[1.7] mb-4 max-w-md">
                    Reach out to our legal team for questions about these Terms, 
                    copyright issues, or formal notices.
                  </p>
                  <div className="space-y-1.5 text-[13px] text-black/60">
                    <div>
                      <a href="mailto:legal@idcardtools.com" className="text-black underline hover:text-[#ff6a00] transition-colors">
                        legal@idcardtools.com
                      </a>
                    </div>
                    <div>Indiranagar, Bangalore 560038, Karnataka, India</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Last updated */}
            <div className="mt-16 pt-8 border-t border-black/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
                Effective · October 15, 2025
              </div>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-[12px] text-black/50 hover:text-black transition-colors">
                  Read Privacy Policy →
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