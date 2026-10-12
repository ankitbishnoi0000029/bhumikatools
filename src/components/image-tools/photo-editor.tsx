"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  Undo2,
  Redo2,
  RotateCw,
  RotateCcw,
  FlipHorizontal2,
  FlipVertical2,
  Crop as CropIcon,
  Brush,
  Type as TypeIcon,
  SlidersHorizontal,
  Trash2,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Sun,
  Contrast as ContrastIcon,
  Droplet,
  Eye,
  Palette,
  Lock,
  Info,
  Eraser,
  Plus,
  Layers,
  Cpu,
  ShieldCheck,
  ArrowUpRight,
  HelpCircle,
  ChevronDown,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Copy,
  Circle as CircleIcon,
  Square as SquareIcon,
  Minus as MinusIcon,
  ArrowRight,
  Triangle,
  Smile,
  Crop,
  Move,
  RefreshCw,
  Sparkle,
  Aperture,
  Film,
  Play,
  Award,
  Heart,
  Star,
  Sun as SunIcon,
  Wind,
  Camera,
  Cloud,
  Mountain,
  Flame,
  Leaf,
  Moon,
  Umbrella,
  Anchor,
  Activity,
  Battery,
  Bookmark,
  Box,
  Briefcase,
  Bug,
  Cake,
  Clock,
  CloudRain,
  Coffee,
  Compass,
  Crown,
  Diamond,
  Drum,
  Feather,
  Flower,
  Ghost,
  Gift,
  Glasses,
  Globe,
  Hexagon,
  Home,
  Key,
  Lightbulb,
  Music,
  Package,
  Pizza,
  Rocket,
  ShoppingBag,
  Skull,
  Snowflake,
  Sprout,
  Target,
  Tent,
  Trophy,
  Tv,
  Waves,
  Zap,
  Infinity as InfinityIcon,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================
type Tool =
  | "adjust"
  | "filters"
  | "crop"
  | "draw"
  | "shapes"
  | "text"
  | "stickers"
  | "effects"
  | "export";

type ExportFormat = "png" | "jpg" | "webp";

type Adj = {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  blur: number;
  grayscale: number;
  sepia: number;
  invert: number;
  opacity: number;
  vignette: number;
  grain: number;
  temperature: number;
};

type Stroke = {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  erase: boolean;
};

type ShapeType = "rect" | "circle" | "line" | "arrow" | "triangle";

type Shape = {
  id: string;
  type: ShapeType;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  strokeSize: number;
  filled: boolean;
};

type TextItem = {
  id: string;
  value: string;
  x: number;
  y: number;
  size: number;
  color: string;
  weight: number;
  font: string;
  bgColor: string;
  padding: number;
  shadow: number;
  outline: number;
  outlineColor: string;
  rotation: number;
};

type Sticker = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
};

type FrameStyle = "none" | "thin" | "thick" | "polaroid" | "rounded";

type EditorState = {
  src: string;
  adj: Adj;
  straighten: number;
  flipH: boolean;
  flipV: boolean;
  strokes: Stroke[];
  shapes: Shape[];
  texts: TextItem[];
  stickers: Sticker[];
  frame: FrameStyle;
  frameColor: string;
};

type Rect = { x: number; y: number; w: number; h: number };

type Exported = {
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
};

// ============================================================
// CONSTANTS
// ============================================================
const ACCENT = "#ff6a00";
const ACCENT_LIGHT = "#ff8c40";
const BG = "#f4f1ea";

const MAX_STAGE_W = 800;
const MAX_STAGE_H = 560;

const DEFAULT_ADJ: Adj = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  opacity: 100,
  vignette: 0,
  grain: 0,
  temperature: 0,
};

const EMPTY: EditorState = {
  src: "",
  adj: { ...DEFAULT_ADJ },
  straighten: 0,
  flipH: false,
  flipV: false,
  strokes: [],
  shapes: [],
  texts: [],
  stickers: [],
  frame: "none",
  frameColor: "#ffffff",
};

const FONTS = [
  { label: "Sans", value: "system-ui, -apple-system, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, 'SF Mono', Monaco, monospace" },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
  { label: "Script", value: "'Brush Script MT', cursive" },
  { label: "Elegant", value: "'Times New Roman', serif" },
];

const PRESETS: { name: string; emoji: string; values: Partial<Adj> }[] = [
  { name: "Original", emoji: "◯", values: {} },
  {
    name: "Vivid",
    emoji: "✦",
    values: { saturate: 155, contrast: 115, brightness: 104 },
  },
  { name: "Mono", emoji: "◑", values: { grayscale: 100, contrast: 112 } },
  {
    name: "Warm",
    emoji: "☀",
    values: { sepia: 32, saturate: 125, brightness: 106, hue: -8, temperature: 20 },
  },
  {
    name: "Cool",
    emoji: "❄",
    values: { hue: 18, saturate: 118, brightness: 102, temperature: -25 },
  },
  {
    name: "Fade",
    emoji: "░",
    values: { contrast: 86, saturate: 78, brightness: 112, sepia: 12 },
  },
  {
    name: "Noir",
    emoji: "◆",
    values: { grayscale: 100, contrast: 148, brightness: 92, vignette: 30 },
  },
  { name: "Invert", emoji: "◐", values: { invert: 100 } },
  {
    name: "Vintage",
    emoji: "✿",
    values: { sepia: 45, saturate: 85, contrast: 110, brightness: 105, grain: 25 },
  },
  {
    name: "Cinematic",
    emoji: "▣",
    values: { saturate: 110, contrast: 130, brightness: 95, hue: -5, vignette: 35 },
  },
  {
    name: "Fresh",
    emoji: "❋",
    values: { saturate: 125, brightness: 108, contrast: 105, hue: 5 },
  },
  {
    name: "Dramatic",
    emoji: "⚡",
    values: { contrast: 145, brightness: 92, saturate: 90, vignette: 40 },
  },
  {
    name: "Arctic",
    emoji: "❅",
    values: { hue: 30, saturate: 110, brightness: 105, temperature: -35 },
  },
  {
    name: "Chrome",
    emoji: "◈",
    values: { saturate: 80, contrast: 130, brightness: 105 },
  },
  {
    name: "Matte",
    emoji: "▤",
    values: { contrast: 85, brightness: 110, saturate: 90, sepia: 5 },
  },
  {
    name: "Dreamy",
    emoji: "☁",
    values: { brightness: 112, saturate: 118, blur: 1, contrast: 92 },
  },
];

const CROP_RATIOS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

const EMOJIS = [
  "😀", "😍", "🥰", "😎", "🤩", "😇", "🤔", "😂",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "⭐", "✨", "💫", "🌟", "🔥", "💥", "⚡", "🌈",
  "🌸", "🌺", "🌻", "🌹", "🍀", "🌿", "🌳", "🌴",
  "☀️", "🌙", "☁️", "🌧️", "❄️", "🌊", "🌋", "🏔️",
  "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "👑", "💎",
  "🍕", "🍔", "🍰", "🍦", "🍩", "☕", "🍷", "🥂",
  "⚽", "🏀", "🎾", "🎯", "🎮", "🎸", "🎨", "📷",
  "✈️", "🚗", "🚀", "🚁", "⛵", "🚂", "🛸", "🗺️",
  "👍", "👏", "🙌", "✌️", "🤙", "💪", "🙏", "👋",
];

const FRAMES: { key: FrameStyle; label: string }[] = [
  { key: "none", label: "None" },
  { key: "thin", label: "Thin" },
  { key: "thick", label: "Thick" },
  { key: "polaroid", label: "Polaroid" },
  { key: "rounded", label: "Rounded" },
];

const SHAPES: { key: ShapeType; label: string; icon: React.ReactNode }[] = [
  { key: "rect", label: "Rectangle", icon: <SquareIcon size={14} /> },
  { key: "circle", label: "Circle", icon: <CircleIcon size={14} /> },
  { key: "line", label: "Line", icon: <MinusIcon size={14} /> },
  { key: "arrow", label: "Arrow", icon: <ArrowRight size={14} /> },
  { key: "triangle", label: "Triangle", icon: <Triangle size={14} /> },
];

const ADJUSTMENTS: {
  key: keyof Adj;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit: string;
  icon: React.ReactNode;
}[] = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%", icon: <Sun size={13} /> },
  { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%", icon: <ContrastIcon size={13} /> },
  { key: "saturate", label: "Saturation", min: 0, max: 300, unit: "%", icon: <Droplet size={13} /> },
  { key: "hue", label: "Hue", min: -180, max: 180, unit: "°", icon: <Palette size={13} /> },
  { key: "temperature", label: "Temperature", min: -100, max: 100, unit: "", icon: <Flame size={13} /> },
  { key: "blur", label: "Blur", min: 0, max: 20, step: 0.5, unit: "px", icon: <Eye size={13} /> },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, unit: "%", icon: <Layers size={13} /> },
  { key: "sepia", label: "Sepia", min: 0, max: 100, unit: "%", icon: <Sparkle size={13} /> },
  { key: "invert", label: "Invert", min: 0, max: 100, unit: "%", icon: <ContrastIcon size={13} /> },
  { key: "opacity", label: "Opacity", min: 0, max: 100, unit: "%", icon: <Droplet size={13} /> },
  { key: "vignette", label: "Vignette", min: 0, max: 100, unit: "%", icon: <Aperture size={13} /> },
  { key: "grain", label: "Film grain", min: 0, max: 100, unit: "%", icon: <Film size={13} /> },
];

// ============================================================
// HELPERS
// ============================================================
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const buildFilterString = (a: Adj) => {
  const parts = [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturate}%)`,
    `blur(${a.blur}px)`,
    `grayscale(${a.grayscale}%)`,
    `sepia(${a.sepia}%)`,
    `hue-rotate(${a.hue}deg)`,
    `invert(${a.invert}%)`,
    `opacity(${a.opacity}%)`,
  ];
  return parts.join(" ");
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file."));
    r.readAsDataURL(file);
  });

const formatBytes = (b: number) => {
  if (!b) return "0 B";
  const k = 1024;
  const s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${s[i]}`;
};

const uid = () => Math.random().toString(36).slice(2, 10);

// paint a freehand stroke on a ctx
const paintStroke = (
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  scale = 1
) => {
  if (!s.points.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, s.size * scale);
  if (s.erase) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
  }
  if (s.points.length === 1) {
    const r = (s.size * scale) / 2;
    ctx.beginPath();
    ctx.arc(s.points[0].x * scale, s.points[0].y * scale, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * scale, s.points[0].y * scale);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x * scale, s.points[i].y * scale);
    }
    ctx.stroke();
  }
  ctx.restore();
};

// draw a geometric shape
const paintShape = (
  ctx: CanvasRenderingContext2D,
  sh: Shape,
  scale = 1
) => {
  const x1 = sh.from.x * scale;
  const y1 = sh.from.y * scale;
  const x2 = sh.to.x * scale;
  const y2 = sh.to.y * scale;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, sh.strokeSize * scale);
  ctx.strokeStyle = sh.color;
  ctx.fillStyle = sh.color;

  if (sh.type === "rect") {
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);
    if (sh.filled) ctx.fillRect(rx, ry, rw, rh);
    else ctx.strokeRect(rx, ry, rw, rh);
  } else if (sh.type === "circle") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const r = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (sh.filled) ctx.fill();
    else ctx.stroke();
  } else if (sh.type === "line") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (sh.type === "arrow") {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(10 * scale, sh.strokeSize * scale * 2.5);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - head * Math.cos(angle - Math.PI / 7),
      y2 - head * Math.sin(angle - Math.PI / 7)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - head * Math.cos(angle + Math.PI / 7),
      y2 - head * Math.sin(angle + Math.PI / 7)
    );
    ctx.stroke();
  } else if (sh.type === "triangle") {
    ctx.beginPath();
    ctx.moveTo((x1 + x2) / 2, y1);
    ctx.lineTo(x1, y2);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    if (sh.filled) ctx.fill();
    else ctx.stroke();
  }
  ctx.restore();
};

// transform stroke/shape/text/sticker coordinates on rotate
const transformPoint = (
  p: { x: number; y: number },
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
  angleCW: number
) => {
  const ocx = oldW / 2;
  const ocy = oldH / 2;
  const ncx = newW / 2;
  const ncy = newH / 2;
  const dx = p.x - ocx;
  const dy = p.y - ocy;
  let rx = dx;
  let ry = dy;
  if (angleCW === 90) {
    rx = -dy;
    ry = dx;
  } else if (angleCW === 180) {
    rx = -dx;
    ry = -dy;
  } else if (angleCW === 270) {
    rx = dy;
    ry = -dx;
  }
  return { x: rx + ncx, y: ry + ncy };
};

// ============================================================
// VARIANTS
// ============================================================
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ============================================================
// MAIN
// ============================================================
export const PhotoEditor = () => {
  // ---- state ----
  const [state, setState] = useState<EditorState>(EMPTY);
  const [history, setHistory] = useState<EditorState[]>([EMPTY]);
  const [histIndex, setHistIndex] = useState(0);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const [tool, setTool] = useState<Tool>("adjust");
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // zoom / pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number; px: number; py: number } | null>(null);

  // before/after
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // draw
  const [brushColor, setBrushColor] = useState("#ff6a00");
  const [brushSize, setBrushSize] = useState(12);
  const [erasing, setErasing] = useState(false);

  // shapes
  const [shapeType, setShapeType] = useState<ShapeType>("rect");
  const [shapeColor, setShapeColor] = useState("#ff6a00");
  const [shapeSize, setShapeSize] = useState(6);
  const [shapeFilled, setShapeFilled] = useState(false);

  // text
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // stickers
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // crop
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [cropRatio, setCropRatio] = useState<number | null>(null);

  // export
  const [format, setFormat] = useState<ExportFormat>("png");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [quality, setQuality] = useState(0.95);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<Exported | null>(null);
  const [exportScale, setExportScale] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // refs
  const stageRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const liveShapeRef = useRef<Shape | null>(null);
  const cropDragRef = useRef<{ mode: string; startX: number; startY: number; start: Rect } | null>(null);
  const dragRef = useRef<{ kind: "text" | "sticker"; id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const exportUrlRef = useRef<string | null>(null);

  // ============================================================
  // toast
  // ============================================================
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  // ============================================================
  // history
  // ============================================================
  const commit = useCallback(
    (next: EditorState) => {
      setState(next);
      setHistory((prev) => {
        const trimmed = prev.slice(0, histIndex + 1);
        return [...trimmed, next];
      });
      setHistIndex((i) => i + 1);
    },
    [histIndex]
  );

  const update = useCallback((patch: Partial<EditorState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const updateAdj = useCallback((patch: Partial<Adj>) => {
    setState((s) => ({ ...s, adj: { ...s.adj, ...patch } }));
  }, []);

  const undo = useCallback(() => {
    setHistIndex((i) => {
      if (i <= 0) return i;
      const ni = i - 1;
      setState(history[ni]);
      return ni;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistIndex((i) => {
      if (i >= history.length - 1) return i;
      const ni = i + 1;
      setState(history[ni]);
      return ni;
    });
  }, [history]);

  // ============================================================
  // load image
  // ============================================================
  useEffect(() => {
    if (!state.src) {
      setImg(null);
      return;
    }
    let cancelled = false;
    setImgLoading(true);
    const im = new Image();
    im.onload = () => {
      if (cancelled) return;
      setImg(im);
      setImgLoading(false);
    };
    im.onerror = () => {
      if (cancelled) return;
      setImgLoading(false);
      notify("Could not load that image.");
    };
    im.src = state.src;
    return () => {
      cancelled = true;
    };
  }, [state.src, notify]);

  // ============================================================
  // fit dims
  // ============================================================
  const natW = img?.naturalWidth ?? 0;
  const natH = img?.naturalHeight ?? 0;

  const fitScale =
    natW && natH
      ? Math.min(MAX_STAGE_W / natW, MAX_STAGE_H / natH, 1)
      : 1;
  const baseW = Math.round(natW * fitScale);
  const baseH = Math.round(natH * fitScale);
  const dispW = baseW;
  const dispH = baseH;

  const filterString = useMemo(
    () => buildFilterString(state.adj),
    [state.adj]
  );

  // fit zoom when image loads
  useEffect(() => {
    if (img) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [img]);

  // ============================================================
  // file load
  // ============================================================
  const loadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        notify("That's not an image.");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        notify("Image too large (max 25 MB).");
        return;
      }
      try {
        const url = await fileToDataUrl(file);
        const next: EditorState = {
          ...EMPTY,
          src: url,
          adj: { ...DEFAULT_ADJ },
        };
        setHistory([next]);
        setHistIndex(0);
        setState(next);
        setTool("adjust");
        setCropRect(null);
        setSelectedTextId(null);
        setSelectedStickerId(null);
        setExported(null);
      } catch {
        notify("Could not read that file.");
      }
    },
    [notify]
  );

  // paste from clipboard
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            await loadFile(f);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const t = e.target as HTMLElement;
      const isInput =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");

      if (mod && e.key.toLowerCase() === "z" && !isInput) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (mod && e.key.toLowerCase() === "s" && !isInput) {
        e.preventDefault();
        doExport();
      }
      if (e.key === "Delete" && !isInput) {
        if (selectedTextId) {
          commit({
            ...state,
            texts: state.texts.filter((t) => t.id !== selectedTextId),
          });
          setSelectedTextId(null);
        } else if (selectedStickerId) {
          commit({
            ...state,
            stickers: state.stickers.filter((s) => s.id !== selectedStickerId),
          });
          setSelectedStickerId(null);
        }
      }
      if (e.key === "Escape") {
        setSelectedTextId(null);
        setSelectedStickerId(null);
        setCropRect(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ============================================================
  // draw canvas render
  // ============================================================
  useEffect(() => {
    const c = drawCanvasRef.current;
    if (!c) return;
    const w = dispW || 1;
    const h = dispH || 1;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    state.strokes.forEach((s) => paintStroke(ctx, s));
    state.shapes.forEach((s) => paintShape(ctx, s));
  }, [state.strokes, state.shapes, dispW, dispH]);

  // ============================================================
  // pointer helpers
  // ============================================================
  const canvasPoint = (e: React.PointerEvent) => {
    const c = drawCanvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  // ============================================================
  // draw handlers
  // ============================================================
  const onDrawDown = (e: React.PointerEvent) => {
    if (tool === "draw") {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const p = canvasPoint(e);
      const s: Stroke = {
        points: [p],
        color: brushColor,
        size: brushSize,
        erase: erasing,
      };
      liveStrokeRef.current = s;
      const ctx = drawCanvasRef.current?.getContext("2d");
      if (ctx) paintStroke(ctx, s);
    } else if (tool === "shapes") {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const p = canvasPoint(e);
      const sh: Shape = {
        id: uid(),
        type: shapeType,
        from: p,
        to: p,
        color: shapeColor,
        strokeSize: shapeSize,
        filled: shapeFilled,
      };
      liveShapeRef.current = sh;
    }
  };

  const onDrawMove = (e: React.PointerEvent) => {
    if (tool === "draw" && liveStrokeRef.current) {
      const p = canvasPoint(e);
      const live = liveStrokeRef.current;
      const prev = live.points[live.points.length - 1];
      live.points.push(p);
      const ctx = drawCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = live.size;
      if (live.erase) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = live.color;
      }
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    } else if (tool === "shapes" && liveShapeRef.current) {
      const p = canvasPoint(e);
      liveShapeRef.current.to = p;
      // redraw canvas
      const c = drawCanvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      state.strokes.forEach((s) => paintStroke(ctx, s));
      state.shapes.forEach((s) => paintShape(ctx, s));
      paintShape(ctx, liveShapeRef.current);
    }
  };

  const onDrawUp = () => {
    if (liveStrokeRef.current) {
      const s = liveStrokeRef.current;
      liveStrokeRef.current = null;
      if (s.points.length) {
        commit({ ...state, strokes: [...state.strokes, s] });
      }
    } else if (liveShapeRef.current) {
      const sh = liveShapeRef.current;
      liveShapeRef.current = null;
      const dist =
        Math.abs(sh.from.x - sh.to.x) + Math.abs(sh.from.y - sh.to.y);
      if (dist > 4) {
        commit({ ...state, shapes: [...state.shapes, sh] });
      } else {
        const c = drawCanvasRef.current;
        if (c) {
          const ctx = c.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, c.width, c.height);
            state.strokes.forEach((s) => paintStroke(ctx, s));
            state.shapes.forEach((s) => paintShape(ctx, s));
          }
        }
      }
    }
  };

  // ============================================================
  // pan / zoom
  // ============================================================
  const onStageDown = (e: React.PointerEvent) => {
    // only pan with middle-click, space, or when zoom > 1 and no tool active
    const wantsPan =
      e.button === 1 ||
      (tool !== "draw" && tool !== "shapes" && tool !== "crop");
    if (!wantsPan) return;
    if (zoom <= 1.05 && !e.shiftKey) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setPanStart({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
  };

  const onStageMove = (e: React.PointerEvent) => {
    if (panStart) {
      setPan({
        x: panStart.px + (e.clientX - panStart.x),
        y: panStart.py + (e.clientY - panStart.y),
      });
      return;
    }
    onDrawMove(e);
    onTextMove(e);
    onStickerMove(e);
    onCropMove(e);
  };

  const onStageUp = () => {
    setPanStart(null);
    onDrawUp();
    onTextUp();
    onStickerUp();
    onCropUp();
  };

  const fitToScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ============================================================
  // text handlers
  // ============================================================
  const onTextDown = (e: React.PointerEvent, t: TextItem) => {
    if (tool !== "text") return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedTextId(t.id);
    setSelectedStickerId(null);
    dragRef.current = {
      kind: "text",
      id: t.id,
      sx: e.clientX,
      sy: e.clientY,
      ox: t.x,
      oy: t.y,
    };
  };

  const onTextMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.kind !== "text") return;
    const nx = d.ox + (e.clientX - d.sx) / zoom;
    const ny = d.oy + (e.clientY - d.sy) / zoom;
    setState((s) => ({
      ...s,
      texts: s.texts.map((t) =>
        t.id === d.id
          ? {
              ...t,
              x: clamp(nx, -40, dispW - 10),
              y: clamp(ny, -10, dispH - 10),
            }
          : t
      ),
    }));
  };

  const onTextUp = () => {
    if (dragRef.current?.kind === "text") {
      dragRef.current = null;
      commit(state);
    }
  };

  const addText = () => {
    const t: TextItem = {
      id: uid(),
      value: "Your text",
      x: dispW / 2 - 60,
      y: dispH / 2 - 20,
      size: 42,
      color: "#ffffff",
      weight: 700,
      font: FONTS[0].value,
      bgColor: "transparent",
      padding: 8,
      shadow: 0,
      outline: 0,
      outlineColor: "#000000",
      rotation: 0,
    };
    commit({ ...state, texts: [...state.texts, t] });
    setSelectedTextId(t.id);
    setTool("text");
  };

  // ============================================================
  // sticker handlers
  // ============================================================
  const onStickerDown = (e: React.PointerEvent, s: Sticker) => {
    if (tool !== "stickers") return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedStickerId(s.id);
    setSelectedTextId(null);
    dragRef.current = {
      kind: "sticker",
      id: s.id,
      sx: e.clientX,
      sy: e.clientY,
      ox: s.x,
      oy: s.y,
    };
  };

  const onStickerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.kind !== "sticker") return;
    const nx = d.ox + (e.clientX - d.sx) / zoom;
    const ny = d.oy + (e.clientY - d.sy) / zoom;
    setState((s) => ({
      ...s,
      stickers: s.stickers.map((it) =>
        it.id === d.id
          ? {
              ...it,
              x: clamp(nx, 0, dispW - 20),
              y: clamp(ny, 0, dispH - 20),
            }
          : it
      ),
    }));
  };

  const onStickerUp = () => {
    if (dragRef.current?.kind === "sticker") {
      dragRef.current = null;
      commit(state);
    }
  };

  const addSticker = (emoji: string) => {
    const s: Sticker = {
      id: uid(),
      emoji,
      x: dispW / 2 - 24,
      y: dispH / 2 - 24,
      size: 72,
      rotation: 0,
    };
    commit({ ...state, stickers: [...state.stickers, s] });
    setSelectedStickerId(s.id);
    setTool("stickers");
  };

  // ============================================================
  // crop
  // ============================================================
  const startCrop = useCallback(() => {
    const pad = 24;
    setCropRect({
      x: pad,
      y: pad,
      w: Math.max(60, dispW - pad * 2),
      h: Math.max(60, dispH - pad * 2),
    });
    setCropRatio(null);
  }, [dispW, dispH]);

  const applyRatio = (ratio: number | null) => {
    setCropRatio(ratio);
    if (!ratio) return;
    const pad = 24;
    const availW = dispW - pad * 2;
    const availH = dispH - pad * 2;
    let w = availW;
    let h = w / ratio;
    if (h > availH) {
      h = availH;
      w = h * ratio;
    }
    setCropRect({
      x: (dispW - w) / 2,
      y: (dispH - h) / 2,
      w,
      h,
    });
  };

  const onCropDown = (e: React.PointerEvent, mode: string) => {
    if (!cropRect) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    cropDragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      start: { ...cropRect },
    };
  };

  const onCropMove = (e: React.PointerEvent) => {
    const d = cropDragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / zoom;
    const dy = (e.clientY - d.startY) / zoom;
    let { x, y, w, h } = d.start;
    const MIN = 48;

    if (d.mode === "move") {
      x = clamp(x + dx, 0, dispW - w);
      y = clamp(y + dy, 0, dispH - h);
    } else {
      if (d.mode.includes("w")) {
        const nx = clamp(d.start.x + dx, 0, d.start.x + d.start.w - MIN);
        w = d.start.w + (d.start.x - nx);
        x = nx;
      }
      if (d.mode.includes("e")) {
        w = clamp(d.start.w + dx, MIN, dispW - d.start.x);
      }
      if (d.mode.includes("n")) {
        const ny = clamp(d.start.y + dy, 0, d.start.y + d.start.h - MIN);
        h = d.start.h + (d.start.y - ny);
        y = ny;
      }
      if (d.mode.includes("s")) {
        h = clamp(d.start.h + dy, MIN, dispH - d.start.y);
      }
      if (cropRatio) {
        const targetH = w / cropRatio;
        if (d.mode.includes("n")) y = d.start.y + (d.start.h - targetH);
        h = targetH;
        if (y < 0) {
          h += y;
          y = 0;
        }
        if (y + h > dispH) {
          h = dispH - y;
          w = h * cropRatio;
        }
      }
    }
    setCropRect({ x, y, w, h });
  };

  const onCropUp = () => {
    cropDragRef.current = null;
  };

  const applyCrop = () => {
    if (!cropRect || !img) return;
    const rw = natW;
    const rh = natH;
    const canvas = document.createElement("canvas");
    canvas.width = rw;
    canvas.height = rh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    const k = rw / dispW;
    const cx = cropRect.x * k;
    const cy = cropRect.y * k;
    const cw = cropRect.w * k;
    const ch = cropRect.h * k;

    const outW = Math.max(1, Math.round(cw));
    const outH = Math.max(1, Math.round(ch));

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    const octx = out.getContext("2d");
    if (!octx) return;
    octx.drawImage(canvas, cx, cy, cw, ch, 0, 0, outW, outH);

    const newSrc = out.toDataURL("image/png");
    const newFit = Math.min(MAX_STAGE_W / outW, MAX_STAGE_H / outH, 1);
    const nDispW = Math.round(outW * newFit);
    const s = nDispW / cropRect.w;

    const newStrokes = state.strokes.map((st) => ({
      ...st,
      size: st.size * s,
      points: st.points.map((p) => ({
        x: (p.x - cropRect.x) * s,
        y: (p.y - cropRect.y) * s,
      })),
    }));

    const newShapes = state.shapes.map((sh) => ({
      ...sh,
      strokeSize: sh.strokeSize * s,
      from: { x: (sh.from.x - cropRect.x) * s, y: (sh.from.y - cropRect.y) * s },
      to: { x: (sh.to.x - cropRect.x) * s, y: (sh.to.y - cropRect.y) * s },
    }));

    const newTexts = state.texts.map((t) => ({
      ...t,
      x: (t.x - cropRect.x) * s,
      y: (t.y - cropRect.y) * s,
      size: t.size * s,
    }));

    const newStickers = state.stickers.map((s2) => ({
      ...s2,
      x: (s2.x - cropRect.x) * s,
      y: (s2.y - cropRect.y) * s,
      size: s2.size * s,
    }));

    const next: EditorState = {
      ...state,
      src: newSrc,
      strokes: newStrokes,
      shapes: newShapes,
      texts: newTexts,
      stickers: newStickers,
    };

    commit(next);
    setCropRect(null);
    setSelectedTextId(null);
    setSelectedStickerId(null);
    setTool("adjust");
    notify("Cropped.");
  };

  // ============================================================
  // transform: rotate / flip (destructive but keeps overlays)
  // ============================================================
  const rotate90 = (dir: 1 | -1) => {
    if (!img) return;
    const rw = natH;
    const rh = natW;
    const canvas = document.createElement("canvas");
    canvas.width = rw;
    canvas.height = rh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(rw / 2, rh / 2);
    ctx.rotate((dir * 90 * Math.PI) / 180);
    ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    ctx.drawImage(img, -natW / 2, -natH / 2, natW, natH);

    const newSrc = canvas.toDataURL("image/png");
    const newFit = Math.min(MAX_STAGE_W / rw, MAX_STAGE_H / rh, 1);
    const nDispW = Math.round(rw * newFit);
    const nDispH = Math.round(rh * newFit);
    const angleCW = dir === 1 ? 90 : 270;

    const oldW = dispW;
    const oldH = dispH;

    const tp = (p: { x: number; y: number }) =>
      transformPoint(p, oldW, oldH, nDispW, nDispH, angleCW);

    const newStrokes = state.strokes.map((s) => ({
      ...s,
      size: s.size * (nDispW / Math.max(1, oldH)),
      points: s.points.map(tp),
    }));

    const newShapes = state.shapes.map((s) => ({
      ...s,
      strokeSize: s.strokeSize * (nDispW / Math.max(1, oldH)),
      from: tp(s.from),
      to: tp(s.to),
    }));

    const newTexts = state.texts.map((t) => {
      const p = tp({ x: t.x, y: t.y });
      return {
        ...t,
        x: p.x,
        y: p.y,
        size: t.size * (nDispW / Math.max(1, oldH)),
      };
    });

    const newStickers = state.stickers.map((s) => {
      const p = tp({ x: s.x, y: s.y });
      return {
        ...s,
        x: p.x,
        y: p.y,
        size: s.size * (nDispW / Math.max(1, oldH)),
      };
    });

    commit({
      ...state,
      src: newSrc,
      flipH: false,
      flipV: false,
      straighten: 0,
      strokes: newStrokes,
      shapes: newShapes,
      texts: newTexts,
      stickers: newStickers,
    });
    setCropRect(null);
    notify(`Rotated ${dir === 1 ? "90° CW" : "90° CCW"}.`);
  };

  const flip = (axis: "h" | "v") => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = natW;
    canvas.height = natH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(natW / 2, natH / 2);
    ctx.scale(
      axis === "h" ? -1 : 1,
      axis === "v" ? -1 : 1
    );
    ctx.drawImage(img, -natW / 2, -natH / 2, natW, natH);
    const newSrc = canvas.toDataURL("image/png");

    const tp = (p: { x: number; y: number }) => ({
      x: axis === "h" ? dispW - p.x : p.x,
      y: axis === "v" ? dispH - p.y : p.y,
    });

    commit({
      ...state,
      src: newSrc,
      strokes: state.strokes.map((s) => ({
        ...s,
        points: s.points.map(tp),
      })),
      shapes: state.shapes.map((s) => ({
        ...s,
        from: tp(s.from),
        to: tp(s.to),
      })),
      texts: state.texts.map((t) => {
        const p = tp({ x: t.x, y: t.y });
        return { ...t, x: p.x, y: p.y };
      }),
      stickers: state.stickers.map((s) => {
        const p = tp({ x: s.x, y: s.y });
        return { ...s, x: p.x, y: p.y };
      }),
    });
    notify(`Flipped ${axis === "h" ? "horizontally" : "vertically"}.`);
  };

  // ============================================================
  // auto enhance
  // ============================================================
  const autoEnhance = () => {
    if (!img) return;
    // Sample the image to compute basic statistics
    const sample = document.createElement("canvas");
    const SW = 64;
    const SH = 64;
    sample.width = SW;
    sample.height = SH;
    const ctx = sample.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, SW, SH);
    const data = ctx.getImageData(0, 0, SW, SH).data;

    let sum = 0;
    let min = 255;
    let max = 0;
    let satSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += lum;
      if (lum < min) min = lum;
      if (lum > max) max = lum;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      satSum += mx === 0 ? 0 : (mx - mn) / mx;
    }
    const n = data.length / 4;
    const avg = sum / n;
    const avgSat = satSum / n;

    const brightness = clamp(128 / Math.max(1, avg) * 100, 85, 130);
    const contrast = clamp(
      (128 / Math.max(1, (max - min) / 2)) * 100,
      90,
      140
    );
    const saturate = clamp(100 + (0.4 - avgSat) * 80, 90, 145);

    commit({
      ...state,
      adj: {
        ...state.adj,
        brightness,
        contrast,
        saturate,
      },
    });
    notify("Auto-enhanced.");
  };

  // ============================================================
  // flatten to canvas (for export)
  // ============================================================
  const flatten = useCallback((): HTMLCanvasElement | null => {
    if (!img || !natW || !natH) return null;

    const outW = natW;
    const outH = natH;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // background
    if (format === "jpg" || bgColor !== "transparent") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, outW, outH);
    }

    // image with filters + straighten
    ctx.save();
    ctx.filter = filterString;
    if (state.straighten !== 0) {
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((state.straighten * Math.PI) / 180);
      const scale = Math.max(
        1,
        Math.abs(Math.cos((state.straighten * Math.PI) / 180)) +
          Math.abs(Math.sin((state.straighten * Math.PI) / 180))
      );
      ctx.scale(scale, scale);
      ctx.translate(-outW / 2, -outH / 2);
    }
    ctx.drawImage(img, 0, 0, outW, outH);
    ctx.restore();
    ctx.filter = "none";

    // temperature overlay
    if (state.adj.temperature !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      const t = state.adj.temperature / 100;
      const col =
        t > 0
          ? `rgba(255, 170, 80, ${Math.abs(t) * 0.45})`
          : `rgba(80, 150, 255, ${Math.abs(t) * 0.45})`;
      ctx.fillStyle = col;
      ctx.fillRect(0, 0, outW, outH);
      ctx.restore();
    }

    // vignette
    if (state.adj.vignette > 0) {
      const g = ctx.createRadialGradient(
        outW / 2,
        outH / 2,
        Math.min(outW, outH) * 0.2,
        outW / 2,
        outH / 2,
        Math.max(outW, outH) * 0.75
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${state.adj.vignette / 100})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, outW, outH);
    }

    // grain
    if (state.adj.grain > 0) {
      const grainCanvas = document.createElement("canvas");
      grainCanvas.width = outW;
      grainCanvas.height = outH;
      const gctx = grainCanvas.getContext("2d");
      if (gctx) {
        const id = gctx.createImageData(outW, outH);
        const d = id.data;
        const amt = state.adj.grain / 100;
        for (let i = 0; i < d.length; i += 4) {
          const v = 128 + (Math.random() - 0.5) * 255 * amt;
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
          d[i + 3] = 255;
        }
        gctx.putImageData(id, 0, 0);
      }
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.35;
      ctx.drawImage(grainCanvas, 0, 0);
      ctx.restore();
    }

    // strokes + shapes at natural resolution
    const strokeScale = outW / dispW;
    state.strokes.forEach((s) => paintStroke(ctx, s, strokeScale));
    state.shapes.forEach((s) => paintShape(ctx, s, strokeScale));

    // text
    const k = outW / dispW;
    state.texts.forEach((t) => {
      ctx.save();
      ctx.translate(t.x * k, t.y * k);
      ctx.rotate((t.rotation * Math.PI) / 180);
      const fs = t.size * k;
      ctx.font = `${t.weight} ${fs}px ${t.font}`;
      ctx.textBaseline = "top";

      const metrics = ctx.measureText(t.value);
      const w = metrics.width;
      const h = fs * 1.1;

      // background
      if (t.bgColor !== "transparent" && t.bgColor !== "none") {
        ctx.fillStyle = t.bgColor;
        const p = t.padding * k;
        const r = Math.min(8 * k, p / 2);
        const rx = -p;
        const ry = -p / 2;
        const rw = w + p * 2;
        const rh = h + p;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(rx, ry, rw, rh, r);
        } else {
          ctx.rect(rx, ry, rw, rh);
        }
        ctx.fill();
      }

      // shadow
      if (t.shadow > 0) {
        ctx.shadowColor = `rgba(0,0,0,${Math.min(1, t.shadow / 20)})`;
        ctx.shadowBlur = t.shadow * k;
        ctx.shadowOffsetY = t.shadow * 0.15 * k;
      }

      // outline
      if (t.outline > 0) {
        ctx.strokeStyle = t.outlineColor;
        ctx.lineWidth = t.outline * k * 0.5;
        ctx.lineJoin = "round";
        ctx.strokeText(t.value, 0, 0);
      }

      ctx.fillStyle = t.color;
      ctx.fillText(t.value, 0, 0);
      ctx.restore();
    });

    // stickers
    state.stickers.forEach((s) => {
      ctx.save();
      ctx.translate((s.x + s.size / 2) * k, (s.y + s.size / 2) * k);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.font = `${s.size * k}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.emoji, 0, 0);
      ctx.restore();
    });

    // frame
    if (state.frame !== "none") {
      const fw = Math.round(outW * 0.025);
      ctx.save();
      if (state.frame === "thin") {
        ctx.strokeStyle = state.frameColor;
        ctx.lineWidth = fw * 0.5;
        ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, outW - ctx.lineWidth, outH - ctx.lineWidth);
      } else if (state.frame === "thick") {
        ctx.strokeStyle = state.frameColor;
        ctx.lineWidth = fw * 2;
        ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, outW - ctx.lineWidth, outH - ctx.lineWidth);
      } else if (state.frame === "polaroid") {
        const padTop = fw * 1.5;
        const padSide = fw * 1.5;
        const padBottom = fw * 4;
        const totalW = outW + padSide * 2;
        const totalH = outH + padTop + padBottom;
        const pc = document.createElement("canvas");
        pc.width = totalW;
        pc.height = totalH;
        const pctx = pc.getContext("2d");
        if (pctx) {
          pctx.fillStyle = state.frameColor;
          pctx.fillRect(0, 0, totalW, totalH);
          pctx.drawImage(canvas, padSide, padTop);
          return pc;
        }
      }
      ctx.restore();
    }

    return canvas;
  }, [
    img,
    natW,
    natH,
    state.adj,
    state.straighten,
    state.strokes,
    state.shapes,
    state.texts,
    state.stickers,
    state.frame,
    state.frameColor,
    filterString,
    dispW,
    format,
    bgColor,
  ]);

  // ============================================================
  // export
  // ============================================================
  const doExport = async () => {
    if (!img) {
      notify("Load an image first.");
      return;
    }
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 20));
      let canvas = flatten();
      if (!canvas) throw new Error("Nothing to export.");

      // apply scale
      if (exportScale !== 1) {
        const scaled = document.createElement("canvas");
        scaled.width = Math.round(canvas.width * exportScale);
        scaled.height = Math.round(canvas.height * exportScale);
        const sctx = scaled.getContext("2d");
        if (sctx) {
          sctx.imageSmoothingQuality = "high";
          sctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
          canvas = scaled;
        }
      }

      const mime =
        format === "png"
          ? "image/png"
          : format === "jpg"
          ? "image/jpeg"
          : "image/webp";
      const blob: Blob | null = await new Promise((resolve) =>
        canvas!.toBlob(
          (b) => resolve(b),
          mime,
          format === "png" ? undefined : quality
        )
      );
      if (!blob) throw new Error("Export failed.");

      if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
      const url = URL.createObjectURL(blob);
      exportUrlRef.current = url;

      setExported({
        url,
        name: `photo-${canvas.width}x${canvas.height}.${format}`,
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
      });
      notify("Image ready!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed.";
      if (msg.includes("tainted") || msg.includes("SecurityError")) {
        notify("Cross-origin assets blocked the export.");
      } else {
        notify(msg);
      }
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async () => {
    if (!exported) return;
    try {
      const res = await fetch(exported.url);
      const blob = await res.blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      notify("Copied to clipboard!");
    } catch {
      notify("Copy failed — try downloading instead.");
    }
  };

  // ============================================================
  // reset
  // ============================================================
  const resetAll = () => {
    const next: EditorState = {
      ...EMPTY,
      src: state.src,
      adj: { ...DEFAULT_ADJ },
    };
    commit(next);
    setCropRect(null);
    setSelectedTextId(null);
    setSelectedStickerId(null);
    setTool("adjust");
    notify("Reset to original.");
  };

  const clearImage = () => {
    setHistory([EMPTY]);
    setHistIndex(0);
    setState(EMPTY);
    setImg(null);
    setExported(null);
    setCropRect(null);
    setSelectedTextId(null);
    setSelectedStickerId(null);
  };

  // ============================================================
  // derived
  // ============================================================
  const canUndo = histIndex > 0;
  const canRedo = histIndex < history.length - 1;
  const selectedText = state.texts.find((t) => t.id === selectedTextId) || null;
  const selectedSticker =
    state.stickers.find((s) => s.id === selectedStickerId) || null;

  const updateSelectedText = (patch: Partial<TextItem>) => {
    if (!selectedTextId) return;
    setState((s) => ({
      ...s,
      texts: s.texts.map((t) =>
        t.id === selectedTextId ? { ...t, ...patch } : t
      ),
    }));
  };
  const commitSelectedText = () => {
    if (selectedTextId) commit(state);
  };

  const updateSelectedSticker = (patch: Partial<Sticker>) => {
    if (!selectedStickerId) return;
    setState((s) => ({
      ...s,
      stickers: s.stickers.map((st) =>
        st.id === selectedStickerId ? { ...st, ...patch } : st
      ),
    }));
  };
  const commitSelectedSticker = () => {
    if (selectedStickerId) commit(state);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative min-h-screen bg-[#f4f1ea] text-[#0a0a0a] overflow-x-hidden">
      {/* vertical rules */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="container mx-auto px-8 h-full relative max-w-[1400px]">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-black/[0.05]" />
          <div className="absolute right-8 top-0 bottom-0 w-px bg-black/[0.05]" />
        </div>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-black text-white text-[13px] font-medium shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative container mx-auto px-6 md:px-8 max-w-[1400px] py-12 md:py-16">
        {/* breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-black/40 mb-10"
        >
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <span className="text-black/25">/</span>
          <Link href="/image-tools" className="hover:text-black transition-colors">Image Tools</Link>
          <span className="text-black/25">/</span>
          <span className="text-black/70">Photo Editor</span>
        </motion.nav>

        {/* header */}
        <motion.header
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end mb-12 pb-8 border-b border-black/[0.12]"
        >
          <div className="lg:col-span-7">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-black/[0.08] bg-white/60 backdrop-blur-md mb-6"
            >
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]"
              />
              <span className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/60">
                Upload · Edit · Export
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[40px] md:text-[56px] lg:text-[64px] leading-[1.02] tracking-[-0.02em]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Your photos,
              <br />
              <span className="italic text-[#ff6a00]">your rules</span>.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-[15px] md:text-[16px] leading-[1.7] text-black/60 max-w-xl"
            >
              Crop, rotate, filter, draw, add shapes, text and stickers — all inside
              your browser. No uploads, no accounts, no watermarks.{" "}
              <strong className="text-black/80 font-medium">
                Everything stays on your device
              </strong>
              .
            </motion.p>
          </div>

          <motion.div
            variants={fadeUp}
            className="lg:col-span-5 lg:pb-2 flex flex-wrap gap-x-7 gap-y-3"
          >
            <TrustBadge icon={<ShieldCheck size={12} />} label="Private" />
            <TrustBadge icon={<Zap size={12} />} label="Instant" />
            <TrustBadge icon={<Sparkles size={12} />} label="Free" />
          </motion.div>
        </motion.header>

        {/* editor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* canvas */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="lg:col-span-8"
          >
            <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden shadow-[0_18px_50px_-24px_rgba(0,0,0,0.2)]">
              {/* toolbar */}
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-black/[0.06] bg-black/[0.012] flex-wrap">
                <div className="flex items-center gap-1.5">
                  <ToolbarBtn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                    <Undo2 size={14} />
                  </ToolbarBtn>
                  <ToolbarBtn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
                    <Redo2 size={14} />
                  </ToolbarBtn>
                  <span className="w-px h-4 bg-black/[0.08] mx-1" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium text-white bg-black hover:bg-[#ff6a00] transition-colors"
                  >
                    <Upload size={12} />
                    {img ? "Replace" : "Upload"}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {img && (
                    <>
                      <ToolbarBtn onClick={() => setZoom((z) => clamp(z - 0.25, 0.25, 4))} title="Zoom out">
                        <ZoomOut size={14} />
                      </ToolbarBtn>
                      <span className="text-[10.5px] font-mono text-black/50 px-1 w-12 text-center">
                        {Math.round(zoom * 100)}%
                      </span>
                      <ToolbarBtn onClick={() => setZoom((z) => clamp(z + 0.25, 0.25, 4))} title="Zoom in">
                        <ZoomIn size={14} />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={fitToScreen} title="Fit to screen">
                        <Maximize2 size={13} />
                      </ToolbarBtn>
                      <ToolbarBtn
                        onClick={() => setShowGrid((g) => !g)}
                        title="Toggle grid"
                        active={showGrid}
                      >
                        <Grid3x3 size={13} />
                      </ToolbarBtn>
                      <button
                        onPointerDown={() => setShowOriginal(true)}
                        onPointerUp={() => setShowOriginal(false)}
                        onPointerLeave={() => setShowOriginal(false)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium text-black/60 hover:text-black hover:bg-black/[0.05] transition-colors"
                        title="Hold to see original"
                      >
                        <Eye size={12} />
                        Before
                      </button>
                      <span className="w-px h-4 bg-black/[0.08] mx-1" />
                      <ToolbarBtn onClick={resetAll} title="Reset all edits">
                        <RefreshCw size={13} />
                      </ToolbarBtn>
                      <ToolbarBtn onClick={clearImage} title="Close image">
                        <X size={14} />
                      </ToolbarBtn>
                    </>
                  )}
                </div>
              </div>

              {/* stage */}
              <div
                ref={stageRef}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) await loadFile(f);
                }}
                onPointerDown={onStageDown}
                onPointerMove={onStageMove}
                onPointerUp={onStageUp}
                onPointerCancel={onStageUp}
                className={`relative flex items-center justify-center min-h-[560px] p-6 overflow-hidden transition-colors ${
                  dragging ? "bg-[#ff6a00]/10" : "bg-[#fafaf6]"
                }`}
                style={{
                  backgroundImage: img
                    ? undefined
                    : `linear-gradient(45deg, rgba(0,0,0,0.03) 25%, transparent 25%),
                       linear-gradient(-45deg, rgba(0,0,0,0.03) 25%, transparent 25%),
                       linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.03) 75%),
                       linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.03) 75%)`,
                  backgroundSize: img ? undefined : "20px 20px",
                  backgroundPosition: img
                    ? undefined
                    : "0 0, 0 10px, 10px -10px, -10px 0px",
                }}
              >
                {!img && !imgLoading && (
                  <EmptyState onPick={() => fileInputRef.current?.click()} />
                )}

                {imgLoading && (
                  <div className="flex flex-col items-center gap-3 text-[#ff6a00]">
                    <Loader2 size={26} className="animate-spin" />
                    <span className="text-[12px] font-mono uppercase tracking-[0.2em]">
                      Loading…
                    </span>
                  </div>
                )}

                {img && !imgLoading && (
                  <div
                    className="relative select-none origin-center"
                    style={{
                      width: dispW,
                      height: dispH,
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transition: panStart ? "none" : "transform 0.18s ease-out",
                    }}
                  >
                    {/* image */}
                    <img
                      src={state.src}
                      alt=""
                      draggable={false}
                      className="absolute inset-0 w-full h-full shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] rounded-[2px]"
                      style={{
                        filter: showOriginal ? "none" : filterString,
                        opacity: showOriginal ? 1 : undefined,
                        transform: state.straighten
                          ? `rotate(${state.straighten}deg) scale(${Math.min(
                              2,
                              1 +
                                Math.abs(state.straighten) / 90
                            )})`
                          : undefined,
                      }}
                    />

                    {/* drawing canvas */}
                    <canvas
                      ref={drawCanvasRef}
                      width={dispW}
                      height={dispH}
                      className="absolute inset-0 w-full h-full"
                      style={{
                        pointerEvents:
                          tool === "draw" || tool === "shapes"
                            ? "auto"
                            : "none",
                        cursor:
                          tool === "draw"
                            ? "crosshair"
                            : tool === "shapes"
                            ? "crosshair"
                            : "default",
                        touchAction: "none",
                      }}
                    />

                    {/* grid overlay */}
                    {showGrid && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40 mix-blend-overlay" />
                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40 mix-blend-overlay" />
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40 mix-blend-overlay" />
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40 mix-blend-overlay" />
                      </div>
                    )}

                    {/* text layers */}
                    {!showOriginal &&
                      state.texts.map((t) => (
                        <div
                          key={t.id}
                          onPointerDown={(e) => onTextDown(e, t)}
                          className={`absolute whitespace-nowrap leading-none ${
                            tool === "text"
                              ? "cursor-move"
                              : "cursor-default pointer-events-none"
                          } ${
                            selectedTextId === t.id
                              ? "ring-2 ring-[#ff6a00] ring-offset-2 ring-offset-transparent rounded-[3px]"
                              : ""
                          }`}
                          style={{
                            left: t.x,
                            top: t.y,
                            fontSize: t.size,
                            color: t.color,
                            fontWeight: t.weight,
                            fontFamily: t.font,
                            transform: `rotate(${t.rotation}deg)`,
                            transformOrigin: "top left",
                            touchAction: "none",
                            padding: t.padding,
                            background:
                              t.bgColor === "transparent"
                                ? undefined
                                : t.bgColor,
                            borderRadius: t.bgColor === "transparent" ? 0 : 8,
                            textShadow:
                              t.shadow > 0
                                ? `0 ${Math.round(t.shadow * 0.15)}px ${
                                    t.shadow
                                  }px rgba(0,0,0,0.5)`
                                : undefined,
                            WebkitTextStroke:
                              t.outline > 0
                                ? `${t.outline * 0.5}px ${t.outlineColor}`
                                : undefined,
                            paintOrder: "stroke fill",
                          }}
                        >
                          {t.value}
                        </div>
                      ))}

                    {/* stickers */}
                    {!showOriginal &&
                      state.stickers.map((s) => (
                        <div
                          key={s.id}
                          onPointerDown={(e) => onStickerDown(e, s)}
                          className={`absolute select-none ${
                            tool === "stickers"
                              ? "cursor-move"
                              : "cursor-default pointer-events-none"
                          } ${
                            selectedStickerId === s.id
                              ? "ring-2 ring-[#ff6a00] ring-offset-2 ring-offset-transparent rounded-[6px]"
                              : ""
                          }`}
                          style={{
                            left: s.x,
                            top: s.y,
                            fontSize: s.size,
                            lineHeight: 1,
                            transform: `rotate(${s.rotation}deg)`,
                            transformOrigin: "center",
                            touchAction: "none",
                            fontFamily:
                              '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                          }}
                        >
                          {s.emoji}
                        </div>
                      ))}

                    {/* crop overlay */}
                    {tool === "crop" && cropRect && (
                      <>
                        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                        <div
                          className="absolute border-2 border-[#ff6a00] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                          style={{
                            left: cropRect.x,
                            top: cropRect.y,
                            width: cropRect.w,
                            height: cropRect.h,
                            cursor: "move",
                          }}
                          onPointerDown={(e) => onCropDown(e, "move")}
                        >
                          <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                          </div>
                          {(["nw", "ne", "sw", "se"] as const).map((c) => (
                            <div
                              key={c}
                              onPointerDown={(e) => onCropDown(e, c)}
                              className="absolute w-4 h-4 bg-white border-2 border-[#ff6a00] rounded-full"
                              style={{
                                left: c.includes("w") ? -8 : undefined,
                                right: c.includes("e") ? -8 : undefined,
                                top: c.includes("n") ? -8 : undefined,
                                bottom: c.includes("s") ? -8 : undefined,
                                cursor:
                                  c === "nw" || c === "se"
                                    ? "nwse-resize"
                                    : "nesw-resize",
                                touchAction: "none",
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* drop hint */}
                <AnimatePresence>
                  {dragging && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-4 rounded-2xl border-2 border-dashed border-[#ff6a00] flex items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-none z-10"
                    >
                      <div className="text-center">
                        <Upload size={28} className="mx-auto text-[#ff6a00] mb-2" />
                        <p className="text-[13px] font-medium text-[#ff6a00]">
                          Drop to load
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* crop action bar */}
              <AnimatePresence>
                {tool === "crop" && cropRect && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-black/[0.06] bg-[#ff6a00]/[0.04]"
                  >
                    <div className="px-5 py-3.5 flex flex-wrap items-center gap-3">
                      <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-black/50">
                        Ratio
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CROP_RATIOS.map((r) => (
                          <button
                            key={r.label}
                            onClick={() => applyRatio(r.value)}
                            className={`px-3 py-1 rounded-full text-[11.5px] border transition-colors ${
                              cropRatio === r.value
                                ? "bg-black text-white border-black"
                                : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => setCropRect(null)}
                          className="px-4 py-1.5 rounded-full text-[12px] text-black/60 hover:text-black hover:bg-black/[0.05] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={applyCrop}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] transition-colors"
                        >
                          <Check size={12} />
                          Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* hint bar */}
              {img && (
                <div className="border-t border-black/[0.06] px-5 py-2.5 bg-black/[0.012] flex items-center justify-between gap-3">
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-black/40">
                    {tool === "draw" && "Paint on the image"}
                    {tool === "shapes" && "Drag to draw shape"}
                    {tool === "text" && "Drag text to move · Delete to remove"}
                    {tool === "stickers" && "Tap a sticker to move it"}
                    {tool === "crop" && "Drag the crop box · choose ratio"}
                    {(tool === "adjust" || tool === "filters" || tool === "effects") &&
                      "Sliders update the preview live"}
                  </span>
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-black/30">
                    {dispW} × {dispH}
                  </span>
                </div>
              )}
            </div>

            {/* tool tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              <ToolTab active={tool === "adjust"} onClick={() => { setTool("adjust"); setCropRect(null); }} icon={<SlidersHorizontal size={14} />} label="Adjust" />
              <ToolTab active={tool === "filters"} onClick={() => { setTool("filters"); setCropRect(null); }} icon={<Wand2 size={14} />} label="Filters" />
              <ToolTab active={tool === "crop"} onClick={() => { setTool("crop"); startCrop(); }} icon={<CropIcon size={14} />} label="Crop" />
              <ToolTab active={tool === "draw"} onClick={() => { setTool("draw"); setCropRect(null); setSelectedTextId(null); setSelectedStickerId(null); }} icon={<Brush size={14} />} label="Draw" />
              <ToolTab active={tool === "shapes"} onClick={() => { setTool("shapes"); setCropRect(null); }} icon={<SquareIcon size={14} />} label="Shapes" />
              <ToolTab active={tool === "text"} onClick={() => { setTool("text"); setCropRect(null); }} icon={<TypeIcon size={14} />} label="Text" />
              <ToolTab active={tool === "stickers"} onClick={() => { setTool("stickers"); setCropRect(null); }} icon={<Smile size={14} />} label="Stickers" />
              <ToolTab active={tool === "effects"} onClick={() => { setTool("effects"); setCropRect(null); }} icon={<Sparkles size={14} />} label="Effects" />
              <ToolTab active={tool === "export"} onClick={() => { setTool("export"); setCropRect(null); }} icon={<Download size={14} />} label="Export" />
            </div>
          </motion.div>

          {/* side panel */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="lg:col-span-4 space-y-6"
          >
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                    {tool === "adjust" && "Adjustments"}
                    {tool === "filters" && "Filter presets"}
                    {tool === "crop" && "Crop & Transform"}
                    {tool === "draw" && "Brush"}
                    {tool === "shapes" && "Shapes"}
                    {tool === "text" && "Text"}
                    {tool === "stickers" && "Stickers"}
                    {tool === "effects" && "Effects"}
                    {tool === "export" && "Export"}
                  </span>
                </div>
              </div>

              {/* ADJUST */}
              {tool === "adjust" && (
                <div className="space-y-4">
                  {ADJUSTMENTS.map((a) => (
                    <Slider
                      key={a.key}
                      icon={a.icon}
                      label={a.label}
                      value={state.adj[a.key]}
                      min={a.min}
                      max={a.max}
                      step={a.step ?? 1}
                      unit={a.unit}
                      onChange={(v) => updateAdj({ [a.key]: v } as Partial<Adj>)}
                      onCommit={() => commit(state)}
                    />
                  ))}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={autoEnhance}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-black text-white text-[12px] font-medium hover:bg-[#ff6a00] transition-colors"
                    >
                      <Sparkles size={12} />
                      Auto enhance
                    </button>
                    <button
                      onClick={() =>
                        commit({ ...state, adj: { ...DEFAULT_ADJ } })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-full border border-black/[0.1] text-black/70 text-[12px] font-medium hover:border-black/30 transition-colors"
                    >
                      <RefreshCw size={12} />
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* FILTERS */}
              {tool === "filters" && (
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESETS.map((p) => {
                    const isActive =
                      p.name === "Original"
                        ? JSON.stringify(state.adj) === JSON.stringify(DEFAULT_ADJ)
                        : false;
                    const previewAdj: Adj = { ...DEFAULT_ADJ, ...p.values };
                    return (
                      <motion.button
                        key={p.name}
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          commit({ ...state, adj: { ...DEFAULT_ADJ, ...p.values } })
                        }
                        className={`relative rounded-xl border overflow-hidden text-center transition-colors ${
                          isActive
                            ? "border-[#ff6a00] ring-2 ring-[#ff6a00]/30"
                            : "border-black/[0.08] hover:border-[#ff6a00]"
                        }`}
                      >
                        <div
                          className="aspect-square w-full bg-cover bg-center"
                          style={{
                            backgroundImage: img
                              ? `url(${state.src})`
                              : "linear-gradient(135deg,#ff8c40,#667eea)",
                            filter: buildFilterString(previewAdj),
                          }}
                        />
                        <div className="py-1.5 bg-white">
                          <span className="text-[10.5px] font-medium text-black/80">
                            {p.emoji} {p.name}
                          </span>
                        </div>
                        {isActive && (
                          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#ff6a00] flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* CROP */}
              {tool === "crop" && (
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Rotate
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        icon={<RotateCcw size={14} />}
                        label="Left 90°"
                        onClick={() => rotate90(-1)}
                      />
                      <ActionButton
                        icon={<RotateCw size={14} />}
                        label="Right 90°"
                        onClick={() => rotate90(1)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Flip
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton
                        icon={<FlipHorizontal2 size={14} />}
                        label="Horizontal"
                        onClick={() => flip("h")}
                      />
                      <ActionButton
                        icon={<FlipVertical2 size={14} />}
                        label="Vertical"
                        onClick={() => flip("v")}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Straighten
                      </div>
                      <div className="text-[11px] font-mono text-black/60">
                        {state.straighten.toFixed(1)}°
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-45}
                      max={45}
                      step={0.5}
                      value={state.straighten}
                      onChange={(e) =>
                        update({ straighten: Number(e.target.value) })
                      }
                      onPointerUp={() => commit(state)}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Crop
                      </div>
                      {!cropRect && (
                        <button
                          onClick={startCrop}
                          className="text-[11px] text-[#ff6a00] hover:underline"
                        >
                          Start cropping
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {CROP_RATIOS.map((r) => (
                        <button
                          key={r.label}
                          onClick={() => {
                            if (!cropRect) startCrop();
                            applyRatio(r.value);
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11.5px] border transition-colors ${
                            cropRatio === r.value
                              ? "bg-black text-white border-black"
                              : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DRAW */}
              {tool === "draw" && (
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Brush color
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => setBrushColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <span
                          className="absolute inset-0"
                          style={{ background: brushColor }}
                        />
                      </label>
                      <input
                        type="text"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {[
                        "#ff6a00",
                        "#ffffff",
                        "#000000",
                        "#e11d2e",
                        "#facc15",
                        "#22c55e",
                        "#3b82f6",
                        "#a855f7",
                        "#ec4899",
                        "#14b8a6",
                        "#f97316",
                        "#8b5cf6",
                      ].map((c) => (
                        <button
                          key={c}
                          onClick={() => setBrushColor(c)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                            brushColor.toLowerCase() === c.toLowerCase()
                              ? "border-[#ff6a00] ring-2 ring-[#ff6a00]/30"
                              : "border-white shadow"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Brush size
                      </div>
                      <div className="text-[11px] font-mono text-black/60">
                        {brushSize}px
                      </div>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={120}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton
                      icon={<Brush size={14} />}
                      label="Brush"
                      active={!erasing}
                      onClick={() => setErasing(false)}
                    />
                    <ActionButton
                      icon={<Eraser size={14} />}
                      label="Eraser"
                      active={erasing}
                      onClick={() => setErasing(true)}
                    />
                  </div>

                  <button
                    onClick={() => commit({ ...state, strokes: [] })}
                    disabled={!state.strokes.length}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.1] text-black/70 text-[12.5px] font-medium hover:border-black/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                    Clear all strokes
                  </button>
                </div>
              )}

              {/* SHAPES */}
              {tool === "shapes" && (
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Shape
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SHAPES.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setShapeType(s.key)}
                          className={`p-2.5 rounded-xl border transition-colors flex flex-col items-center gap-1 ${
                            shapeType === s.key
                              ? "bg-black text-white border-black"
                              : "bg-white text-black/60 border-black/[0.1] hover:border-black/30"
                          }`}
                          title={s.label}
                        >
                          {s.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Color
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                        <input
                          type="color"
                          value={shapeColor}
                          onChange={(e) => setShapeColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <span
                          className="absolute inset-0"
                          style={{ background: shapeColor }}
                        />
                      </label>
                      <input
                        type="text"
                        value={shapeColor}
                        onChange={(e) => setShapeColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {["#ff6a00", "#ffffff", "#000000", "#e11d2e", "#22c55e", "#3b82f6", "#a855f7", "#facc15"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setShapeColor(c)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                            shapeColor.toLowerCase() === c.toLowerCase()
                              ? "border-[#ff6a00] ring-2 ring-[#ff6a00]/30"
                              : "border-white shadow"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                        Stroke size
                      </div>
                      <div className="text-[11px] font-mono text-black/60">
                        {shapeSize}px
                      </div>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={40}
                      value={shapeSize}
                      onChange={(e) => setShapeSize(Number(e.target.value))}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton
                      icon={<SquareIcon size={14} />}
                      label="Outline"
                      active={!shapeFilled}
                      onClick={() => setShapeFilled(false)}
                    />
                    <ActionButton
                      icon={<SquareIcon size={14} />}
                      label="Filled"
                      active={shapeFilled}
                      onClick={() => setShapeFilled(true)}
                    />
                  </div>

                  <button
                    onClick={() => commit({ ...state, shapes: [] })}
                    disabled={!state.shapes.length}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.1] text-black/70 text-[12.5px] font-medium hover:border-black/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                    Clear all shapes
                  </button>
                </div>
              )}

              {/* TEXT */}
              {tool === "text" && (
                <div className="space-y-5">
                  <button
                    onClick={addText}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
                  >
                    <Plus size={14} />
                    Add text layer
                  </button>

                  {!selectedText && (
                    <p className="text-[12px] text-black/45 leading-relaxed">
                      {state.texts.length
                        ? "Tap a text layer on the canvas to edit it."
                        : "No text layers yet. Add one to get started."}
                    </p>
                  )}

                  {selectedText && (
                    <div className="space-y-4 pt-2 border-t border-black/[0.06]">
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                          Content
                        </div>
                        <input
                          type="text"
                          value={selectedText.value}
                          onChange={(e) => updateSelectedText({ value: e.target.value })}
                          onBlur={commitSelectedText}
                          className="w-full px-3 py-2.5 rounded-xl border border-black/[0.1] text-[13px] bg-white outline-none focus:border-black/30 transition-colors"
                        />
                      </div>

                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                          Font
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {FONTS.map((f) => (
                            <button
                              key={f.label}
                              onClick={() => {
                                updateSelectedText({ font: f.value });
                                setTimeout(commitSelectedText, 0);
                              }}
                              style={{ fontFamily: f.value }}
                              className={`px-2 py-2 rounded-lg text-[11.5px] border transition-colors ${
                                selectedText.font === f.value
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            Size
                          </div>
                          <div className="text-[11px] font-mono text-black/60">
                            {Math.round(selectedText.size)}px
                          </div>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={200}
                          value={selectedText.size}
                          onChange={(e) =>
                            updateSelectedText({ size: Number(e.target.value) })
                          }
                          onPointerUp={commitSelectedText}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            Rotation
                          </div>
                          <div className="text-[11px] font-mono text-black/60">
                            {selectedText.rotation}°
                          </div>
                        </div>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={selectedText.rotation}
                          onChange={(e) =>
                            updateSelectedText({ rotation: Number(e.target.value) })
                          }
                          onPointerUp={commitSelectedText}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            Weight
                          </div>
                          <div className="text-[11px] font-mono text-black/60">
                            {selectedText.weight}
                          </div>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[300, 400, 500, 700, 900].map((w) => (
                            <button
                              key={w}
                              onClick={() => {
                                updateSelectedText({ weight: w });
                                setTimeout(commitSelectedText, 0);
                              }}
                              className={`py-1.5 rounded-lg text-[11.5px] border transition-colors ${
                                selectedText.weight === w
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
                              }`}
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                            Text
                          </div>
                          <label className="relative block w-full h-9 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer">
                            <input
                              type="color"
                              value={selectedText.color}
                              onChange={(e) =>
                                updateSelectedText({ color: e.target.value })
                              }
                              onBlur={commitSelectedText}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span
                              className="absolute inset-0"
                              style={{ background: selectedText.color }}
                            />
                          </label>
                        </div>
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                            Background
                          </div>
                          <label className="relative block w-full h-9 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer">
                            <input
                              type="color"
                              value={
                                selectedText.bgColor === "transparent"
                                  ? "#ffffff"
                                  : selectedText.bgColor
                              }
                              onChange={(e) =>
                                updateSelectedText({ bgColor: e.target.value })
                              }
                              onBlur={commitSelectedText}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span
                              className="absolute inset-0"
                              style={{
                                background:
                                  selectedText.bgColor === "transparent"
                                    ? "repeating-conic-gradient(#eee 0% 25%, white 0% 50%) 50% / 12px 12px"
                                    : selectedText.bgColor,
                              }}
                            />
                          </label>
                          <button
                            onClick={() => {
                              updateSelectedText({ bgColor: "transparent" });
                              setTimeout(commitSelectedText, 0);
                            }}
                            className="mt-1.5 w-full text-[10.5px] text-black/50 hover:text-black transition-colors"
                          >
                            Clear background
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10.5px] font-mono uppercase tracking-[0.15em] text-black/40">
                              Shadow
                            </div>
                            <div className="text-[10.5px] font-mono text-black/50">
                              {selectedText.shadow}
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={40}
                            value={selectedText.shadow}
                            onChange={(e) =>
                              updateSelectedText({ shadow: Number(e.target.value) })
                            }
                            onPointerUp={commitSelectedText}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10.5px] font-mono uppercase tracking-[0.15em] text-black/40">
                              Outline
                            </div>
                            <div className="text-[10.5px] font-mono text-black/50">
                              {selectedText.outline}
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={12}
                            value={selectedText.outline}
                            onChange={(e) =>
                              updateSelectedText({ outline: Number(e.target.value) })
                            }
                            onPointerUp={commitSelectedText}
                            className="w-full accent-[#ff6a00]"
                          />
                        </div>
                      </div>

                      {selectedText.outline > 0 && (
                        <div>
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                            Outline color
                          </div>
                          <label className="relative block w-full h-9 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer">
                            <input
                              type="color"
                              value={selectedText.outlineColor}
                              onChange={(e) =>
                                updateSelectedText({ outlineColor: e.target.value })
                              }
                              onBlur={commitSelectedText}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <span
                              className="absolute inset-0"
                              style={{ background: selectedText.outlineColor }}
                            />
                          </label>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          commit({
                            ...state,
                            texts: state.texts.filter((t) => t.id !== selectedText.id),
                          });
                          setSelectedTextId(null);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.15] text-black/70 text-[12.5px] font-medium hover:border-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                        Delete layer
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STICKERS */}
              {tool === "stickers" && (
                <div className="space-y-5">
                  {!selectedSticker && (
                    <p className="text-[12px] text-black/45 leading-relaxed">
                      Tap an emoji to add it to your photo. Tap an added sticker to resize or rotate it.
                    </p>
                  )}

                  <div className="grid grid-cols-8 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => addSticker(e)}
                        className="aspect-square rounded-lg hover:bg-[#ff6a00]/10 transition-colors text-[22px] leading-none flex items-center justify-center"
                      >
                        {e}
                      </button>
                    ))}
                  </div>

                  {selectedSticker && (
                    <div className="space-y-4 pt-2 border-t border-black/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="text-[38px] leading-none">
                          {selectedSticker.emoji}
                        </div>
                        <div className="text-[12px] text-black/50">
                          Selected sticker
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            Size
                          </div>
                          <div className="text-[11px] font-mono text-black/60">
                            {Math.round(selectedSticker.size)}px
                          </div>
                        </div>
                        <input
                          type="range"
                          min={24}
                          max={280}
                          value={selectedSticker.size}
                          onChange={(e) =>
                            updateSelectedSticker({ size: Number(e.target.value) })
                          }
                          onPointerUp={commitSelectedSticker}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                            Rotation
                          </div>
                          <div className="text-[11px] font-mono text-black/60">
                            {selectedSticker.rotation}°
                          </div>
                        </div>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={selectedSticker.rotation}
                          onChange={(e) =>
                            updateSelectedSticker({ rotation: Number(e.target.value) })
                          }
                          onPointerUp={commitSelectedSticker}
                          className="w-full accent-[#ff6a00]"
                        />
                      </div>

                      <button
                        onClick={() => {
                          commit({
                            ...state,
                            stickers: state.stickers.filter(
                              (s) => s.id !== selectedSticker.id
                            ),
                          });
                          setSelectedStickerId(null);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.15] text-black/70 text-[12.5px] font-medium hover:border-red-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                        Remove sticker
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* EFFECTS */}
              {tool === "effects" && (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                        <Aperture size={13} className="text-[#ff6a00]" />
                        Vignette
                      </div>
                      <div className="text-[11px] font-mono text-black/60">
                        {state.adj.vignette}%
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={state.adj.vignette}
                      onChange={(e) => updateAdj({ vignette: Number(e.target.value) })}
                      onPointerUp={() => commit(state)}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
                        <Film size={13} className="text-[#ff6a00]" />
                        Film grain
                      </div>
                      <div className="text-[11px] font-mono text-black/60">
                        {state.adj.grain}%
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={state.adj.grain}
                      onChange={(e) => updateAdj({ grain: Number(e.target.value) })}
                      onPointerUp={() => commit(state)}
                      className="w-full accent-[#ff6a00]"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Frame
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {FRAMES.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => commit({ ...state, frame: f.key })}
                          className={`py-2 rounded-lg text-[11px] border transition-colors ${
                            state.frame === f.key
                              ? "bg-black text-white border-black"
                              : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {state.frame !== "none" && (
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-2">
                        Frame color
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                          <input
                            type="color"
                            value={state.frameColor}
                            onChange={(e) => {
                              update({ frameColor: e.target.value });
                            }}
                            onBlur={() => commit(state)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <span
                            className="absolute inset-0"
                            style={{ background: state.frameColor }}
                          />
                        </label>
                        <input
                          type="text"
                          value={state.frameColor}
                          onChange={(e) => update({ frameColor: e.target.value })}
                          onBlur={() => commit(state)}
                          className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EXPORT */}
              {tool === "export" && (
                <div className="space-y-5">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Format
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <FormatButton
                        active={format === "png"}
                        onClick={() => setFormat("png")}
                        title="PNG"
                        icon={<Layers size={14} />}
                      />
                      <FormatButton
                        active={format === "jpg"}
                        onClick={() => setFormat("jpg")}
                        title="JPG"
                        icon={<ImageIcon size={14} />}
                      />
                      <FormatButton
                        active={format === "webp"}
                        onClick={() => setFormat("webp")}
                        title="WebP"
                        icon={<Wand2 size={14} />}
                      />
                    </div>
                  </div>

                  {format !== "png" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40">
                          Quality
                        </div>
                        <div className="text-[11px] font-mono text-black/60">
                          {Math.round(quality * 100)}%
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={1}
                        step={0.01}
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-[#ff6a00]"
                      />
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Scale
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0.5, 1, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setExportScale(s)}
                          className={`py-2 rounded-lg text-[11.5px] border transition-colors ${
                            exportScale === s
                              ? "bg-black text-white border-black"
                              : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
                          }`}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/40 mb-3">
                      Background
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative w-10 h-10 rounded-xl overflow-hidden border border-black/[0.1] cursor-pointer shrink-0">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <span
                          className="absolute inset-0"
                          style={{ background: bgColor }}
                        />
                      </label>
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-black/[0.1] text-[12.5px] font-mono bg-white outline-none focus:border-black/30 transition-colors"
                      />
                    </div>
                    {format === "png" && (
                      <p className="mt-3 text-[11.5px] text-black/40 leading-relaxed">
                        Type{" "}
                        <code className="font-mono bg-black/[0.05] px-1 rounded">
                          transparent
                        </code>{" "}
                        for a see-through background.
                      </p>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: exporting ? 1 : 1.02 }}
                    whileTap={{ scale: exporting ? 1 : 0.97 }}
                    onClick={doExport}
                    disabled={!img || exporting}
                    className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-black text-white text-[13.5px] font-medium hover:bg-[#ff6a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Rendering…
                      </>
                    ) : (
                      <>
                        <Download size={15} />
                        Export {format.toUpperCase()}
                      </>
                    )}
                  </motion.button>
                  <p className="text-center text-[10.5px] font-mono uppercase tracking-[0.15em] text-black/35">
                    Shortcut: Ctrl+S
                  </p>
                </div>
              )}
            </motion.div>

            {/* history panel */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <button
                onClick={() => setShowHistory((s) => !s)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6a00]" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/60">
                    History · {history.length}
                  </span>
                </div>
                <motion.span
                  animate={{ rotate: showHistory ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown size={14} className="text-black/40" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 max-h-[240px] overflow-y-auto space-y-1 pr-1">
                      {history
                        .slice()
                        .reverse()
                        .map((h, idx) => {
                          const realIdx = history.length - 1 - idx;
                          const isCurrent = realIdx === histIndex;
                          return (
                            <button
                              key={realIdx}
                              onClick={() => {
                                setHistIndex(realIdx);
                                setState(h);
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                                isCurrent
                                  ? "bg-[#ff6a00]/10 border border-[#ff6a00]/30"
                                  : "hover:bg-black/[0.04] border border-transparent"
                              }`}
                            >
                              <div className="w-10 h-10 rounded-md bg-[#fafaf6] border border-black/[0.06] overflow-hidden shrink-0">
                                {h.src && (
                                  <img
                                    src={h.src}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    style={{ filter: buildFilterString(h.adj) }}
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-medium text-black/80">
                                  {isCurrent ? "Current" : `Step ${realIdx + 1}`}
                                </div>
                                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-black/40">
                                  {h.strokes.length + h.shapes.length} overlays ·{" "}
                                  {h.texts.length} text · {h.stickers.length} sticker
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* exported result */}
            <AnimatePresence>
              {exported && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[22px] bg-[#0a0a0a] text-white border border-black/10 p-6 md:p-7 overflow-hidden relative"
                >
                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute -top-20 -right-16 w-[260px] h-[260px] rounded-full bg-[#ff6a00]/30 blur-[80px]"
                  />

                  <div className="relative">
                    <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-md mb-5">
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Sparkles size={11} className="text-[#ff6a00]" />
                      </motion.span>
                      <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white/75">
                        {format.toUpperCase()} ready
                      </span>
                    </div>

                    <h3
                      className="text-[20px] leading-tight mb-1 break-all"
                      style={{ fontFamily: "Georgia, serif" }}
                    >
                      {exported.name}
                    </h3>
                    <p className="text-[13px] text-white/50 mb-6">
                      {exported.width} × {exported.height} px ·{" "}
                      {formatBytes(exported.size)}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <motion.a
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        href={exported.url}
                        download={exported.name}
                        className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white text-black text-[13px] font-medium hover:bg-[#ff6a00] hover:text-white transition-colors"
                      >
                        <Download size={15} />
                        Download
                        <ArrowUpRight
                          size={14}
                          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </motion.a>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={copyToClipboard}
                        className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/[0.07] border border-white/15 text-white text-[13px] font-medium hover:bg-white/[0.12] transition-colors"
                      >
                        <Copy size={14} />
                        Copy
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* shortcuts */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-white border border-black/[0.06] p-6 md:p-7"
            >
              <button
                onClick={() => setShowShortcuts((s) => !s)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                    <Info size={13} className="text-white" />
                  </div>
                  <span className="text-[13px] font-medium text-black">
                    Keyboard shortcuts
                  </span>
                </div>
                <motion.span
                  animate={{ rotate: showShortcuts ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown size={14} className="text-black/40" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showShortcuts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-2 text-[12px] text-black/60">
                      {[
                        ["Ctrl / Cmd + Z", "Undo"],
                        ["Ctrl / Cmd + Shift + Z", "Redo"],
                        ["Ctrl / Cmd + S", "Export image"],
                        ["Delete", "Remove selected layer"],
                        ["Escape", "Deselect / cancel"],
                        ["Ctrl / Cmd + V", "Paste image from clipboard"],
                      ].map(([k, d]) => (
                        <div key={k} className="flex items-center justify-between gap-3">
                          <kbd className="font-mono text-[11px] bg-black/[0.05] px-1.5 py-0.5 rounded">
                            {k}
                          </kbd>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* privacy */}
            <motion.div
              variants={fadeUp}
              className="rounded-[22px] bg-[#f4f1ea] border border-black/[0.08] p-6 md:p-7"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                  <Lock size={13} className="text-white" />
                </div>
                <span className="text-[13px] font-medium text-black">
                  Your photos never leave your device
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-black/55">
                Every operation runs on an HTML5 canvas inside your browser. No
                uploads, no server, no tracking. Open DevTools → Network and
                you'll see zero requests for your image.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* features section */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              What's inside
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Everything you'd expect.
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <FeatureCard icon={<SlidersHorizontal size={18} />} title="11 live adjustments" desc="Brightness, contrast, saturation, hue, temperature, blur, grayscale, sepia, invert, opacity, vignette + grain." />
            <FeatureCard icon={<Wand2 size={18} />} title="16 filter presets" desc="One-click looks from Vivid and Mono to Cinematic and Vintage — each fully editable afterwards." />
            <FeatureCard icon={<Sparkles size={18} />} title="Auto enhance" desc="One-click analysis that tunes brightness, contrast, and saturation based on your image." />
            <FeatureCard icon={<CropIcon size={18} />} title="Crop, rotate & straighten" desc="Ratio presets, 90° rotation, mirror flip, and fine straighten slider — all non-destructive until you apply." />
            <FeatureCard icon={<Brush size={18} />} title="Brush & eraser" desc="Freehand paint with any color and size. Eraser mode wipes strokes cleanly." />
            <FeatureCard icon={<SquareIcon size={18} />} title="5 shape tools" desc="Rectangle, circle, line, arrow, and triangle — outlined or filled." />
            <FeatureCard icon={<TypeIcon size={18} />} title="Text with effects" desc="6 fonts, custom size, weight, color, background, shadow, outline, and rotation." />
            <FeatureCard icon={<Smile size={18} />} title="80 stickers" desc="Emoji library with drag, resize, and rotate controls." />
            <FeatureCard icon={<Aperture size={18} />} title="Effects & frames" desc="Vignette, film grain, and 4 frame styles including polaroid." />
            <FeatureCard icon={<ZoomIn size={18} />} title="Zoom & pan" desc="Zoom up to 400% for fine detail work, then fit back to screen instantly." />
            <FeatureCard icon={<Eye size={18} />} title="Before / after" desc="Hold the button to compare your edits against the original in real time." />
            <FeatureCard icon={<Download size={18} />} title="PNG, JPG, WebP" desc="Export at 0.5× to 2× scale with adjustable quality and custom background." />
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-20 pt-14 border-t border-black/[0.12]"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <span className="w-5 h-px bg-black/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-black/45">
              Common questions
            </span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-[32px] md:text-[42px] leading-[1.1] tracking-[-0.02em] mb-10 max-w-3xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Frequently asked
          </motion.h2>

          <div className="rounded-[22px] bg-white border border-black/[0.06] overflow-hidden divide-y divide-black/[0.06]">
            {FAQS.map((item, i) => (
              <FaqRow key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </motion.section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await loadFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
};

// ============================================================
// FAQ DATA
// ============================================================
const FAQS = [
  { q: "Are my photos uploaded anywhere?", a: "No. Everything — loading, editing, and exporting — happens in your browser using the HTML5 Canvas API. Open DevTools → Network while editing and you'll see zero requests for your image data." },
  { q: "What image formats can I load?", a: "Any format your browser can decode: JPEG, PNG, WebP, GIF (first frame), BMP, and AVIF in modern browsers. Files up to 25 MB are accepted." },
  { q: "Can I paste an image from my clipboard?", a: "Yes. Copy an image anywhere and press Ctrl+V / Cmd+V on this page. It loads instantly." },
  { q: "How do filters work?", a: "Adjustments use CSS filters on the preview and native canvas filters on export, so the result you see is the result you get. Effects like vignette and grain are composited separately." },
  { q: "Are rotate and flip destructive?", a: "Yes — rotation and flip re-draw the underlying image so overlays stay aligned. Undo (Ctrl+Z) will restore the previous state, so nothing is truly lost." },
  { q: "How do I get a transparent background?", a: "Choose PNG and set the background color field to the word transparent. The exported PNG will have an alpha channel. JPG and WebP (in some browsers) don't support transparency." },
  { q: "Why does exporting fail with a security error?", a: "If an image is loaded from another domain without CORS headers, the canvas becomes 'tainted' and browsers block reading its pixels. Uploading a local file or pasting from your clipboard always works." },
  { q: "Can I undo changes?", a: "Yes. Every meaningful action pushes a snapshot onto the history stack. Open the History panel to jump to any step, or use Ctrl+Z / Ctrl+Shift+Z." },
];

// ============================================================
// SUB COMPONENTS
// ============================================================
function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.span
      variants={fadeUp}
      className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/55"
    >
      <motion.span
        whileHover={{ scale: 1.15, rotate: 8 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-5 h-5 rounded-full bg-black/[0.05] flex items-center justify-center text-black/70"
      >
        {icon}
      </motion.span>
      {label}
    </motion.span>
  );
}

function ToolbarBtn({
  children,
  onClick,
  disabled,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "bg-[#ff6a00] text-white"
          : "text-black/60 hover:text-black hover:bg-black/[0.05]"
      }`}
    >
      {children}
    </button>
  );
}

function ToolTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[12.5px] font-medium border transition-colors ${
        active
          ? "bg-black text-white border-black shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]"
          : "bg-white text-black/70 border-black/[0.08] hover:border-black/25 hover:text-black"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium border transition-colors ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function FormatButton({
  active,
  onClick,
  title,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-black/70 border-black/[0.1] hover:border-black/30"
      }`}
    >
      {icon}
      <span className="text-[11.5px] font-medium">{title}</span>
    </motion.button>
  );
}

function Slider({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
  onCommit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
          <span className="text-[#ff6a00]">{icon}</span>
          {label}
        </div>
        <div className="text-[11px] font-mono text-black/60">
          {value}
          {unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="w-full accent-[#ff6a00] cursor-pointer"
      />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-start gap-4 p-6 rounded-[20px] bg-white border border-black/[0.06]"
    >
      <div className="w-10 h-10 rounded-xl bg-[#ff6a00]/10 flex items-center justify-center text-[#ff6a00] shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-[15px] font-medium text-black mb-1.5 leading-tight">
          {title}
        </h4>
        <p className="text-[12.5px] leading-relaxed text-black/55">{desc}</p>
      </div>
    </motion.div>
  );
}

function EmptyState({ onPick }: { onPick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-sm"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#ff6a00]/10 border border-[#ff6a00]/20 flex items-center justify-center mx-auto mb-5">
        <ImageIcon size={26} className="text-[#ff6a00]" />
      </div>
      <h3
        className="text-[22px] leading-tight mb-2"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Drop a photo here
      </h3>
      <p className="text-[13px] text-black/50 leading-relaxed mb-6">
        Or click to browse. You can also paste from your clipboard with{" "}
        <kbd className="font-mono text-[11px] bg-black/[0.06] px-1.5 py-0.5 rounded">
          Ctrl
        </kbd>{" "}
        +{" "}
        <kbd className="font-mono text-[11px] bg-black/[0.06] px-1.5 py-0.5 rounded">
          V
        </kbd>
        .
      </p>
      <button
        onClick={onPick}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[13px] font-medium hover:bg-[#ff6a00] transition-colors"
      >
        <Upload size={14} />
        Choose image
      </button>
      <p className="mt-4 text-[11px] font-mono uppercase tracking-[0.15em] text-black/35">
        JPG · PNG · WebP · up to 25 MB
      </p>
    </motion.div>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-6 p-6 text-left hover:bg-black/[0.015] transition-colors"
      >
        <span className="text-[14.5px] font-medium text-black flex items-start gap-3">
          <HelpCircle size={16} className="text-[#ff6a00] shrink-0 mt-0.5" />
          {q}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown size={16} className="text-black/40" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pl-[58px] text-[13px] leading-relaxed text-black/60">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}