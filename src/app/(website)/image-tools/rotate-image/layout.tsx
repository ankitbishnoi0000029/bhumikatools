import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("rotate-image");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
