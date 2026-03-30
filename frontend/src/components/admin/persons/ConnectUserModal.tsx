import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { getUnlinkedUsers, linkPersonToUser, PersonResponseDTO } from '@/api/persons.api';
import { showToast } from '@/lib/customToast';
import { UserCircle, Envelope } from '@phosphor-icons/react';

interface ConnectUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: PersonResponseDTO | null;
    organisationId: string;
    onSuccess: () => void;
}

export const ConnectUserModal: React.FC<ConnectUserModalProps> = ({ isOpen, onClose, person, organisationId, onSuccess }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        if (isOpen && organisationId) {
            fetchUnlinkedUsers();
        }
    }, [isOpen, organisationId]);

    const fetchUnlinkedUsers = async () => {
        setLoading(true);
        try {
            const data = await getUnlinkedUsers(organisationId);
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch unlinked users", err);
            showToast.error("Failed to load available users");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (userId: string) => {
        if (!person) return;
        setConnecting(true);
        try {
            await linkPersonToUser(person.id, userId);
            showToast.success('User link established successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Link failed", err);
            showToast.error(err.response?.data?.message || "Failed to link user");
        } finally {
            setConnecting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="md"
            title="Connect System User"
        >
            <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-sm font-medium">Linking record for:</p>
                    <p className="text-lg font-bold text-foreground">{person?.firstName} {person?.lastName}</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                        Linking a system user allows this person to log in and manage their own profile and assigned roles.
                    </p>
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                        Available Users in Organisation
                        {users.length > 0 && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">{users.length}</span>}
                    </p>
                    
                    {loading ? (
                        <div className="text-sm text-center py-8 text-muted animate-pulse">Searching for unlinked users...</div>
                    ) : users.length === 0 ? (
                        <div className="text-sm text-center py-10 text-muted italic border-2 border-dashed rounded-2xl border-border/50">
                            No unlinked users found in this organisation. 
                            <br />
                            <span className="text-[10px] mt-2 block opacity-60">Ensure the user has been invited via the Users section first.</span>
                        </div>
                    ) : (
                        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {users.map(u => (
                                <div key={u.id} className="group flex items-center justify-between p-3 border rounded-xl hover:bg-accent/50 hover:border-accent transition-all">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <UserCircle size={24} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold">{u.firstName} {u.lastName}</div>
                                            <div className="text-[10px] text-muted flex items-center gap-1">
                                                <Envelope size={12} weight="duotone" />
                                                {u.email}
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="h-8 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all px-4"
                                        onClick={() => handleConnect(u.id)}
                                        disabled={connecting}
                                    >
                                        Link
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
                </div>
            </div>
        </Modal>
    );
};
