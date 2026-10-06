"use client";
import { useState } from 'react';
import ToolShell from '@/components/pdf-tools/tool-shell';
import { unlockPDF } from '@/lib/pdf-utils';

export default function UnlockPage() {
  const [pw, setPw] = useState('');
  return (
    <ToolShell
      title="Unlock PDF"
      slug="unlock"
      category="Security"
      description="Remove password protection from your own PDF files."
      onProcess={async (files) => {
        const bytes = await unlockPDF(files[0], pw);
        return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'unlocked.pdf' };
      }}
    >
      {() => (
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Current password"
          className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-3 text-[15px]"
        />
      )}
    </ToolShell>
  );
}