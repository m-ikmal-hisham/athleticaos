
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getIncomingSanctioningRequests, getOutgoingSanctioningRequests, approveSanctioning, rejectSanctioning, SanctioningRequest } from '@/api/federation.api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/Table';
import { Toast } from '@/components/Toast';
import { Check, X, Clock } from '@phosphor-icons/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs';

export const SanctioningConsole = () => {
    const { user } = useAuthStore();
    const [incomingRequests, setIncomingRequests] = useState<SanctioningRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<SanctioningRequest[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Assume user's primary organisation is the one they represent for sanctioning
    // In a real multi-org setup, we might need a context selector.
    const userOrgId = user?.organisationId;

    useEffect(() => {
        if (userOrgId) {
            loadRequests();
        }
    }, [userOrgId]);

    const loadRequests = async () => {
        if (!userOrgId) return;
        setLoading(true);
        try {
            // Load both concurrently
            const [incoming, outgoing] = await Promise.all([
                getIncomingSanctioningRequests(userOrgId),
                getOutgoingSanctioningRequests(userOrgId)
            ]);
            setIncomingRequests(incoming);
            setOutgoingRequests(outgoing);
        } catch (error) {
            console.error("Failed to load requests", error);
            setToast({ message: 'Failed to load sanctioning requests', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId: string) => {
        setProcessingId(requestId);
        try {
            await approveSanctioning(requestId, "Approved via Console");
            setToast({ message: 'Request approved successfully', type: 'success' });
            loadRequests();
        } catch (error) {
            setToast({ message: 'Failed to approve request', type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId: string) => {
        // ideally prompt for reason
        if (!confirm("Are you sure you want to reject this request?")) return;

        setProcessingId(requestId);
        try {
            await rejectSanctioning(requestId, "Rejected via Console");
            setToast({ message: 'Request rejected', type: 'success' });
            loadRequests();
        } catch (error) {
            setToast({ message: 'Failed to reject request', type: 'error' });
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge variant="success" className="flex items-center gap-1"><Check weight="bold" /> Approved</Badge>;
            case 'REJECTED': return <Badge variant="destructive" className="flex items-center gap-1"><X weight="bold" /> Rejected</Badge>;
            case 'PENDING': return <Badge variant="warning" className="flex items-center gap-1"><Clock weight="bold" /> Pending</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading sanctioning requests...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Sanctioning Console</h1>
                <Button onClick={loadRequests} variant="outline" size="sm">Refresh</Button>
            </div>

            <Tabs defaultValue="incoming">
                <TabsList>
                    <TabsTrigger value="incoming">Incoming Requests ({incomingRequests.filter(r => r.status === 'PENDING').length})</TabsTrigger>
                    <TabsTrigger value="outgoing">My Requests</TabsTrigger>
                </TabsList>

                <TabsContent value="incoming" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sanctioning Inbox</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tournament</TableHead>
                                        <TableHead>Requesting Org</TableHead>
                                        <TableHead>Date Requested</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incomingRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No incoming requests found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        incomingRequests.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium">{req.tournamentName}</TableCell>
                                                <TableCell>{req.requesterOrgName}</TableCell>
                                                <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{getStatusBadge(req.status)}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    {req.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => handleApprove(req.id)}
                                                                disabled={!!processingId}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                onClick={() => handleReject(req.id)}
                                                                disabled={!!processingId}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outgoing" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sent Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tournament</TableHead>
                                        <TableHead>Approving Org</TableHead>
                                        <TableHead>Date Requested</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outgoingRequests.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sent requests found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        outgoingRequests.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium">{req.tournamentName}</TableCell>
                                                <TableCell>{req.approverOrgName}</TableCell>
                                                <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{getStatusBadge(req.status)}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{req.notes}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
