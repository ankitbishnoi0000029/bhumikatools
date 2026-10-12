import type { Metadata } from "next";
import { BGRemover } from "@/components/image-tools/bg-remove"

export const metadata: Metadata = {
  title: "Remove Image Background Online Free",
  description:
    "Remove the background from an image with the idcardtools online background remover. Add an image, review the result, and download it when ready.",
  alternates: {
    canonical: "https://idcardtools.com/image-tools/bg-remove",
  },
};

const page = () => {
  return (
    <BGRemover />
  )
}

export default page