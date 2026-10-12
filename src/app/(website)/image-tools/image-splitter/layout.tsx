import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("image-splitter");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
