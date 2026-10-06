import { useEffect, useState } from 'react';
import { Partner } from '@/config/partners';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';

export interface PartnerLogoProps {
    partner: Partner;
    maxHeight?: number | string;
    className?: string;
}

export const PartnerLogo = ({ partner, maxHeight = 40, className = '' }: PartnerLogoProps) => {
    const effectiveTheme = useEffectiveTheme();
    const [hasError, setHasError] = useState(false);

    const logoSrc = (effectiveTheme === 'dark' && partner.logoSrcDark)
        ? partner.logoSrcDark
        : partner.logoSrc;

    useEffect(() => {
        setHasError(false);
    }, [logoSrc]);

    const styleHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;

    const content = hasError ? (
        <span className="text-sm font-semibold text-foreground text-center select-none">
            {partner.name}
        </span>
    ) : (
        <img
            src={logoSrc}
            alt={partner.name}
            loading="lazy"
            onError={() => setHasError(true)}
            style={{ maxHeight: styleHeight }}
            className={`w-auto object-contain ${className}`}
        />
    );

    if (partner.url) {
        return (
            <a
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint rounded"
            >
                {content}
            </a>
        );
    }

    return <div className="inline-flex items-center justify-center">{content}</div>;
};
