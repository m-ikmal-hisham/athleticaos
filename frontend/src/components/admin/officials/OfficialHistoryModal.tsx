import React, { useEffect, useState } from 'react';
import { getOfficialHistory, MatchOfficial } from '@/api/officials.api';
import { Modal } from '@/components/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { CalendarBlank, MapPin } from '@phosphor-icons/react';

interface OfficialHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    officialId: string | null;
    officialName: string;
}

export const OfficialHistoryModal: React.FC<OfficialHistoryModalProps> = ({ isOpen, onClose, officialId, officialName }) => {
    const [history, setHistory] = useState<MatchOfficial[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && officialId) {
            loadHistory(officialId);
        }
    }, [isOpen, officialId]);

    const loadHistory = async (id: string) => {
        setLoading(true);
        try {
            const data = await getOfficialHistory(id);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Participation History: ${officialName}`}
            size="lg"
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Match assignments and roles for this official.
                </p>

                {loading ? (
                    <div className="py-8 text-center">Loading history...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Match</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        No participation history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((assignment) => {
                                    const match = assignment.match;
                                    const matchDisplay = match ? `${match.homeTeamName || 'Home'} vs ${match.awayTeamName || 'Away'}` : 'Unknown Match';

                                    return (
                                        <TableRow key={assignment.id}>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <CalendarBlank className="w-3.5 h-3.5" />
                                                        {match?.matchDate ? new Date(match.matchDate).toLocaleDateString() : '-'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {match?.kickOffTime}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{matchDisplay}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {match?.venue || 'TBA'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{assignment.assignedRole}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={match?.status === 'COMPLETED' ? 'secondary' : 'default'} className="text-xs">
                                                    {match?.status || 'SCHEDULED'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </Modal>
    );
};
