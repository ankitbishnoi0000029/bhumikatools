import type { Metadata } from "next";
import PDFReaderClient from "./pdf-reader-client";

const SITE_URL = "https://idcardtools.com";
const PAGE_URL = `${SITE_URL}/pdf-tools/pdf-read`;

// ============================================
// FAQ DATA
// ============================================

const faqItems = [
  { q: "What is a PDF reader?", a: "A PDF Reader is software that lets you open, view, and interact with PDF (Portable Document Format) files. It preserves formatting, fonts, and layout across devices." },
  { q: "How do I read a PDF online?", a: "Upload your PDF to idcardtools PDF Reader by dragging and dropping it or clicking to import. It opens instantly in your browser for viewing — no download or installation required." },
  { q: "Can I open a PDF file without Adobe?", a: "Yes. idcardtools PDF Reader is a free online PDF viewer that works in any modern web browser. You do not need Adobe Acrobat or any other software." },
  { q: "Is it safe to use an online PDF reader?", a: "Yes. Our PDF Reader processes files locally in your browser, so your PDF never leaves your device. For any tool that requires transfer, we use 256-bit TLS encryption and auto-delete files after one hour." },
  { q: "Does the online PDF reader work on mobile devices?", a: "Yes. The reader works on smartphones and tablets running iOS or Android. The interface adapts to your screen size for comfortable reading." },
  { q: "Can it read my PDF to me out loud?", a: "Yes, our PDF Reader supports text-to-speech. You can have your PDF read aloud and control the playback pace. Adjust the audio speed to suit your learning style." },
  { q: "Can I adjust the reading speed in a PDF reader?", a: "Yes. You can control the playback speed of the read-aloud feature, from slow, deliberate narration to quick information absorption." },
  { q: "Is idcardtools PDF reader free to use?", a: "Yes, 100% free, forever. No signup, no watermarks, no page limits, no file size restrictions up to 5GB per file." },
  { q: "What can I do with the PDF reader?", a: "You can view, search, zoom, rotate, print, and download PDFs. You can also read them aloud, use bookmarks, and navigate large documents effortlessly." },
  { q: "Can I read a PDF on mobile?", a: "Yes. The PDF Reader works perfectly on mobile browsers like Chrome, Safari, and Firefox on both Android and iOS. There's a mobile-friendly bottom navigation bar for easy page switching." },
  { q: "Can I read a PDF while offline?", a: "Once the reader page is loaded, you can continue reading even if your internet disconnects. The PDF file is already in your browser's memory. However, to initially load the reader and open a new file, you need an internet connection." },
  { q: "Can the PDF reader search text?", a: "Yes. You can search any text within the PDF using the search icon in the toolbar. The reader uses the PDF's embedded text layer for accurate, instant search results." },
  { q: "What's the best free PDF reader option?", a: "idcardtools PDF Reader is one of the best free options because it works entirely in your browser, requires no installation, protects your privacy, and offers a rich set of reading features." },
  { q: "Can I customize the voice settings in PDF Reader?", a: "Yes, you can customize the read-aloud voice and speed settings to match your preferences." },
  { q: "Do my PDF files get uploaded to your servers?", a: "No. The PDF Reader processes everything entirely in your browser using WebAssembly and PDF.js. Your files never leave your device — no upload, no server, no storage." },
  { q: "Can I print a PDF directly from the reader?", a: "Yes. Click the printer icon in the toolbar to open your browser's print dialog. You can print the entire PDF or select specific page ranges." },
  { q: "What keyboard shortcuts does the PDF Reader support?", a: "Arrow Left/Up (previous page), Arrow Right/Down (next page), + or = (zoom in), - (zoom out), Ctrl+F or Cmd+F (fullscreen mode), Escape (close search or thumbnails)." },
  { q: "Is there a file size limit for the PDF Reader?", a: "You can open PDF files up to 5GB. Since processing happens in your browser, actual limits depend on your device's available memory." },
  { q: "Can I view PDF thumbnails?", a: "Yes. Click the grid icon in the toolbar to open a sidebar with page thumbnails. Click any thumbnail to jump directly to that page." },
  { q: "Is this PDF Reader better than Adobe Acrobat?", a: "For simply reading PDFs, yes — it's faster, lighter, more private, and doesn't require installation. Adobe Acrobat has advanced editing features that our reader doesn't offer." },
];

// ============================================
// HOW TO STEPS
// ============================================

const howToSteps = [
  { name: "Upload your PDF", text: "Drag and drop your PDF file into the upload zone, or click to browse from your device. Files stay in your browser — never uploaded to any server." },
  { name: "Navigate, zoom & search", text: "Use the toolbar to navigate pages, zoom in or out, rotate pages, view thumbnails, and search text inside the document." },
  { name: "Print or download", text: "When you are done reading, print the PDF directly from your browser or download it to your device." },
];

// ============================================
// LUMIN FEATURES
// ============================================

const luminFeatures = [
  { title: "Read PDFs instantly", description: "Open any PDF file in seconds with smooth navigation, page search, and bookmarks. Enjoy lightning-fast document loading with intuitive controls." },
  { title: "Cross-platform access", description: "Use your PDF reader on iPhone, Android, Windows, and Mac without compatibility issues. Your reading progress syncs across all devices." },
  { title: "Read PDFs aloud", description: "Have your PDF read aloud to you and control the playback pace. Adjust the audio speed to suit your learning style and comprehension needs." },
  { title: "No installation needed", description: "Read, view, and review PDFs directly in your browser without downloading software. Access your documents instantly from any device." },
  { title: "Strong encryption", description: "Protect sensitive documents with advanced 256-bit AES encryption. Confidential files remain secure during viewing and sharing." },
  { title: "Password protection", description: "Secure your files with unique passwords so only authorized users can open and read them. Add extra protection to financial or legal documents." },
];

// ============================================
// TESTIMONIALS
// ============================================

const testimonials = [
  { name: "Monalisa Das", date: "Oct 6", text: "The App is very easy to use it, Nice app.", rating: 5 },
  { name: "Wellington Picanço", date: "Oct 5", text: "Top... Adorei o app", rating: 5 },
  { name: "Luis Ramirez Cuadros", date: "Oct 5", text: "excelente documento, muy util para cuando llegan documentos pdf", rating: 5 },
  { name: "Junior Luiz", date: "Oct 4", text: "the best pdf editor in the world", rating: 5 },
  { name: "Dee", date: "Oct 4", text: "This has made getting documents signed so much easier and efficient.", rating: 5 },
  { name: "Avril Etsebeth Clench", date: "Oct 4", text: "Signing documents with multiple signatures and then only having to have one document instead of many copies has been great.", rating: 5 },
];

// ============================================
// FEATURED ARTICLES
// ============================================

const featuredArticles = [
  { title: "How to have a PDF read out loud to you", category: "Text-to-Speech", date: "Sep 24, 2025", excerpt: "Need to listen to your PDFs instead of reading them? Whether you're multitasking, dealing with eye strain, or simply prefer audio, here are proven methods to make any PDF speak to you.", link: "#" },
  { title: "Meet your wingman: AI summarization", category: "PDF Editing", date: "Sep 29, 2024", excerpt: "Long days spent navigating long documents is an eye-shrivelling endeavour. What if you had a wingman backing you up every step of the way?", link: "#" },
  { title: "A Google Chrome extension that actually extends", category: "PDF Editing", date: "Jul 1, 2024", excerpt: "PDF viewing and editing is now as easy as opening Chrome. We explain how a simple Chrome extension can be part of the cure to technostress.", link: "#" },
];

// ============================================
// SEO METADATA
// ============================================

export const metadata: Metadata = {
  title: "PDF Viewer | Open PDFs Online with Our Free PDF Reader",
  description: "Open and read PDFs online with this fast PDF viewer. Forget software signups and downloads. Our online PDF reader lets you view PDFs in your browser for free. No signup, no uploads to server, 100% private and secure.",
  keywords: ["pdf reader online", "free pdf reader", "read pdf online free", "open pdf in browser", "view pdf online", "pdf viewer online", "pdf reader with zoom", "pdf reader with search", "pdf reader no signup", "free pdf viewer online", "read pdf aloud", "text to speech pdf", "idcardtools pdf reader"],
  authors: [{ name: "idcardtools", url: SITE_URL }],
  creator: "idcardtools",
  publisher: "idcardtools",
  category: "PDF Tools",
  classification: "PDF Reader, Document Viewer",
  alternates: { canonical: PAGE_URL, languages: { "en-IN": PAGE_URL } },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: PAGE_URL,
    siteName: "idcardtools",
    title: "PDF Viewer | Open PDFs Online with Our Free PDF Reader",
    description: "Open and read PDFs online with this fast PDF viewer. Free, private, no signup required.",
    countryName: "India",
    images: [{ url: `${SITE_URL}/demo.png`, width: 1200, height: 630, alt: "idcardtools PDF Reader", type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@idcardtools",
    creator: "@idcardtools",
    title: "PDF Viewer | Open PDFs Online with Our Free PDF Reader",
    description: "Open and read PDFs online with this fast PDF viewer. 100% private, no signup.",
    images: [`${SITE_URL}/demo.png`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
};

// ============================================
// STRUCTURED DATA
// ============================================

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": `${PAGE_URL}#software`,
  name: "idcardtools PDF Reader",
  description: "Free online PDF reader that works entirely in your browser.",
  url: PAGE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web Browser",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "2847" },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Read a PDF Online",
  step: howToSteps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "PDF Tools", item: `${SITE_URL}/pdf-tools` },
    { "@type": "ListItem", position: 3, name: "PDF Reader", item: PAGE_URL },
  ],
};

// ============================================
// PAGE COMPONENT
// ============================================

export default function Page() {
  return (
    <>
      {/* Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

     
              <PDFReaderClient />
        
        

        {/* ============================================
            FEATURES
        ============================================ */}
        <section className="border-y border-black/[0.08] bg-white py-24">
          <div className="container mx-auto max-w-[1400px] px-8">
            <div className="mb-16 grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
                  Features — Why Choose Us
                </div>
                <h2
                  className="text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[52px] lg:text-[60px]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Everything you need.
                  <br />
                  <span className="italic text-[#ff6a00]">Nothing</span> you don&apos;t.
                </h2>
              </div>
              <div className="lg:col-span-5 lg:pb-4">
                <p className="max-w-md text-[15px] leading-[1.7] text-black/60">
                  Everything you need to read, view, and work with PDFs — packed into one fast, private, browser-based tool.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[18px] border border-black/[0.08] bg-black/[0.08] md:grid-cols-2 lg:grid-cols-3">
              {luminFeatures.map((feature, i) => (
                <div
                  key={feature.title}
                  className="group relative bg-white p-8 transition-colors duration-300 hover:bg-[#faf8f3]"
                >
                  <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff6a00]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3
                    className="mb-3 text-[20px] leading-tight tracking-[-0.01em]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-[13px] leading-[1.7] text-black/55">
                    {feature.description}
                  </p>
                  <span className="absolute right-8 top-8 text-black/10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#ff6a00]">
                    →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            HOW TO USE
        ============================================ */}
        <section className="py-24">
          <div className="container mx-auto max-w-[1400px] px-8">
            <div className="mb-16 max-w-2xl">
              <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
                Process — How It Works
              </div>
              <h2
                className="text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[52px] lg:text-[60px]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Read any PDF in
                <br />
                <span className="italic text-[#ff6a00]">three</span> simple steps.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-black/60">
                No downloads. No signup. Just upload and read — takes less than 20 seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {howToSteps.map((step, i) => (
                <div
                  key={step.name}
                  className="relative rounded-[18px] border border-black/[0.08] bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div
                      className="text-[48px] leading-none text-[#ff6a00]"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/30">
                      Step
                    </span>
                  </div>
                  <h3
                    className="mb-3 text-[20px] leading-tight tracking-[-0.01em]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {step.name}
                  </h3>
                  <p className="text-[13px] leading-[1.7] text-black/55">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            CONTENT SECTIONS (2-col editorial)
        ============================================ */}
        <section className="border-y border-black/[0.08] bg-white py-24">
          <div className="container mx-auto max-w-[1400px] px-8">
            <div className="mb-16 max-w-2xl">
              <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
                Editorial — Deep Dive
              </div>
              <h2
                className="text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[52px]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                More than <span className="italic text-[#ff6a00]">just</span> a viewer.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-2">
              {[
                { title: "Enhance Your Digital Documents", desc: "Our PDF Reader is more than it may seem. View, search, print, and download PDFs online. For compression, conversion, or advanced editing, use our other PDF tools from the same platform." },
                { title: "Secure Connection", desc: "All idcardtools tools use 256-bit TLS encryption to protect your documents during transfer. Our PDF Reader processes files locally in your browser, so your PDF never leaves your device." },
                { title: "Offline PDF Reader", desc: "If you prefer reading your PDF documents offline or don't always have access to the internet, you can continue reading after the page and file are loaded. The PDF stays in your browser memory." },
                { title: "Universally Compatible", desc: "As an online PDF Reader, you can use this tool with any web browser on any operating system, including mobile devices. It also works with scanned documents." },
                { title: "Read PDFs in Any Browser", desc: "Whether you're using Chrome, Firefox, Safari, or Edge, our PDF viewer works seamlessly across all major browsers. There's nothing to install or configure." },
                { title: "Mobile PDF Reader", desc: "Access your PDFs on the go with full mobile support. Our online reader adapts to your smartphone or tablet screen, making it easy to read documents wherever you are." },
              ].map((item, i) => (
                <div key={item.title} className="border-t border-black/[0.12] pt-6">
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff6a00]">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3
                    className="mb-3 text-[22px] leading-tight tracking-[-0.01em]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-[13px] leading-[1.75] text-black/55">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            TESTIMONIALS
        ============================================ */}
        <section className="py-24">
          <div className="container mx-auto max-w-[1400px] px-8">
            <div className="mb-16 grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
                  Testimonials — What They Say
                </div>
                <h2
                  className="text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[52px] lg:text-[60px]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Trusted by
                  <br />
                  <span className="italic text-[#ff6a00]">100 million+</span> users.
                </h2>
              </div>
              <div className="lg:col-span-5 lg:pb-4">
                <p className="max-w-md text-[15px] leading-[1.7] text-black/60">
                  1,500+ verified reviews on G2, Trustpilot, and Capterra.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="group flex flex-col justify-between rounded-[18px] border border-black/[0.08] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]"
                >
                  <div className="mb-5 flex items-center gap-1 text-[#ff6a00]">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="text-[14px]">★</span>
                    ))}
                  </div>
                  <p
                    className="text-[15px] leading-[1.6] text-black/80"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-black/[0.08] pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff6a00] text-[12px] font-medium text-white">
                        {t.name.charAt(0)}
                      </div>
                      <span className="text-[12px] font-medium text-black">{t.name}</span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-black/40">
                      {t.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            FEATURED ARTICLES
        ============================================ */}
        <section className="border-y border-black/[0.08] bg-white py-24">
          <div className="container mx-auto max-w-[1400px] px-8">
            <div className="mb-16 grid grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
                  Journal — Featured Articles
                </div>
                <h2
                  className="text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[52px] lg:text-[60px]"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  From the <span className="italic text-[#ff6a00]">reading</span> room.
                </h2>
              </div>
              <div className="lg:col-span-5 lg:pb-4">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black/60 transition-colors hover:text-[#ff6a00]"
                >
                  View all articles →
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {featuredArticles.map((article) => (
                <a
                  key={article.title}
                  href={article.link}
                  className="group flex flex-col border-t border-black/[0.12] pt-6"
                >
                  <div className="mb-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-black/40">
                    <span>{article.category}</span>
                    <span>{article.date}</span>
                  </div>
                  <h3
                    className="mb-4 text-[22px] leading-[1.15] tracking-[-0.01em] transition-colors duration-300 group-hover:text-[#ff6a00]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {article.title}
                  </h3>
                  <p className="mb-6 flex-1 text-[13px] leading-[1.7] text-black/55">
                    {article.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-black transition-colors group-hover:text-[#ff6a00]">
                    Read more
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================
            FAQ
        ============================================ */}
        <section className="py-24">
          <div className="container mx-auto max-w-[1400px] px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Left sticky */}
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-8">
                  <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
                    FAQ — Questions
                  </div>
                  <h2
                    className="text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Things you
                    <br />
                    <span className="italic text-[#ff6a00]">might ask.</span>
                  </h2>
                  <p className="mt-6 max-w-xs text-[14px] leading-[1.7] text-black/55">
                    Everything you need to know about our PDF Reader. Can&apos;t find an answer? Reach out anytime.
                  </p>
                </div>
              </div>

              {/* Right accordion */}
              <div className="lg:col-span-8">
                <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
                  {faqItems.map((item, i) => (
                    <details key={item.q} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 transition-colors hover:text-[#ff6a00]">
                        <div className="flex items-baseline gap-4">
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/30 group-open:text-[#ff6a00]">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span
                            className="text-[16px] leading-tight text-black group-open:text-[#ff6a00] md:text-[17px]"
                            style={{ fontFamily: 'Georgia, serif' }}
                          >
                            {item.q}
                          </span>
                        </div>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/[0.15] text-black/60 transition-all duration-300 group-open:rotate-45 group-open:border-[#ff6a00] group-open:bg-[#ff6a00] group-open:text-white">
                          +
                        </span>
                      </summary>
                      <p className="pb-6 pl-10 pr-12 text-[13px] leading-[1.75] text-black/55">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            CTA
        ============================================ */}
        <section className="border-t border-black/[0.08] bg-white py-24">
          <div className="container mx-auto max-w-[1400px] px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
                Get Started — It&apos;s Free
              </div>
              <h2
                className="text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[56px]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Ready to read
                <br />
                your <span className="italic text-[#ff6a00]">PDF</span>?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.7] text-black/60">
                Join millions of users who read, view, and work with PDFs every day — free, fast, and 100% private.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#reader"
                  className="group inline-flex items-center gap-3 rounded-full bg-black px-8 py-3.5 text-[13px] font-medium text-white transition-colors duration-300 hover:bg-[#ff6a00]"
                >
                  Open PDF Reader
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </a>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-black/40">
                  No signup required
                </span>
              </div>
            </div>
          </div>
        </section>
 
    </>
  );
}