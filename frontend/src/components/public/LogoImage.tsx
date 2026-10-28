import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { getImageUrl } from '@/utils/image';

export interface LogoImageProps {
    src?: string | null;
    name?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl' | string | number;
    alt?: string;
    className?: string;
    imgClassName?: string;
    fallbackClassName?: string;
    icon?: React.ReactNode;
}

const SIZE_CLASSES: Record<string, string> = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
};

const SIZE_DIMENSIONS: Record<string, number> = {
    sm: 24,
    md: 40,
    lg: 64,
    xl: 80,
};

const DEFAULT_DIMENSION = 40;

function getInitials(name?: string | null): string {
    if (!name || !name.trim()) return '';
    const clean = name.trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return clean.slice(0, 2).toUpperCase();
    }
    return parts
        .slice(0, 3)
        .map((p) => p.charAt(0))
        .join('')
        .toUpperCase();
}

/**
 * Shared logo component for teams, organisations, and tournaments on public pages.
 * Handles load errors gracefully by displaying the initials fallback instead of broken alt text.
 */
export function LogoImage({
    src,
    name,
    size,
    alt,
    className = 'w-full h-full',
    imgClassName = 'w-full h-full object-contain',
    fallbackClassName,
    icon,
}: LogoImageProps) {
    const [hasError, setHasError] = useState(false);

    // Reset error if src changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const resolvedSrc = src ? getImageUrl(src) : '';
    const initials = getInitials(name);
    const sizeClass = typeof size === 'string' ? SIZE_CLASSES[size] || '' : '';
    const resolvedDimension =
        typeof size === 'number'
            ? size
            : (typeof size === 'string' && SIZE_DIMENSIONS[size]) || DEFAULT_DIMENSION;

    if (!resolvedSrc || hasError) {
        return (
            <div
                className={clsx(
                    'w-full h-full flex items-center justify-center font-bold select-none text-slate-500 dark:text-slate-400 font-score tracking-wider',
                    sizeClass,
                    fallbackClassName
                )}
                aria-hidden="true"
            >
                {initials || icon || '—'}
            </div>
        );
    }

    return (
        <img
            src={resolvedSrc}
            alt={alt ?? (name || '')}
            width={resolvedDimension}
            height={resolvedDimension}
            decoding="async"
            className={clsx(imgClassName, sizeClass, className)}
            onError={() => setHasError(true)}
            loading="lazy"
        />
    );
}
