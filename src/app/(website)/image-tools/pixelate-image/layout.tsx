import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("pixelate-image");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
