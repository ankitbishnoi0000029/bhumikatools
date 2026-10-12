import { ToolSeoContent } from "@/components/seo/tool-seo-content";

export default function ImageToolsLayout({
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
