import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getContrastColor(bg: string): 'white' | 'black' {
    // Simple heuristic for now, can be expanded with real color parsing if needed
    // Assuming 'bg' might be a hex code or a simple color name
    // For this specific task, we'll rely on CSS variables handling most of this,
    // but this function is requested for specific manual overrides.

    // If it's a hex color
    if (bg.startsWith('#')) {
        const r = parseInt(bg.substr(1, 2), 16);
        const g = parseInt(bg.substr(3, 2), 16);
        const b = parseInt(bg.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    return 'white'; // Default fallback
}
