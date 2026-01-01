import React, { useEffect, useState } from 'react';
import { getAllOfficials, OfficialRegistry } from '@/api/officials.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Plus, Calendar } from '@phosphor-icons/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { useAuthStore } from '@/store/auth.store';
import { OfficialHistoryModal } from '@/components/admin/officials/OfficialHistoryModal';

const Officials: React.FC = () => {
    const { user } = useAuthStore();
    const [officials, setOfficials] = useState<OfficialRegistry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOfficial, setSelectedOfficial] = useState<OfficialRegistry | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    useEffect(() => {
        loadOfficials();
    }, []);

    const loadOfficials = async () => {
        setLoading(true);
        try {
            const data = await getAllOfficials();
            setOfficials(data);
        } catch (err) {
            console.error("Failed to load officials", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading officials...</div>;

    const isSuperAdmin = user?.roles?.includes('ROLE_SUPER_ADMIN');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Officials Registry</h1>
                {isSuperAdmin && (
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Register Official
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Officials</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Badge #</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-24">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {officials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">No officials registered.</TableCell>
                                </TableRow>
                            ) : (
                                officials.map((official) => (
                                    <TableRow key={official.id}>
                                        <TableCell className="font-medium">
                                            {official.user?.firstName} {official.user?.lastName}
                                        </TableCell>
                                        <TableCell>{official.primaryRole}</TableCell>
                                        <TableCell>{official.accreditationLevel}</TableCell>
                                        <TableCell>{official.badgeNumber}</TableCell>
                                        <TableCell>{official.isActive ? 'Active' : 'Inactive'}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedOfficial(official);
                                                    setIsHistoryModalOpen(true);
                                                }}
                                            >
                                                <Calendar className="w-4 h-4 mr-2" />
                                                History
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OfficialHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                officialId={selectedOfficial?.id || null}
                officialName={selectedOfficial ? `${selectedOfficial.user.firstName} ${selectedOfficial.user.lastName}` : ''}
            />
        </div>
    );
};

export default Officials;
