import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useState, useEffect } from 'react';
import { Trophy } from '@phosphor-icons/react';
import { getImageUrl } from '@/utils/image';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface TournamentLogoProps {
    tournamentId?: string;
    logoUrl?: string | null;
    className?: string;
}

export const TournamentLogo = ({ logoUrl, className }: TournamentLogoProps) => {
    const [imgError, setImgError] = useState(false);

    // Reset error state if logoUrl changes
    useEffect(() => {
        setImgError(false);
    }, [logoUrl]);

    // Robust check for valid URL
    const isValidUrl = logoUrl &&
        typeof logoUrl === 'string' &&
        logoUrl.trim().length > 0 &&
        logoUrl !== 'null' &&
        logoUrl !== 'undefined';

    // Process URL to handle uploads correctly
    const finalUrl = isValidUrl ? getImageUrl(logoUrl) : null;

    if (finalUrl && !imgError) {
        return (
            <img
                src={finalUrl}
                alt="Tournament Logo"
                className={cn("object-cover w-full h-full transition-opacity duration-300", className)}
                onError={() => setImgError(true)}
                loading="lazy"
            />
        );
    }

    // Default fallback: Tournament Icon (Trophy)
    // Using cn ensures passed className can override default styles if validated
    return (
        <div className={cn(
            "flex items-center justify-center w-full h-full",
            "bg-slate-100 dark:bg-slate-800",
            "text-slate-400 dark:text-slate-500",
            className
        )}>
            <Trophy weight="duotone" className="w-[50%] h-[50%]" />
        </div>
    );
};
