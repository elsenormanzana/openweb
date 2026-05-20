import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "";
}

export function getOptimizedImageUrl(url: string | null | undefined, options?: { width?: number; quality?: number; format?: string }) {
  if (!url) return "";
  if (!url.startsWith("/uploads/")) return url;
  const params = new URLSearchParams();
  if (options?.width) params.set("w", String(options.width));
  if (options?.quality) params.set("q", String(options.quality));
  if (options?.format) params.set("f", options.format);
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
