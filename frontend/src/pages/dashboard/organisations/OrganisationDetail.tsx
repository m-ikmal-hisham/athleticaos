import { useEffect, useState } from 'react';
import { getOrganisationById, Organisation } from '../../../api/organisations.api';
import { fetchTeamsByOrganisation } from '../../../api/teams.api';
import { fetchPlayersByOrganisation } from '../../../api/players.api';
import { usersApi } from '../../../api/users.api';
import { RecentActivityWidget } from '../../../components/RecentActivityWidget';
import { GlassCard } from '../../../components/GlassCard';
import { Users, TShirt, ChartBar, TreeStructure, Buildings, MapPin } from '@phosphor-icons/react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Badge } from '../../../components/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/Tabs';
import { Button } from '../../../components/Button';
import { getImageUrl } from '../../../utils/image';
import { MALAYSIA_STATES } from '../../../constants/malaysia-geo';
import { RosterList } from '../../../components/RosterList';
import { useNavigate, useParams } from 'react-router-dom';

const OrganisationDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [organisation, setOrganisation] = useState<Organisation | null>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
            const [teamsRes, playersRes, usersRes] = await Promise.all([
                fetchTeamsByOrganisation(orgId).catch(() => ({ data: [] })),
                fetchPlayersByOrganisation(orgId).catch(() => ({ data: [] })),
                usersApi.getAllUsers({ organisationId: orgId }).catch(() => ({ data: [] }))
            ]);
            setTeams(teamsRes.data || []);
            setPlayers(playersRes.data || []);
            setUsers(usersRes.data || []);
        } catch (error) {
            console.error("Failed to load related data", error);
        }
    };

    const formatOrgType = (type: string) => {
        return type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') || type;
    };

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

                <TabsContent value="teams">
                    <GlassCard className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <TShirt className="w-5 h-5 text-primary-500" />
                                Assigned Teams ({teams.length})
                            </h3>
                            <Button size="sm" onClick={() => navigate('/dashboard/teams/new')}>Add Team</Button>
                        </div>
                        {teams.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                                No teams assigned yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teams.map((team) => (
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
            </Tabs>
        </div>
    );
};

export default OrganisationDetail;
