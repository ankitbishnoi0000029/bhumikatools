import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("heic-to-png");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
