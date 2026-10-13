import type { FaqItem, InfoItem, InformationSectionProps } from "@/types/types";
import {
  imageToolDetails,
  type ImageToolSlug,
} from "@/lib/image-tool-metadata";

export const pdfToolDetails: Record<string, { name: string; description: string }> = {
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
};

export const pdfToolsInfoItems: InfoItem[] = [
  {
    id: "choose-by-task",
    icon: "FileText",
    title: "Choose a PDF task",
    description:
      "The PDF tools include operations for merging, splitting, editing, protecting, signing, organizing, reading, and converting documents.",
  },
  {
    id: "check-inputs",
    icon: "Info",
    title: "Check the input requirements",
    description:
      "Accepted file types and available controls depend on the selected tool. Check the upload area and on-page instructions before choosing a file.",
  },
  {
    id: "review-output",
    icon: "Eye",
    title: "Review the result",
    description:
      "Check the processed document before sharing or relying on it, and keep the original file until you have confirmed the result is correct.",
  },
];

export const mergePdfInfoItems: InfoItem[] = [
  {
    id: "add-pdfs",
    icon: "FileText",
    title: "Add PDF files",
    description:
      "The merge page accepts PDF files and reports when a selected file cannot be loaded.",
  },
  {
    id: "preview-order",
    icon: "Layers",
    title: "Preview and arrange files",
    description:
      "After files load, the interface displays page previews and lets you arrange the selected PDFs before merging.",
  },
  {
    id: "merge-download",
    icon: "Download",
    title: "Merge and check the output",
    description:
      "Create one PDF from the selected files, then open or save the result and check it before using it elsewhere.",
  },
  {
    id: "local-processing",
    icon: "MonitorSmartphone",
    title: "Processing in your browser",
    description:
      "The merge operation uses the browser's PDF library to read and combine the files selected in the page.",
  },
];

export const imageToolsInfoItems: InfoItem[] = [
  {
    id: "image-conversion",
    icon: "Image",
    title: "Convert image formats",
    description:
      "Available image routes include converters for JPG, PNG, WebP, HEIC, GIF, and SVG format pairs.",
  },
  {
    id: "image-editing",
    icon: "Layers",
    title: "Edit and compose images",
    description:
      "Image tools include resizing, cropping, rotating, pixelating, watermarking, combining images, and making collages.",
  },
  {
    id: "image-inputs",
    icon: "Info",
    title: "Check supported files",
    description:
      "Supported formats and options vary by operation. Confirm the selected tool's upload instructions before processing.",
  },
];

function toolInformation(name: string, description: string, kind: "PDF" | "image"): InfoItem[] {
  const inputName = kind === "PDF" ? "document" : "image";
  return [
    {
      id: "purpose",
      icon: kind === "PDF" ? "FileText" : "Image",
      title: `What ${name} does`,
      description: `This page provides a tool to ${description}.`,
    },
    {
      id: "input-and-options",
      icon: "Info",
      title: `Choose an input for ${name}`,
      description: `Select the ${inputName} requested by the page and review its available options. Accepted file types and limits are shown in the tool interface.`,
    },
    {
      id: "check-result",
      icon: "Eye",
      title: "Check the processed result",
      description: `Review the output from ${name} before sharing or relying on it. Keep the source ${inputName} until you have confirmed the result is correct.`,
    },
  ];
}

function section(
  eyebrow: string,
  title: string,
  subtitle: string,
  items: InfoItem[],
): InformationSectionProps {
  return {
    chapterLabel: "Page information",
    metaLabel: "Useful details",
    eyebrow,
    title,
    subtitle,
    items,
    columns: 3,
    showSchema: false,
  };
}

const staticSections: Record<string, InformationSectionProps> = {
  "/": section(
    "idcardtools services",
    "Choose the service you need",
    "Explore document and image tools, or review the separate physical card printing service.",
    [
      { id: "pdf", icon: "FileText", title: "PDF tools", description: "Open the PDF tools collection to merge, split, edit, organize, and convert documents." },
      { id: "images", icon: "Image", title: "Image tools", description: "Browse image tools for conversion, editing, resizing, cropping, and composition." },
      { id: "printing", icon: "Info", title: "Physical card printing", description: "Card printing is a separate service from the online PDF and image tools. Review its page details before placing an order." },
    ],
  ),
  "/pdf-tools": section(
    "PDF tools",
    "Find a tool for your PDF task",
    "Choose an operation, check the page's input requirements, and review the resulting document.",
    pdfToolsInfoItems,
  ),
  "/image-tools": section(
    "Image tools",
    "Find an image editing or conversion tool",
    "Use the listed image operations and check each tool page for supported input formats and options.",
    imageToolsInfoItems,
  ),
  "/blog": section(
    "Guides and articles",
    "Explore practical guides",
    "The blog contains published guides and other site articles. Open an article for its full instructions and source links.",
    [
      { id: "aadhaar-pvc-guide", icon: "BookOpen", title: "Aadhaar PVC card guide", description: "The published guide explains the distinction between official UIDAI services and private printing, and includes preparation and review advice." },
      { id: "check-sources", icon: "ExternalLink", title: "Check linked sources", description: "Use the source links in an article to confirm current requirements with the relevant organization." },
    ],
  ),
  "/e-aadhaar": section(
    "E-Aadhaar PVC printing",
    "Print your E-Aadhaar on a PVC card",
    "Understand how the E-Aadhaar PVC card printing service works, and what to check before placing an order.",
    [
      { id: "what-is-eaadhaar", icon: "Info", title: "What E-Aadhaar is", description: "E-Aadhaar is the digital copy of an Aadhaar card issued by UIDAI. The printing service turns that PDF into a physical PVC card with the same layout, logo, and QR code." },
      { id: "pvc-material", icon: "ShieldCheck", title: "PVC material", description: "Cards are printed on 600-micron PVC, the same grade used for bank cards. The material is waterproof and durable, and the QR code stays scannable." },
      { id: "uidai-compliance", icon: "BookOpen", title: "UIDAI compliance", description: "UIDAI permits printing E-Aadhaar on PVC cards when the layout, logo, and QR code remain unaltered. The service keeps the original details unchanged." },
      { id: "order-check", icon: "Eye", title: "Before you order", description: "Confirm your E-Aadhaar PDF opens correctly and shows current details, then review the order page for pricing, delivery time, and the privacy terms." },
    ],
  ),
  "/blog/aadhaar-pvc-guide": section(
    "Aadhaar PVC card guide",
    "Key points from this guide",
    "Read the full article and follow the linked official source for current Aadhaar instructions.",
    [
      { id: "official-vs-private", icon: "Info", title: "Official service or private print", description: "The article distinguishes UIDAI's official services from a physical copy printed by a private provider." },
      { id: "protect-file", icon: "ShieldCheck", title: "Handle identity files carefully", description: "The guide recommends keeping the original file unchanged and reviewing a provider's privacy terms before sharing a copy." },
      { id: "verify-card", icon: "Eye", title: "Check the final copy", description: "The guide advises checking printed details and QR-code readability against the source document." },
    ],
  ),
  "/about": section(
    "About idcardtools",
    "What the site provides",
    "These are the service areas described on idcardtools.",
    [
      { id: "pdf-service", icon: "FileText", title: "PDF utilities", description: "The site provides online tools for common PDF operations and document conversion." },
      { id: "image-service", icon: "Image", title: "Image utilities", description: "The site also provides image conversion and editing tools." },
      { id: "printing-service", icon: "Info", title: "Card printing service", description: "Physical card printing is offered separately from the browser-based document and image utilities." },
    ],
  ),
  "/contacts": section(
    "Contact",
    "Contact and support information",
    "Use the contact details and inquiry options shown on the Contact page for current support routes.",
    [
      { id: "support", icon: "Info", title: "Support enquiries", description: "The Contact page lists the available ways to get in touch with idcardtools." },
      { id: "orders", icon: "FileText", title: "Order questions", description: "Review the Contact page for the current route for card-order and service enquiries." },
    ],
  ),
  "/privacy": section(
    "Privacy",
    "Review privacy choices",
    "The Privacy page explains the site's stated data practices and how analytics consent can be changed.",
    [
      { id: "analytics-choice", icon: "Eye", title: "Optional analytics", description: "Google Analytics is loaded only after consent when a measurement ID is configured." },
      { id: "change-consent", icon: "ShieldCheck", title: "Change your choice", description: "The site's privacy settings control lets visitors revisit their analytics consent choice." },
    ],
  ),
  "/terms": section(
    "Terms",
    "Understand the service terms",
    "Read the full terms page for the conditions that apply to use of the website and its services.",
    [
      { id: "terms", icon: "FileText", title: "Website and tool use", description: "The terms page describes the conditions for using the site and its tools." },
      { id: "service", icon: "Info", title: "Separate services", description: "Review the terms and service details that apply to any physical card printing order." },
    ],
  ),
};

export function getPageInformation(pathname: string): InformationSectionProps | null {
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  const staticContent = staticSections[normalizedPath];
  if (staticContent) return staticContent;

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length !== 2) return null;

  const [category, slug] = segments;
  if (category === "pdf-tools") {
    const details = pdfToolDetails[slug];
    if (!details) return null;
    return section(
      "PDF tool details",
      details.name,
      `Information about the PDF tool that can ${details.description}.`,
      slug === "merge"
        ? mergePdfInfoItems
        : toolInformation(details.name, details.description, "PDF"),
    );
  }

  if (category === "image-tools") {
    if (!Object.prototype.hasOwnProperty.call(imageToolDetails, slug)) return null;
    const details = imageToolDetails[slug as ImageToolSlug];
    const [name, description] = details;
    return section(
      "Image tool details",
      name,
      `Information about the image tool that can ${description}.`,
      toolInformation(name, description, "image"),
    );
  }

  return null;
}

// ===================== FAQ CONTENT =====================

const eAadhaarFaqs: FaqItem[] = [
  {
    id: "what-is-e-aadhaar",
    question: "What is E-Aadhaar, and how is it different from the physical card?",
    answer:
      "E-Aadhaar is the digital version of your Aadhaar, issued by UIDAI as a signed PDF. It carries the same details, photograph, and QR code as the physical card. Our service prints that PDF onto a PVC card without changing any content.",
  },
  {
    id: "is-pvc-printing-legal",
    question: "Is printing E-Aadhaar on a PVC card legal?",
    answer:
      "Yes. UIDAI permits printing E-Aadhaar on PVC cards as long as the layout, logo, and QR code stay unaltered. The service keeps your document exactly as issued, so the printed card remains a faithful copy of the original.",
  },
  {
    id: "what-material-is-used",
    question: "What material is the PVC card printed on?",
    answer:
      "Cards are printed on 600-micron PVC, the same grade used for bank cards. The material is waterproof and tear-resistant, and the embedded QR code stays scannable by standard verification apps after printing.",
  },
  {
    id: "how-long-does-delivery-take",
    question: "How long does PVC card delivery take?",
    answer:
      "Cards are typically printed and dispatched within 24 hours. Standard delivery takes a few business days across India, and tracked shipping is included with every order so you can follow the parcel until it arrives.",
  },
  {
    id: "is-my-aadhaar-data-safe",
    question: "Is my E-Aadhaar PDF safe when I place an order?",
    answer:
      "Your E-Aadhaar PDF is used only to produce your card. Review the privacy terms on the order page before uploading, and confirm that the provider states how long the file is retained and when it is deleted.",
  },
  {
    id: "who-should-i-contact",
    question: "Where do I check current prices or place an order?",
    answer:
      "Visit the Contact page for the current pricing, delivery estimates, and order route. For questions about the PDF tools themselves, use the support details listed there instead.",
  },
];

const imageToolsFaqs: FaqItem[] = [
  {
    id: "image-formats",
    question: "Which image formats do the tools support?",
    answer:
      "The image collection covers JPG, PNG, WebP, HEIC, GIF, and SVG conversion pairs, plus editing operations such as resizing, cropping, rotating, and watermarking. Open the individual tool page for its accepted input formats.",
  },
  {
    id: "image-privacy",
    question: "Are my images uploaded to a server?",
    answer:
      "Handling depends on the operation. Several tools process files directly in the browser, while others may use server-side processing. Check the tool page and the privacy policy for the applicable behaviour before uploading sensitive images.",
  },
  {
    id: "image-limits",
    question: "Is there a file size limit for image tools?",
    answer:
      "Practical limits vary by tool, browser, and device. The upload control on each tool page shows the accepted file types, and any processing limits appear while you use the tool. Starting with a high-quality source image gives the best output.",
  },
  {
    id: "image-commercial-use",
    question: "Can I use the image tools for commercial projects?",
    answer:
      "The online image tools are free to use, including for commercial work. You remain responsible for the images you upload, so only process files you own or are authorized to edit, and review the output before publishing it.",
  },
];

const blogFaqs: FaqItem[] = [
  {
    id: "blog-topics",
    question: "What topics does the blog cover?",
    answer:
      "The blog publishes practical guides on PDF tools, document privacy, and E-Aadhaar PVC cards. Each article includes step-by-step instructions and links to official sources so you can verify current requirements yourself.",
  },
  {
    id: "blog-sources",
    question: "How current is the information in the guides?",
    answer:
      "Articles are reviewed against the linked official sources at publication time. Requirements from organizations such as UIDAI can change, so use the source links inside each guide to confirm the latest rules before relying on them.",
  },
  {
    id: "blog-aadhaar-guide",
    question: "What does the Aadhaar PVC card guide explain?",
    answer:
      "The guide distinguishes UIDAI's official services from a card printed by a private provider. It also covers preparing your E-Aadhaar PDF, handling identity files carefully, and checking the printed card's details and QR code.",
  },
];

const aboutFaqs: FaqItem[] = [
  {
    id: "what-is-idcardtools",
    question: "What does idcardtools provide?",
    answer:
      "idcardtools provides free, privacy-first PDF and image tools in the browser, alongside information about the separate E-Aadhaar PVC card printing service. The digital tools require no signup and remain free for personal and commercial use.",
  },
  {
    id: "where-based",
    question: "Where is idcardtools based?",
    answer:
      "The team is based in Bangalore, Karnataka, India, and serves users across the country. Support is available by email and phone on weekdays, and the Contact page lists the current support hours and inquiry routes.",
  },
  {
    id: "why-free",
    question: "Why are the online tools free?",
    answer:
      "The digital tools are free because the physical PVC card printing and delivery service is offered separately. The site does not run ads or sell visitor data, and browser-based tools process files without uploading them at all.",
  },
];

const contactsFaqs: FaqItem[] = [
  {
    id: "response-time",
    question: "How quickly does the support team respond?",
    answer:
      "Support emails are usually answered within two hours on weekdays. Weekend messages may take up to a day. For PVC card orders and bulk inquiries, phone support is available during business hours.",
  },
  {
    id: "office-visits",
    question: "Can I visit the office in person?",
    answer:
      "Office visits are by appointment only. The office is located in Indiranagar, Bangalore. Email the team first to schedule a convenient time before planning a visit.",
  },
  {
    id: "bulk-orders",
    question: "How do I place a bulk PVC card order?",
    answer:
      "For bulk orders, contact the team through the Contact page with your required quantity, timeline, and delivery location. Bulk pricing is available for larger quantities, and a custom quote is provided for the order.",
  },
  {
    id: "partnerships",
    question: "Do you offer partnerships for businesses?",
    answer:
      "Yes. The site partners with cyber cafés, CSC centres, and businesses across India for card printing services. Email the sales address listed on the Contact page with details about your business to start the conversation.",
  },
];

const staticFaqs: Record<string, FaqItem[]> = {
  "/e-aadhaar": eAadhaarFaqs,
  "/image-tools": imageToolsFaqs,
  "/blog": blogFaqs,
  "/about": aboutFaqs,
  "/contacts": contactsFaqs,
};

export function getFaqsForPath(pathname: string): FaqItem[] | null {
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  const staticFaqSet = staticFaqs[normalizedPath];
  if (staticFaqSet) return staticFaqSet;

  // Hub pages without their own FAQ content, and individual tool pages
  // (which get FAQ content from ToolSeoContent), return no extra section.
  return null;
}
