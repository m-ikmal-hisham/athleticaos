import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CaretRight,
    CaretDown,
    MapPin,
    Trophy,
    Shield,
    TreeStructure,
    WarningCircle,
    Info,
    Calendar,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { usePublicOrganisation } from '@/hooks/public';
import { PublicOrganisationChildRef, PublicOrganisationTreeTeam } from '@/api/public.api';

function getContrastTextColor(hex: string | null | undefined): string {
    if (!hex) return '#FFFFFF';
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6 && cleanHex.length !== 3) return '#FFFFFF';

    let r: number, g: number, b: number;
    if (cleanHex.length === 3) {
        r = parseInt(cleanHex[0] + cleanHex[0], 16);
        g = parseInt(cleanHex[1] + cleanHex[1], 16);
        b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else {
        r = parseInt(cleanHex.substring(0, 2), 16);
        g = parseInt(cleanHex.substring(2, 4), 16);
        b = parseInt(cleanHex.substring(4, 6), 16);
    }

    // Relative luminance
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#0D1B2A' : '#FFFFFF';
}

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

export function OrganisationDetail() {
    const { slug } = useParams<{ slug: string }>();
    const { t } = useTranslation(['organisations', 'common']);
    const navigate = useNavigate();

    const { data: org, isLoading, isError } = usePublicOrganisation(slug);

    const primaryColor = org?.primaryColor || '#0047AB';
    const secondaryColor = org?.secondaryColor || '#C1121F';
    const levelTextColor = useMemo(() => getContrastTextColor(primaryColor), [primaryColor]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-surface-page pb-12">
                {/* Hero Skeleton */}
                <div className="h-72 bg-deep-navy animate-pulse" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
                    <div className="h-24 rounded-[14px] bg-surface-card border border-line-subtle animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="h-48 rounded-[14px] bg-surface-card border border-line-subtle animate-pulse" />
                            <div className="h-48 rounded-[14px] bg-surface-card border border-line-subtle animate-pulse" />
                        </div>
                        <div className="h-64 rounded-[14px] bg-surface-card border border-line-subtle animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !org) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-crimson/10 text-crimson mb-4">
                    <WarningCircle size={48} weight="duotone" />
                </div>
                <h1 className="text-2xl font-bold text-content-primary mb-2">
                    {t('organisations:detail.notFoundTitle')}
                </h1>
                <p className="text-content-secondary max-w-md mb-6">
                    {t('organisations:detail.notFoundDesc')}
                </p>
                <Button variant="primary" onClick={() => navigate('/organisations')}>
                    {t('organisations:detail.backToOrganisations')}
                </Button>
            </div>
        );
    }

    // Direct immediate parent if any in parentChain (nearest first)
    const immediateParent = org.parentChain && org.parentChain.length > 0 ? org.parentChain[0] : null;

    // Breadcrumb chain in display order: [topParent, ..., immediateParent, current]
    const breadcrumbChain = org.parentChain ? [...org.parentChain].reverse() : [];

    return (
        <div className="min-h-screen bg-surface-page pb-16">
            {/* Breadcrumb row */}
            <div className="bg-surface-card border-b border-line-subtle">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-content-secondary flex-wrap">
                        <Link to="/organisations" className="hover:text-content-primary transition-colors">
                            {t('organisations:title')}
                        </Link>
                        {breadcrumbChain.map((ancestor) => (
                            <React.Fragment key={ancestor.id}>
                                <CaretRight size={12} className="text-content-secondary shrink-0" />
                                <Link
                                    to={`/organisations/${ancestor.slug || ancestor.id}`}
                                    className="hover:text-content-primary transition-colors truncate max-w-[150px]"
                                >
                                    {ancestor.name}
                                </Link>
                            </React.Fragment>
                        ))}
                        <CaretRight size={12} className="text-content-secondary shrink-0" />
                        <span className="font-semibold text-content-primary truncate max-w-[200px]" aria-current="page">
                            {org.name}
                        </span>
                    </nav>
                </div>
            </div>

            {/* Hero Header with Diagonal Brand Bands */}
            <div className="relative overflow-hidden bg-deep-navy text-white pt-10 pb-8 sm:pt-14 sm:pb-12 border-b border-line-subtle">
                {/* Diagonal Brand Stripes */}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden"
                >
                    <div
                        className="absolute -top-32 -right-24 w-96 h-[600px] -rotate-45"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        }}
                    />
                    <div
                        className="absolute top-1/4 -right-12 w-32 h-[400px] -rotate-45 opacity-60"
                        style={{ backgroundColor: secondaryColor }}
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                        {/* Round Logo Tile with Primary Colour Ring */}
                        <div
                            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-surface-card shrink-0 flex items-center justify-center p-2 shadow-xl overflow-hidden"
                            style={{ boxShadow: `0 0 0 4px ${primaryColor}` }}
                        >
                            {org.logoUrl ? (
                                <img
                                    src={org.logoUrl}
                                    alt={org.name}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={clsx('w-full h-full rounded-full flex items-center justify-center font-bold text-2xl text-deep-navy', org.logoUrl ? 'hidden' : '')}>
                                {getInitials(org.name)}
                            </div>
                        </div>

                        {/* Org Information */}
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                {/* Level Pill with Primary Colour */}
                                <span
                                    className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs"
                                    style={{
                                        backgroundColor: primaryColor,
                                        color: levelTextColor,
                                    }}
                                >
                                    {t(`organisations:levels.${org.level}`, org.level)}
                                </span>

                                {/* State Pill */}
                                {org.state && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
                                        <MapPin size={12} weight="fill" />
                                        <span>{org.state}</span>
                                    </span>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
                                {org.name}
                            </h1>

                            {/* "Affiliated to <parent>" */}
                            {immediateParent && (
                                <p className="text-sm text-white/80">
                                    {t('organisations:detail.affiliatedTo', { name: '' })}
                                    <Link
                                        to={`/organisations/${immediateParent.slug || immediateParent.id}`}
                                        className="font-semibold text-white underline hover:text-white/80 transition-colors ml-1"
                                    >
                                        {immediateParent.name}
                                    </Link>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Stats Strip */}
                    <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
                        <div className="space-y-0.5">
                            <div className="text-2xl sm:text-3xl font-black text-white">
                                {org.counts.affiliatedOrganisations}
                            </div>
                            <div className="text-xs text-white/70">
                                {t('organisations:detail.stats.affiliatedOrgs')}
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <div className="text-2xl sm:text-3xl font-black text-white">
                                {org.counts.teams}
                            </div>
                            <div className="text-xs text-white/70">
                                {t('organisations:detail.stats.teams')}
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <div className="text-2xl sm:text-3xl font-black text-white">
                                {org.counts.players}
                            </div>
                            <div className="text-xs text-white/70">
                                {t('organisations:detail.stats.players')}
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <div className="text-2xl sm:text-3xl font-black text-white">
                                {org.counts.tournaments}
                            </div>
                            <div className="text-xs text-white/70">
                                {t('organisations:detail.stats.tournaments')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Main Column: Affiliated organisations + Teams */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Section: Affiliated Organisations */}
                        {org.children.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-lg font-bold text-content-primary flex items-center gap-2">
                                    <TreeStructure size={20} className="text-navy" />
                                    <span>{t('organisations:detail.sections.affiliatedOrgs')}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-content-secondary font-semibold">
                                        {org.children.length}
                                    </span>
                                </h2>

                                <div className="space-y-2">
                                    {org.children.map((child: PublicOrganisationChildRef) => (
                                        <details
                                            key={child.id}
                                            className="group bg-surface-card border border-line-subtle rounded-[14px] p-4 transition-colors open:ring-1 open:ring-navy/20"
                                        >
                                            <summary className="flex items-center justify-between cursor-pointer list-none select-none">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs bg-surface-sunken border border-line-subtle text-content-primary overflow-hidden"
                                                        style={
                                                            child.primaryColor
                                                                ? { backgroundColor: `${child.primaryColor}18`, color: child.primaryColor }
                                                                : undefined
                                                        }
                                                    >
                                                        {child.logoUrl ? (
                                                            <img
                                                                src={child.logoUrl}
                                                                alt={child.name}
                                                                className="w-full h-full object-contain p-1"
                                                            />
                                                        ) : (
                                                            getInitials(child.name)
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link
                                                            to={`/organisations/${child.slug || child.id}`}
                                                            className="font-semibold text-content-primary hover:text-navy dark:hover:text-navy-tint hover:underline transition-colors truncate text-sm block"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                        <div className="text-xs text-content-secondary">
                                                            {t(`organisations:levels.${child.level}`, child.level)}
                                                            {child.teamCount > 0 && ` · ${t('organisations:tree.teamsCount_other', { count: child.teamCount })}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-content-secondary group-open:rotate-180 transition-transform p-1">
                                                    <CaretDown size={16} />
                                                </div>
                                            </summary>

                                            <div className="mt-3 pt-3 border-t border-line-subtle flex items-center justify-between text-xs">
                                                <span className="text-content-secondary">
                                                    {child.childCount > 0
                                                        ? `${child.childCount} sub-affiliations`
                                                        : 'Direct affiliate'}
                                                </span>
                                                <Link
                                                    to={`/organisations/${child.slug || child.id}`}
                                                    className="font-semibold text-navy dark:text-navy-tint hover:underline flex items-center gap-1"
                                                >
                                                    <span>View page</span>
                                                    <CaretRight size={12} />
                                                </Link>
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section: Teams */}
                        <div className="space-y-3">
                            <h2 className="text-lg font-bold text-content-primary flex items-center gap-2">
                                <Shield size={20} className="text-navy" />
                                <span>{t('organisations:detail.sections.teams')}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-content-secondary font-semibold">
                                    {org.teams.length}
                                </span>
                            </h2>

                            {org.teams.length === 0 ? (
                                <GlassCard className="py-8 text-center text-content-secondary text-sm">
                                    {t('organisations:detail.sections.noTeams')}
                                </GlassCard>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {org.teams.map((team: PublicOrganisationTreeTeam) => (
                                        <Link
                                            key={team.id}
                                            to={`/teams/${team.slug || team.id}`}
                                            className="group relative overflow-hidden bg-surface-card border border-line-subtle rounded-[14px] p-4 hover:border-navy/30 dark:hover:border-navy-tint/30 hover:bg-surface-sunken transition-all shadow-xs flex flex-col justify-between"
                                        >
                                            {/* Jersey-Hoop Stripes Accent Bar at Top */}
                                            <div
                                                aria-hidden="true"
                                                className="absolute top-0 left-0 right-0 h-1.5"
                                                style={{
                                                    background: `repeating-linear-gradient(90deg, ${primaryColor} 0px, ${primaryColor} 12px, ${secondaryColor} 12px, ${secondaryColor} 24px)`,
                                                }}
                                            />

                                            <div className="flex items-start gap-3 pt-1">
                                                <div className="w-10 h-10 rounded-xl bg-surface-sunken border border-line-subtle flex items-center justify-center shrink-0 overflow-hidden text-content-secondary">
                                                    {team.logoUrl ? (
                                                        <img
                                                            src={team.logoUrl}
                                                            alt={team.name}
                                                            className="w-full h-full object-contain p-1"
                                                        />
                                                    ) : (
                                                        <Shield size={20} weight="duotone" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-content-primary group-hover:text-navy dark:group-hover:text-navy-tint transition-colors text-sm truncate">
                                                        {team.name}
                                                    </h3>
                                                    <div className="text-xs text-content-secondary mt-0.5 truncate">
                                                        {[team.category, team.ageGroup, team.division]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-xs text-content-secondary">
                                                <span>
                                                    {team.playerCount > 0
                                                        ? t('organisations:tree.playersCount', {
                                                              count: team.playerCount,
                                                          })
                                                        : t('organisations:detail.roster')}
                                                </span>
                                                <span className="text-navy dark:text-navy-tint font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                                    {t('organisations:detail.viewTeam')} <CaretRight size={12} />
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Column: Tournaments Organised + Transparency Note */}
                    <div className="space-y-6">
                        {/* Tournaments Organised */}
                        <GlassCard className="p-5 space-y-4">
                            <h2 className="text-base font-bold text-content-primary flex items-center gap-2">
                                <Trophy size={18} className="text-navy" />
                                <span>{t('organisations:detail.sections.tournaments')}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-content-secondary font-semibold">
                                    {org.tournaments.length}
                                </span>
                            </h2>

                            {org.tournaments.length === 0 ? (
                                <p className="text-xs text-content-secondary">
                                    {t('organisations:detail.sections.noTournaments')}
                                </p>
                            ) : (
                                <div className="space-y-2.5">
                                    {org.tournaments.map((tItem) => (
                                        <Link
                                            key={tItem.id}
                                            to={`/tournaments/${tItem.slug || tItem.id}`}
                                            className="group block p-3 rounded-[10px] bg-surface-sunken border border-line-subtle hover:border-navy/30 dark:hover:border-navy-tint/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-surface-card border border-line-subtle flex items-center justify-center shrink-0 overflow-hidden text-content-secondary">
                                                    {tItem.logoUrl ? (
                                                        <img
                                                            src={tItem.logoUrl}
                                                            alt={tItem.name}
                                                            className="w-full h-full object-contain p-1"
                                                        />
                                                    ) : (
                                                        <Trophy size={16} weight="duotone" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-xs text-content-primary group-hover:text-navy dark:group-hover:text-navy-tint truncate transition-colors">
                                                        {tItem.name}
                                                    </div>
                                                    {tItem.startDate && (
                                                        <div className="text-[11px] text-content-secondary mt-0.5 flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            <span>{tItem.startDate}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <CaretRight size={14} className="text-content-secondary group-hover:translate-x-0.5 transition-transform shrink-0" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </GlassCard>

                        {/* Public Transparency Note */}
                        <div className="p-4 rounded-[12px] bg-surface-sunken border border-line-subtle flex items-start gap-3">
                            <Info size={18} className="text-content-secondary shrink-0 mt-0.5" weight="duotone" />
                            <p className="text-xs text-content-secondary leading-relaxed">
                                {t('organisations:detail.transparencyNote')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrganisationDetail;
