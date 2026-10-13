import type { ReactNode } from "react";

export interface InfoItem {
  id: string;
  icon:
    | "BookOpen"
    | "Circle"
    | "Download"
    | "Eye"
    | "ExternalLink"
    | "FileText"
    | "Image"
    | "Info"
    | "Layers"
    | "MonitorSmartphone"
    | "ShieldCheck";
  title: string;
  description: string;
  highlight?: string;
}

export interface InformationSectionProps {
  chapterLabel?: string;
  metaLabel?: string;
  metaRight?: ReactNode;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  items: InfoItem[];
  columns?: 1 | 2 | 3 | 4;
  variant?: "default" | "compact" | "featured";
  showSchema?: boolean;
  className?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSectionProps {
  chapterLabel?: string;
  metaLabel?: string;
  metaRight?: ReactNode;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  items: FaqItem[];
  showSchema?: boolean;
  className?: string;
}