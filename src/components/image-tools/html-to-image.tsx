"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ArrowUpRight,
  Shield,
  Zap,
  Infinity as InfinityIcon,
  Lock,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
  Sparkles,
  Wand2,
  HardDriveDownload,
  Info,
  Layers,
  Cpu,
  Code2,
  FileCheck2,
  HelpCircle,
  ChevronDown,
  Image as ImageIcon,
  Code,
  Eye,
  Palette,
  Layout,
  Smartphone,
  Monitor,
  Sparkle,
  Maximize2,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Converted = {
  url: string;
  size: number;
  name: string;
  width: number;
  height: number;
};

type Stage = "idle" | "loading-lib" | "rendering" | "capturing" | "done";
type Tab = "code" | "preview";
type Format = "png" | "jpg";

const MAX_HTML_CHARS = 100_000;

// ============================================================
// TEMPLATES
// ============================================================
const TEMPLATES: { name: string; icon: string; html: string }[] = [
  {
    name: "Business card",
    icon: "💼",
    html: `<div style="width: 440px; height: 260px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; padding: 36px; font-family: system-ui, -apple-system, sans-serif; color: white; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; box-shadow: 0 24px 60px rgba(102, 126, 234, 0.35);">
  <div>
    <div style="font-size: 11px; opacity: 0.7; letter-spacing: 0.25em; text-transform: uppercase; font-weight: 600;">Product Designer</div>
    <div style="font-size: 30px; font-weight: 700; margin-top: 10px; letter-spacing: -0.02em;">Aarav Sharma</div>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: flex-end;">
    <div style="font-size: 13px; opacity: 0.9; line-height: 1.6;">
      aarav@studio.in<br/>+91 86995-92500
    </div>
    <div style="font-size: 11px; opacity: 0.6; font-family: monospace; letter-spacing: 0.2em;">STUDIO.IN</div>
  </div>
</div>`,
  },
  {
    name: "Quote card",
    icon: "❝",
    html: `<div style="width: 500px; padding: 56px 48px; background: #0a0a0a; font-family: Georgia, 'Times New Roman', serif; color: white; position: relative; overflow: hidden; border-radius: 4px;">
  <div style="position: absolute; top: -120px; right: -120px; width: 340px; height: 340px; background: #ff6a00; border-radius: 50%; filter: blur(90px); opacity: 0.55;"></div>
  <div style="font-size: 80px; color: #ff6a00; line-height: 0.7; font-family: Georgia, serif; position: relative;">&ldquo;</div>
  <div style="font-size: 30px; line-height: 1.4; margin-top: 12px; letter-spacing: -0.01em; position: relative;">The best way to predict the future is to invent it.</div>
  <div style="margin-top: 36px; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.25em; opacity: 0.55; position: relative;">— Alan Kay</div>
</div>`,
  },
  {
    name: "Code snippet",
    icon: "⌘",
    html: `<div style="width: 580px; background: #1e1e2e; border-radius: 14px; overflow: hidden; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 13.5px; box-shadow: 0 20px 50px rgba(0,0,0,0.25);">
  <div style="background: #181825; padding: 14px 18px; display: flex; gap: 8px; align-items: center;">
    <span style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f57;"></span>
    <span style="width: 12px; height: 12px; border-radius: 50%; background: #febc2e;"></span>
    <span style="width: 12px; height: 12px; border-radius: 50%; background: #28c840;"></span>
    <span style="margin-left: auto; font-size: 11px; color: #6c7086; letter-spacing: 0.1em;">greet.ts</span>
  </div>
  <pre style="padding: 24px; margin: 0; color: #cdd6f4; line-height: 1.7;"><span style="color: #cba6f7;">const</span> <span style="color: #89b4fa;">greet</span> = (name: <span style="color: #f9e2af;">string</span>) => {
  <span style="color: #cba6f7;">return</span> <span style="color: #a6e3a1;">\`Hello, \${name}!\`</span>;
};

<span style="color: #6c7086;">// → greet("World")</span>
<span style="color: #6c7086;">// "Hello, World!"</span></pre>
</div>`,
  },
  {
    name: "Social post",
    icon: "◆",
    html: `<div style="width: 540px; height: 540px; background: #f4f1ea; padding: 56px; font-family: Georgia, serif; color: #0a0a0a; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; border: 1px solid rgba(0,0,0,0.08);">
  <div style="font-family: monospace; font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; opacity: 0.5;">Notes · 001</div>
  <div style="font-size: 44px; line-height: 1.15; letter-spacing: -0.02em;">Ship small.<br/><em style="color: #ff6a00;">Ship often.</em><br/>Learn fast.</div>
  <div style="font-family: monospace; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.4;">— 2026</div>
</div>`,
  },
  {
    name: "Gradient hero",
    icon: "◐",
    html: `<div style="width: 640px; height: 360px; background: radial-gradient(circle at 30% 20%, #ff8c40 0%, transparent 50%), radial-gradient(circle at 70% 80%, #667eea 0%, transparent 50%), #0a0a0a; border-radius: 24px; display: flex; align-items: center; justify-content: center; font-family: Georgia, serif; color: white; box-sizing: border-box;">
  <div style="text-align: center;">
    <div style="font-size: 64px; letter-spacing: -0.03em; line-height: 1;">Make it <em style="color: #ff6a00;">real</em>.</div>
    <div style="margin-top: 20px; font-family: monospace; font-size: 12px; letter-spacing: 0.3em; opacity: 0.6; text-transform: uppercase;">Design · Build · Ship</div>
  </div>
</div>`,
  },
  {
    name: "Blank",
    icon: "▢",
    html: `<div style="width: 400px; padding: 40px; background: white; font-family: system-ui, sans-serif; color: #0a0a0a; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1);">
  <h1 style="margin: 0 0 12px; font-size: 28px; letter-spacing: -0.02em;">Hello, world.</h1>
  <p style="margin: 0; color: #666; line-height: 1.6;">Edit the HTML on the left. Your changes appear here instantly.</p>
</div>`,
  },
];

// ============================================================
// HELPERS
// ============================================================
const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const buildSrcDoc = (userHtml: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    box-sizing: border-box;
    background:
      linear-gradient(45deg, #e5e0d5 25%, transparent 25%),
      linear-gradient(-45deg, #e5e0d5 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #e5e0d5 75%),
      linear-gradient(-45deg, transparent 75%, #e5e0d5 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    background-color: #f4f1ea;
    font-family: system-ui, -apple-system, sans-serif;
  }
  #capture-root { display: inline-block; }
</style>
</head>
<body>
<div id="capture-root">${userHtml}</div>
</body>
</html>`;

// ============================================================
// VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ============================================================
// COMPONENT
// ============================================================
export const HtmlToImage = () => {
  const [html, setHtml] = useState<string>(TEMPLATES[0].html);
  const [format, setFormat] = useState<Format>("png");
  const [scale, setScale] = useState<number>(2);
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [tab, setTab] = useState<Tab>("code");
  const [converted, setConverted] = useState<Converted | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const convertedUrlRef = useRef<string | null>(null);

  // Debounced preview HTML — avoids re-rendering iframe on every keystroke
  const [previewHtml, setPreviewHtml] = useState(html);
  useEffect(() => {
    const t = setTimeout(() => setPreviewHtml(html), 300);
    return () => clearTimeout(t);
  }, [html]);

  const srcDoc = useMemo(() => buildSrcDoc(previewHtml), [previewHtml]);

  useEffect(() => {
    return () => {
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current);
    };
  }, []);

  const reset = () => {
    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    setConverted(null);
    setError(null);
    setStage("idle");
  };

  const convert = useCallback(async () => {
    if (!html.trim()) {
      setError("Please paste some HTML first.");
      return;
    }
    if (html.length > MAX_HTML_CHARS) {
      setError(`HTML is too large. Maximum is ${MAX_HTML_CHARS.toLocaleString()} characters.`);
      return;
    }

    setError(null);
    setConverted(null);
    if (convertedUrlRef.current) {
      URL.revokeObjectURL(convertedUrlRef.current);
      convertedUrlRef.current = null;
    }
    setStage("loading-lib");

    try {
      // 1) Lazily load html-to-image (only when user clicks Convert)
      const { toPng, toJpeg } = await import("html-to-image");

      // 2) Make sure the iframe has rendered the latest HTML
      setStage("rendering");
      const iframe = iframeRef.current;
      if (!iframe) throw new Error("Preview not ready. Try again.");

      // Force iframe to reflect the current source even if debounce hasn't fired
      if (iframe.srcdoc !== srcDoc) {
        iframe.srcdoc = srcDoc;
      }

      // Wait for iframe load + fonts
      await new Promise<void>((resolve) => {
        const check = () => {
          const doc = iframe.contentDocument;
          if (doc && doc.readyState === "complete" && doc.getElementById("capture-root")) {
            resolve();
          } else {
            setTimeout(check, 30);
          }
        };
        check();
      });

      // Give the browser a frame to lay out
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const doc = iframe.contentDocument;
      if (!doc) throw new Error("Lost access to the preview.");

      const captureRoot = doc.getElementById("capture-root");
      if (!captureRoot) throw new Error("Preview container not found.");

      const node = (captureRoot.firstElementChild as HTMLElement) || captureRoot;

      // 3) Snapshot the DOM → SVG foreignObject → canvas → PNG/JPG
      setStage("capturing");
      const captureFn = format === "png" ? toPng : toJpeg;
      const dataUrl = await captureFn(node, {
        quality: 0.95,
        pixelRatio: scale,
        backgroundColor: bgColor,
        cacheBust: true,
        skipFonts: false,
      });

      // 4) Convert the data URL into a Blob for a proper download size
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const rect = node.getBoundingClientRect();
      const outW = Math.round(rect.width * scale);
      const outH = Math.round(rect.height * scale);

      const url = URL.createObjectURL(blob);
      convertedUrlRef.current = url;

      const baseName = "render";
      setConverted({
        url,
        size: blob.size,
        name: `${baseName}-${outW}x${outH}.${format}`,
        width: outW,
        height: outH,
      });
      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(
        msg.includes("tainted") || msg.includes("SecurityError")
          ? "This HTML contains cross-origin assets (images, fonts) that block the canvas. Try embedding them as data URLs or removing external URLs."
          : msg
      );
      setStage("idle");
    }
  }, [html, format, scale, bgColor, srcDoc]);

  const busy =
    stage === "loading-lib" || stage === "rendering" || stage === "capturing";

  const stageLabel: Record<Stage, string> = {
    idle: "",
    "loading-lib": "Loading renderer…",
    rendering: "Rendering HTML…",
    capturing: "Capturing pixels…",
    done: "",
  };

  const stageStep: Record<Stage, string> = {
    idle: "",
    "loading-lib": "step 1 of 3",
    rendering: "step 2 of 3",
    capturing: "step 3 of 3",
    done: "",
  };

  const progressWidth =
    stage === "loading-lib"
      ? "25%"
      : stage === "rendering"
      ? "60%"
      : stage === "capturing"
      ? "90%"
      : "0%";

  const charCount = html.length;
  const charOverLimit = charCount > MAX_HTML_CHARS;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen bg-[#f4f1ea] text-[#0a0a0a] overflow-hidden">

      {/* vertical rules */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      <div className="relative container mx-auto px-6 md:px-8 max-w-[1400px] py-12 md:py-16">

        {/* ===================== BREADCRUMB ===================== */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-black/40 mb-10"
        >
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <span className="text-black/25">/</span>
          <Link href="/image-tools" className="hover:text-black transition-colors">Image Tools</Link>
          <span className="text-black/25">/</span>
          <span className="text-black/70">HTML to Image</span>
        </motion.nav>

        {/* ===================== HEADER ===================== */}
        <motion.header
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end mb-12 pb-8 border-b border-black/[0.12]"
        >
          <div className="lg:col-span-7">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white/60 backdrop-blur-md mb-6"
            >
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]"
              />
              <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">
                Paste HTML · Render · Download PNG
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              HTML in.
              <br />
              <span className="italic text-[#ff6a00]">Pixels</span> out.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Paste any HTML + CSS snippet, watch it render in a sandboxed preview,
              and download it as a crisp PNG or JPG. Perfect for quote cards, code
              snippets, social posts, and documentation screenshots — <strong className="text-black/80 font-medium">
              right in your browser</strong>.
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3">
            <TrustBadge icon={<Zap size={12} />} label="Instant" />
            <TrustBadge icon={<Shield size={12} />} label="Sandboxed" />
            <TrustBadge icon={<InfinityIcon size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* ===================== SANDBOX NOTE ===================== */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-14 flex items-start gap-4 p-5 rounded-2xl bg-[#ff6a00]/[0.05] border border-[#ff6a00]/15"
        >
          <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/15 flex items-center justify-center shrink-0">
            <Info size={16} className="text-[#ff6a00]" />
          </div>
          <div className="text-[13px] leading-relaxed text-black/70">
            <strong className="text-black font-medium">Sandboxed for your safety.</strong>{" "}
            Your HTML renders inside an isolated iframe with <em>scripts disabled</em> — so
            pasted code can't run JavaScript or touch this page. HTML and CSS render fully;
            only <code className="font-mono text-[11.5px] bg-black/[0.05] px-1 py-0.5 rounded">&lt;script&gt;</code> tags
            are inert. External images and fonts will load but must be CORS-friendly to be captured.
          </div>
        </motion.div>

        {/* ===================== 3-STEP EXPLAINER ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              How this tool works
            </span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ExplainerCard
              n="01"
              icon={<Code size={18} />}
              title="Paste your HTML"
              desc="Any snippet with inline styles or a <style> tag. Pick from a preset template or write your own from scratch."
            />
            <ExplainerCard
              n="02"
              icon={<Wand2 size={18} />}
              title="Browser renders it"
              desc="Your HTML loads in a sandboxed iframe — the same rendering engine that powers your normal web browsing."
            />
            <ExplainerCard
              n="03"
              icon={<HardDriveDownload size={18} />}
              title="Download the image"
              desc="We snapshot the DOM into SVG, draw it to canvas, and export a crisp PNG or JPG at up to 3× resolution."
            />
          </div>
        </motion.section>

        {/* ===================== WORKSPACE ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ---------- LEFT: Editor / Preview ---------- */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="lg:col-span-7"
          >
            <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden flex flex-col">

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-black/[0.06] bg-black/[0.012]">
                <div className="flex items-center gap-1">
                  <TabButton
                    active={tab === "code"}
                    onClick={() => setTab("code")}
                    icon={<Code size={13} />}
                    label="HTML"
                  />
                  <TabButton
                    active={tab === "preview"}
                    onClick={() => setTab("preview")}
                    icon={<Eye size={13} />}
                    label="Preview"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-black/35 hidden sm:inline">
                    {charCount.toLocaleString()} chars
                  </span>
                  <button
                    onClick={() => {
                      setHtml("");
                      reset();
                    }}
                    className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center transition-colors text-black/50 hover:text-black"
                    title="Clear"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>

              {/* Editor / Preview area */}
              <div className="relative flex-1 min-h-[520px] bg-[#fafaf6]">
                <AnimatePresence mode="wait">
                  {tab === "code" && (
                    <motion.div
                      key="code"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0"
                    >
                      <textarea
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                        spellCheck={false}
                        placeholder="Paste your HTML here…"
                        className="w-full h-full p-5 font-mono text-[12.5px] leading-[1.65] bg-transparent border-0 outline-none resize-none text-black/85 placeholder:text-black/25"
                        style={{
                          fontFamily:
                            "ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace",
                        }}
                      />
                    </motion.div>
                  )}

                  {tab === "preview" && (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0"
                    >
                      <iframe
                        ref={iframeRef}
                        srcDoc={srcDoc}
                        sandbox="allow-same-origin"
                        className="w-full h-full border-0 bg-[#f4f1ea]"
                        title="HTML preview"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Template presets */}
              <div className="border-t border-black/[0.06] px-5 py-4 bg-black/[0.012]">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkle size={12} className="text-[#ff6a00]" />
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-black/45">
                    Start from a template
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t) => (
                    <motion.button
                      key={t.name}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setHtml(t.html);
                        setTab("preview");
                        reset();
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-black/[0.08] text-[12px] text-black/70 hover:border-black/25 hover:text-black transition-colors"
                    >
                      <span className="text-[13px] leading-none">{t.icon}</span>
                      {t.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ---------- RIGHT: Settings + Result ---------- */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="lg:col-span-5 space-y-6"
          >

            {/* Settings */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  Output settings
                </span>
              </div>

              {/* Format */}
              <div className="mb-7">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Format
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormatButton
                    active={format === "png"}
                    onClick={() => setFormat("png")}
                    title="PNG"
                    subtitle="Lossless · transparent"
                    icon={<Layers size={14} />}
                  />
                  <FormatButton
                    active={format === "jpg"}
                    onClick={() => setFormat("jpg")}
                    title="JPG"
                    subtitle="Smaller · no alpha"
                    icon={<ImageIcon size={14} />}
                  />
                </div>
              </div>

              {/* Scale */}
              <div className="mb-7">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                    Resolution
                  </div>
                  <div className="text-[11px] font-mono text-black/60">
                    {scale}× scale
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((s) => (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setScale(s)}
                      className={`py-2.5 rounded-xl text-[13px] font-medium border transition-colors ${
                        scale === s
                          ? "bg-black text-white border-black"
                          : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
                      }`}
                    >
                      {s}×
                    </motion.button>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">
                  2× gives you a retina-ready export. 3× is best for print or high-DPI displays.
                </p>
              </div>

              {/* Background */}
              <div className="mb-7">
                <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                  Background
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <span
                      className="absolute inset-0"
                      style={{ background: bgColor }}
                    />
                  </label>
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                    placeholder="#ffffff"
                  />
                </div>
                {format === "png" && (
                  <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">
                    PNG supports transparency — try <code className="font-mono bg-black/[0.05] px-1 rounded">transparent</code> as the color value
                    if you want no background.
                  </p>
                )}
              </div>

              {/* Convert button */}
              <motion.button
                whileHover={{ scale: busy ? 1 : 1.02 }}
                whileTap={{ scale: busy ? 1 : 0.97 }}
                onClick={convert}
                disabled={busy || !html.trim() || charOverLimit}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    {stageLabel[stage]}
                  </>
                ) : (
                  <>
                    <ImageIcon size={15} />
                    Convert to {format.toUpperCase()}
                  </>
                )}
              </motion.button>

              {/* Progress bar */}
              <AnimatePresence>
                {busy && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className="h-1 rounded-full bg-black/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: progressWidth }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#ff6a00] to-[#ff8c40]"
                      />
                    </div>
                    <div className="mt-2 text-[10.5px] font-mono uppercase tracking-[0.16em] text-black/35 text-center">
                      {stageStep[stage]}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-red-500/[0.06] border border-red-500/15">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[12.5px] text-red-700/90 leading-relaxed">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Result */}
            <AnimatePresence>
              {converted && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[22px] bg-[#0b0b0c] text-white border border-black/10 p-6 md:p-7 overflow-hidden relative"
                >
                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute -top-20 -right-16 w-[260px] h-[260px] rounded-full bg-[#ff6a00]/20 blur-[80px]"
                  />

                  <div className="relative">
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-md mb-5"
                    >
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles size={11} className="text-[#ff6a00]" />
                      </motion.span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">
                        {format.toUpperCase()} ready
                      </span>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-[22px] leading-tight mb-1 break-all"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {converted.name}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.28 }}
                      className="text-[13px] text-white/50 mb-6"
                    >
                      {converted.width} × {converted.height} px · {formatBytes(converted.size)}
                    </motion.p>

                    <motion.a
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.34 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      href={converted.url}
                      download={converted.name}
                      className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[13.5px] font-medium hover:bg-[#ff6a00] hover:text-white transition-colors"
                    >
                      <Download size={15} />
                      Download {format.toUpperCase()}
                      <ArrowUpRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </motion.a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* What this tool does */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-black/[0.06]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                  What this tool does
                </span>
              </div>

              <ul className="space-y-3 text-[13px] leading-relaxed text-black/70">
                <FeatureRow>
                  <strong className="text-black">Input: any HTML + CSS.</strong> Inline styles or a
                  &lt;style&gt; tag — it renders exactly like a real browser tab.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Output: PNG or JPG.</strong> PNG for lossless and
                  transparency, JPG for smaller files.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Up to 3× resolution.</strong> Retina-ready exports
                  without pixelation.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">Sandboxed rendering.</strong> Scripts are disabled
                  for safety — HTML and CSS only.
                </FeatureRow>
                <FeatureRow>
                  <strong className="text-black">100% client-side.</strong> Your HTML never touches
                  a server.
                </FeatureRow>
              </ul>
            </motion.div>

            {/* Privacy */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">Your HTML never leaves your device</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Rendering, SVG serialization, and canvas capture all happen inside your browser.
                Open DevTools → Network and you'll see zero requests for the HTML you pasted.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* ===================== DEEP DIVE ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              Deep dive
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-4 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            How does a browser turn HTML into a picture?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] leading-[1.75] text-black/60 max-w-3xl mb-12">
            Browsers can't natively export DOM to an image — that's a limitation, not a feature.
            We work around it with an old trick called SVG foreignObject. Here's the full path.
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <DeepDiveCard
              className="lg:col-span-4"
              n="01"
              icon={<Cpu size={18} />}
              title="Render in a sandboxed iframe"
              body="Your HTML is injected into an iframe with sandbox='allow-same-origin'. The browser lays out and paints it exactly as it would any web page — CSS, flexbox, gradients, shadows, all of it."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="02"
              icon={<Code2 size={18} />}
              title="Serialize to SVG"
              body="The DOM node is cloned, all computed styles are inlined as attributes, and the whole tree is wrapped inside an <svg><foreignObject>. This SVG contains a perfect vector description of your HTML."
            />
            <DeepDiveCard
              className="lg:col-span-4"
              n="03"
              icon={<FileCheck2 size={18} />}
              title="Draw to canvas"
              body="The SVG is loaded as an image, drawn onto an HTML5 canvas at your chosen scale, then exported via canvas.toBlob() as PNG (lossless) or JPG (quality 95%)."
            />
          </div>

          <motion.div variants={fadeUp} className="mt-10 p-6 rounded-[20px] bg-white border border-black/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center shrink-0">
                <Info size={16} className="text-[#ff6a00]" />
              </div>
              <div className="text-[13px] leading-relaxed text-black/65">
                <strong className="text-black">Known limits of the SVG foreignObject trick:</strong>{" "}
                external images and fonts must be CORS-enabled, otherwise the canvas becomes
                "tainted" and the export fails. If you hit that error, embed assets as data URLs
                or use system fonts. Same-origin and data-URL assets always work.
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* ===================== WHEN TO USE ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              When to use this
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            You'll want this when…
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCaseCard
              icon={<Sparkle size={18} />}
              title="You need a quote or social card fast"
              desc="Skip Figma. Paste HTML, pick a template, hit convert. Perfect for Twitter/X, Instagram, LinkedIn, or blog headers."
            />
            <UseCaseCard
              icon={<Code2 size={18} />}
              title="You want a shareable code screenshot"
              desc="Instead of blurry phone photos of a monitor, paste real HTML with syntax highlighting and export a crisp code card."
            />
            <UseCaseCard
              icon={<Layout size={18} />}
              title="You're writing docs or a README"
              desc="Embed rendered HTML as a static image in docs where raw HTML isn't allowed (GitHub READMEs, Notion previews, email newsletters)."
            />
            <UseCaseCard
              icon={<Monitor size={18} />}
              title="You need a UI mockup thumbnail"
              desc="Build a quick HTML mock of a card, button, or widget and export it as a portfolio thumbnail or design review asset."
            />
            <UseCaseCard
              icon={<Smartphone size={18} />}
              title="You're shipping social previews"
              desc="Generate Open Graph cards (og:image) from templates — same HTML in, deterministic pixels out, every time."
            />
            <UseCaseCard
              icon={<Palette size={18} />}
              title="You need a design token sheet"
              desc="Lay out a color palette or type scale in HTML with CSS variables, then export it as a static image for the design system docs."
            />
          </div>
        </motion.section>

        {/* ===================== FAQ ===================== */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              Common questions
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Frequently asked
          </motion.h2>

          <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden divide-y divide-black/[0.06]">
            {FAQS.map((item, i) => (
              <FaqRow
                key={i}
                q={item.q}
                a={item.a}
                open={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

// ============================================================
// DATA
// ============================================================
const FAQS = [
  {
    q: "Will JavaScript inside my HTML run?",
    a: "No. The preview iframe uses sandbox='allow-same-origin' without 'allow-scripts', so any <script> tags are ignored. This is deliberate: it prevents pasted code from accessing your browser data or this page. HTML and CSS render fully.",
  },
  {
    q: "Why do my external images or Google Fonts not show up?",
    a: "The capture step (canvas) is blocked from reading cross-origin content unless the source sends proper CORS headers. If an image or font doesn't include those headers, the canvas becomes 'tainted' and export fails. Fix: embed the asset as a data URL, or use system fonts.",
  },
  {
    q: "What does the '×' scale option actually do?",
    a: "It multiplies the output resolution. A 400×260 element exported at 2× becomes an 800×520 PNG. The layout is identical — just more pixels. 2× is what you want for retina screens; 3× is for print.",
  },
  {
    q: "Can I export with a transparent background?",
    a: "Yes — choose PNG and set the background color to 'transparent' (type it in the color text field). The output PNG will have an alpha channel. JPG doesn't support transparency, so this only works with PNG.",
  },
  {
    q: "Does the tool support <canvas>, SVG, or WebGL content?",
    a: "Inline SVG works perfectly. <canvas> elements export as blank because the tool snapshots the DOM, not the rendered bitmap. WebGL is unsupported for the same reason — use the source element only.",
  },
  {
    q: "How large can my HTML be?",
    a: `Up to ${MAX_HTML_CHARS.toLocaleString()} characters. Beyond that, the DOM serialization can get slow. If you're building something large, consider splitting into multiple exports.`,
  },
  {
    q: "Does anything get uploaded?",
    a: "No. Your HTML is injected into a client-side iframe, snapshotted locally, and converted to an image with the HTML5 Canvas API. Open DevTools → Network — you'll see zero requests for your content.",
  },
  {
    q: "Which library does the conversion?",
    a: "html-to-image — a small, modern library that uses the SVG foreignObject approach. It's loaded lazily, only when you click Convert, so the page stays fast.",
  },
];

// ============================================================
// SUB COMPONENTS
// ============================================================
function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.span
      variants={fadeUp}
      className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/55"
    >
      <motion.span
        whileHover={{ scale: 1.15, rotate: 8 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-5 h-5 rounded-full bg-black/[0.05] flex items-center justify-center text-black/70"
      >
        {icon}
      </motion.span>
      {label}
    </motion.span>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
        active
          ? "bg-black text-white"
          : "text-black/55 hover:text-black hover:bg-black/[0.04]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FormatButton({
  active,
  onClick,
  title,
  subtitle,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`text-left p-3.5 rounded-xl border transition-colors ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            active ? "bg-white/10" : "bg-black/[0.05]"
          }`}
        >
          {icon}
        </span>
        <span className="text-[13px] font-medium">{title}</span>
        {active && <Check size={12} className="ml-auto text-[#ff6a00]" />}
      </div>
      <div className={`text-[10.5px] ${active ? "text-white/50" : "text-black/40"}`}>
        {subtitle}
      </div>
    </motion.button>
  );
}

function ExplainerCard({
  n,
  icon,
  title,
  desc,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, borderColor: "rgba(0,0,0,0.2)" }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="flex items-start justify-between mb-5">
        <motion.div
          whileHover={{ scale: 1.08, rotate: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center text-black/70"
        >
          {icon}
        </motion.div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
          {n}
        </span>
      </div>
      <h4
        className="text-[16px] font-medium text-black mb-2 leading-tight"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {title}
      </h4>
      <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
    </motion.div>
  );
}

function DeepDiveCard({
  n,
  icon,
  title,
  body,
  className = "",
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={`relative p-6 rounded-[20px] bg-white border border-black/[0.06] ${className}`}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#f4f1ea] flex items-center justify-center text-black/70">
          {icon}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-black/30">
          {n}
        </span>
      </div>
      <h4
        className="text-[17px] font-medium text-black mb-2 leading-tight"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {title}
      </h4>
      <p className="text-[13px] leading-relaxed text-black/60">{body}</p>
    </motion.div>
  );
}

function UseCaseCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-start gap-4 p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center text-[#ff6a00] shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-[15px] font-medium text-black mb-1.5 leading-tight">
          {title}
        </h4>
        <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
      </div>
    </motion.div>
  );
}

function FaqRow({
  q,
  a,
  open,
  onClick,
}: {
  q: string;
  a: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-6 p-6 text-left hover:bg-black/[0.015] transition-colors"
      >
        <span className="text-[14.5px] font-medium text-black flex items-start gap-3">
          <HelpCircle size={16} className="text-[#ff6a00] shrink-0 mt-0.5" />
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown size={16} className="text-black/40" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pl-[58px] text-[13px] leading-relaxed text-black/60">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex items-start gap-3"
    >
      <motion.span
        whileHover={{ scale: 1.15, rotate: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-4 h-4 rounded-full bg-[#ff6a00]/10 flex items-center justify-center shrink-0 mt-1"
      >
        <Check size={10} className="text-[#ff6a00]" strokeWidth={2.5} />
      </motion.span>
      <span>{children}</span>
    </motion.li>
  );
}