import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getDateLocale } from '@/utils/malaysiaDate';
import {
    publicProfileApi,
    PublicPlayerDetailResponse,
    PublicOrganisationRef,
} from '../../api/public.api';
import { ProfileHero } from '../../components/profile/ProfileHero';
import { PositionPitch } from '../../components/profile/PositionPitch';
import { pickOrgColours } from '../../components/profile/colours';
import { GlassCard } from '../../components/GlassCard';
import { CompetitionFilterBar } from '../../components/common/CompetitionFilterBar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
    Shield,
    Pulse,
    Hash,
    Calendar,
    MapPin,
    Trophy,
    Info,
} from '@phosphor-icons/react';

interface RecentMatchStat {
    matchDate?: string;
    teamName?: string;
    tournamentName?: string;
    opponentName?: string;
    result?: string;
    tries?: number;
    points?: number;
    minutesPlayed?: string | number;
}

interface PlayerStatsData {
    matchesPlayed?: number;
    totalMinutesPlayed?: number;
    totalPoints?: number;
    tries?: number;
    conversions?: number;
    penalties?: number;
    dropGoals?: number;
    yellowCards?: number;
    redCards?: number;
    recentMatches?: RecentMatchStat[];
}

function getUnitCategory(position?: string | null, jerseyNumber?: number | null): 'FORWARDS' | 'BACKS' | null {
    if (jerseyNumber !== undefined && jerseyNumber !== null) {
        if (jerseyNumber >= 1 && jerseyNumber <= 8) return 'FORWARDS';
        if (jerseyNumber >= 9 && jerseyNumber <= 15) return 'BACKS';
    }
    if (!position) return null;
    const p = position.toLowerCase();
    if (
        p.includes('prop') ||
        p.includes('hooker') ||
        p.includes('lock') ||
        p.includes('flanker') ||
        p.includes('eight') ||
        p.includes('forward')
    ) {
        return 'FORWARDS';
    }
    if (
        p.includes('scrum') ||
        p.includes('fly') ||
        p.includes('half') ||
        p.includes('centre') ||
        p.includes('center') ||
        p.includes('wing') ||
        p.includes('fullback') ||
        p.includes('back')
    ) {
        return 'BACKS';
    }
    return null;
}

export function PublicPlayerProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation(['profile', 'players', 'common']);
    const [player, setPlayer] = useState<PublicPlayerDetailResponse | null>(null);
    const [stats, setStats] = useState<PlayerStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const initialTournamentId = searchParams.get('tournamentId') || null;
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(initialTournamentId);

    // Synchronise state with URL search params
    useEffect(() => {
        const param = searchParams.get('tournamentId');
        setSelectedTournamentId(param || null);
    }, [searchParams]);

    const handleTournamentSelect = (tournamentId: string | null) => {
        setSelectedTournamentId(tournamentId);
        if (tournamentId) {
            setSearchParams({ tournamentId }, { preventScrollReset: true });
        } else {
            setSearchParams({}, { preventScrollReset: true });
        }
    };

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!id) return;
            try {
                setLoading(true);
                setError(null);
                const [data, statsData] = await Promise.all([
                    publicProfileApi.getPlayer(id, selectedTournamentId || undefined),
                    publicProfileApi.getPlayerStats(id, selectedTournamentId || undefined).catch(() => null),
                ]);
                setPlayer(data);
                setStats(statsData);
            } catch (err: unknown) {
                console.error('Error fetching player:', err);
                const errorObj = err as { response?: { data?: { message?: string } } };
                setError(errorObj.response?.data?.message || 'Failed to load player details');
            } finally {
                setLoading(false);
            }
        };

        fetchPlayer();
    }, [id, selectedTournamentId]);

    const orgColours = useMemo(() => {
        return pickOrgColours(player?.organisation);
    }, [player?.organisation]);

    // Breadcrumbs chain
    const breadcrumbChain = useMemo(() => {
        if (!player?.organisation) return [];
        const chain: PublicOrganisationRef[] = [];
        if (player.affiliation && player.affiliation.length > 0) {
            const reversed = [...player.affiliation].reverse();
            chain.push(...reversed);
        }
        if (!chain.some(o => o.id === player.organisation!.id)) {
            chain.push(player.organisation);
        }
        return chain;
    }, [player?.organisation, player?.affiliation]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !player) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl max-w-lg text-center border border-red-200 dark:border-red-800/40">
                    <h2 className="text-xl font-bold mb-2">
                        {t('players:profile.notFound', { defaultValue: 'Player Not Found' })}
                    </h2>
                    <p className="text-sm mb-4">
                        {error || t('players:profile.notFoundDesc', { defaultValue: 'This player profile could not be found or is not public.' })}
                    </p>
                    <button
                        onClick={() => navigate('/players')}
                        className="px-4 py-2 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-xl font-semibold text-sm hover:bg-red-200 transition-colors"
                    >
                        {t('players:profile.backToPlayers', { defaultValue: 'Back to Players' })}
                    </button>
                </div>
            </div>
        );
    }

    const fullName = `${player.firstName} ${player.lastName}`;
    const age = player.age ?? null;

    // Subtitle links: current team · organisation · state
    const subtitleLinks = [];
    if (player.currentTeamName) {
        subtitleLinks.push({
            prefix: t('player.team', 'Team'),
            label: player.currentTeamName,
            to: player.currentTeamId ? `/teams/${player.currentTeamId}` : undefined,
        });
    }
    if (player.organisation) {
        subtitleLinks.push({
            label: player.organisation.name,
            to: `/organisations/${player.organisation.slug || player.organisation.id}`,
        });
    } else if (player.organisationName) {
        subtitleLinks.push({
            label: player.organisationName,
        });
    }
    if (player.state) {
        subtitleLinks.push({
            label: player.state,
        });
    }

    // Position Chip ("FLY HALF · BACKS")
    const chips: string[] = [];
    if (player.position) {
        const unit = getUnitCategory(player.position, player.jerseyNumber);
        const positionLabel = unit
            ? `${player.position.toUpperCase()} · ${unit}`
            : player.position.toUpperCase();
        chips.push(positionLabel);
    }
    if (player.position2) {
        chips.push(player.position2.toUpperCase());
    }

    // Breadcrumb items
    const breadcrumbItems = breadcrumbChain.length > 0
        ? [
            { label: t('breadcrumb.organisations', 'Organisations'), path: '/organisations' },
            ...breadcrumbChain.map(org => ({ label: org.name, path: `/organisations/${org.slug || org.id}` })),
            ...(player.currentTeamName
                ? [{ label: player.currentTeamName, path: player.currentTeamId ? `/teams/${player.currentTeamId}` : undefined }]
                : []),
            { label: fullName }
        ]
        : [
            { label: t('breadcrumb.players', 'Players'), path: '/players' },
            { label: fullName }
        ];

    return (
        <div className="pb-16">
            {/* Profile Hero with PositionPitch in the aside */}
            <div className="mb-8">
                <ProfileHero
                    variant="player"
                    size="public"
                    primary={player.organisation?.primaryColor}
                    secondary={player.organisation?.secondaryColor}
                    watermark={player.jerseyNumber ? String(player.jerseyNumber) : undefined}
                    avatar={player.profilePictureUrl}
                    initials={`${player.firstName.charAt(0)}${player.lastName.charAt(0)}`.toUpperCase()}
                    ringColour={orgColours.primary}
                    badgeText={player.jerseyNumber}
                    chips={chips}
                    title={fullName}
                    subtitleLinks={subtitleLinks}
                    breadcrumbs={
                        <Breadcrumbs
                            items={breadcrumbItems}
                            variant="on-dark"
                            showMobileBack={false}
                        />
                    }
                    aside={
                        <PositionPitch
                            position={player.position}
                            jerseyNumber={player.jerseyNumber}
                            primaryColour={orgColours.primary}
                            secondaryColour={orgColours.secondary}
                        />
                    }
                    stats={[
                        { label: t('stats.appearances', 'Appearances'), value: stats?.matchesPlayed },
                        { label: t('stats.tries', 'Tries'), value: stats?.tries },
                        { label: t('stats.conversions', 'Conversions'), value: stats?.conversions },
                        { label: t('stats.penalties', 'Penalties'), value: stats?.penalties },
                        { label: t('stats.yellowCards', 'Yellow cards'), value: stats?.yellowCards },
                        { label: t('stats.redCards', 'Red cards'), value: stats?.redCards },
                    ]}
                />
            </div>

            {/* Main Content */}
            <div>
                {/* Competition Filter Bar */}
                {player.tournaments && player.tournaments.length > 0 && (
                    <div className="mb-8">
                        <GlassCard surface="glass" className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white shrink-0">
                                <Trophy className="w-4 h-4 text-navy dark:text-navy-tint" />
                                <span>{t('players:profile.filterByTournament', { defaultValue: 'Filter by tournament:' })}</span>
                            </div>
                            <CompetitionFilterBar
                                tournaments={player.tournaments.map(tItem => ({
                                    id: tItem.id,
                                    name: tItem.name,
                                    status: tItem.status,
                                }))}
                                selectedTournamentId={selectedTournamentId}
                                onSelect={handleTournamentSelect}
                                allLabel={t('players:profile.allTimeCareer', { defaultValue: 'All-Time Career (Global)' })}
                                variant="public"
                            />
                        </GlassCard>
                    </div>
                )}

                {/* 2-Column Grid: Career by tournament on left / Details on right */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Career by Tournament Table (2 Cols) */}
                    <div className="lg:col-span-2 space-y-6">
                        <GlassCard surface="glass" className="p-6 sm:p-8 rounded-3xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-navy dark:text-navy-tint" />
                                    <span>{t('player.careerByTournament', 'Career by tournament')}</span>
                                </h2>
                                {selectedTournamentId && (
                                    <button
                                        onClick={() => handleTournamentSelect(null)}
                                        className="min-h-[44px] inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-navy dark:text-navy-tint bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                                    >
                                        <span>{t('players:profile.viewAllTimeCareer', { defaultValue: 'View all-time career' })}</span>
                                    </button>
                                )}
                            </div>

                            {/* Recent Matches Table */}
                            {stats?.recentMatches && stats.recentMatches.length > 0 ? (
                                <div className="overflow-x-auto -mx-6 sm:mx-0">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                                <th className="py-3 px-3 text-left font-semibold">{t('players:profile.table.date', { defaultValue: 'Date' })}</th>
                                                <th className="py-3 px-3 text-left font-semibold">{t('players:profile.table.team', { defaultValue: 'Team' })}</th>
                                                <th className="py-3 px-3 text-left font-semibold">{t('players:profile.table.opponent', { defaultValue: 'Opponent' })}</th>
                                                <th className="py-3 px-3 text-center font-semibold">{t('players:profile.table.result', { defaultValue: 'Result' })}</th>
                                                <th className="py-3 px-3 text-center font-semibold">{t('players:profile.table.tries', { defaultValue: 'Tries' })}</th>
                                                <th className="py-3 px-3 text-center font-semibold">{t('players:profile.table.pts', { defaultValue: 'Pts' })}</th>
                                                <th className="py-3 px-3 text-center font-semibold">{t('players:profile.table.mins', { defaultValue: 'Mins' })}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                                            {stats.recentMatches.slice(0, 10).map((match, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3 px-3 text-slate-500 text-xs whitespace-nowrap">
                                                        {match.matchDate
                                                            ? format(new Date(match.matchDate), 'd MMM', { locale: getDateLocale(i18n.language) })
                                                            : '—'}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                                                {match.teamName || '—'}
                                                            </span>
                                                            {match.tournamentName && (
                                                                <span className="text-slate-400 text-xs truncate max-w-[130px]">
                                                                    {match.tournamentName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white text-xs truncate max-w-[150px]">
                                                        {match.opponentName || '—'}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                                                match.result?.startsWith('W')
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                    : match.result?.startsWith('L')
                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                    : match.result?.startsWith('D')
                                                                    ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                                    : 'text-slate-500'
                                                            }`}
                                                        >
                                                            {match.result || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                                        {match.tries || 0}
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-black text-navy dark:text-navy-tint text-xs">
                                                        {match.points || 0}
                                                    </td>
                                                    <td className="py-3 px-3 text-center text-slate-500 text-xs">
                                                        {match.minutesPlayed || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 text-sm">
                                    {t('players:profile.noMatches', { defaultValue: 'No matches recorded for this tournament.' })}
                                </div>
                            )}
                        </GlassCard>
                    </div>

                    {/* Player Details Panel (Exactly the fields shown publicly today) */}
                    <div className="space-y-6">
                        <GlassCard surface="glass" className="p-6 rounded-3xl">
                            <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Pulse className="w-4 h-4 text-navy dark:text-navy-tint" />
                                <span>{t('player.detailsTitle', 'Player details')}</span>
                            </h2>

                            <div className="space-y-3.5 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                {player.position && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                                            <Hash className="w-3.5 h-3.5 text-slate-400" />
                                            {t('player.position', 'Position')}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                            {player.position}
                                            {player.position2 ? ` / ${player.position2}` : ''}
                                        </span>
                                    </div>
                                )}

                                {player.gender && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                                            {t('player.gender', 'Gender')}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white capitalize text-xs">
                                            {player.gender.toLowerCase()}
                                        </span>
                                    </div>
                                )}

                                {(player.ageGroup || age !== null) && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {player.ageGroup ? t('player.ageGroup', 'Age group') : t('player.age', 'Age')}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                            {player.ageGroup || (age !== null ? t('players:profile.years', { age, defaultValue: `${age} yrs` }) : '—')}
                                        </span>
                                    </div>
                                )}

                                {player.country && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {t('player.country', 'Country')}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                            {player.country}
                                        </span>
                                    </div>
                                )}

                                {player.state && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {t('player.state', 'State')}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                            {player.state}
                                        </span>
                                    </div>
                                )}

                                {player.city && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {t('player.city', 'City')}
                                        </span>
                                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                                            {player.city}
                                        </span>
                                    </div>
                                )}

                                {player.currentTeamName && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                                            <Shield className="w-3.5 h-3.5 text-slate-400" />
                                            {t('player.team', 'Team')}
                                        </span>
                                        {player.currentTeamId ? (
                                            <Link
                                                to={`/teams/${player.currentTeamId}`}
                                                className="font-semibold text-navy dark:text-navy-tint hover:underline text-xs truncate max-w-[160px] inline-flex items-center min-h-[24px]"
                                            >
                                                {player.currentTeamName}
                                            </Link>
                                        ) : (
                                            <span className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[160px]">
                                                {player.currentTeamName}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Public transparency note */}
                            <div className="mt-5 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                                    {t('player.detailsNote', "Only details the player's organisation has made public are shown.")}
                                </p>
                            </div>
                        </GlassCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
