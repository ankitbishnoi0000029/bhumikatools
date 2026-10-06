"use client";
import { useState } from 'react';
import ToolShell from '@/components/pdf-tools/tool-shell';
import { addPageNumbers, createBlobFromBytes } from '@/lib/pdf-utils';

export default function PageNumbersPage() {
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'>('bottom-center');

  const positions = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-center', label: 'Bottom Center' },
    { value: 'bottom-right', label: 'Bottom Right' },
  ] as const;

  return (
    <ToolShell
      title="Page Numbers"
      slug="page-numbers"
      category="Organize"
      description="Add page numbers to every page with custom position and format."
      onProcess={async (files) => {
        const bytes = await addPageNumbers(files[0], { position });
        return { blob: createBlobFromBytes(bytes, 'application/pdf'), filename: 'numbered.pdf' };
      }}
    >
      {() => (
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-black/40 mb-4">
            Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            {positions.map((p) => (
              <button
                key={p.value}
                onClick={() => setPosition(p.value)}
                className={`px-3 py-2 rounded-lg text-[11px] font-mono uppercase tracking-[0.1em] transition-colors ${
                  position === p.value ? 'bg-[#ff6a00] text-white' : 'bg-black/[0.04] hover:bg-black/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </ToolShell>
  );
}