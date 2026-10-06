"use client";

import dynamic from "next/dynamic";

const PDFReader = dynamic(() => import("@/components/pdf-tools/pdf-read"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-black/50">
      Loading PDF reader…
    </div>
  ),
});

export default function PDFReaderClient() {
  return <PDFReader />;
}
