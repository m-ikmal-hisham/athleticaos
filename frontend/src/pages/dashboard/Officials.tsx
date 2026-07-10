import React, { useEffect, useState } from 'react';
import { getAllOfficials, OfficialRegistryDTO } from '@/api/officials.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Plus, Calendar } from '@phosphor-icons/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { useAuthStore } from '@/store/auth.store';
import { OfficialHistoryModal } from '@/components/admin/officials/OfficialHistoryModal';
import { RegisterOfficialModal } from '@/components/admin/officials/RegisterOfficialModal';
import { Badge } from '@/components/Badge';

const Officials: React.FC = () => {
    const { user } = useAuthStore();
    const [officials, setOfficials] = useState<OfficialRegistryDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOfficial, setSelectedOfficial] = useState<OfficialRegistryDTO | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

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

    const isAdmin = user?.roles?.some(r => ['ROLE_SUPER_ADMIN', 'ROLE_ORG_ADMIN'].includes(r));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Officials Registry</h1>
                {isAdmin && (
                    <Button onClick={() => setIsRegisterModalOpen(true)}>
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
                                    <TableCell colSpan={6} className="text-center py-4">No officials registered.</TableCell>
                                </TableRow>
                            ) : (
                                officials.map((official) => (
                                    <TableRow key={official.id}>
                                        <TableCell className="font-medium">
                                            {official.firstName} {official.lastName}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span>{official.primaryRole}</span>
                                                {official.isWorldRugbyCertified && (
                                                    <div className="flex items-center gap-1 bg-blue-50/50 w-fit px-1.5 py-0.5 rounded border border-blue-100 mt-1" title="World Rugby Certified">
                                                        <img 
                                                            src="https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/World_Rugby_logo.svg/1200px-World_Rugby_logo.svg.png" 
                                                            alt="WR" 
                                                            className="h-3 w-3 object-contain"
                                                        />
                                                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">Certified</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{official.accreditationLevel}</Badge>
                                        </TableCell>
                                        <TableCell>{official.badgeNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant={official.isActive || official.active ? 'default' : 'secondary'}>
                                                {official.isActive || official.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
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
                officialName={selectedOfficial ? `${selectedOfficial.firstName} ${selectedOfficial.lastName}` : ''}
            />

            <RegisterOfficialModal
                isOpen={isRegisterModalOpen}
                onClose={() => setIsRegisterModalOpen(false)}
                onSuccess={loadOfficials}
            />
        </div>
    );
};

export default Officials;
