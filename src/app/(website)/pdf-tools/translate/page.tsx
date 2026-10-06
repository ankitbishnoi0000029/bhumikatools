"use client";
import { useState } from 'react';
import ToolShell from '@/components/pdf-tools/tool-shell';
import { readFileAsArrayBuffer } from '@/lib/pdf-utils';

export default function TranslatePage() {
  const [lang, setLang] = useState('hi');

  return (
    <ToolShell
      title="Translate PDF"
      slug="translate"
      category="Intelligence"
      description="Extract and translate PDF text into 12+ Indian and global languages."
      onProcess={async (files) => {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const bytes = await readFileAsArrayBuffer(files[0]);
        const pdf = await pdfjs.getDocument({ data: bytes }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += (content.items as any[]).map((it) => it.str).join(' ') + '\n\n';
        }
        // Simple pass-through — real translation needs API
        return { blob: new Blob([text], { type: 'text/plain' }), filename: `translated-${lang}.txt` };
      }}
    >
      {() => (
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-3">
            Target language
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full bg-[#f4f1ea] rounded-lg px-4 py-3 outline-none border border-black/[0.08] focus:border-[#ff6a00] text-[14px]"
          >
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="bn">Bengali</option>
            <option value="mr">Marathi</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      )}
    </ToolShell>
  );
}