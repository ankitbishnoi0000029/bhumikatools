import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("jpg-to-webp");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
