"use client";
import { useState } from 'react';
import ToolShell from '@/components/pdf-tools/tool-shell';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createBlobFromBytes, readFileAsArrayBuffer } from '@/lib/pdf-utils';

export default function SignPdfPage() {
  const [sig, setSig] = useState('');
  return (
    <ToolShell
      title="Sign PDF"
      slug="sign"
      category="Edit"
      description="Add your signature to the last page of any PDF document."
      onProcess={async (files) => {
        const bytes = await readFileAsArrayBuffer(files[0]);
        const doc = await PDFDocument.load(bytes);
        const font = await doc.embedFont(StandardFonts.HelveticaOblique);
        const pages = doc.getPages();
        const last = pages[pages.length - 1];
        const { width } = last.getSize();
        last.drawText(sig || 'Signature', {
          x: width - 250,
          y: 100,
          size: 24,
          font,
          color: rgb(0.1, 0.1, 0.5),
        });
        const out = await doc.save();
        return { blob: createBlobFromBytes(out, 'application/pdf'), filename: 'signed.pdf' };
      }}
    >
      {() => (
        <input
          type="text"
          value={sig}
          onChange={(e) => setSig(e.target.value)}
          placeholder="Type your signature"
          className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[15px]"
          style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
        />
      )}
    </ToolShell>
  );
}