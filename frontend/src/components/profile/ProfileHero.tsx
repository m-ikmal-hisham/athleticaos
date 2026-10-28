import React from 'react';
import { Link } from 'react-router-dom';
import { JerseyHoops } from './JerseyHoops';
import { pickOrgColours, rgba, readableOn } from './colours';

export interface ProfileHeroStat {
    label: string;
    value: number | null | undefined;
    suffix?: string;
    highlight?: boolean;
}

export interface ProfileHeroChip {
    label: string;
    variant?: 'default' | 'live' | 'accent' | 'primary';
}

export interface ProfileHeroSubtitleLink {
    prefix?: string;
    label: string;
    to?: string;
}

export interface ProfileHeroProps {
    variant: 'team' | 'player' | 'organisation';
    size?: 'public' | 'compact';
    primary?: string | null;
    secondary?: string | null;
    watermark?: string | number | null;
    avatar?: string | null;
    initials?: string | null;
    ringColour?: string | null;
    badgeText?: string | number | null;
    chips?: (string | ProfileHeroChip)[];
    title: string;
    subtitleLinks?: ProfileHeroSubtitleLink[];
    aside?: React.ReactNode;
    stats?: ProfileHeroStat[];
    actions?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    className?: string;
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({
    variant,
    size = 'public',
    primary: rawPrimary,
    secondary: rawSecondary,
    watermark,
    avatar,
    initials,
    ringColour,
    badgeText,
    chips = [],
    title,
    subtitleLinks = [],
    aside,
    stats = [],
    actions,
    breadcrumbs,
    className = '',
}) => {
    const isPublic = size === 'public';
    const { primary, secondary } = pickOrgColours({
        primaryColor: rawPrimary,
        secondaryColor: rawSecondary,
    });

    const activeRingColour = ringColour || primary || '#0047AB';

    // Filter real number stats only — no placeholders or undefined/null/NaN
    const validStats = stats.filter(
        (s): s is ProfileHeroStat & { value: number } =>
            typeof s.value === 'number' && !Number.isNaN(s.value)
    );

    const cornerRadius = isPublic ? 'rounded-[24px]' : 'rounded-[20px]';

    return (
        <section
            aria-label={`${title} profile header`}
            className={`relative bg-[#0D1B2A] text-white ${cornerRadius} overflow-hidden shadow-xl border border-white/10 ${className}`}
        >
            {/* Background Jersey Hoops */}
            <JerseyHoops
                primary={primary}
                secondary={secondary}
                size={size}
                opacity={isPublic ? 0.9 : 0.75}
            />

            {/* Background Watermark (short name or jersey number) */}
            {watermark && (
                <div
                    aria-hidden="true"
                    className="absolute right-4 sm:right-8 md:right-16 top-1/2 -translate-y-1/2 pointer-events-none select-none z-0 font-black tracking-tighter text-white/[0.04] text-[120px] sm:text-[180px] md:text-[240px] leading-none uppercase font-score"
                >
                    {watermark}
                </div>
            )}

            {/* Top Breadcrumbs / Action Bar if present */}
            {breadcrumbs && (
                <div className="relative z-10 px-5 sm:px-8 pt-5 sm:pt-6">
                    {breadcrumbs}
                </div>
            )}

            {/* Main Hero Content */}
            <div className={`relative z-10 px-5 sm:px-8 ${breadcrumbs ? 'pt-3' : isPublic ? 'pt-8' : 'pt-6'} ${isPublic ? 'pb-6 sm:pb-8' : 'pb-5'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left: Avatar + Details */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-5 sm:gap-6 flex-1 min-w-0 text-center sm:text-left">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                            {variant === 'team' ? (
                                /* Team Crest Tile */
                                <div
                                    className={`${isPublic ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-18 h-18 sm:w-20 sm:h-20'} rounded-2xl bg-[#0B1522] p-2.5 shadow-2xl overflow-hidden flex items-center justify-center`}
                                    style={{
                                        boxShadow: `0 0 0 3px ${rgba(activeRingColour, 0.45)}, 0 10px 25px -5px rgba(0, 0, 0, 0.5)`,
                                    }}
                                >
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt={title}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`w-full h-full rounded-xl flex items-center justify-center font-black tracking-wider text-white font-score ${isPublic ? 'text-2xl sm:text-3xl' : 'text-xl'} ${avatar ? 'hidden' : ''}`}
                                        style={{ backgroundColor: rgba(primary, 0.3) }}
                                    >
                                        {initials || title.slice(0, 3).toUpperCase()}
                                    </div>
                                </div>
                            ) : variant === 'organisation' ? (
                                /* Organisation Round Logo Tile with Primary Ring */
                                <div
                                    className={`${isPublic ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-18 h-18 sm:w-20 sm:h-20'} rounded-full bg-[#0B1522] p-2 shadow-2xl overflow-hidden flex items-center justify-center`}
                                    style={{
                                        boxShadow: `0 0 0 4px ${primary}, 0 10px 25px -5px rgba(0, 0, 0, 0.5)`,
                                    }}
                                >
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt={title}
                                            className="w-full h-full object-contain rounded-full"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`w-full h-full rounded-full flex items-center justify-center font-black tracking-wider text-white font-score ${isPublic ? 'text-2xl sm:text-3xl' : 'text-xl'} ${avatar ? 'hidden' : ''}`}
                                        style={{ backgroundColor: rgba(primary, 0.3) }}
                                    >
                                        {initials || title.split(' ').map(n => n.charAt(0)).slice(0, 3).join('').toUpperCase()}
                                    </div>
                                </div>
                            ) : (
                                /* Player Circular Avatar */
                                <div
                                    className={`${isPublic ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-18 h-18 sm:w-20 sm:h-20'} rounded-full bg-[#0B1522] p-1 shadow-2xl overflow-hidden flex items-center justify-center`}
                                    style={{
                                        boxShadow: `0 0 0 3px ${rgba(activeRingColour, 0.55)}, 0 10px 25px -5px rgba(0, 0, 0, 0.5)`,
                                    }}
                                >
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt={title}
                                            className="w-full h-full object-cover rounded-full"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        className={`w-full h-full rounded-full flex items-center justify-center font-black text-white font-score ${isPublic ? 'text-2xl sm:text-3xl' : 'text-lg'} ${avatar ? 'hidden' : ''}`}
                                        style={{ backgroundColor: rgba(primary, 0.3) }}
                                    >
                                        {initials || title.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase()}
                                    </div>
                                </div>
                            )}

                            {/* Crimson Jersey Badge on Player Avatar */}
                            {badgeText !== undefined && badgeText !== null && badgeText !== '' && (
                                <div
                                    aria-label={`Jersey number ${badgeText}`}
                                    className="absolute -bottom-1.5 -right-1.5 min-w-[28px] h-7 px-1.5 rounded-full bg-[#C1121F] text-white flex items-center justify-center text-xs font-black shadow-lg border-2 border-[#0D1B2A] font-score"
                                >
                                    {badgeText}
                                </div>
                            )}
                        </div>

                        {/* Text Details */}
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                            {/* Chips */}
                            {chips.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                                    {chips.map((chip, idx) => {
                                        const isObj = typeof chip === 'object';
                                        const label = isObj ? chip.label : chip;
                                        const chipVariant = isObj ? chip.variant : 'default';

                                        if (chipVariant === 'live') {
                                            return (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase bg-[#C1121F] text-white shadow-sm"
                                                >
                                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                    {label}
                                                </span>
                                            );
                                        }

                                        if (chipVariant === 'primary') {
                                            const textColor = readableOn(primary);
                                            return (
                                                <span
                                                    key={idx}
                                                    style={{ backgroundColor: primary, color: textColor }}
                                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm"
                                                >
                                                    {label}
                                                </span>
                                            );
                                        }

                                        return (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-white/10 text-white/90 border border-white/10 backdrop-blur-sm"
                                            >
                                                {label}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Title */}
                            <h1
                                title={title}
                                className={`${isPublic ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-xl sm:text-2xl md:text-3xl'} font-black text-white leading-tight mb-1.5 break-words [overflow-wrap:anywhere] [text-wrap:balance] line-clamp-3 sm:line-clamp-2`}
                            >
                                {title}
                            </h1>

                            {/* Subtitle / Affiliation Links */}
                            {(() => {
                                const deduplicatedSubtitleLinks = subtitleLinks.filter(
                                    (sub, idx, arr) => idx === 0 || sub.label !== arr[idx - 1].label
                                );
                                if (deduplicatedSubtitleLinks.length === 0) return null;
                                return (
                                    <div className="text-xs sm:text-sm text-white/80 font-medium flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
                                        {deduplicatedSubtitleLinks.map((sub, idx) => (
                                            <React.Fragment key={idx}>
                                                {idx > 0 && <span className="text-white/30">·</span>}
                                                <span>
                                                    {sub.prefix && <span className="text-white/60">{sub.prefix} </span>}
                                                    {sub.to ? (
                                                        <Link
                                                            to={sub.to}
                                                            style={{ textDecorationColor: primary }}
                                                            className="text-white hover:text-white underline underline-offset-2 transition-colors font-semibold"
                                                        >
                                                            {sub.label}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-white font-semibold">{sub.label}</span>
                                                    )}
                                                </span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Right: Actions / Aside slot (e.g. Pitch or Admin buttons) */}
                    {(aside || actions) && (
                        <div className="flex flex-col sm:flex-row items-center justify-center md:justify-end gap-4 shrink-0">
                            {aside && <div className="w-full max-w-[155px] flex justify-center">{aside}</div>}
                            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Stat Strip (Darker sunken band with dividers) */}
            {validStats.length > 0 && (
                <div className="relative z-10 bg-[#08111B]/85 border-t border-white/10 px-4 sm:px-8 py-3.5 sm:py-4">
                    <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-around sm:justify-start gap-4 sm:gap-8 divide-x-0 sm:divide-x sm:divide-white/10">
                        {validStats.map((stat, idx) => (
                            <div
                                key={idx}
                                className={`flex flex-col items-center sm:items-start ${idx > 0 ? 'sm:pl-8' : ''}`}
                            >
                                <div className="text-lg sm:text-2xl font-black text-white font-score tracking-tight tabular-nums flex items-baseline gap-0.5">
                                    <span>{stat.value}</span>
                                    {stat.suffix && <span className="text-xs font-bold text-white/70">{stat.suffix}</span>}
                                </div>
                                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/70 mt-0.5 text-center sm:text-left">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};
