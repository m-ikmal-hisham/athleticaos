import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { JOURNEY_1, JOURNEY_2, ROADMAP, type Journey as JourneyType, type Milestone, type SetPiece } from '@/content/journey';
import { JourneyField, SetPieceIcon } from '@/components/public/journey/JourneyField';
import { getPublicStatsSummary, type PublicStatsSummary } from '@/api/public.api';
import { PRODUCT_NAME } from '@/config/site';

const SET_PIECE_ORDER: SetPiece[] = ['kick', 'phase', 'scrum', 'lineout', 'ruck', 'maul', 'try', 'conv'];

export default function Journey() {
    const { t, i18n } = useTranslation('journey');
    const lang = i18n.language && i18n.language.startsWith('ms') ? 'ms' : 'en';

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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8 md:pt-4 md:pb-12 space-y-6 md:space-y-10">
            {/* -------------------------------------------------------------- */}
            {/* 1. Header & Journey Tabs Selector                                */}
            {/* -------------------------------------------------------------- */}
            <div className="text-center space-y-2 max-w-3xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold font-score tracking-tight text-black dark:text-white">
                    {t('pageTitle')}
                </h1>
                <p className="text-sm sm:text-base text-black/72 dark:text-white/72">
                    {t('subtitle')}
                </p>

                {/* Journey selector tabs */}
                <div className="inline-flex p-1 rounded-xl bg-surface-sunken border border-line-subtle gap-1">
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

            {/* -------------------------------------------------------------- */}
            {/* 2. Interactive Rugby Pitch & Milestone Detail Card               */}
            {/* -------------------------------------------------------------- */}
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row items-start gap-6">
                    {/* The Rugby Field SVG */}
                    <div className="w-full lg:flex-1">
                        <JourneyField
                            journey={selectedJourney}
                            selectedMilestone={selectedMilestone}
                            onSelectMilestone={setSelectedMilestone}
                            lang={lang}
                        />
                    </div>

                    {/* Milestone Detail Card (beside field on ≥ lg, below on < lg) */}
                    <div className="w-full lg:w-80 shrink-0">
                        <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm space-y-4">
                            <div className="flex items-center justify-between gap-2 border-b border-line-subtle pb-3">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={clsx(
                                            'w-8 h-8 rounded-full flex items-center justify-center text-xs',
                                            selectedMilestone.status === 'current' && 'bg-crimson text-white',
                                            selectedMilestone.status === 'done' && 'bg-navy dark:bg-navy-tint text-white dark:text-black',
                                            selectedMilestone.status === 'next' && 'bg-surface-sunken text-black/72 dark:text-white/72 border border-line-subtle'
                                        )}
                                    >
                                        <SetPieceIcon piece={selectedMilestone.setPiece} className="w-4 h-4" />
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                                        {selectedMilestone.setPiece}
                                    </span>
                                </div>

                                {/* Status badge */}
                                {selectedMilestone.status === 'current' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-crimson text-white uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                                        LIVE
                                    </span>
                                )}
                                {selectedMilestone.status === 'done' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy dark:text-navy-tint">
                                        <CheckCircle weight="fill" className="w-4 h-4" />
                                        {lang === 'ms' ? 'Selesai' : 'Done'}
                                    </span>
                                )}
                                {selectedMilestone.status === 'next' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-black/60 dark:text-white/60">
                                        <Clock weight="duotone" className="w-4 h-4" />
                                        {lang === 'ms' ? 'Akan datang' : 'Upcoming'}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-navy dark:text-navy-tint">
                                    {selectedMilestone.date}
                                </p>
                                <h3 className="text-lg font-bold text-black dark:text-white">
                                    {selectedMilestone.title[lang]}
                                </h3>
                            </div>

                            <p className="text-sm text-black/80 dark:text-white/80 leading-relaxed">
                                {selectedMilestone.text[lang]}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* 3. Legend (Set piece meanings)                              */}
                {/* ---------------------------------------------------------- */}
                <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm space-y-4">
                    <div className="border-b border-line-subtle pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-black/72 dark:text-white/72">
                            {t('legend.title')}
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {SET_PIECE_ORDER.map((piece) => (
                            <div key={piece} className="flex items-start gap-2.5 text-xs">
                                <span className="w-6 h-6 rounded-full bg-surface-sunken flex items-center justify-center shrink-0 text-navy dark:text-navy-tint">
                                    <SetPieceIcon piece={piece} className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-black/80 dark:text-white/80 leading-snug">
                                    {t(`legend.${piece}`)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* 4. Live Counters (hidden if request fails; no fakes)             */}
            {/* -------------------------------------------------------------- */}
            {!statsFailed && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {statsLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="p-6 rounded-xl bg-surface-card border border-line-subtle animate-pulse space-y-2">
                                    <div className="h-8 bg-surface-sunken rounded w-16" />
                                    <div className="h-4 bg-surface-sunken rounded w-24" />
                                </div>
                            ))
                        ) : stats ? (
                            <>
                                <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm text-center md:text-left">
                                    <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                        {stats.tournaments}
                                    </p>
                                    <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                        {t('counters.tournaments')}
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm text-center md:text-left">
                                    <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                        {stats.teams}
                                    </p>
                                    <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                        {t('counters.teams')}
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm text-center md:text-left">
                                    <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                        {stats.players}
                                    </p>
                                    <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                        {t('counters.players')}
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm text-center md:text-left">
                                    <p className="text-3xl md:text-4xl font-extrabold font-score tabular-nums text-navy dark:text-navy-tint">
                                        {stats.matchesPlayed}
                                    </p>
                                    <p className="text-xs sm:text-sm font-medium text-black/72 dark:text-white/72 mt-1">
                                        {t('counters.matchesPlayed')}
                                    </p>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* 5. What's Next (Roadmap 3 Columns)                              */}
            {/* -------------------------------------------------------------- */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black font-score tracking-tight text-black dark:text-white uppercase">
                        {t('roadmap.title')}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Now Column */}
                    <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-crimson motion-safe:animate-pulse" />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-black dark:text-white">
                                {t('roadmap.now')}
                            </h3>
                        </div>
                        <ul className="space-y-3">
                            {ROADMAP.now.map((item, idx) => (
                                <li key={idx} className="text-sm text-black/80 dark:text-white/80 flex items-start gap-2">
                                    <span className="text-navy dark:text-navy-tint font-bold">·</span>
                                    <div>
                                        <span>{item.title[lang]}</span>
                                        {item.testing && (
                                            <span className="ml-2 inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-sunken text-navy dark:text-navy-tint border border-line-subtle">
                                                {t('roadmap.testingOnStaging')}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Next Column */}
                    <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-navy dark:bg-navy-tint" />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-black dark:text-white">
                                {t('roadmap.next')}
                            </h3>
                        </div>
                        <ul className="space-y-3">
                            {ROADMAP.next.map((item, idx) => (
                                <li key={idx} className="text-sm text-black/80 dark:text-white/80 flex items-start gap-2">
                                    <span className="text-navy dark:text-navy-tint font-bold">·</span>
                                    <div>
                                        <span>{item.title[lang]}</span>
                                        {item.testing && (
                                            <span className="ml-2 inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-sunken text-navy dark:text-navy-tint border border-line-subtle">
                                                {t('roadmap.testingOnStaging')}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Later Column */}
                    <div className="p-6 rounded-xl bg-surface-card border border-line-subtle shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-line-subtle pb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-black/40 dark:bg-white/40" />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-black dark:text-white">
                                {t('roadmap.later')}
                            </h3>
                        </div>
                        <ul className="space-y-3">
                            {ROADMAP.later.map((item, idx) => (
                                <li key={idx} className="text-sm text-black/80 dark:text-white/80 flex items-start gap-2">
                                    <span className="text-black/40 dark:text-white/40 font-bold">·</span>
                                    <div>
                                        <span>{item.title[lang]}</span>
                                        {item.testing && (
                                            <span className="ml-2 inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-surface-sunken text-navy dark:text-navy-tint border border-line-subtle">
                                                {t('roadmap.testingOnStaging')}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* 6. Join Us (Call to Organisers)                                  */}
            {/* -------------------------------------------------------------- */}
            <div className="p-8 md:p-12 rounded-2xl bg-surface-card border border-line-subtle shadow-sm text-center space-y-6">
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
            </div>
        </div>
    );
}
