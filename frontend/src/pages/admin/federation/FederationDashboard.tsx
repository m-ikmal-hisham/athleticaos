
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getOrganisationTree, OrganisationTreeNode } from '@/api/federation.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Buildings, MapPin, UsersThree } from '@phosphor-icons/react';
import { Badge } from '@/components/Badge';

// Custom recursive tree node renderer
const OrgNode = ({ node }: { node: OrganisationTreeNode }) => {
    return (
        <div className="flex flex-col items-center">
            <div className="flex flex-col items-center p-3 border rounded-lg bg-card shadow-sm min-w-[140px] z-10 relative">
                <div className="mb-2">
                    {node.orgLevel === 'COUNTRY' && <Buildings className="w-6 h-6 text-primary" />}
                    {node.orgLevel === 'STATE' && <MapPin className="w-6 h-6 text-blue-500" />}
                    {node.orgLevel === 'CLUB' && <UsersThree className="w-6 h-6 text-green-500" />}
                    {node.orgLevel === 'DISTRICT' && <MapPin className="w-6 h-6 text-purple-500" />}
                </div>
                <span className="font-semibold text-sm text-center">{node.name}</span>
                <Badge variant="outline" className="mt-1 text-[10px] px-1 py-0 h-4">{node.orgLevel}</Badge>
            </div>

            {node.children && node.children.length > 0 && (
                <div className="flex flex-col items-center mt-4 w-full">
                    {/* Vertical line from parent to children container */}
                    <div className="w-px h-4 bg-border mb-4"></div>

                    {/* Children container */}
                    <div className="flex justify-center gap-8 relative">
                        {/* Horizontal connecting line */}
                        {node.children.length > 1 && (
                            <div className="absolute top-[-1px] left-8 right-8 h-px bg-border"></div>
                        )}

                        {node.children.map((child) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Vertical line to child */}
                                {node.children && node.children.length > 1 && (
                                    <div className="w-px h-4 bg-border absolute top-[-17px]"></div>
                                )}
                                <OrgNode node={child} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const FederationDashboard = () => {
    const { user } = useAuthStore();
    const [treeData, setTreeData] = useState<OrganisationTreeNode | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadTree = async () => {
            if (!user?.organisationId) return;
            try {
                const data = await getOrganisationTree(user.organisationId);
                setTreeData(data);
            } catch (err) {
                console.error("Failed to load hierarchy", err);
                // Demo Data
                setTreeData({
                    id: '1', name: 'Malaysia Rugby', orgLevel: 'COUNTRY',
                    children: [
                        {
                            id: '2', name: 'Selangor Rugby', orgLevel: 'STATE', children: [
                                { id: '3', name: 'KL Tigers', orgLevel: 'CLUB' },
                                { id: '4', name: 'Cobra RC', orgLevel: 'CLUB' }
                            ]
                        },
                        {
                            id: '5', name: 'Sabah Rugby', orgLevel: 'STATE', children: [
                                { id: '6', name: 'Eagles RC', orgLevel: 'CLUB' }
                            ]
                        }
                    ]
                });
            } finally {
                setLoading(false);
            }
        };
        loadTree();
    }, [user]);

    if (loading) return <div>Loading hierarchy...</div>;
    // if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Federation Overview</h1>

            <Card className="overflow-auto">
                <CardHeader>
                    <CardTitle>Organization Structure</CardTitle>
                </CardHeader>
                <CardContent className="p-8 min-w-[800px] flex justify-center">
                    {treeData ? (
                        <OrgNode node={treeData} />
                    ) : (
                        <div>No hierarchy data available.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
