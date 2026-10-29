import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import {
    JOURNEY_1,
    JOURNEY_2,
    ROADMAP,
    type Journey as JourneyType,
    type Milestone,
    type SetPiece,
} from '@/content/journey';
import { JourneyOverlay } from '@/components/public/journey/JourneyOverlay';
import { SetPieceIcon } from '@/components/public/journey/journeyIcons';
import { GlassCard } from '@/components/GlassCard';
import { isAnimatedBackgroundFlagEnabled } from '@/config/animatedBackground';
import { getPublicStatsSummary, type PublicStatsSummary } from '@/api/public.api';
import { PRODUCT_NAME } from '@/config/site';

const SET_PIECE_ORDER: SetPiece[] = ['kick', 'phase', 'scrum', 'lineout', 'ruck', 'maul', 'try', 'conv'];

export default function Journey() {
    const { t, i18n } = useTranslation('journey');
    const lang = i18n.language && i18n.language.startsWith('ms') ? 'ms' : 'en';

    const isBgFlagEnabled = isAnimatedBackgroundFlagEnabled();
    const [fallbackCardNeeded, setFallbackCardNeeded] = useState(false);

    // Journey selection (default is JOURNEY_2, which contains the 'current' milestone)
    const [selectedJourney, setSelectedJourney] = useState<JourneyType>(JOURNEY_2);

    // Selected milestone for detail card (defaults to the 'current' milestone if present, or first)
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone>(() => {
        return (
            JOURNEY_2.milestones.find((m) => m.status === 'current') ||
            JOURNEY_2.milestones[0]
        );
    });

    // Update document.title: "Our journey — AthleticaOS" / "Perjalanan kami — AthleticaOS"
    useEffect(() => {
        const titleText = t('pageTitle');
        document.title = `${titleText} — ${PRODUCT_NAME}`;
    }, [t, lang]);

    // When switching journeys, select the current milestone or the first milestone
    const handleSwitchJourney = (j: JourneyType) => {
        setSelectedJourney(j);
        const curr = j.milestones.find((m) => m.status === 'current') || j.milestones[0];
        setSelectedMilestone(curr);
    };

    // Public summary stats
    const [stats, setStats] = useState<PublicStatsSummary | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsFailed, setStatsFailed] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setStatsLoading(true);
        setStatsFailed(false);

        getPublicStatsSummary()
            .then((data) => {
                if (isMounted) {
                    setStats(data);
                    setStatsLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setStatsFailed(true);
                    setStatsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // 1. Measure real header height for dynamic hero sizing
    const [headerHeight, setHeaderHeight] = useState(64);
    useEffect(() => {
        const measureHeader = () => {
            const headerEl = document.querySelector('header');
            if (headerEl) {
                setHeaderHeight(headerEl.getBoundingClientRect().height);
            }
        };
        measureHeader();
        window.addEventListener('resize', measureHeader);
        return () => window.removeEventListener('resize', measureHeader);
    }, []);

    // 2. Measure hero header block bottom for overlay clearance guard
    const heroHeaderRef = useRef<HTMLDivElement>(null);
    const [headerBlockBottom, setHeaderBlockBottom] = useState<number | undefined>(undefined);
    useEffect(() => {
        const updateRect = () => {
            if (heroHeaderRef.current) {
                setHeaderBlockBottom(heroHeaderRef.current.getBoundingClientRect().bottom);
            }
        };
        updateRect();
        window.addEventListener('resize', updateRect);
        return () => window.removeEventListener('resize', updateRect);
    }, [selectedJourney]);

    // 3. Hero visibility IntersectionObserver (threshold 0.6)
    const heroRef = useRef<HTMLElement>(null);
    const [isHeroVisible, setIsHeroVisible] = useState(true);
    useEffect(() => {
        const heroEl = heroRef.current;
        if (!heroEl || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Fade overlay out as soon as hero is less than ~60% visible
                setIsHeroVisible(entry.isIntersecting && entry.intersectionRatio >= 0.6);
            },
            { threshold: [0, 0.6, 1.0] }
        );

        observer.observe(heroEl);
        return () => observer.disconnect();
    }, []);

    // 4. Milestone selection with smooth scroll into view on phones (< 1024px) when phase card is below hero
    const phaseBoxRef = useRef<HTMLDivElement>(null);
    const handleSelectMilestone = (m: Milestone) => {
        setSelectedMilestone(m);
        if (typeof window !== 'undefined' && window.innerWidth < 1024 && (!isBgFlagEnabled || fallbackCardNeeded)) {
            phaseBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    return (
        <div className="relative w-full">
            {/* -------------------------------------------------------------- */}
            {/* 1. Hero Section (One Viewport Tall minus Real Header Height)    */}
            {/* -------------------------------------------------------------- */}
            <section
                ref={heroRef}
                style={{ minHeight: `calc(100dvh - ${headerHeight}px)` }}
                className="relative flex flex-col justify-between pt-4 pb-12 overflow-hidden"
            >
                {/* Hero Header & Journey Switch (Measured for overlay clearance) */}
                <div
                    ref={heroHeaderRef}
                    className="text-center space-y-2 max-w-3xl mx-auto px-4 relative z-10"
                >
                    <h1 className="text-2xl md:text-3xl font-bold font-score tracking-tight text-black dark:text-white drop-shadow-sm">
                        {t('pageTitle')}
                    </h1>
                    <p className="text-sm sm:text-base text-black/75 dark:text-white/75 drop-shadow-sm">
                        {t('subtitle')}
                    </p>

                    {/* Journey selector tabs */}
                    <div className="inline-flex p-1 rounded-xl bg-surface-sunken/80 backdrop-blur-sm border border-line-subtle gap-1 shadow-sm mt-1">
                        <button
                            type="button"
                            onClick={() => handleSwitchJourney(JOURNEY_2)}
                            className={clsx(
                                'min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                                selectedJourney.id === JOURNEY_2.id
                                    ? 'bg-navy dark:bg-navy-tint text-white dark:text-black shadow-sm'
                                    : 'text-black/72 dark:text-white/72 hover:text-black dark:hover:text-white'
                            )}
                            aria-pressed={selectedJourney.id === JOURNEY_2.id}
                        >
                            {t('journey2Tab')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchJourney(JOURNEY_1)}
                            className={clsx(
                                'min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                                selectedJourney.id === JOURNEY_1.id
                                    ? 'bg-navy dark:bg-navy-tint text-white dark:text-black shadow-sm'
                                    : 'text-black/72 dark:text-white/72 hover:text-black dark:hover:text-white'
                            )}
                            aria-pressed={selectedJourney.id === JOURNEY_1.id}
                        >
                            {t('journey1Tab')}
                        </button>
                    </div>
                </div>

                {/* Empty bottom spacer allowing the stadium pitch perspective to breathe */}
                <div className="h-16 pointer-events-none" />
            </section>

            {/* Fixed Overlay: sits directly above the stadium background when flag is enabled */}
            {isBgFlagEnabled && (
                <JourneyOverlay
                    journey={selectedJourney}
                    selectedMilestone={selectedMilestone}
                    onSelectMilestone={handleSelectMilestone}
                    lang={lang}
                    visible={isHeroVisible}
                    headerBlockBottom={headerBlockBottom}
                    onFallbackCardNeeded={setFallbackCardNeeded}
                />
            )}

            {/* -------------------------------------------------------------- */}
            {/* 2. Below-the-Hero Content (Phase Box, Legend, Counters, Roadmap)*/}
            {/* -------------------------------------------------------------- */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 md:space-y-10 pb-16 relative z-10">
                {/* Fallback for Production when flag is OFF: Render vertical milestone list */}
                {!isBgFlagEnabled && (
                    <div className="space-y-4">
                        <div className="border-b border-line-subtle pb-2">
                            <h2 className="text-xl font-bold font-score text-black dark:text-white uppercase tracking-wider">
                                {selectedJourney.title[lang]} · {selectedJourney.period[lang]}
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedJourney.milestones.map((m) => (
                                <GlassCard
                                    key={m.id}
                                    surface="glass"
                                    onClick={() => handleSelectMilestone(m)}
                                    className={clsx(
                                        'p-5 cursor-pointer transition-all space-y-2',
                                        selectedMilestone.id === m.id &&
                                            'ring-2 ring-navy dark:ring-navy-tint'
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={clsx(
                                                    'w-7 h-7 rounded-full flex items-center justify-center text-xs',
                                                    m.status === 'current' && 'bg-crimson text-white',
                                                    m.status === 'done' && 'bg-navy dark:bg-navy-tint text-white dark:text-black',
                                                    m.status === 'next' && 'bg-surface-sunken border border-line-subtle text-navy dark:text-navy-tint'
                                                )}
                                            >
                                                <SetPieceIcon piece={m.setPiece} width={14} height={14} />
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                                                {m.setPiece}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold text-navy dark:text-navy-tint">
                                            {m.date}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-sm text-black dark:text-white">
                                        {m.title[lang]}
                                    </h3>
                                    <p className="text-xs text-black/80 dark:text-white/80 line-clamp-2">
                                        {m.text[lang]}
                                    </p>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* Milestone Detail Card (Phase Box) — rendered below hero only when fallback is needed or flag is off */}
                {(!isBgFlagEnabled || fallbackCardNeeded) && (
                    <div ref={phaseBoxRef} className="scroll-mt-24">
                        <GlassCard surface="glass" className="p-6 sm:p-8 space-y-4">
                            <div className="flex items-center justify-between gap-2 border-b border-line-subtle pb-4">
                                <div className="flex items-center gap-3">
                                    <span
                                        className={clsx(
                                            'w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-sm',
                                            selectedMilestone.status === 'current' && 'bg-crimson text-white',
                                            selectedMilestone.status === 'done' &&
                                                'bg-navy dark:bg-navy-tint text-white dark:text-black',
                                            selectedMilestone.status === 'next' &&
                                                'bg-surface-sunken text-black/72 dark:text-white/72 border border-line-subtle'
                                        )}
                                    >
                                        <SetPieceIcon piece={selectedMilestone.setPiece} width={20} height={20} />
                                    </span>
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60 block">
                                            {selectedMilestone.setPiece}
                                        </span>
                                        <span className="text-xs font-semibold text-navy dark:text-navy-tint">
                                            {selectedMilestone.date}
                                        </span>
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div>
                                    {selectedMilestone.status === 'current' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-crimson text-white uppercase tracking-wider">
                                            <span
                                                className="w-1.5 h-1.5 rounded-full bg-white motion-safe:animate-pulse"
                                                aria-hidden="true"
                                            />
                                            {t('common:status.live')}
                                        </span>
                                    )}
                                    {selectedMilestone.status === 'done' && (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy dark:text-navy-tint">
                                            <CheckCircle weight="fill" className="w-4 h-4" />
                                            {t('status.done')}
                                        </span>
                                    )}
                                    {selectedMilestone.status === 'next' && (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-black/60 dark:text-white/60">
                                            <Clock weight="duotone" className="w-4 h-4" />
                                            {t('status.upcoming')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-black dark:text-white">
                                    {selectedMilestone.title[lang]}
                                </h3>
                                <p className="text-sm text-black/85 dark:text-white/85 leading-relaxed">
                                    {selectedMilestone.text[lang]}
                                </p>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* Legend (Set piece meanings) */}
                <GlassCard surface="glass" className="p-6 sm:p-8 space-y-4">
                    <div className="border-b border-line-subtle pb-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-black/72 dark:text-white/72">
                            {t('legend.title')}
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {SET_PIECE_ORDER.map((piece) => (
                            <div key={piece} className="flex items-start gap-2.5 text-xs">
                                <span className="w-6 h-6 rounded-full bg-surface-sunken flex items-center justify-center shrink-0 text-navy dark:text-navy-tint">
                                    <SetPieceIcon piece={piece} width={14} height={14} />
                                </span>
                                <span className="text-black/80 dark:text-white/80 leading-snug">
                                    {t(`legend.${piece}`)}
                                </span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Live Counters */}
                {!statsFailed && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {statsLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <GlassCard
                                        key={i}
                                        surface="glass"
                                        className="p-6 animate-pulse space-y-2"
                                    >
                                        <div className="h-8 bg-surface-sunken rounded w-16" />
                                        <div className="h-4 bg-surface-sunken rounded w-24" />
                                    </GlassCard>
                                ))
                            ) : stats ? (
                                <>
                                    <GlassCard surface="glass" className="p-6 text-center md:text-left">
                                        <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                            {stats.tournaments}
                                        </p>
                                        <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                            {t('counters.tournaments')}
                                        </p>
                                    </GlassCard>
                                    <GlassCard surface="glass" className="p-6 text-center md:text-left">
                                        <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                            {stats.teams}
                                        </p>
                                        <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                            {t('counters.teams')}
                                        </p>
                                    </GlassCard>
                                    <GlassCard surface="glass" className="p-6 text-center md:text-left">
                                        <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                            {stats.players}
                                        </p>
                                        <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                            {t('counters.players')}
                                        </p>
                                    </GlassCard>
                                    <GlassCard surface="glass" className="p-6 text-center md:text-left">
                                        <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                            {stats.matchesPlayed}
                                        </p>
                                        <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                            {t('counters.matchesPlayed')}
                                        </p>
                                    </GlassCard>
                                </>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* What's Next (Roadmap 3 Columns) */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black font-score tracking-tight text-black dark:text-white uppercase">
                            {t('roadmap.title')}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Now Column */}
                        <GlassCard surface="glass" className="p-6 space-y-4">
                            <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-crimson motion-safe:animate-pulse" />
                                <h3 className="font-bold text-sm uppercase tracking-wider text-black dark:text-white">
                                    {t('roadmap.now')}
                                </h3>
                            </div>
                            <ul className="space-y-3">
                                {ROADMAP.now.map((item, idx) => (
                                    <li
                                        key={idx}
                                        className="text-sm text-black/80 dark:text-white/80 flex items-start gap-2"
                                    >
                                        <span className="text-navy dark:text-navy-tint font-bold">·</span>
                                        <div>
                                            <span>{item.title[lang]}</span>
                                            {item.testing && (
                                                <span className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold rounded bg-surface-sunken text-navy dark:text-navy-tint border border-line-subtle">
                                                    {t('roadmap.testingOnStaging')}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </GlassCard>

                        {/* Next Column */}
                        <GlassCard surface="glass" className="p-6 space-y-4">
                            <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-navy dark:bg-navy-tint" />
                                <h3 className="font-bold text-sm uppercase tracking-wider text-black dark:text-white">
                                    {t('roadmap.next')}
                                </h3>
                            </div>
                            <ul className="space-y-3">
                                {ROADMAP.next.map((item, idx) => (
                                    <li
                                        key={idx}
                                        className="text-sm text-black/80 dark:text-white/80 flex items-start gap-2"
                                    >
                                        <span className="text-navy dark:text-navy-tint font-bold">·</span>
                                        <div>
                                            <span>{item.title[lang]}</span>
                                            {item.testing && (
                                                <span className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold rounded bg-surface-sunken text-navy dark:text-navy-tint border border-line-subtle">
                                                    {t('roadmap.testingOnStaging')}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </GlassCard>

                        {/* Later Column */}
                        <GlassCard surface="glass" className="p-6 space-y-4">
                            <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-black/40 dark:bg-white/40" />
                                <h3 className="font-bold text-sm uppercase tracking-wider text-black dark:text-white">
                                    {t('roadmap.later')}
                                </h3>
                            </div>
                            <ul className="space-y-3">
                                {ROADMAP.later.map((item, idx) => (
                                    <li
                                        key={idx}
                                        className="text-sm text-black/80 dark:text-white/80 flex items-start gap-2"
                                    >
                                        <span className="text-black/40 dark:text-white/40 font-bold">·</span>
                                        <div>
                                            <span>{item.title[lang]}</span>
                                            {item.testing && (
                                                <span className="ml-2 inline-block px-2 py-0.5 text-xs font-semibold rounded bg-surface-sunken text-navy dark:text-navy-tint border border-line-subtle">
                                                    {t('roadmap.testingOnStaging')}
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </GlassCard>
                    </div>
                </div>

                {/* Join Us (Call to Organisers) */}
                <GlassCard surface="glass" className="p-8 md:p-12 text-center space-y-6">
                    <div className="max-w-2xl mx-auto space-y-2">
                        <h2 className="text-2xl md:text-3xl font-black font-score tracking-tight text-black dark:text-white">
                            {t('joinUs.title')}
                        </h2>
                    </div>
                    <div>
                        <Link
                            to="/contact?subject=ORGANISATION_REGISTRATION"
                            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 text-sm font-semibold rounded-lg bg-navy dark:bg-navy-tint text-white dark:text-black hover:bg-navy-hover dark:hover:bg-navy-tint/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint"
                        >
                            {t('joinUs.cta')}
                        </Link>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
