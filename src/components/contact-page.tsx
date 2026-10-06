"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Send, CheckCircle2, Clock } from 'lucide-react';

const contactMethods = [
  {
    n: '01',
    icon: Mail,
    label: 'Email',
    value: 'hello@idcardtools.com',
    href: 'mailto:hello@idcardtools.com',
    response: 'Under 2 hours',
  },
  {
    n: '02',
    icon: Phone,
    label: 'Phone',
    value: '+91 98765 43210',
    href: 'tel:+919876543210',
    response: 'Mon-Fri, 10AM-6PM',
  },
  {
    n: '03',
    icon: MapPin,
    label: 'Office',
    value: 'Indiranagar, Bangalore',
    href: '#',
    response: 'By appointment only',
  },
];

const faqs = [
  { q: 'How fast do you reply?', a: 'Usually within 2 hours on weekdays. Weekends may take up to 24 hours.' },
  { q: 'Do you offer phone support?', a: 'Yes, for PVC card orders and bulk inquiries. Email for everything else.' },
  { q: 'Can I visit your office?', a: 'Yes, by appointment. Email us to schedule a visit.' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

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
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
              Contact — We&apos;re Listening
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Avg. Response: 2h</span>
            <span>·</span>
            <span>Based in Bangalore</span>
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
              Chapter 07 — Say Hello
            </div>
            <h1 
              className="text-[48px] md:text-[68px] lg:text-[80px] leading-[0.98] tracking-[-0.02em]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Let&apos;s talk about
              <br />
              your <span className="italic text-[#ff6a00]">documents.</span>
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pb-4">
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md">
              Questions about a tool, a bulk order, or a partnership? 
              Drop us a message and a real human will reply.
            </p>
          </div>
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-24">

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-7"
          >
            <div className="p-8 md:p-10 rounded-[22px] bg-white border border-black/[0.06]">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-8">
                Send us a message
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <h3 
                    className="text-[24px] text-black mb-3"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Message received!
                  </h3>
                  <p className="text-[14px] text-black/55">
                    We&apos;ll get back to you within 2 hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="contact-name" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                        Your Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[15px] text-black placeholder:text-black/25 transition-colors"
                        placeholder="Priya Sharma"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[15px] text-black placeholder:text-black/25 transition-colors"
                        placeholder="priya@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-subject" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                      Subject
                    </label>
                    <input
                      id="contact-subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[15px] text-black placeholder:text-black/25 transition-colors"
                      placeholder="Bulk PVC card order for my firm"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[15px] text-black placeholder:text-black/25 resize-none transition-colors"
                      placeholder="Tell us what you need..."
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="group inline-flex items-center gap-3"
                    >
                      <span className="relative text-[15px] font-medium text-black pb-1">
                        Send message
                        <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
                      </span>
                      <span className="w-10 h-10 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                        <Send size={15} className="text-black group-hover:text-white transition-colors" />
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>

          {/* Contact methods */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
            className="lg:col-span-5"
          >
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-8">
              Other ways to reach us
            </div>

            <div className="space-y-6">
              {contactMethods.map((method, i) => {
                const Icon = method.icon;
                return (
                  <motion.a
                    key={method.n}
                    href={method.href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="group block p-6 rounded-[18px] bg-white border border-black/[0.06] hover:border-[#ff6a00]/40 hover:-translate-y-0.5 transition-all duration-500"
                  >
                    <div className="flex items-start gap-5">
                      <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#f4f1ea] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-500">
                        <Icon size={18} strokeWidth={1.75} className="text-black/70 group-hover:text-white transition-colors duration-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">
                            {method.label}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/30">
                            {method.n}
                          </span>
                        </div>
                        <div 
                          className="text-[18px] text-black mb-1 group-hover:text-[#ff6a00] transition-colors"
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {method.value}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                          <Clock size={10} />
                          {method.response}
                        </div>
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </div>

            <div className="mt-10 pt-8 border-t border-black/[0.08]">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/40 mb-5">
                Quick answers
              </div>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="pb-4 border-b border-black/[0.06] last:border-0">
                    <div 
                      className="text-[14px] text-black mb-1"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {faq.q}
                    </div>
                    <div className="text-[12px] text-black/55 font-light leading-[1.6]">
                      {faq.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}