import { imageToolMetadata } from "@/lib/image-tool-metadata";

export const metadata = imageToolMetadata("profile-photo-maker");

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
