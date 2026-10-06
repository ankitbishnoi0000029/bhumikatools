import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="relative bg-[#f4f1ea] text-[#0a0a0a] pt-40 pb-24 min-h-screen overflow-hidden">
      <div className="container mx-auto px-8 relative max-w-[1400px]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-black/40 mb-6">
            404 — Page Not Found
          </div>
          <h1
            className="text-[80px] md:text-[120px] lg:text-[160px] leading-[0.9] tracking-[-0.03em] text-black mb-6"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Lost?
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.7] text-black/60 max-w-lg mx-auto mb-12 font-light">
            The page you&apos;re looking for doesn&apos;t exist. But our tools are still here —
            ready to help with your documents.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="relative text-[15px] font-medium text-black pb-1">
                Back to home
                <span className="absolute left-0 right-0 bottom-0 h-px bg-black group-hover:bg-[#ff6a00] transition-colors" />
              </span>
              <span className="w-9 h-9 rounded-full border border-black/20 group-hover:border-[#ff6a00] group-hover:bg-[#ff6a00] flex items-center justify-center transition-all duration-300">
                <ArrowUpRight size={15} className="text-black group-hover:text-white transition-colors" />
              </span>
            </Link>
            <Link href="/pdf-tools" className="text-[15px] text-black/50 hover:text-black transition-colors">
              Browse tools →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}