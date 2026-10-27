import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { LogoImage } from '@/components/public/LogoImage';

export interface ListRowProps {
    to?: string;
    title: string;
    meta?: ReactNode;
    logoUrl?: string;
    icon?: ReactNode;
    initials?: string;
    badge?: ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * Compact link row for public directory listings on phones (< 768px).
 * Per STYLE_GUIDE §5.4: 40px logo/initials, name up to 2 lines, one meta line,
 * chevron, >= 44px hit target, glass surface.
 */
export function ListRow({
    to,
    title,
    meta,
    logoUrl,
    icon,
    initials,
    badge,
    className,
    onClick,
}: ListRowProps) {
    const content = (
        <div
            className={clsx(
                'group relative flex items-center gap-3.5 min-h-[52px] py-2.5 px-3.5 rounded-xl',
                'bg-white/70 dark:bg-slate-900/60 backdrop-blur-md',
                'border border-slate-200/60 dark:border-slate-800',
                'hover:bg-white/95 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700',
                'transition-all duration-150 motion-safe:hover:translate-x-0.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                className
            )}
        >
            {/* 40px Logo / Initials / Icon */}
            <div className="w-10 h-10 rounded-lg p-1 shrink-0 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-2xs">
                {logoUrl ? (
                    <LogoImage
                        src={logoUrl}
                        name={title}
                        className="w-full h-full object-contain"
                        icon={icon}
                    />
                ) : initials ? (
                    <span className="text-xs font-bold text-navy dark:text-navy-tint uppercase">
                        {initials}
                    </span>
                ) : (
                    icon || <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700" />
                )}
            </div>

            {/* Title & Meta Line */}
            <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-navy dark:group-hover:text-navy-tint transition-colors">
                        {title}
                    </span>
                    {badge && <span className="shrink-0">{badge}</span>}
                </div>
                {meta && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {meta}
                    </div>
                )}
            </div>

            {/* Chevron */}
            <CaretRight
                size={18}
                aria-hidden="true"
                className="text-slate-400 dark:text-slate-500 group-hover:text-navy dark:group-hover:text-navy-tint transition-colors shrink-0"
            />
        </div>
    );

    if (to) {
        return (
            <Link to={to} className="block no-underline focus-visible:outline-none" onClick={onClick}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left bg-transparent p-0 border-0 focus-visible:outline-none"
        >
            {content}
        </button>
    );
}
