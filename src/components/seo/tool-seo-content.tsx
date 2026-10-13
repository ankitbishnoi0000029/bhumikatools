"use client";

import { usePathname } from "next/navigation";

const SITE_URL = "https://idcardtools.com";

const toolDetails: Record<string, { name: string; description: string }> = {
  compare: { name: "Compare PDF", description: "compare two PDF documents and review their differences" },
  compress: { name: "Compress PDF", description: "reduce the file size of a PDF document" },
  edit: { name: "Edit PDF", description: "add or adjust content in a PDF document" },
  "excel-to-pdf": { name: "Excel to PDF", description: "convert an Excel spreadsheet into a PDF document" },
  forms: { name: "PDF Forms", description: "work with interactive PDF forms" },
  "html-pdf": { name: "HTML to PDF", description: "convert HTML content into a PDF document" },
  "jpg-pdf": { name: "JPG to PDF", description: "convert JPG images into a PDF document" },
  "markdown-pdf": { name: "Markdown to PDF", description: "convert Markdown content into a PDF document" },
  merge: { name: "Merge PDF", description: "combine multiple PDF files into one document" },
  ocr: { name: "OCR PDF", description: "recognize text in scanned PDF pages" },
  organize: { name: "Organize PDF", description: "reorder, rotate, or remove pages in a PDF" },
  "page-numbers": { name: "Add Page Numbers to PDF", description: "add page numbers to a PDF document" },
  "pdf-jpg": { name: "PDF to JPG", description: "convert PDF pages into JPG images" },
  "pdf-md": { name: "PDF to Markdown", description: "extract PDF content into Markdown text" },
  "pdf-read": { name: "Read PDF", description: "open and read a PDF document in your browser" },
  "pdf-to-excel": { name: "PDF to Excel", description: "convert supported PDF tables into an Excel spreadsheet" },
  "pdf-to-powerpoint": { name: "PDF to PowerPoint", description: "convert PDF pages into a PowerPoint presentation" },
  "pdf-word": { name: "PDF to Word", description: "convert a PDF document into an editable Word file" },
  "ppt-pdf": { name: "PowerPoint to PDF", description: "convert a PowerPoint presentation into a PDF" },
  protect: { name: "Protect PDF", description: "set password protection on a PDF document" },
  redact: { name: "Redact PDF", description: "remove selected sensitive content from a PDF" },
  repair: { name: "Repair PDF", description: "attempt to recover a damaged PDF document" },
  rotate: { name: "Rotate PDF", description: "rotate PDF pages to the correct orientation" },
  scan: { name: "Scan to PDF", description: "capture document pages and save them as a PDF" },
  sign: { name: "Sign PDF", description: "place a signature on a PDF document" },
  split: { name: "Split PDF", description: "separate pages or page ranges from a PDF" },
  translate: { name: "Translate PDF", description: "translate supported PDF text into another language" },
  unlock: { name: "Unlock PDF", description: "remove password protection from a PDF you are authorized to access" },
  watermark: { name: "Watermark PDF", description: "add a text or image watermark to a PDF" },
  "word-pdf": { name: "Word to PDF", description: "convert a Word document into a PDF" },
  "bg-remove": { name: "Background Remover", description: "remove the background from an image" },
  "collage-maker": { name: "Collage Maker", description: "combine photos into a collage" },
  "colorize-photo": { name: "Colorize Photo", description: "add color to a black-and-white photo" },
  "combine-images": { name: "Combine Images", description: "combine multiple images into one composition" },
  "compress-image": { name: "Compress Image", description: "reduce an image file size" },
  "convert-from-jpg": { name: "Convert from JPG", description: "convert a JPG image to another supported format" },
  "convert-to-jpg": { name: "Convert to JPG", description: "convert a supported image into JPG format" },
  "crop-image": { name: "Crop Image", description: "crop an image to the framing you need" },
  "heic-to-jpg": { name: "HEIC to JPG", description: "convert HEIC photos into JPG images" },
  "heic-to-png": { name: "HEIC to PNG", description: "convert HEIC photos into PNG images" },
  "html-to-image": { name: "HTML to Image", description: "render HTML content as an image" },
  "image-splitter": { name: "Image Splitter", description: "divide an image into smaller sections" },
  "jpg-to-gif": { name: "JPG to GIF", description: "convert JPG images into GIF format" },
  "jpg-to-png": { name: "JPG to PNG", description: "convert JPG images into PNG format" },
  "jpg-to-svg": { name: "JPG to SVG", description: "trace a JPG image into an SVG graphic" },
  "jpg-to-webp": { name: "JPG to WebP", description: "convert JPG images into WebP format" },
  "make-round-image": { name: "Make Round Image", description: "crop an image into a circular shape" },
  "photo-editor": { name: "Photo Editor", description: "make edits to an image" },
  "pixelate-image": { name: "Pixelate Image", description: "pixelate selected areas of an image" },
  "png-to-jpg": { name: "PNG to JPG", description: "convert PNG images into JPG format" },
  "png-to-svg": { name: "PNG to SVG", description: "trace a PNG image into an SVG graphic" },
  "png-to-webp": { name: "PNG to WebP", description: "convert PNG images into WebP format" },
  "profile-photo-maker": { name: "Profile Photo Maker", description: "prepare an image for a profile photo" },
  "resize-image": { name: "Resize Image", description: "resize an image to selected dimensions" },
  "rotate-image": { name: "Rotate Image", description: "rotate an image to the correct orientation" },
  "svg-to-png": { name: "SVG to PNG", description: "convert SVG graphics into PNG images" },
  "upscale-image": { name: "Upscale Image", description: "increase image dimensions using the available upscaling option" },
  "watermark-image": { name: "Watermark Image", description: "add a watermark to an image" },
  "webp-to-jpg": { name: "WebP to JPG", description: "convert WebP images into JPG format" },
  "webp-to-png": { name: "WebP to PNG", description: "convert WebP images into PNG format" },
};

export function ToolSeoContent() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length !== 2) return null;

  const route = segments[1];
  const details = toolDetails[route];
  if (!details) return null;

  const pageUrl = `${SITE_URL}${pathname}`;
  const questions = [
    {
      question: `What does ${details.name} do?`,
      answer: `${details.name} is an online tool designed to ${details.description}. Open the tool page to see its current options and supported inputs. Review the result after processing, especially when the document is important for work, records, printing, or submission to another service.`,
    },
    {
      question: `How do I use ${details.name} online?`,
      answer: `Open the ${details.name} page, choose the file or files requested by the upload area, and adjust any options shown. Start processing, wait for the result, and download it when ready. Keep your original file until you have checked that the output is correct and complete.`,
    },
    {
      question: `Is ${details.name} free to use?`,
      answer: `The online ${details.name} tool is available without a paid subscription or account signup. Use the options displayed on the page and check the output before relying on it. The optional physical E-Aadhaar PVC card printing service is separate from the online document tools.`,
    },
    {
      question: `Are files private when I use ${details.name}?`,
      answer: `File handling depends on the operation: some tools process files in your browser, while other features may use server processing. Check the page and privacy policy for the applicable handling before uploading sensitive material. Only upload files you are authorized to process.`,
    },
    {
      question: `Which file formats and sizes does ${details.name} support?`,
      answer: `Supported formats and practical size limits vary by tool, browser, and device. The upload control on this page identifies accepted file types, and any processing limits are shown as you use the tool. For best results, start with a readable source file and verify the downloaded output.`,
    },
  ];

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: details.name,
    applicationCategory: "WebApplication",
    operatingSystem: "Any",
    description: `Use idcardtools to ${details.description}.`,
    url: pageUrl,
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <section className="container mx-auto max-w-350 px-8 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
        }}
      />
      <div className="mx-auto max-w-3xl rounded-2xl border border-black/10 bg-white p-6 md:p-10">
        <h2 className="text-2xl font-semibold text-black">About {details.name}</h2>
        <p className="mt-3 text-sm leading-6 text-black/65">
          Use this online tool to {details.description}. Check the available file
          options and review the downloaded result before using it elsewhere.
        </p>
        <h3 className="mt-8 text-lg font-semibold text-black">
          Frequently asked questions
        </h3>
        <div className="mt-3 divide-y divide-black/10">
          {questions.map(({ question, answer }) => (
            <details key={question} className="py-4">
              <summary className="cursor-pointer font-medium text-black">
                {question}
              </summary>
              <p className="mt-3 text-sm leading-6 text-black/65">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
