

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toUrl(url: any): string {
    if (!url) return '';
    if (typeof url === 'string') {
        return url.startsWith('/') ? url : `/${url}`;
    }
    if (typeof url === 'object' && url !== null && 'url' in url) {
        return toUrl(url.url);
    }
    if (url instanceof URL) {
        return url.pathname + url.search + url.hash;
    }
    return String(url);
}
