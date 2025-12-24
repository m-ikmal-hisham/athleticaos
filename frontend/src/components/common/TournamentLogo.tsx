import clsx from 'clsx';
import { useState, useEffect } from 'react';
import { Trophy } from '@phosphor-icons/react';

interface TournamentLogoProps {
    tournamentId: string;
    logoUrl?: string;
    className?: string;
}

export const TournamentLogo = ({ logoUrl, className }: TournamentLogoProps) => {
    const [imgError, setImgError] = useState(false);

    // Reset error state if logoUrl changes
    useEffect(() => {
        setImgError(false);
    }, [logoUrl]);

    if (logoUrl && !imgError) {
        return (
            <img
                src={logoUrl}
                alt="Tournament Logo"
                className={clsx("object-cover w-full h-full", className)}
                onError={() => setImgError(true)}
            />
        );
    }

    // Default fallback: Tournament Icon (Trophy)
    return (
        <div className={clsx("flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 w-full h-full", className)}>
            <Trophy weight="duotone" className="w-[50%] h-[50%]" />
        </div>
    );
};
