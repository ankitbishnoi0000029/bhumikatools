import type { Metadata } from "next";

const SITE_URL = "https://idcardtools.com";

export const imageToolDetails = {
  "bg-remove": ["Background Remover", "remove a background from a photo"],
  "collage-maker": ["Collage Maker", "combine photos into a collage"],
  "colorize-photo": ["Colorize Photo", "add color to a black-and-white photo"],
  "combine-images": ["Combine Images", "combine multiple images into one composition"],
  "compress-image": ["Compress Image", "reduce the file size of an image"],
  "convert-from-jpg": ["Convert from JPG", "convert a JPG image to another format"],
  "convert-to-jpg": ["Convert to JPG", "convert an image into JPG format"],
  "crop-image": ["Crop Image", "crop an image to the framing you need"],
  "heic-to-jpg": ["HEIC to JPG", "convert HEIC photos into JPG images"],
  "heic-to-png": ["HEIC to PNG", "convert HEIC photos into PNG images"],
  "html-to-image": ["HTML to Image", "render HTML content as an image"],
  "image-splitter": ["Image Splitter", "divide an image into smaller sections"],
  "jpg-to-gif": ["JPG to GIF", "convert JPG images into GIF format"],
  "jpg-to-png": ["JPG to PNG", "convert JPG images into PNG format"],
  "jpg-to-svg": ["JPG to SVG", "trace a JPG image into an SVG graphic"],
  "jpg-to-webp": ["JPG to WebP", "convert JPG images into WebP format"],
  "make-round-image": ["Make Round Image", "crop an image into a circular shape"],
  "photo-editor": ["Photo Editor", "edit an image using the available options"],
  "pixelate-image": ["Pixelate Image", "pixelate selected areas of an image"],
  "png-to-jpg": ["PNG to JPG", "convert PNG images into JPG format"],
  "png-to-svg": ["PNG to SVG", "trace a PNG image into an SVG graphic"],
  "png-to-webp": ["PNG to WebP", "convert PNG images into WebP format"],
  "profile-photo-maker": ["Profile Photo Maker", "prepare an image for a profile photo"],
  "resize-image": ["Resize Image", "resize an image to selected dimensions"],
  "rotate-image": ["Rotate Image", "rotate an image to the correct orientation"],
  "svg-to-png": ["SVG to PNG", "convert SVG graphics into PNG images"],
  "upscale-image": ["Upscale Image", "increase image dimensions with the available tool"],
  "watermark-image": ["Watermark Image", "add a watermark to an image"],
  "webp-to-jpg": ["WebP to JPG", "convert WebP images into JPG format"],
  "webp-to-png": ["WebP to PNG", "convert WebP images into PNG format"],
} as const;

export type ImageToolSlug = keyof typeof imageToolDetails;

export const imageToolSlugs = Object.keys(imageToolDetails) as ImageToolSlug[];

export function imageToolMetadata(slug: ImageToolSlug): Metadata {
  const [name, action] = imageToolDetails[slug];
  const canonical = `${SITE_URL}/image-tools/${slug}`;
  const description = `Use the free online ${name} to ${action}. Add a supported image, check the result, and download it for your project. Open the tool to get started; no signup is required.`;

  return {
    title: `${name} Online — Free Image Tool`,
    description,
    keywords: [`${name.toLowerCase()} online`, "free image tool", "image tools"],
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${name} Online — Free Image Tool`,
      description,
      siteName: "idcardtools",
      images: [
        {
          url: "/aitools.png",
          width: 1200,
          height: 630,
          alt: `${name} online with idcardtools`,
        },
      ],
    },
  };
}
