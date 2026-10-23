import { useTranslation } from 'react-i18next';
import { CaretUpDown, Trophy } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { useSpotlightTournament } from '@/hooks/useSpotlightTournament';

interface AdminTournamentAccessoryProps {
    onOpenSwitcher: () => void;
    className?: string;
}

/**
 * Admin tournament accessory floating capsule.
 * Height 52px, glass material (§4), z-index pill 35.
 * Displays current spotlight tournament name, LIVE dot when live, and a chevron.
 * Tapping opens the TournamentSwitcher.
 */
export function AdminTournamentAccessory({ onOpenSwitcher, className }: AdminTournamentAccessoryProps) {
    const { i18n } = useTranslation();
    const t = i18n.getFixedT('en', 'admin');
    const { tournament } = useSpotlightTournament({ isAdmin: true });

    return (
        <button
            type="button"
            onClick={onOpenSwitcher}
            aria-label={t('accessory.openSwitcher')}
            className={clsx(
                'glass z-[35] flex items-center justify-between w-full h-[52px] px-3 rounded-full',
                'text-content-primary no-underline outline-none text-left',
                'focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                'active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150',
                className
            )}
        >
            {/* Left: Logo + Name */}
            <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-surface-sunken flex items-center justify-center border border-line-subtle">
                    {tournament && (tournament.logoUrl || tournament.organiserBranding?.logoUrl) ? (
                        <TournamentLogo
                            tournamentId={tournament.id}
                            logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <Trophy size={16} className="text-content-secondary" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate leading-tight text-black dark:text-white">
                        {tournament ? tournament.name : t('switcher.selectTournament')}
                    </span>
                    {tournament?.organiserName && (
                        <span className="block text-xs text-black/60 dark:text-white/60 truncate leading-tight">
                            {tournament.organiserName}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: LIVE dot if live + chevron */}
            <div className="flex items-center gap-2 shrink-0">
                {tournament?.live && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-crimson text-white text-[11px] font-bold uppercase tracking-wider shadow-sm select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                        Live
                    </span>
                )}
                <CaretUpDown size={18} weight="bold" className="text-black/60 dark:text-white/60" aria-hidden="true" />
            </div>
        </button>
    );
}
