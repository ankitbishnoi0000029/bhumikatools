import { ToolSeoContent } from "@/components/seo/tool-seo-content";

export default function PdfToolsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <ToolSeoContent />
    </>
  );
}
