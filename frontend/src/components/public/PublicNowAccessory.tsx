import { Link, useLocation } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { useSpotlightTournament } from '@/hooks/useSpotlightTournament';
import { useUIStore } from '@/store/ui.store';
import { PublicTournamentSummary } from '@/api/public.api';

/**
 * Returns true only when the public spotlight tournament is LIVE,
 * not on a match route, and no sheet or modal is open.
 */
export function useIsPublicAccessoryLive(): boolean {
    const { tournament } = useSpotlightTournament({ isAdmin: false });
    const overlayCount = useUIStore((s) => s.overlayCount);
    const location = useLocation();
    const isMatches = location.pathname.startsWith('/matches/');
    return Boolean(tournament?.live && overlayCount === 0 && !isMatches);
}

interface PublicNowAccessoryProps {
    tournament?: PublicTournamentSummary | null;
    className?: string;
}

/**
 * Live tournament accessory floating capsule.
 * Height 52px, glass material (§4), z-index pill 35.
 * Shown only when the picked public tournament is LIVE,
 * hidden on /matches/* and while any sheet/modal is open.
 */
export function PublicNowAccessory({ tournament: propTournament, className }: PublicNowAccessoryProps) {
    const { tournament: hookTournament } = useSpotlightTournament({ isAdmin: false });
    const tournament = propTournament !== undefined ? propTournament : hookTournament;
    const isLive = useIsPublicAccessoryLive();

    if (!isLive || !tournament) {
        return null;
    }

    const tournamentPath = `/tournaments/${tournament.slug || tournament.id}`;

    return (
        <Link
            to={tournamentPath}
            aria-label={`Live now: ${tournament.name}`}
            className={clsx(
                'glass z-[35] flex items-center justify-between w-full h-[52px] px-3 rounded-full',
                'text-content-primary no-underline outline-none',
                'focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint',
                'active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150',
                className
            )}
        >
            {/* Left: Logo + Name */}
            <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-surface-sunken flex items-center justify-center">
                    <TournamentLogo
                        tournamentId={tournament.id}
                        logoUrl={tournament.logoUrl || tournament.organiserBranding?.logoUrl}
                        className="w-full h-full object-contain"
                    />
                </div>
                <div className="min-w-0">
                    <span className="block text-sm font-semibold truncate leading-tight text-black dark:text-white">
                        {tournament.name}
                    </span>
                    {tournament.organiserName && (
                        <span className="block text-xs text-black/60 dark:text-white/60 truncate leading-tight">
                            {tournament.organiserName}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Crimson LIVE dot with pulse + chevron */}
            <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-crimson text-white text-xs font-bold uppercase tracking-wider shadow-sm select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" />
                    LIVE
                </span>
                <CaretRight size={18} weight="bold" className="text-black/60 dark:text-white/60" aria-hidden="true" />
            </div>
        </Link>
    );
}
