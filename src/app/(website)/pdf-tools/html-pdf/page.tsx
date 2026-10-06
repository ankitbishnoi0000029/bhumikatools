"use client";
import { useState } from 'react';
import ToolShell from '@/components/pdf-tools/tool-shell';
import { createBlobFromBytes, htmlToPDF } from '@/lib/pdf-utils';

export default function HtmlToPdfPage() {
  const [html, setHtml] = useState('<h1>Hello World</h1>\n<p>This is HTML content.</p>');

  return (
    <ToolShell
      title="HTML to PDF"
      slug="html-pdf"
      category="Convert"
      description="Paste HTML and convert to a clean, printable PDF document."
      onProcess={async () => {
        const bytes = await htmlToPDF(html);
        return { blob: createBlobFromBytes(bytes, 'application/pdf'), filename: 'html-to-pdf.pdf' };
      }}
    >
      {() => (
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
            HTML Content
          </label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={6}
            className="w-full bg-[#f4f1ea] rounded-xl p-4 outline-none text-[13px] font-mono border border-black/[0.08] focus:border-[#ff6a00] transition-colors resize-none"
          />
        </div>
      )}
    </ToolShell>
  );
}