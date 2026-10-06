"use client";
import ToolShell from "@/components/pdf-tools/tool-shell";

export default function ComparePage() {
  return (
    <ToolShell
      title="Compare PDF"
      slug="compare"
      category="Intelligence"
      description="Upload two PDFs to visually compare them side-by-side."
      multiple
      onProcess={async (files) => {
        // Placeholder — side-by-side visual comparison UI coming soon
        return { blob: files[0], filename: "comparison.txt" };
      }}
    />
  );
}
