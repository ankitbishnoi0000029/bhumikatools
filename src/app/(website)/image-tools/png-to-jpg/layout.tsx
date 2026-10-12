import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("png-to-jpg");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
