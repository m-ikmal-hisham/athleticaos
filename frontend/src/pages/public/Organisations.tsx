import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CaretRight,
    CaretDown,
    MagnifyingGlass,
    X,
    Shield,
    TreeStructure,
    WarningCircle,
    ArrowsOut,
    ArrowsIn,
    Buildings,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { usePublicOrganisationTree } from '@/hooks/public';
import {
    PublicOrganisationTreeNode,
    PublicOrganisationTreeTeam,
} from '@/api/public.api';
import { LogoImage } from '@/components/public/LogoImage';

interface OrgHierarchyNode {
    org: PublicOrganisationTreeNode;
    key: string;
    children: OrgHierarchyNode[];
    teams: PublicOrganisationTreeTeam[];
    depth: number;
}

type LevelFilterOption = 'ALL' | 'STATE' | 'CLUB' | 'SCHOOL';

function HighlightMatch({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <>{text}</>;
    const regex = new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 text-inherit rounded-xs px-0.5">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
}

export function Organisations() {
    const { t } = useTranslation(['organisations', 'common']);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const { data, isLoading, isError, refetch } = usePublicOrganisationTree();

    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState<LevelFilterOption>('ALL');

    const openParam = searchParams.get('open');
    const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
    const [hasInitializedOpen, setHasInitializedOpen] = useState(false);

    // Build hierarchy
    const { hierarchy, allKeys, topLevelKeys } = useMemo(() => {
        if (!data) {
            return { hierarchy: [] as OrgHierarchyNode[], allKeys: new Set<string>(), topLevelKeys: new Set<string>() };
        }

        const orgs = data.organisations;
        const teams = data.teams;

        const orgMap = new Map<string, OrgHierarchyNode>();
        const allKeySet = new Set<string>();
        const topKeySet = new Set<string>();

        // Teams by org ID
        const teamsByOrg = new Map<string, PublicOrganisationTreeTeam[]>();
        for (const team of teams) {
            const list = teamsByOrg.get(team.organisationId) ?? [];
            list.push(team);
            teamsByOrg.set(team.organisationId, list);
        }

        // Initialize node map
        for (const org of orgs) {
            const key = org.slug || org.id;
            allKeySet.add(key);
            orgMap.set(org.id, {
                org,
                key,
                children: [],
                teams: teamsByOrg.get(org.id) ?? [],
                depth: 0,
            });
        }

        // Build parent-child tree
        const roots: OrgHierarchyNode[] = [];
        for (const org of orgs) {
            const node = orgMap.get(org.id);
            if (!node) continue;

            if (org.parentId && orgMap.has(org.parentId)) {
                const parentNode = orgMap.get(org.parentId);
                if (parentNode) {
                    parentNode.children.push(node);
                }
            } else {
                roots.push(node);
                topKeySet.add(node.key);
            }
        }

        // Recursively compute depth
        function setDepths(nodes: OrgHierarchyNode[], currentDepth: number) {
            for (const n of nodes) {
                n.depth = currentDepth;
                setDepths(n.children, currentDepth + 1);
            }
        }
        setDepths(roots, 0);

        return { hierarchy: roots, allKeys: allKeySet, topLevelKeys: topKeySet };
    }, [data]);

    // Initialise open keys from URL parameter, or default to top-level organisations
    useEffect(() => {
        if (!hasInitializedOpen && topLevelKeys.size > 0) {
            if (openParam !== null) {
                const keysFromUrl = openParam.split(',').filter(Boolean);
                setOpenKeys(new Set(keysFromUrl));
            } else {
                setOpenKeys(new Set(topLevelKeys));
            }
            setHasInitializedOpen(true);
        }
    }, [openParam, topLevelKeys, hasInitializedOpen]);

    // Synchronise open keys back to URL
    const updateOpenKeysInUrl = useCallback(
        (next: Set<string>) => {
            setOpenKeys(next);
            setSearchParams(
                (prev) => {
                    const nextParams = new URLSearchParams(prev);
                    if (next.size > 0) {
                        nextParams.set('open', Array.from(next).join(','));
                    } else {
                        nextParams.delete('open');
                    }
                    return nextParams;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const toggleOpen = useCallback(
        (key: string) => {
            const next = new Set(openKeys);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            updateOpenKeysInUrl(next);
        },
        [openKeys, updateOpenKeysInUrl]
    );

    const handleExpandAll = useCallback(() => {
        updateOpenKeysInUrl(new Set(allKeys));
    }, [allKeys, updateOpenKeysInUrl]);

    const handleCollapseAll = useCallback(() => {
        updateOpenKeysInUrl(new Set());
    }, [updateOpenKeysInUrl]);

    // Filtering logic
    const { filteredHierarchy, matchedOrgCount, matchedTeamCount, autoExpandedKeys } = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const autoOpen = new Set<string>();

        let totalOrgs = 0;
        let totalTeams = 0;

        function filterNode(node: OrgHierarchyNode): OrgHierarchyNode | null {
            const orgNameMatch = !query || node.org.name.toLowerCase().includes(query);
            const levelMatch =
                levelFilter === 'ALL' ||
                (levelFilter === 'STATE' && node.org.level === 'STATE') ||
                (levelFilter === 'CLUB' && node.org.level === 'CLUB') ||
                (levelFilter === 'SCHOOL' && node.org.level === 'SCHOOL');

            // Filter teams
            const matchingTeams = node.teams.filter((t) => {
                const teamNameMatch = !query || t.name.toLowerCase().includes(query);
                return teamNameMatch && levelMatch;
            });

            // Filter children recursively
            const matchingChildren: OrgHierarchyNode[] = [];
            for (const child of node.children) {
                const filteredChild = filterNode(child);
                if (filteredChild) {
                    matchingChildren.push(filteredChild);
                }
            }

            const hasMatchingDescendant = matchingChildren.length > 0 || matchingTeams.length > 0;
            const matchesCurrent = orgNameMatch && levelMatch;

            if (matchesCurrent || hasMatchingDescendant) {
                totalOrgs++;
                totalTeams += matchingTeams.length;

                if (query && hasMatchingDescendant) {
                    autoOpen.add(node.key);
                }

                return {
                    ...node,
                    children: matchingChildren,
                    teams: matchingTeams,
                };
            }

            return null;
        }

        const filtered: OrgHierarchyNode[] = [];
        for (const root of hierarchy) {
            const res = filterNode(root);
            if (res) filtered.push(res);
        }

        return {
            filteredHierarchy: filtered,
            matchedOrgCount: totalOrgs,
            matchedTeamCount: totalTeams,
            autoExpandedKeys: autoOpen,
        };
    }, [hierarchy, searchQuery, levelFilter]);

    // Effective open set includes search-auto-expanded keys
    const effectiveOpenKeys = useMemo(() => {
        if (searchQuery.trim().length > 0) {
            return new Set([...openKeys, ...autoExpandedKeys]);
        }
        return openKeys;
    }, [openKeys, autoExpandedKeys, searchQuery]);

    // Keyboard navigation: flat list of visible navigable items
    interface FlatItem {
        id: string;
        type: 'org' | 'team';
        key: string;
        url: string;
        parentKey?: string;
        isExpanded?: boolean;
        hasChildren?: boolean;
    }

    const flatItems = useMemo(() => {
        const items: FlatItem[] = [];

        function traverse(node: OrgHierarchyNode, parentKey?: string) {
            const isExpanded = effectiveOpenKeys.has(node.key);
            const hasChildren = node.children.length > 0 || node.teams.length > 0;

            items.push({
                id: node.org.id,
                type: 'org',
                key: node.key,
                url: `/organisations/${node.org.slug || node.org.id}`,
                parentKey,
                isExpanded,
                hasChildren,
            });

            if (isExpanded) {
                for (const child of node.children) {
                    traverse(child, node.key);
                }
                for (const team of node.teams) {
                    items.push({
                        id: team.id,
                        type: 'team',
                        key: team.slug || team.id,
                        url: `/teams/${team.slug || team.id}`,
                        parentKey: node.key,
                    });
                }
            }
        }

        for (const root of filteredHierarchy) {
            traverse(root);
        }

        return items;
    }, [filteredHierarchy, effectiveOpenKeys]);

    const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

    const handleTreeKeyDown = (e: React.KeyboardEvent, item: FlatItem) => {
        const index = flatItems.findIndex((fi) => fi.key === item.key);
        if (index === -1) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = flatItems[index + 1];
            if (next) itemRefs.current.get(next.key)?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = flatItems[index - 1];
            if (prev) itemRefs.current.get(prev.key)?.focus();
        } else if (e.key === 'ArrowRight') {
            if (item.type === 'org' && item.hasChildren) {
                e.preventDefault();
                if (!item.isExpanded) {
                    toggleOpen(item.key);
                } else {
                    const next = flatItems[index + 1];
                    if (next) itemRefs.current.get(next.key)?.focus();
                }
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (item.type === 'org' && item.isExpanded) {
                toggleOpen(item.key);
            } else if (item.parentKey) {
                itemRefs.current.get(item.parentKey)?.focus();
            }
        } else if (e.key === 'Enter') {
            // Default link action or navigate
            navigate(item.url);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="space-y-2">
                    <div className="h-9 w-64 rounded-md bg-surface-sunken animate-pulse" />
                    <div className="h-5 w-96 rounded-md bg-surface-sunken animate-pulse" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-16 rounded-[14px] border border-line-subtle bg-surface-card animate-pulse"
                            />
                        ))}
                    </div>
                    <div className="h-64 rounded-[14px] border border-line-subtle bg-surface-card animate-pulse" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center">
                <div className="p-4 rounded-full bg-crimson/10 text-crimson mb-4">
                    <WarningCircle size={40} weight="duotone" />
                </div>
                <h2 className="text-xl font-bold text-content-primary mb-2">
                    {t('organisations:errorTitle')}
                </h2>
                <Button variant="primary" onClick={() => void refetch()}>
                    {t('organisations:retry')}
                </Button>
            </div>
        );
    }

    const renderOrgRow = (node: OrgHierarchyNode) => {
        const isOpen = effectiveOpenKeys.has(node.key);
        const hasChildren = node.children.length > 0 || node.teams.length > 0;
        const org = node.org;

        // Meta string: e.g. "Sarawak · 2 teams · 1 division"
        const metaParts: string[] = [];
        if (org.state) metaParts.push(org.state);
        if (org.teamCount > 0) {
            metaParts.push(
                org.teamCount === 1
                    ? t('organisations:tree.teamsCount_one', { count: 1 })
                    : t('organisations:tree.teamsCount_other', { count: org.teamCount })
            );
        }
        if (org.childCount > 0) {
            // Children of a state are divisions, of a division/district clubs; above state they are organisations
            const labelKey =
                org.level === 'STATE'
                    ? 'divisionsCount'
                    : org.level === 'DIVISION' || org.level === 'DISTRICT'
                    ? 'clubsCount'
                    : 'orgsCount';
            metaParts.push(
                org.childCount === 1
                    ? t(`organisations:tree.${labelKey}_one`, { count: 1 })
                    : t(`organisations:tree.${labelKey}_other`, { count: org.childCount })
            );
        }

        const isTopLevel = node.depth === 0;

        return (
            <div key={node.key} role="treeitem" aria-level={node.depth + 1} aria-expanded={hasChildren ? isOpen : undefined}>
                <div
                    ref={(el) => {
                        if (el) itemRefs.current.set(node.key, el);
                        else itemRefs.current.delete(node.key);
                    }}
                    tabIndex={0}
                    onKeyDown={(e) =>
                        handleTreeKeyDown(e, {
                            id: org.id,
                            type: 'org',
                            key: node.key,
                            url: `/organisations/${org.slug || org.id}`,
                            parentKey: undefined,
                            isExpanded: isOpen,
                            hasChildren,
                        })
                    }
                    style={{ paddingLeft: `${node.depth * 28 + 12}px` }}
                    className={clsx(
                        'group flex items-center gap-3 py-3 pr-4 rounded-[12px] border border-transparent hover:border-line-subtle hover:bg-surface-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy'
                    )}
                >
                    {/* Expand/Collapse Chevron Button */}
                    <div className="w-6 flex items-center justify-center shrink-0">
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOpen(node.key);
                                }}
                                aria-label={t(
                                    isOpen ? 'organisations:tree.collapse' : 'organisations:tree.expand',
                                    { name: org.name }
                                )}
                                className="p-1 rounded-md text-content-secondary hover:text-content-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                                {isOpen ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
                            </button>
                        ) : (
                            <span className="w-2 h-2 rounded-full bg-line-subtle" />
                        )}
                    </div>

                    {/* Logo / Badge */}
                    <div
                        className={clsx(
                            'w-9 h-9 rounded-lg shrink-0 flex items-center justify-center overflow-hidden font-bold text-xs',
                            isTopLevel
                                ? 'bg-navy text-white ring-2 ring-navy/20'
                                : 'bg-surface-sunken text-content-primary border border-line-subtle'
                        )}
                        style={
                            !isTopLevel && org.primaryColor
                                ? { backgroundColor: `${org.primaryColor}18`, color: org.primaryColor }
                                : undefined
                        }
                    >
                        <LogoImage
                            src={org.logoUrl}
                            name={org.name}
                            className="w-full h-full object-contain p-1"
                            fallbackClassName="text-xs"
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link
                                to={`/organisations/${org.slug || org.id}`}
                                className="font-semibold text-content-primary hover:text-navy dark:hover:text-navy-tint hover:underline transition-colors truncate text-sm sm:text-base"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <HighlightMatch text={org.name} query={searchQuery} />
                            </Link>

                            {/* Level Pill */}
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-surface-sunken text-content-secondary border border-line-subtle">
                                {t(`organisations:levels.${org.level}`, org.level)}
                            </span>
                        </div>

                        {metaParts.length > 0 && (
                            <div className="text-xs text-content-secondary mt-0.5 truncate">
                                {metaParts.join(' · ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Children & Teams Group */}
                {hasChildren && isOpen && (
                    <div role="group" className="space-y-1 mt-1">
                        {node.children.map(renderOrgRow)}
                        {node.teams.map((team) => renderTeamRow(team, node.depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const renderTeamRow = (team: PublicOrganisationTreeTeam, depth: number) => {
        const teamKey = team.slug || team.id;
        const metaParts: string[] = [];
        if (team.category) metaParts.push(team.category);
        if (team.ageGroup) metaParts.push(team.ageGroup);
        if (team.playerCount > 0) {
            metaParts.push(t('organisations:tree.playersCount', { count: team.playerCount }));
        }

        return (
            <div
                key={teamKey}
                role="treeitem"
                aria-level={depth + 1}
                ref={(el) => {
                    if (el) itemRefs.current.set(teamKey, el);
                    else itemRefs.current.delete(teamKey);
                }}
                tabIndex={0}
                onKeyDown={(e) =>
                    handleTreeKeyDown(e, {
                        id: team.id,
                        type: 'team',
                        key: teamKey,
                        url: `/teams/${team.slug || team.id}`,
                    })
                }
                style={{ paddingLeft: `${depth * 28 + 12}px` }}
                className="group flex items-center gap-3 py-2.5 pr-4 rounded-[12px] border border-transparent hover:border-line-subtle hover:bg-surface-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            >
                <div className="w-6 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-line-subtle" />
                </div>

                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-surface-sunken border border-line-subtle text-content-secondary overflow-hidden">
                    <LogoImage
                        src={team.logoUrl}
                        name={team.name}
                        className="w-full h-full object-contain p-1"
                        icon={<Shield size={16} weight="duotone" />}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            to={`/teams/${team.slug || team.id}`}
                            className="font-medium text-content-primary hover:text-navy dark:hover:text-navy-tint hover:underline transition-colors truncate text-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <HighlightMatch text={team.name} query={searchQuery} />
                        </Link>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-navy/10 text-navy dark:text-navy-tint">
                            {t('organisations:pills.team')}
                        </span>
                    </div>
                    {metaParts.length > 0 && (
                        <div className="text-xs text-content-secondary mt-0.5 truncate">
                            {metaParts.join(' · ')}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="font-score text-3xl sm:text-4xl font-bold text-content-primary">
                    {t('organisations:title')}
                </h1>
                <p className="text-content-secondary text-sm sm:text-base">
                    {t('organisations:subtitle')}
                </p>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlass
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('organisations:searchPlaceholder')}
                        className="w-full pl-10 pr-9 py-2 rounded-[10px] border border-line-subtle bg-surface-card text-content-primary placeholder:text-content-secondary text-sm focus:outline-none focus:ring-2 focus:ring-navy"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label={t('organisations:clearFilters')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-secondary hover:text-content-primary p-0.5 rounded"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Level Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {(['ALL', 'STATE', 'CLUB', 'SCHOOL'] as const).map((lvl) => {
                        const active = levelFilter === lvl;
                        return (
                            <button
                                key={lvl}
                                type="button"
                                onClick={() => setLevelFilter(lvl)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                                    active
                                        ? 'bg-navy text-white'
                                        : 'bg-surface-card border border-line-subtle text-content-secondary hover:text-content-primary hover:bg-surface-sunken'
                                )}
                            >
                                {t(`organisations:levelFilter.${lvl.toLowerCase()}`)}
                            </button>
                        );
                    })}
                </div>

                {/* Expand / Collapse Controls */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                        type="button"
                        onClick={handleExpandAll}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-sunken transition-colors"
                    >
                        <ArrowsOut size={14} />
                        <span>{t('organisations:expandAll')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleCollapseAll}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-surface-sunken transition-colors"
                    >
                        <ArrowsIn size={14} />
                        <span>{t('organisations:collapseAll')}</span>
                    </button>
                </div>
            </div>

            {/* Showing Count */}
            <div className="text-xs text-content-secondary">
                {t('organisations:showingCounts', {
                    orgCount: matchedOrgCount,
                    teamCount: matchedTeamCount,
                })}
            </div>

            {/* Main Layout: Tree + Explainer Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Tree Column */}
                <div className="lg:col-span-2 space-y-2">
                    {filteredHierarchy.length === 0 ? (
                        <GlassCard className="py-12">
                            <EmptyState
                                icon={TreeStructure}
                                title={t('organisations:noResults')}
                                description={t('organisations:noResultsDesc')}
                                actionLabel={
                                    searchQuery || levelFilter !== 'ALL'
                                        ? t('organisations:clearFilters')
                                        : undefined
                                }
                                onAction={() => {
                                    setSearchQuery('');
                                    setLevelFilter('ALL');
                                }}
                            />
                        </GlassCard>
                    ) : (
                        <div
                            role="tree"
                            aria-label={t('organisations:title')}
                            className="bg-surface-card border border-line-subtle rounded-[14px] p-2 space-y-1 shadow-xs"
                        >
                            {filteredHierarchy.map(renderOrgRow)}
                        </div>
                    )}
                </div>

                {/* Side Panel: "How rugby is organised" */}
                <div className="space-y-4">
                    <GlassCard className="p-6 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <Buildings size={22} weight="duotone" className="text-navy" />
                            <h2 className="text-base font-bold text-content-primary">
                                {t('organisations:howOrganised.title')}
                            </h2>
                        </div>
                        <p className="text-xs text-content-secondary leading-relaxed">
                            {t('organisations:howOrganised.explainer')}
                        </p>

                        <div className="space-y-3 pt-2 border-t border-line-subtle">
                            {[
                                {
                                    level: '1',
                                    title: t('organisations:howOrganised.national'),
                                    desc: t('organisations:howOrganised.nationalDesc'),
                                },
                                {
                                    level: '2',
                                    title: t('organisations:howOrganised.state'),
                                    desc: t('organisations:howOrganised.stateDesc'),
                                },
                                {
                                    level: '3',
                                    title: t('organisations:howOrganised.division'),
                                    desc: t('organisations:howOrganised.divisionDesc'),
                                },
                                {
                                    level: '4',
                                    title: t('organisations:howOrganised.clubSchool'),
                                    desc: t('organisations:howOrganised.clubSchoolDesc'),
                                },
                                {
                                    level: '5',
                                    title: t('organisations:howOrganised.teams'),
                                    desc: t('organisations:howOrganised.teamsDesc'),
                                },
                            ].map((step, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {step.level}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-content-primary">
                                            {step.title}
                                        </div>
                                        <div className="text-[11px] text-content-secondary">
                                            {step.desc}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

export default Organisations;
