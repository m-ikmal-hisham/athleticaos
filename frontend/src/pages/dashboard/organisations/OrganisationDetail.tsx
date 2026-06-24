import { useEffect, useState, useMemo } from 'react';
import { formatOrgType } from '@/utils/formatters';
import { getOrganisationById, Organisation, getChildren, fetchOrganisations } from '../../../api/organisations.api';
import { fetchTeamsByOrganisation } from '../../../api/teams.api';
import { fetchPlayersByOrganisation } from '../../../api/players.api';
import { usersApi } from '../../../api/users.api';
import { RecentActivityWidget } from '../../../components/RecentActivityWidget';
import { GlassCard } from '../../../components/GlassCard';
import { Users, TShirt, ChartBar, TreeStructure, Buildings, MapPin, CaretDown, CaretRight } from '@phosphor-icons/react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Badge } from '../../../components/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/Tabs';
import { Button } from '../../../components/Button';
import { getImageUrl } from '../../../utils/image';
import { MALAYSIA_STATES } from '../../../constants/malaysia-geo';
import { RosterList } from '../../../components/RosterList';
import { useNavigate, useParams } from 'react-router-dom';

interface ChildOrgTeamGroup {
    orgId: string;
    orgName: string;
    orgLogoUrl?: string;
    orgType?: string;
    teams: any[];
}

interface OrgTreeNode {
    org: Organisation;
    children: OrgTreeNode[];
    teams: any[];
}

const OrgTreeNodeView = ({ node }: { node: OrgTreeNode }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const navigate = useNavigate();

    const hasChildren = node.children.length > 0;
    const hasTeams = node.teams.length > 0;
    const totalDescendantTeamsCount = useMemo(() => {
        let count = node.teams.length;
        const countDescendants = (n: OrgTreeNode) => {
            count += n.teams.length;
            n.children.forEach(countDescendants);
        };
        node.children.forEach(countDescendants);
        return count;
    }, [node]);

    return (
        <div className="space-y-1 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left">
                {/* Expander Arrow */}
                {hasChildren ? (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-white/10 rounded shrink-0 transition-colors"
                        type="button"
                    >
                        {isExpanded ? (
                            <CaretDown className="w-4 h-4 text-muted-foreground transition-transform" />
                        ) : (
                            <CaretRight className="w-4 h-4 text-muted-foreground transition-transform" />
                        )}
                    </button>
                ) : (
                    <div className="w-6 h-6 shrink-0" />
                )}

                {/* Org Logo / Icon */}
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {node.org.logoUrl ? (
                        <img src={getImageUrl(node.org.logoUrl)} alt={node.org.name} className="w-full h-full object-cover" />
                    ) : (
                        <Buildings className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>

                {/* Name and Level */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(`/dashboard/organisations/${node.org.id}`)}
                            className="font-semibold text-sm truncate hover:text-primary-500 hover:underline text-left text-foreground"
                            type="button"
                        >
                            {node.org.name}
                        </button>
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 shrink-0">
                            {formatOrgType(node.org.type)}
                        </Badge>
                    </div>
                </div>

                {/* Team counts / details */}
                <div className="flex items-center gap-2 shrink-0">
                    {totalDescendantTeamsCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {totalDescendantTeamsCount} {totalDescendantTeamsCount === 1 ? 'team' : 'teams'} total
                        </Badge>
                    )}
                </div>
            </div>

            {/* Render children and teams under this node */}
            {isExpanded && (hasChildren || hasTeams) && (
                <div className="pl-6 ml-4 border-l border-white/10 space-y-3">
                    {/* Render Teams of this node */}
                    {hasTeams && (
                        <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1.5">Teams</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {node.teams.map(team => (
                                    <div
                                        key={team.id}
                                        className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-primary-500/50 transition-all cursor-pointer group"
                                        onClick={() => navigate(`/dashboard/teams/${team.slug || team.id}`)}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-xs text-foreground group-hover:text-primary-500 transition-colors truncate">{team.name}</span>
                                            <Badge variant="secondary" className="text-[9px] px-1 h-3.5">{team.status}</Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground truncate">{team.category} • {team.division}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Render Child nodes recursively */}
                    {hasChildren && (
                        <div className="space-y-2">
                            {node.children.map(childNode => (
                                <OrgTreeNodeView
                                    key={childNode.org.id}
                                    node={childNode}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const OrganisationDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [organisation, setOrganisation] = useState<Organisation | null>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [childOrgs, setChildOrgs] = useState<Organisation[]>([]);
    const [allOrganisations, setAllOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedChildOrgs, setExpandedChildOrgs] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (id) {
            loadOrganisation(id);
            loadRelatedData(id);
        }
    }, [id]);

    const loadOrganisation = async (orgId: string) => {
        try {
            setLoading(true);
            const data = await getOrganisationById(orgId);
            setOrganisation(data);
        } catch (error) {
            console.error("Failed to load organisation", error);
        } finally {
            setLoading(false);
        }
    };

    const loadRelatedData = async (orgId: string) => {
        try {
            const [teamsRes, playersRes, usersRes, childOrgsRes, allOrgsRes] = await Promise.all([
                fetchTeamsByOrganisation(orgId).catch(() => ({ data: [] })),
                fetchPlayersByOrganisation(orgId).catch(() => ({ data: [] })),
                usersApi.getAllUsers({ organisationId: orgId }).catch(() => ({ data: [] })),
                getChildren(orgId).catch(() => []),
                fetchOrganisations().catch(() => [])
            ]);
            setTeams(teamsRes.data || []);
            setPlayers(playersRes.data || []);
            setUsers(usersRes.data || []);
            setChildOrgs(childOrgsRes || []);
            setAllOrganisations(allOrgsRes || []);
        } catch (error) {
            console.error("Failed to load related data", error);
        }
    };

    // Separate teams into direct teams and child org teams
    const { directTeams, childOrgTeamGroups, totalChildOrgTeams } = useMemo(() => {
        if (!id) return { directTeams: [], childOrgTeamGroups: [], totalChildOrgTeams: 0 };

        const direct = teams.filter(t => t.organisationId === id);
        const childTeams = teams.filter(t => t.organisationId !== id);

        // Group child teams by their organisation
        const groupMap = new Map<string, ChildOrgTeamGroup>();
        childTeams.forEach(team => {
            const orgId = team.organisationId;
            if (!groupMap.has(orgId)) {
                // Try to find org details from childOrgs list, otherwise use team data
                const childOrg = childOrgs.find(co => co.id === orgId);
                groupMap.set(orgId, {
                    orgId,
                    orgName: team.organisationName || childOrg?.name || 'Unknown Organisation',
                    orgLogoUrl: childOrg?.logoUrl,
                    orgType: childOrg?.type,
                    teams: []
                });
            }
            groupMap.get(orgId)!.teams.push(team);
        });

        const groups = Array.from(groupMap.values()).sort((a, b) => a.orgName.localeCompare(b.orgName));

        return {
            directTeams: direct,
            childOrgTeamGroups: groups,
            totalChildOrgTeams: childTeams.length
        };
    }, [teams, id, childOrgs]);

    const buildOrgTree = (parentId: string): OrgTreeNode[] => {
        const children = allOrganisations.filter(org => org.parentOrgId === parentId);
        return children.map(child => {
            const childTeams = teams.filter(t => t.organisationId === child.id);
            return {
                org: child,
                children: buildOrgTree(child.id),
                teams: childTeams
            };
        });
    };

    const orgTree = useMemo(() => {
        if (!id || allOrganisations.length === 0) return [];
        return buildOrgTree(id);
    }, [allOrganisations, id, teams]);

    const toggleChildOrg = (orgId: string) => {
        setExpandedChildOrgs(prev => {
            const next = new Set(prev);
            if (next.has(orgId)) {
                next.delete(orgId);
            } else {
                next.add(orgId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedChildOrgs(new Set(childOrgTeamGroups.map(g => g.orgId)));
    };

    const collapseAll = () => {
        setExpandedChildOrgs(new Set());
    };

    // Local formatOrgType removed in favor of utility

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading organisation details...</div>;
    }

    if (!organisation) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-400 mb-4">Organisation not found</p>
                <Button onClick={() => navigate('/dashboard/organisations')}>Back to Organisations</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <Breadcrumbs
                    items={[
                        { label: 'Organisations', path: '/dashboard/organisations' },
                        { label: organisation.name }
                    ]}
                    className="mb-4"
                />

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {organisation.logoUrl ? (
                            <img src={getImageUrl(organisation.logoUrl)} alt={organisation.name} className="w-full h-full object-cover" />
                        ) : (
                            <Buildings className="w-8 h-8 text-muted-foreground" />
                        )}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{organisation.name}</h1>
                            <Badge variant={organisation.status === 'Active' ? 'success' : 'secondary'}>
                                {organisation.status || 'Active'}
                            </Badge>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Buildings className="w-4 h-4" />
                                <span>{formatOrgType(organisation.type)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>
                                    {organisation.state || (organisation.stateCode ? MALAYSIA_STATES.find(s => s.code === organisation.stateCode)?.name : '-')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button onClick={() => navigate(`/dashboard/organisations/${organisation.id}/edit`)}>
                        Edit Organisation
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white/5 border border-white/10">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-primary-500">Overview</TabsTrigger>
                    <TabsTrigger value="teams" className="data-[state=active]:bg-primary-500">Teams</TabsTrigger>
                    <TabsTrigger value="children" className="data-[state=active]:bg-primary-500">Sub-Organisations</TabsTrigger>
                    <TabsTrigger value="personnel" className="data-[state=active]:bg-primary-500">Personnel</TabsTrigger>
                    <TabsTrigger value="chart" className="data-[state=active]:bg-primary-500">Org Chart</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="p-6 md:col-span-2">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <ChartBar className="w-5 h-5 text-primary-500" />
                                Activity Summary
                            </h3>
                            <div className="h-64 flex items-center justify-center text-muted-foreground bg-white/5 rounded-lg border border-dashed border-white/10">
                                Activity stats will be displayed here soon.
                            </div>
                        </GlassCard>
                        <div className="md:col-span-1 h-full">
                            <RecentActivityWidget
                                scope="org"
                                entityId={id}
                                title="Recent Activity"
                                limit={5}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="teams" className="space-y-6">
                    {/* Summary Stats */}
                    {(childOrgTeamGroups.length > 0 || directTeams.length > 0) && (
                        <div className="flex flex-wrap gap-3">
                            <div className="px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20">
                                <span className="text-sm text-muted-foreground">Total Teams</span>
                                <p className="text-xl font-bold text-primary-400">{teams.length}</p>
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                                <span className="text-sm text-muted-foreground">Direct Teams</span>
                                <p className="text-xl font-bold">{directTeams.length}</p>
                            </div>
                            {childOrgTeamGroups.length > 0 && (
                                <>
                                    <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-sm text-muted-foreground">Child Organisations</span>
                                        <p className="text-xl font-bold">{childOrgTeamGroups.length}</p>
                                    </div>
                                    <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                                        <span className="text-sm text-muted-foreground">Child Org Teams</span>
                                        <p className="text-xl font-bold">{totalChildOrgTeams}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Direct / Assigned Teams */}
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TShirt className="w-5 h-5 text-primary-500" />
                                Assigned Teams ({directTeams.length})
                            </h3>
                            <Button size="sm" onClick={() => navigate('/dashboard/teams/new')}>Add Team</Button>
                        </div>
                        {directTeams.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                                No teams directly assigned to this organisation.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {directTeams.map((team) => (
                                    <div
                                        key={team.id}
                                        className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary-500/50 transition-all cursor-pointer group"
                                        onClick={() => navigate(`/dashboard/teams/${team.slug || team.id}`)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-foreground group-hover:text-primary-500 transition-colors">{team.name}</h4>
                                            <Badge variant="secondary" className="text-xs">{team.status}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-1">{team.category} • {team.division}</p>
                                        <p className="text-xs text-muted-foreground">{team.ageGroup}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassCard>

                    {/* Child Organisation Teams */}
                    {childOrgTeamGroups.length > 0 && (
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <TreeStructure className="w-5 h-5 text-primary-500" />
                                    Child Organisation Teams ({totalChildOrgTeams})
                                </h3>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={expandedChildOrgs.size === childOrgTeamGroups.length ? collapseAll : expandAll}
                                    >
                                        {expandedChildOrgs.size === childOrgTeamGroups.length ? 'Collapse All' : 'Expand All'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {childOrgTeamGroups.map((group) => {
                                    const isExpanded = expandedChildOrgs.has(group.orgId);
                                    return (
                                        <div
                                            key={group.orgId}
                                            className="rounded-lg border border-white/10 overflow-hidden transition-all"
                                        >
                                            {/* Child Org Header */}
                                            <button
                                                onClick={() => toggleChildOrg(group.orgId)}
                                                className="w-full flex items-center gap-3 p-4 bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                    {group.orgLogoUrl ? (
                                                        <img src={getImageUrl(group.orgLogoUrl)} alt={group.orgName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Buildings className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm truncate">{group.orgName}</span>
                                                        {group.orgType && (
                                                            <Badge variant="outline" className="text-[10px] px-1.5 h-4 shrink-0">
                                                                {formatOrgType(group.orgType)}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {group.teams.length} {group.teams.length === 1 ? 'team' : 'teams'}
                                                    </Badge>
                                                    {isExpanded ? (
                                                        <CaretDown className="w-4 h-4 text-muted-foreground transition-transform" />
                                                    ) : (
                                                        <CaretRight className="w-4 h-4 text-muted-foreground transition-transform" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Expanded Teams Grid */}
                                            {isExpanded && (
                                                <div className="p-4 pt-0 border-t border-white/5">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                                                        {group.teams.map((team) => (
                                                            <div
                                                                key={team.id}
                                                                className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary-500/50 transition-all cursor-pointer group"
                                                                onClick={() => navigate(`/dashboard/teams/${team.slug || team.id}`)}
                                                            >
                                                                <div className="flex justify-between items-start mb-1.5">
                                                                    <h4 className="font-medium text-sm text-foreground group-hover:text-primary-500 transition-colors">{team.name}</h4>
                                                                    <Badge variant="secondary" className="text-[10px]">{team.status}</Badge>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground">{team.category} • {team.division}</p>
                                                                <p className="text-xs text-muted-foreground">{team.ageGroup}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassCard>
                    )}
                </TabsContent>

                <TabsContent value="personnel">
                    <div className="space-y-6">
                        {/* Users */}
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary-500" />
                                    Users & Managers ({users.length})
                                </h3>
                                <Button size="sm" onClick={() => navigate('/dashboard/users/new')}>Invite User</Button>
                            </div>
                            {users.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-white/10 rounded-lg">
                                    No users found.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="glass-table w-full">
                                        <thead>
                                            <tr>
                                                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Name</th>
                                                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Email</th>
                                                <th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-t border-white/5">
                                                    <td className="p-3 text-sm">{user.firstName} {user.lastName}</td>
                                                    <td className="p-3 text-sm text-muted-foreground">{user.email}</td>
                                                    <td className="p-3 text-sm">
                                                        <Badge variant="outline">{user.role?.replace('ROLE_', '')}</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </GlassCard>

                        {/* Players */}
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <TShirt className="w-5 h-5 text-primary-500" />
                                    Players ({players.length})
                                </h3>
                            </div>
                            <RosterList players={players} onPlayerClick={(pid) => navigate(`/dashboard/players/${pid}/edit`)} />
                        </GlassCard>
                    </div>
                </TabsContent>

                <TabsContent value="chart">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TreeStructure className="w-5 h-5 text-primary-500" />
                                Organisation Chart
                            </h3>
                        </div>
                        <div className="h-96 flex items-center justify-center text-muted-foreground bg-white/5 rounded-lg border border-dashed border-white/10">
                            Organisation Chart Visualization Area
                        </div>
                    </GlassCard>
                </TabsContent>

                <TabsContent value="children" className="space-y-6">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TreeStructure className="w-5 h-5 text-primary-500" />
                                Sub-Organisations & Hierarchy
                            </h3>
                        </div>

                        {orgTree.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                                No sub-organisations registered under this organisation.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orgTree.map(node => (
                                    <OrgTreeNodeView key={node.org.id} node={node} />
                                ))}
                            </div>
                        )}
                    </GlassCard>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrganisationDetail;
