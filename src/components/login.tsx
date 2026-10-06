"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3500);
  };

  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] min-h-screen pt-32 pb-24 overflow-hidden">
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
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">Account</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-[0.2em] text-black/40">
            <span>Secure</span>
            <span>·</span>
            <span>Encrypted</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 items-center">
          {/* LEFT: Brand message */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="lg:col-span-5"
          >
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-5">Welcome to</div>
            <h1
              className="text-[48px] md:text-[64px] leading-[1] tracking-[-0.02em] mb-8"
              style={{ fontFamily: "Georgia, serif" }}
            >
              idcardtools
              <span className="text-[#ff6a00]">.</span>
            </h1>
            <p className="text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-md mb-10 font-light">Save your preferences, track your PVC card orders, and get access to bulk tools. It&apos;s free, and we&apos;ll never sell your data.</p>

            {/* Benefits */}
            <div className="space-y-4">
              {["Track orders in real-time", "Access bulk processing tools", "Save your favorite tools", "Priority support on orders"].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3 text-[14px] text-black/70"
                >
                  <CheckCircle2
                    size={15}
                    className="text-emerald-500 shrink-0"
                  />
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-7"
          >
            <div className="p-8 md:p-10 rounded-[22px] bg-white border border-black/[0.06]">
              {/* Mode toggle */}
              <div className="flex items-center gap-6 mb-10 pb-6 border-b border-black/[0.08]">
                <button
                  onClick={() => setMode("login")}
                  className={`relative pb-1 text-[14px] font-medium tracking-tight transition-colors ${mode === "login" ? "text-black" : "text-black/40 hover:text-black"}`}
                >
                  Login
                  {mode === "login" && (
                    <motion.span
                      layoutId="activeAuthTab"
                      className="absolute -bottom-1 left-0 right-0 h-px bg-[#ff6a00]"
                    />
                  )}
                </button>
                <button
                  onClick={() => setMode("signup")}
                  className={`relative pb-1 text-[14px] font-medium tracking-tight transition-colors ${mode === "signup" ? "text-black" : "text-black/40 hover:text-black"}`}
                >
                  Sign Up
                  {mode === "signup" && (
                    <motion.span
                      layoutId="activeAuthTab"
                      className="absolute -bottom-1 left-0 right-0 h-px bg-[#ff6a00]"
                    />
                  )}
                </button>
                <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-black/30">{mode === "login" ? "Returning user" : "New account"}</span>
              </div>

              {/* Form */}
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-16 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2
                      size={28}
                      className="text-emerald-500"
                    />
                  </div>
                  <h3
                    className="text-[24px] text-black mb-3"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {mode === "login" ? "Welcome back!" : "Account created!"}
                  </h3>
                  <p className="text-[14px] text-black/55">{mode === "login" ? "Signing you in..." : "Check your email to verify."}</p>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={mode}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Name (only signup) */}
                      {mode === "signup" && (
                        <div>
                          <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">Full Name</label>
                          <div className="relative flex items-center border-b border-black/20 focus-within:border-[#ff6a00] transition-colors">
                            <User
                              size={14}
                              className="text-black/30 mr-3"
                            />
                            <input
                              type="text"
                              required
                              placeholder="Priya Sharma"
                              className="w-full bg-transparent outline-none py-3 text-[15px] text-black placeholder:text-black/25"
                            />
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">Email Address</label>
                        <div className="relative flex items-center border-b border-black/20 focus-within:border-[#ff6a00] transition-colors">
                          <Mail
                            size={14}
                            className="text-black/30 mr-3"
                          />
                          <input
                            type="email"
                            required
                            placeholder="you@example.com"
                            className="w-full bg-transparent outline-none py-3 text-[15px] text-black placeholder:text-black/25"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/40">Password</label>
                          {mode === "login" && (
                            <Link
                              href="/forgot-password"
                              className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#ff6a00] hover:underline"
                            >
                              Forgot?
                            </Link>
                          )}
                        </div>
                        <div className="relative flex items-center border-b border-black/20 focus-within:border-[#ff6a00] transition-colors">
                          <Lock
                            size={14}
                            className="text-black/30 mr-3"
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••••"
                            className="w-full bg-transparent outline-none py-3 text-[15px] text-black placeholder:text-black/25"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-black/30 hover:text-black transition-colors"
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Terms (signup only) */}
                      {mode === "signup" && (
                        <div className="flex items-start gap-3 pt-2">
                          <input
                            type="checkbox"
                            required
                            className="mt-0.5 accent-[#ff6a00]"
                          />
                          <label className="text-[12px] text-black/60 leading-[1.6]">
                            I agree to the{" "}
                            <Link
                              href="/terms"
                              className="text-black underline hover:text-[#ff6a00]"
                            >
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link
                              href="/privacy"
                              className="text-black underline hover:text-[#ff6a00]"
                            >
                              Privacy Policy
                            </Link>
                            .
                          </label>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Submit */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="submit"
                      className="group inline-flex items-center gap-3"
                    >
                      <span className="relative text-[15px] font-medium text-black pb-1">
                        {mode === "login" ? "Sign in" : "Create account"}
                        <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
                      </span>
                      <span className="w-10 h-10 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                        <ArrowUpRight
                          size={15}
                          className="text-black group-hover:text-white transition-colors"
                        />
                      </span>
                    </button>

                    <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-black/30">
                      {mode === "login" ? "No account?" : "Have one?"}{" "}
                      <button
                        type="button"
                        onClick={() => setMode(mode === "login" ? "signup" : "login")}
                        className="text-[#ff6a00] hover:underline"
                      >
                        {mode === "login" ? "Sign up" : "Login"}
                      </button>
                    </span>
                  </div>
                </form>
              )}

              {/* Divider */}
              {!submitted && (
                <>
                  <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-black/[0.08]" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">Or continue with</span>
                    <div className="flex-1 h-px bg-black/[0.08]" />
                  </div>

                  {/* Social buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-black/[0.12] hover:bg-black hover:text-white transition-all duration-300 text-[13px] font-medium">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                      </svg>
                      Google
                    </button>
                    <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-black/[0.12] hover:bg-black hover:text-white transition-all duration-300 text-[13px] font-medium">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                      Apple
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Note below card */}
            <div className="mt-6 text-center text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">Your data is encrypted end-to-end</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
