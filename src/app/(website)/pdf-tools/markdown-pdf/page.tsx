"use client";
import { useState } from 'react';
import ToolShell from '@/components/pdf-tools/tool-shell';
import { createBlobFromBytes, markdownToPDF } from '@/lib/pdf-utils';

export default function MarkdownToPdfPage() {
  const [md, setMd] = useState('# Hello\n\nThis is **markdown** content.');

  return (
    <ToolShell
      title="Markdown to PDF"
      slug="markdown-pdf"
      category="Convert"
      description="Convert Markdown into a beautifully formatted PDF."
      onProcess={async () => {
        const bytes = await markdownToPDF(md);
        return { blob: createBlobFromBytes(bytes, 'application/pdf'), filename: 'markdown.pdf' };
      }}
    >
      {() => (
        <textarea
          value={md}
          onChange={(e) => setMd(e.target.value)}
          rows={8}
          className="w-full bg-[#f4f1ea] rounded-xl p-4 outline-none text-[13px] font-mono border border-black/[0.08] focus:border-[#ff6a00] transition-colors resize-none"
        />
      )}
    </ToolShell>
  );
}