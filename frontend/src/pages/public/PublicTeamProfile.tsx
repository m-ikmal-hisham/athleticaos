import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    publicProfileApi,
    PublicTeamDetailResponse,
    PublicPlayerSummary,
    PublicOrganisationRef,
} from '../../api/public.api';
import { ProfileHero } from '../../components/profile/ProfileHero';
import { pickOrgColours } from '../../components/profile/colours';
import { GlassCard } from '../../components/GlassCard';
import { LogoImage } from '@/components/public/LogoImage';
import { formatTournamentLevel } from '@/utils/formatters';
import { RosterList } from '../../components/RosterList';
import { CompetitionFilterBar } from '../../components/common/CompetitionFilterBar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
    Users,
    Trophy,
    Shield,
    MagnifyingGlass,
    X,
    BuildingOffice,
    CaretDown,
} from '@phosphor-icons/react';
import { enumLabel } from '@/utils/enumLabel';

interface PositionGroup {
    key: string;
    titleKey: string;
    players: PublicPlayerSummary[];
}

function classifyPlayer(player: PublicPlayerSummary): string {
    const num = player.jerseyNumber;
    const pos = (player.position || '').toLowerCase().replace(/^reserve\s+/, '').trim();

    // Specific position text checks first
    if (pos.includes('prop') || pos.includes('hooker')) return 'frontRow';
    if (pos.includes('lock') || pos.includes('second row')) return 'locks';
    if (pos.includes('flanker') || pos.includes('eight') || pos.includes('8')) return 'backRow';
    if (pos.includes('scrum') || pos.includes('fly half') || pos.includes('flyhalf') || pos.includes('halfback') || pos.includes('half back') || pos.includes('stand-off')) return 'halfBacks';
    if (pos.includes('centre') || pos.includes('center')) return 'centres';
    if (pos.includes('wing') || pos.includes('fullback') || pos.includes('full back')) return 'backThree';

    // Jersey number checks if no text match
    if (num !== undefined && num !== null) {
        if (num >= 1 && num <= 3) return 'frontRow';
        if (num === 4 || num === 5) return 'locks';
        if (num >= 6 && num <= 8) return 'backRow';
        if (num === 9 || num === 10) return 'halfBacks';
        if (num === 12 || num === 13) return 'centres';
        if (num === 11 || num === 14 || num === 15) return 'backThree';
        // Reserves mapping standard rugby 16-23
        if (num === 16 || num === 17 || num === 18) return 'frontRow';
        if (num === 19) return 'locks';
        if (num === 20) return 'backRow';
        if (num === 21) return 'halfBacks';
        if (num === 22) return 'centres';
        if (num === 23) return 'backThree';
    }

    return 'extendedSquad';
}

export function PublicTeamProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation(['profile', 'teams', 'common']);
    const [team, setTeam] = useState<PublicTeamDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [playerSearch, setPlayerSearch] = useState('');
    const [rosterView, setRosterView] = useState<'position' | 'stats'>('position');
    const [mobileTab, setMobileTab] = useState<'squad' | 'tournaments' | 'club'>('squad');
    const [openPositionGroups, setOpenPositionGroups] = useState<Record<string, boolean>>({});

    const togglePositionGroup = (key: string, defaultOpen: boolean) => {
        setOpenPositionGroups(prev => ({
            ...prev,
            [key]: !(prev[key] ?? defaultOpen),
        }));
    };

    const [searchParams, setSearchParams] = useSearchParams();
    const initialTournamentId = searchParams.get('tournamentId') || '';
    const [selectedTournamentId, setSelectedTournamentId] = useState<string>(initialTournamentId);

    useEffect(() => {
        const fetchTeam = async () => {
            if (!id) return;
            try {
                setLoading(true);
                setError(null);
                const data = await publicProfileApi.getTeam(id, selectedTournamentId || undefined);
                setTeam(data);
            } catch (err: unknown) {
                console.error('Error fetching team:', err);
                const errorObj = err as { response?: { data?: { message?: string } } };
                setError(errorObj.response?.data?.message || 'Failed to load team details');
            } finally {
                setLoading(false);
            }
        };

        fetchTeam();
    }, [id, selectedTournamentId]);

    const handleTournamentSelect = (tournamentId: string | null) => {
        const val = tournamentId || '';
        setSelectedTournamentId(val);
        if (val) {
            setSearchParams({ tournamentId: val });
        } else {
            setSearchParams({});
        }
    };

    // Filter players by search query
    const filteredPlayers = useMemo(() => {
        if (!team?.players) return [];
        if (!playerSearch.trim()) return team.players;
        const q = playerSearch.toLowerCase();
        return team.players.filter(p => {
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            const pos = (p.position || '').toLowerCase();
            const jNum = p.jerseyNumber !== undefined && p.jerseyNumber !== null ? String(p.jerseyNumber) : '';
            return fullName.includes(q) || pos.includes(q) || jNum.includes(q);
        });
    }, [team?.players, playerSearch]);

    // Position Groups
    const positionGroups: PositionGroup[] = useMemo(() => {
        const groups: Record<string, PublicPlayerSummary[]> = {
            frontRow: [],
            locks: [],
            backRow: [],
            halfBacks: [],
            centres: [],
            backThree: [],
            extendedSquad: [],
        };

        filteredPlayers.forEach(player => {
            const grp = classifyPlayer(player);
            groups[grp].push(player);
        });

        const groupDefs: { key: string; titleKey: string }[] = [
            { key: 'frontRow', titleKey: 'positionGroups.frontRow' },
            { key: 'locks', titleKey: 'positionGroups.locks' },
            { key: 'backRow', titleKey: 'positionGroups.backRow' },
            { key: 'halfBacks', titleKey: 'positionGroups.halfBacks' },
            { key: 'centres', titleKey: 'positionGroups.centres' },
            { key: 'backThree', titleKey: 'positionGroups.backThree' },
            { key: 'extendedSquad', titleKey: 'positionGroups.extendedSquad' },
        ];

        return groupDefs
            .map(def => ({
                key: def.key,
                titleKey: def.titleKey,
                players: groups[def.key].sort((a, b) => (a.jerseyNumber || 99) - (b.jerseyNumber || 99)),
            }))
            .filter(grp => grp.players.length > 0);
    }, [filteredPlayers]);

    // Compute organisation colours
    const orgColours = useMemo(() => {
        return pickOrgColours(team?.organisation);
    }, [team?.organisation]);

    // Breadcrumbs chain (root parent to team)
    const breadcrumbChain = useMemo(() => {
        if (!team?.organisation) return [];
        const chain: PublicOrganisationRef[] = [];
        if (team.affiliation && team.affiliation.length > 0) {
            // Affiliation is nearest-first; reverse to get root-first (National -> State)
            const reversed = [...team.affiliation].reverse();
            chain.push(...reversed);
        }
        // Add owning organisation if not already the last entry
        if (!chain.some(o => o.id === team.organisation!.id)) {
            chain.push(team.organisation);
        }
        return chain;
    }, [team?.organisation, team?.affiliation]);

    // Top parent organisation
    const topParentOrg = useMemo(() => {
        if (!team?.affiliation || team.affiliation.length === 0) return null;
        return team.affiliation[team.affiliation.length - 1];
    }, [team?.affiliation]);

    // Count LIVE tournaments
    const liveCount = useMemo(() => {
        if (!team?.tournaments) return 0;
        return team.tournaments.filter(t => t.status === 'LIVE').length;
    }, [team?.tournaments]);

    // Total tries scored across roster
    const totalTriesScored = useMemo(() => {
        if (!team?.players) return 0;
        return team.players.reduce((sum, p) => sum + (p.tries || 0), 0);
    }, [team?.players]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !team) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl max-w-lg text-center border border-red-200 dark:border-red-800/40">
                    <h2 className="text-xl font-bold mb-2">
                        {t('teams:profile.notFound', { defaultValue: 'Team Not Found' })}
                    </h2>
                    <p className="text-sm mb-4">
                        {error || t('teams:profile.notFoundDesc', { defaultValue: 'This team profile could not be found or is not public.' })}
                    </p>
                    <button
                        onClick={() => navigate('/teams')}
                        className="px-4 py-2 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300 rounded-xl font-semibold text-sm hover:bg-red-200 transition-colors"
                    >
                        {t('teams:profile.backToTeams', { defaultValue: 'Back to Teams' })}
                    </button>
                </div>
            </div>
        );
    }

    // Build subtitle links
    const subtitleLinks = [];
    if (team.organisation) {
        subtitleLinks.push({
            prefix: t('team.belongsTo', 'Belongs to'),
            label: team.organisation.name,
            to: `/organisations/${team.organisation.slug || team.organisation.id}`,
        });
    } else if (team.organisationName) {
        subtitleLinks.push({
            prefix: t('team.belongsTo', 'Belongs to'),
            label: team.organisationName,
        });
    }

    if (topParentOrg && (!team.organisation || topParentOrg.id !== team.organisation.id)) {
        subtitleLinks.push({
            prefix: t('team.affiliatedTo', 'affiliated to'),
            label: topParentOrg.name,
            to: `/organisations/${topParentOrg.slug || topParentOrg.id}`,
        });
    }

    if (team.state) {
        subtitleLinks.push({
            label: team.state,
        });
    }

    // Build Chips
    const chips: Array<{ label: string; variant?: 'default' | 'live' }> = [];
    if (liveCount > 0) {
        chips.push({
            label: t('liveBadge', { count: liveCount, defaultValue: `● ${liveCount} LIVE` }),
            variant: 'live',
        });
    }
    if (team.category) chips.push({ label: enumLabel(t, 'category', team.category) });
    if (team.ageGroup) chips.push({ label: enumLabel(t, 'ageGroup', team.ageGroup) });
    if (team.division) chips.push({ label: enumLabel(t, 'tier', team.division) });

    // Breadcrumb items
    const breadcrumbItems = breadcrumbChain.length > 0
        ? [
            { label: t('breadcrumb.organisations', 'Organisations'), path: '/organisations' },
            ...breadcrumbChain.map(org => ({ label: org.name, path: `/organisations/${org.slug || org.id}` })),
            { label: team.name }
        ]
        : [
            { label: t('breadcrumb.teams', 'Teams'), path: '/teams' },
            { label: team.name }
        ];

    return (
        <div className="pb-16">
            {/* Profile Hero */}
            <div className="mb-8">
                <ProfileHero
                    variant="team"
                    size="public"
                    primary={team.organisation?.primaryColor}
                    secondary={team.organisation?.secondaryColor}
                    watermark={team.shortName || team.name.split(/\s+/).map(n => n.charAt(0)).slice(0, 3).join('').toUpperCase()}
                    avatar={team.logoUrl}
                    initials={team.shortName || team.name.split(/\s+/).map(n => n.charAt(0)).slice(0, 3).join('').toUpperCase()}
                    ringColour={orgColours.primary}
                    chips={chips}
                    title={team.name}
                    subtitleLinks={subtitleLinks}
                    breadcrumbs={
                        <Breadcrumbs
                            items={breadcrumbItems}
                            variant="on-dark"
                            showMobileBack={false}
                        />
                    }
                    stats={[
                        { label: t('stats.squad', 'Squad'), value: team.players?.length || 0 },
                        { label: t('stats.tournaments', 'Tournaments'), value: team.tournaments?.length || 0 },
                        { label: t('stats.triesScored', 'Tries scored'), value: totalTriesScored },
                    ]}
                />
            </div>

            {/* Mobile Tab Selector (< lg) */}
            <div className="mb-6 lg:hidden">
                <div className="grid grid-cols-3 gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl">
                    <button
                        onClick={() => setMobileTab('squad')}
                        className={`min-h-[44px] flex items-center justify-center py-2 text-xs font-bold rounded-xl transition-all ${
                            mobileTab === 'squad'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        {t('tabs.squad', 'Squad')} ({team.players?.length || 0})
                    </button>
                    <button
                        onClick={() => setMobileTab('tournaments')}
                        className={`min-h-[44px] flex items-center justify-center py-2 text-xs font-bold rounded-xl transition-all ${
                            mobileTab === 'tournaments'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        {t('tabs.tournaments', 'Tournaments')} ({team.tournaments?.length || 0})
                    </button>
                    <button
                        onClick={() => setMobileTab('club')}
                        className={`min-h-[44px] flex items-center justify-center py-2 text-xs font-bold rounded-xl transition-all ${
                            mobileTab === 'club'
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        {t('tabs.club', 'Club')}
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left 2 Columns: Squad View */}
                    <div className={`lg:col-span-2 space-y-6 ${mobileTab !== 'squad' ? 'hidden lg:block' : ''}`}>
                        <GlassCard surface="glass" className="p-6 sm:p-8 rounded-3xl">
                            {/* Roster Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-navy dark:text-navy-tint" />
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                        {t('activeRoster', 'Active squad')}
                                    </h2>
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                    {t('playersCount', { count: filteredPlayers.length, defaultValue: `${filteredPlayers.length} players` })}
                                </span>
                            </div>

                            {/* Search Bar */}
                            {team.players && team.players.length > 4 && (
                                <div className="relative mb-5">
                                    <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={t('searchPlayerPlaceholder', 'Search squad by name, position or jersey...')}
                                        value={playerSearch}
                                        onChange={(e) => setPlayerSearch(e.target.value)}
                                        className="w-full pl-10 pr-10 min-h-[44px] py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-navy transition-all"
                                    />
                                    {playerSearch && (
                                        <button
                                            aria-label={t('teams:list.clearSearch', { defaultValue: 'Clear search' })}
                                            onClick={() => setPlayerSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* View Switcher: "By position" vs "Player Stats" */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 mb-6 pb-2 gap-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setRosterView('position')}
                                        className={`min-h-[44px] inline-flex items-center pb-2.5 px-4 font-bold text-sm transition-all border-b-2 ${
                                            rosterView === 'position'
                                                ? 'border-navy text-navy dark:border-navy-tint dark:text-navy-tint'
                                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {t('byPosition', 'By position')}
                                    </button>
                                    <button
                                        onClick={() => setRosterView('stats')}
                                        className={`min-h-[44px] inline-flex items-center pb-2.5 px-4 font-bold text-sm transition-all border-b-2 ${
                                            rosterView === 'stats'
                                                ? 'border-navy text-navy dark:border-navy-tint dark:text-navy-tint'
                                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {t('statsView', 'Player stats')}
                                    </button>
                                </div>

                                {/* Competition Filter Bar */}
                                {team.tournaments && team.tournaments.length > 0 && (
                                    <div className="min-w-0 max-w-full">
                                        <CompetitionFilterBar
                                            tournaments={team.tournaments.map(tItem => ({
                                                id: tItem.id,
                                                name: tItem.name,
                                                status: tItem.status,
                                            }))}
                                            selectedTournamentId={selectedTournamentId || null}
                                            onSelect={handleTournamentSelect}
                                            allLabel={t('teams:profile.allTournamentsGlobal', { defaultValue: 'All Tournaments (Global)' })}
                                            variant="public"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Squad Content */}
                            {filteredPlayers.length > 0 ? (
                                rosterView === 'position' ? (
                                    /* Grouped By Position */
                                    <div className="space-y-6">
                                        {positionGroups.map((grp, idx) => {
                                            const defaultOpen = idx === 0;
                                            const isOpen = openPositionGroups[grp.key] ?? defaultOpen;
                                            return (
                                                <div key={grp.key} className="border-b border-slate-100 dark:border-slate-800 md:border-b-0 pb-4 md:pb-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePositionGroup(grp.key, defaultOpen)}
                                                        className="w-full min-h-[44px] flex items-center justify-between text-left mb-3 group/grp md:pointer-events-none"
                                                        aria-expanded={isOpen}
                                                    >
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                            <span>{t(grp.titleKey, grp.key)}</span>
                                                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                                ({grp.players.length})
                                                            </span>
                                                        </span>
                                                        <CaretDown
                                                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 md:hidden ${isOpen ? 'rotate-180' : ''}`}
                                                            weight="bold"
                                                        />
                                                    </button>
                                                    <div className={`grid-cols-1 sm:grid-cols-2 gap-3 ${isOpen ? 'grid' : 'hidden md:grid'}`}>
                                                        {grp.players.map(player => (
                                                            <div
                                                                key={player.id}
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/players/${player.id}${
                                                                            selectedTournamentId
                                                                                ? `?tournamentId=${selectedTournamentId}`
                                                                                : ''
                                                                        }`
                                                                    )
                                                                }
                                                                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 hover:shadow-md transition-all cursor-pointer group"
                                                            >
                                                                {/* Navy jersey-number square with inset bottom colour bar */}
                                                                <div className="w-11 h-11 rounded-xl bg-[#0D1B2A] text-white flex flex-col items-center justify-center relative overflow-hidden font-score shrink-0 shadow-sm">
                                                                    <span className="text-sm font-black">
                                                                        {player.jerseyNumber !== undefined && player.jerseyNumber !== null
                                                                            ? player.jerseyNumber
                                                                            : '—'}
                                                                    </span>
                                                                    {/* Inset bottom bar in organisation primary colour */}
                                                                    <div
                                                                        className="absolute bottom-0 inset-x-0 h-1.5"
                                                                        style={{ backgroundColor: orgColours.primary }}
                                                                    />
                                                                </div>

                                                                {/* Player Name and Position */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-navy dark:group-hover:text-navy-tint transition-colors">
                                                                        {player.firstName} {player.lastName}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                                        {player.position || 'Player'}
                                                                        {player.position2 ? ` · ${player.position2}` : ''}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* Standard Stats View */
                                    <div className="overflow-x-auto">
                                        <RosterList
                                            players={filteredPlayers as unknown as import('../../types').Player[]}
                                            onPlayerClick={(playerId) =>
                                                navigate(
                                                    `/players/${playerId}${
                                                        selectedTournamentId
                                                            ? `?tournamentId=${selectedTournamentId}`
                                                            : ''
                                                    }`
                                                )
                                            }
                                            showStats={true}
                                        />
                                    </div>
                                )
                            ) : playerSearch ? (
                                <div className="text-center py-12 text-slate-500 text-sm">
                                    {t('noPlayersFound', { search: playerSearch, defaultValue: `No players matching "${playerSearch}"` })}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 text-sm">
                                    {t('noRosterData', 'No squad data available for this team.')}
                                </div>
                            )}
                        </GlassCard>
                    </div>

                    {/* Right 1 Column: Side Column (Ladder + Tournaments) */}
                    <div className="space-y-6">
                        {/* Club & Affiliation Ladder */}
                        <div className={mobileTab !== 'club' ? 'hidden lg:block' : ''}>
                            <GlassCard surface="glass" className="p-6 rounded-3xl">
                                <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <BuildingOffice className="w-4 h-4 text-navy dark:text-navy-tint" />
                                    <span>{t('clubAndAffiliation', 'Club and affiliation')}</span>
                                </h2>

                                <div className="space-y-3 relative pl-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                    {/* Affiliation chain: National -> State -> Owning Club */}
                                    {breadcrumbChain.map((org) => (
                                        <div key={org.id} className="relative flex items-center gap-3">
                                            {/* Node circle */}
                                            <div
                                                className="w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-800 border-2 shrink-0 -ml-[23px]"
                                                style={{ borderColor: org.primaryColor || orgColours.primary }}
                                            />
                                            <Link
                                                to={`/organisations/${org.slug || org.id}`}
                                                className="flex-1 min-h-[44px] p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center justify-between group"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-navy dark:group-hover:text-navy-tint transition-colors">
                                                        {org.name}
                                                    </div>
                                                    <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                                        {formatTournamentLevel(org.level, t)}
                                                    </div>
                                                </div>
                                                <div className="w-6 h-6 rounded shrink-0 overflow-hidden flex items-center justify-center">
                                                    <LogoImage
                                                        src={org.logoUrl}
                                                        name={org.name}
                                                        className="w-full h-full object-contain"
                                                        icon={<Shield className="w-5 h-5 text-slate-400" />}
                                                    />
                                                </div>
                                            </Link>
                                        </div>
                                    ))}

                                    {/* Current Team (Active bottom node) */}
                                    <div className="relative flex items-center gap-3">
                                        <div
                                            className="w-4 h-4 rounded-full bg-navy dark:bg-navy-tint border-2 border-white dark:border-slate-900 shrink-0 -ml-[24px] shadow-sm"
                                        />
                                        <div className="flex-1 p-3 rounded-xl bg-[#0D1B2A] text-white border border-white/10 shadow-sm flex items-center justify-between">
                                            <div className="min-w-0 pr-2">
                                                <div className="text-xs font-black truncate">{team.name}</div>
                                                <div className="text-[11px] uppercase font-bold tracking-wider text-white/60">
                                                    {t('teams:profile.thisTeam', { defaultValue: 'THIS TEAM' })}
                                                </div>
                                            </div>
                                            <div className="w-7 h-7 rounded shrink-0 overflow-hidden flex items-center justify-center">
                                                <LogoImage
                                                    src={team.logoUrl}
                                                    name={team.name}
                                                    className="w-full h-full object-contain"
                                                    icon={<Shield className="w-5 h-5 text-white/70" />}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Tournaments Panel with Status Badges */}
                        <div className={mobileTab !== 'tournaments' ? 'hidden lg:block' : ''}>
                            <GlassCard surface="glass" className="p-6 rounded-3xl">
                                <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-navy dark:text-navy-tint" />
                                    <span>{t('tournaments', 'Tournaments')}</span>
                                </h2>

                                {team.tournaments && team.tournaments.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {team.tournaments.map((tourn) => {
                                            const isLive = tourn.status === 'LIVE';
                                            const isUpcoming = tourn.status === 'UPCOMING';

                                            return (
                                                <Link
                                                    key={tourn.id}
                                                    to={`/tournaments/${tourn.id}`}
                                                    className="min-h-[44px] p-3 rounded-2xl bg-white/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all flex items-center justify-between gap-3 group"
                                                >
                                                    <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-navy dark:group-hover:text-navy-tint transition-colors truncate">
                                                        {tourn.name}
                                                    </div>
                                                    <div className="shrink-0">
                                                        {isLive ? (
                                                            <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-[#C1121F] text-white shadow-sm flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                                {t('common:status.live', { defaultValue: 'LIVE' })}
                                                            </span>
                                                        ) : isUpcoming ? (
                                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                                                {t('common:status.upcoming', { defaultValue: 'UPCOMING' })}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                                {tourn.status ? t(`common:status.${tourn.status.toLowerCase()}`, { defaultValue: tourn.status }) : t('common:status.completed', { defaultValue: 'COMPLETED' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 py-4 text-center">
                                        {t('teams:profile.noTournaments', { defaultValue: 'No tournament records for this team yet.' })}
                                    </p>
                                )}
                            </GlassCard>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
