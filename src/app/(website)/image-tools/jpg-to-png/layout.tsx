import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("jpg-to-png");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
