"use client";
import { useState } from 'react';
import ToolShell from '@/components/pdf-tools/tool-shell';
import { redactArea } from '@/lib/pdf-utils';

export default function RedactPage() {
  const [page, setPage] = useState(1);
  const [x, setX] = useState(100);
  const [y, setY] = useState(100);
  const [w, setW] = useState(200);
  const [h, setH] = useState(50);

  return (
    <ToolShell
      title="Redact PDF"
      slug="redact"
      category="Security"
      description="Permanently black out sensitive regions on any page."
      onProcess={async (files) => {
        const bytes = await redactArea(files[0], [{ page, x, y, width: w, height: h }]);
        return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'redacted.pdf' };
      }}
    >
      {() => (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Page', val: page, set: setPage },
            { label: 'X', val: x, set: setX },
            { label: 'Y', val: y, set: setY },
            { label: 'Width', val: w, set: setW },
            { label: 'Height', val: h, set: setH },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                {field.label}
              </label>
              <input
                type="number"
                value={field.val}
                onChange={(e) => field.set(parseInt(e.target.value) || 0)}
                className="w-full bg-transparent border-b border-black/20 focus:border-[#ff6a00] outline-none py-2 text-[14px]"
              />
            </div>
          ))}
        </div>
      )}
    </ToolShell>
  );
}