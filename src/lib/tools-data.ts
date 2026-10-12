import {
  Layers, Scissors, RotateCw, LayoutList, FileText, Crop, Minimize, Wrench,
  ScanText, FileInput, FileOutput, Presentation, FileSpreadsheet,
  Image as ImageIcon, FileCode2, Edit3, PenTool, Stamp, Lock, Unlock, EyeOff,
  ShieldAlert, Brain, Languages, LucideCreditCardReader, ImageDown, ImageUp,
  Eraser, Smile, Expand, ScanFace, Palette, Scaling, Wand2, Type, UserRound,
  UserMinus, Trash2, Focus, Plus, Square, Contrast, Grid3x3, LayoutGrid,
  Film, Circle, Download, Music, VolumeX, Captions, Mic, Podcast, Radio, Video,
} from "lucide-react";

export type Tool = {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  desc?: string;
  isNew?: boolean;
};

export type Category = {
  name: string;
  slug: string;
  group: "pdf" | "image" | "video";
  desc: string;
  color: string;
  tools: Tool[];
};

export const toolsMenu: Category[] = [
  // ===================== PDF =====================
  {
    name: "Organize PDF", slug: "organize", group: "pdf",
    desc: "Merge, split, rotate, and rearrange", color: "#ff6a00",
    tools: [
      { id: "pdf-read", title: "Read PDF", icon: LucideCreditCardReader },
      { id: "merge", title: "Merge PDF", icon: Layers },
      { id: "split", title: "Split PDF", icon: Scissors },
      { id: "rotate", title: "Rotate PDF", icon: RotateCw },
      { id: "organize", title: "Organize PDF", icon: LayoutList },
      { id: "page-numbers", title: "Page Numbers", icon: FileText },
      { id: "crop", title: "Crop PDF", icon: Crop },
    ],
  },
  {
    name: "Optimize PDF", slug: "optimize", group: "pdf",
    desc: "Compress, repair, and OCR", color: "#10b981",
    tools: [
      { id: "compress", title: "Compress PDF", icon: Minimize },
      { id: "repair", title: "Repair PDF", icon: Wrench },
      { id: "ocr", title: "OCR PDF", icon: ScanText },
      { id: "scan", title: "Scan to PDF", icon: FileInput },
    ],
  },
  {
    name: "Convert PDF", slug: "convert", group: "pdf",
    desc: "To and from any format", color: "#3b82f6",
    tools: [
      { id: "pdf-word", title: "PDF to Word", icon: FileOutput },
      { id: "pdf-to-powerpoint", title: "PDF to PowerPoint", icon: Presentation },
      { id: "pdf-to-excel", title: "PDF to Excel", icon: FileSpreadsheet },
      { id: "pdf-to-jpg", title: "PDF to JPG", icon: ImageIcon },
      { id: "word-pdf", title: "Word to PDF", icon: FileText },
      { id: "jpg-pdf", title: "JPG to PDF", icon: ImageIcon },
      { id: "html-pdf", title: "HTML to PDF", icon: FileCode2 },
      { id: "pdf-md", title: "PDF to Markdown", icon: FileCode2, isNew: true },
    ],
  },
  {
    name: "Edit PDF", slug: "edit", group: "pdf",
    desc: "Edit, sign, and annotate", color: "#a855f7",
    tools: [
      { id: "edit", title: "Edit PDF", icon: Edit3 },
      { id: "sign", title: "Sign PDF", icon: PenTool },
      { id: "watermark", title: "Watermark", icon: Stamp },
      { id: "forms", title: "PDF Forms", icon: FileInput, isNew: true },
    ],
  },
  {
    name: "PDF Security", slug: "security", group: "pdf",
    desc: "Protect, unlock, and redact", color: "#ef4444",
    tools: [
      { id: "unlock", title: "Unlock PDF", icon: Unlock },
      { id: "protect", title: "Protect PDF", icon: Lock },
      { id: "redact", title: "Redact PDF", icon: EyeOff },
    ],
  },
  {
    name: "PDF Intelligence", slug: "intelligence", group: "pdf",
    desc: "AI-powered tools", color: "#ec4899",
    tools: [
      { id: "compare", title: "Compare PDF", icon: ShieldAlert },
      { id: "ai-summarizer", title: "AI Summarizer", icon: Brain, isNew: true },
      { id: "translate", title: "Translate PDF", icon: Languages, isNew: true },
    ],
  },

  // ===================== IMAGE =====================
  {
    name: "AI Image", slug: "image-ai", group: "image",
    desc: "Generate, enhance, and remove with AI", color: "#8b5cf6",
    tools: [
      { id: "ai-image-generator", title: "AI Image Generator", icon: Wand2, desc: "Generate images from a text prompt with AI.", isNew: true },
      { id: "remove-background", title: "Remove Background", icon: Eraser, desc: "Instantly detect and cut out backgrounds.", isNew: true },
      { id: "transparent-background", title: "Make background transparent", icon: Eraser, desc: "Make background transparent instantly." },
      { id: "remove-watermark", title: "Remove watermark", icon: Trash2, desc: "Remove watermark from your photo." },
      { id: "remove-objects-photo", title: "Remove Objects Photo", icon: Eraser, desc: "Remove unwanted objects from your photo." },
      { id: "remove-person-photo", title: "Remove Person from Photo", icon: UserMinus, desc: "Remove a person from a photo cleanly." },
      { id: "upscale-image", title: "Upscale Image", icon: Expand, desc: "Enlarge images without quality loss.", isNew: true },
      { id: "unblur-img", title: "Unblur IMG", icon: Wand2, desc: "Unblur and sharpen your image." },
      { id: "colorize-photo", title: "Colorize Photo", icon: Palette, desc: "Add colour to black & white photos." },
      { id: "blur-face", title: "Blur Face", icon: ScanFace, desc: "Easily blur out faces in photos.", isNew: true },
      { id: "blur-background", title: "Blur Background", icon: Focus, desc: "Blur the background of an image." },
      { id: "cleanup-picture", title: "Cleanup picture", icon: Eraser, desc: "Cleanup and enhance your picture." },
      { id: "translate-image", title: "Translate Image", icon: Languages, desc: "Translate text inside your image." },
    ],
  },
  {
    name: "Convert Image", slug: "image-convert", group: "image",
    desc: "Convert to and from any image format", color: "#3b82f6",
    tools: [
      { id: "convert-to-jpg", title: "Convert to JPG", icon: ImageDown, desc: "PNG, GIF, TIF, PSD, SVG, WEBP, HEIC, RAW → JPG." },
      { id: "convert-from-jpg", title: "Convert from JPG", icon: ImageUp, desc: "JPG → PNG, GIF, or animated GIF." },
      { id: "heic-to-jpg", title: "HEIC to JPG", icon: ImageDown, desc: "Convert iPhone HEIC images to JPG." },
      { id: "heic-to-png", title: "HEIC to PNG", icon: ImageUp, desc: "Convert iPhone HEIC images to PNG." },
      { id: "webp-to-jpg", title: "WebP to JPG", icon: ImageDown, desc: "Upload WebP and download as JPG." },
      { id: "webp-to-png", title: "WEBP to PNG", icon: ImageUp, desc: "Convert a WEBP image to PNG online." },
      { id: "png-to-jpg", title: "PNG to JPG", icon: ImageDown, desc: "Convert a PNG image to JPG online." },
      { id: "jpg-to-png", title: "JPG to PNG", icon: ImageUp, desc: "Convert a JPG image to PNG online." },
      { id: "png-to-webp", title: "PNG to WEBP", icon: ImageUp, desc: "Convert a PNG image to WEBP online." },
      { id: "jpg-to-webp", title: "JPG to WEBP", icon: ImageUp, desc: "Convert a JPG image to WEBP online." },
      { id: "png-to-svg", title: "PNG to SVG", icon: FileCode2, desc: "Convert a PNG image to SVG online." },
      { id: "jpg-to-svg", title: "JPG to SVG", icon: FileCode2, desc: "Convert a JPG image to SVG online." },
      { id: "svg-to-png", title: "SVG to PNG", icon: ImageUp, desc: "Convert an SVG image to PNG free." },
      { id: "jpg-to-gif", title: "JPG to GIF", icon: ImageUp, desc: "Convert a JPG image to GIF online." },
      { id: "gif-to-mp4", title: "GIF to MP4", icon: Film, desc: "Convert animated GIF to MP4 online." },
    ],
  },
  {
    name: "Optimize Image", slug: "image-optimize", group: "image",
    desc: "Compress, resize, crop, and rotate", color: "#10b981",
    tools: [
      { id: "compress-image", title: "Compress IMAGE", icon: Minimize, desc: "Compress JPG, PNG, SVG, and GIFs while saving space." },
      { id: "resize-image", title: "Resize IMAGE", icon: Scaling, desc: "Resize by percent or pixel." },
      { id: "crop-image", title: "Crop IMAGE", icon: Crop, desc: "Crop with pixel or visual editor." },
      { id: "rotate-image", title: "Rotate IMAGE", icon: RotateCw, desc: "Rotate many JPG, PNG or GIF at once." },
      { id: "pixelate-image", title: "Pixelate Image", icon: Grid3x3, desc: "Pixelate any part of your photo." },
      { id: "html-to-image", title: "HTML to IMAGE", icon: FileCode2, desc: "Convert webpages in HTML to JPG or SVG." },
    ],
  },
  {
    name: "Edit Image", slug: "image-edit", group: "image",
    desc: "Edit, style, and compose images", color: "#f59e0b",
    tools: [
      { id: "photo-editor", title: "Photo Editor", icon: Palette, desc: "Add text, effects, frames or stickers." },
      { id: "add-text-to-image", title: "Add Text to an Image", icon: Type, desc: "Easily add text to an image online." },
      { id: "add-border", title: "Add Border to Image", icon: Square, desc: "Add a border to your image." },
      { id: "add-images", title: "Add Images", icon: Plus, desc: "Add images on top of an image." },
      { id: "black-and-white", title: "Black & White", icon: Contrast, desc: "Make your photo black & white." },
      { id: "combine-images", title: "Combine Images", icon: Layers, desc: "Combine multiple images online." },
      { id: "collage-maker", title: "Collage Maker", icon: LayoutGrid, desc: "Create photo collages online." },
      { id: "image-splitter", title: "Image Splitter", icon: Grid3x3, desc: "Cut an image into pieces." },
      { id: "make-round-image", title: "Make Round Image", icon: Circle, desc: "Make any image round in one click." },
      { id: "profile-photo-maker", title: "Profile Photo Maker", icon: UserRound, desc: "Create a round profile photo." },
      { id: "meme-generator", title: "Meme Generator", icon: Smile, desc: "Caption images to make custom memes." },
      { id: "watermark-image", title: "Watermark IMAGE", icon: Stamp, desc: "Stamp text/image with position control." },
    ],
  },
  {
    name: "Extract & Read", slug: "image-extract", group: "image",
    desc: "Read text and data from images", color: "#ec4899",
    tools: [
      { id: "image-to-text", title: "Image To Text", icon: Type, desc: "Extract text from an image using OCR.", isNew: true },
    ],
  },

  // ===================== VIDEO =====================
  {
    name: "Download Video", slug: "video-download", group: "video",
    desc: "Download videos from social platforms", color: "#0ea5e9",
    tools: [
      { id: "instagram-download", title: "Instagram Download", icon: Download, desc: "Download video from Instagram." },
      { id: "tiktok-downloader", title: "TikTok Video Downloader", icon: Download, desc: "Download video from TikTok." },
      { id: "twitter-download", title: "Twitter Download", icon: Download, desc: "Download video from Twitter." },
      { id: "facebook-download", title: "Facebook Download", icon: Download, desc: "Download video from Facebook." },
    ],
  },
  {
    name: "Convert Video", slug: "video-convert", group: "video",
    desc: "Convert between video formats", color: "#3b82f6",
    tools: [
      { id: "mov-to-mp4", title: "MOV to MP4", icon: Video, desc: "Convert MOV to MP4." },
      { id: "mp4-to-avi", title: "MP4 to AVI", icon: Video, desc: "Convert MP4 to AVI." },
      { id: "webm-to-mp4", title: "WEBM to MP4", icon: Video, desc: "Convert WEBM to MP4." },
      { id: "mkv-to-mp4", title: "MKV to MP4", icon: Video, desc: "Convert MKV to MP4." },
      { id: "avi-to-mp4", title: "AVI to MP4", icon: Video, desc: "Convert AVI to MP4." },
      { id: "mp4-to-mov", title: "MP4 to MOV", icon: Video, desc: "Convert MP4 to MOV." },
      { id: "mp4-to-webm", title: "MP4 to WEBM", icon: Video, desc: "Convert MP4 to WEBM." },
      { id: "mov-to-avi", title: "MOV to AVI", icon: Video, desc: "Convert MOV to AVI." },
      { id: "avi-to-mov", title: "AVI to MOV", icon: Video, desc: "Convert AVI to MOV." },
      { id: "mkv-to-mov", title: "MKV to MOV", icon: Video, desc: "Convert MKV to MOV." },
      { id: "webm-to-mov", title: "WEBM to MOV", icon: Video, desc: "Convert WEBM to MOV." },
      { id: "avi-to-mkv", title: "AVI to MKV", icon: Video, desc: "Convert AVI to MKV." },
      { id: "mkv-to-avi", title: "MKV to AVI", icon: Video, desc: "Convert MKV to AVI." },
      { id: "m4a-to-mp4", title: "M4A to MP4", icon: Video, desc: "Convert M4A to MP4." },
      { id: "aac-to-mp4", title: "AAC to MP4", icon: Video, desc: "Convert AAC to MP4." },
    ],
  },
  {
    name: "Video to Audio", slug: "video-audio", group: "video",
    desc: "Extract or convert to audio formats", color: "#10b981",
    tools: [
      { id: "mp4-to-mp3", title: "MP4 to MP3", icon: Music, desc: "Convert MP4 to MP3 audio." },
      { id: "extract-audio", title: "Extract Audio from Video", icon: Music, desc: "Extract audio from your video." },
      { id: "mov-to-mp3", title: "MOV to MP3", icon: Music, desc: "Convert MOV to MP3 audio." },
      { id: "mp4-to-wav", title: "MP4 to WAV", icon: Music, desc: "Convert MP4 to WAV audio." },
      { id: "mkv-to-mp3", title: "MKV to MP3", icon: Music, desc: "Convert MKV to MP3 audio." },
      { id: "webm-to-mp3", title: "WEBM to MP3", icon: Music, desc: "Convert WEBM to MP3." },
      { id: "mov-to-wav", title: "MOV to WAV", icon: Music, desc: "Convert MOV to WAV audio." },
      { id: "avi-to-mp3", title: "AVI to MP3", icon: Music, desc: "Convert AVI to MP3 audio." },
      { id: "m4a-to-mp3", title: "M4A to MP3", icon: Music, desc: "Convert M4A to MP3 audio." },
      { id: "m4a-to-wav", title: "M4A to WAV", icon: Music, desc: "Convert M4A to WAV audio." },
      { id: "ogg-to-mp3", title: "OGG to MP3", icon: Music, desc: "Convert OGG to MP3 audio." },
      { id: "ogg-to-wav", title: "OGG to WAV", icon: Music, desc: "Convert OGG to WAV." },
      { id: "mp4-to-ogg", title: "MP4 to OGG", icon: Music, desc: "Convert MP4 to OGG audio." },
      { id: "aac-to-mp3", title: "AAC to MP3", icon: Music, desc: "Convert AAC to MP3 audio." },
      { id: "aac-to-wav", title: "AAC to WAV", icon: Music, desc: "Convert AAC to WAV audio." },
      { id: "aac-to-m4r", title: "AAC to M4R", icon: Music, desc: "Convert AAC to M4R audio." },
      { id: "aac-to-flac", title: "AAC to FLAC", icon: Music, desc: "Convert AAC to FLAC audio." },
    ],
  },
  {
    name: "Video to GIF", slug: "video-gif", group: "video",
    desc: "Convert between video and GIF", color: "#a855f7",
    tools: [
      { id: "video-to-gif", title: "Video to Gif", icon: Film, desc: "Upload MP4 and convert to animated GIF." },
      { id: "mp4-to-gif", title: "MP4 to GIF", icon: Film, desc: "Convert MP4 to GIF." },
      { id: "mov-to-gif", title: "MOV to GIF", icon: Film, desc: "Convert MOV to GIF." },
      { id: "mkv-to-gif", title: "MKV to GIF", icon: Film, desc: "Convert MKV to GIF." },
      { id: "avi-to-gif", title: "AVI to GIF", icon: Film, desc: "Convert AVI to GIF." },
      { id: "gif-to-mov", title: "GIF to MOV", icon: Film, desc: "Convert animated GIF to MOV online." },
      { id: "gif-to-webm", title: "GIF to WEBM", icon: Film, desc: "Convert animated GIF to WEBM online." },
      { id: "video-to-webp", title: "Video to WebP", icon: ImageIcon, desc: "Upload a video file to convert to WebP." },
    ],
  },
  {
    name: "Edit & Compress", slug: "video-edit", group: "video",
    desc: "Trim, resize, mute, and compress video", color: "#f59e0b",
    tools: [
      { id: "trim-video", title: "Trim Video", icon: Scissors, desc: "Select start/stop and download trimmed video." },
      { id: "resize-video", title: "Resize Video", icon: Scaling, desc: "Resize video resolution, maintain aspect ratio." },
      { id: "mute-video", title: "Mute Video", icon: VolumeX, desc: "Download the video with no sound." },
      { id: "add-subtitles", title: "Add subtitles", icon: Captions, desc: "Add subtitles to video." },
      { id: "compress-video", title: "Compress Video", icon: Minimize, desc: "Lessen the file size of a video file." },
      { id: "compress-mov", title: "Compress MOV", icon: Minimize, desc: "Compress MOV video." },
      { id: "compress-avi", title: "Compress AVI", icon: Minimize, desc: "Compress AVI video." },
      { id: "compress-mkv", title: "Compress MKV", icon: Minimize, desc: "Compress MKV video." },
    ],
  },
  {
    name: "Transcribe & Text", slug: "video-transcribe", group: "video",
    desc: "Turn video and audio into text", color: "#ec4899",
    tools: [
      { id: "youtube-to-text", title: "Youtube to Text", icon: Mic, desc: "Convert video to text.", isNew: true },
      { id: "video-to-text", title: "Video to Text", icon: Type, desc: "Transcribe video to text.", isNew: true },
      { id: "audio-to-text", title: "Audio to Text", icon: Mic, desc: "Transcribe audio to text.", isNew: true },
      { id: "youtube-transcript", title: "YouTube Transcript Generator", icon: Radio, desc: "Transcribe YouTube video." },
      { id: "transcribe-podcast", title: "Transcribe Podcast", icon: Podcast, desc: "Transcribe podcast to text." },
      { id: "summarize-podcast", title: "Summarize Podcast", icon: Brain, desc: "Summarize podcast content." },
    ],
  },
];

export const imageCategories = toolsMenu.filter((c) => c.group === "image");
export const totalImageTools = imageCategories.reduce((n, c) => n + c.tools.length, 0);