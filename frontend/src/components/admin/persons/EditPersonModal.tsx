import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { showToast } from '@/lib/customToast';
import { updatePerson, PersonResponseDTO, RecordVerificationSummary } from '@/api/persons.api';
import { RecordVerificationPanel } from './RecordVerificationPanel';
import { PossibleDuplicateDialog, PossibleDuplicateMatchItem } from './PossibleDuplicateDialog';

interface EditPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: PersonResponseDTO | null;
    onSuccess: () => void;
    onPersonUpdated?: (updated: PersonResponseDTO) => void;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({ isOpen, onClose, person, onSuccess, onPersonUpdated }) => {
    const [loading, setLoading] = useState(false);
    const [recordVerification, setRecordVerification] = useState<RecordVerificationSummary | null>(null);
    const [duplicateData, setDuplicateData] = useState<{
        visibleMatches: PossibleDuplicateMatchItem[];
        otherOrganisationsCount: number;
    } | null>(null);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

    // Track loaded core identity fields for verification reset detection
    const loadedFirstName = useRef('');
    const loadedLastName = useRef('');
    const loadedDob = useRef('');
    const loadedGender = useRef('');
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dob: '',
        gender: '',
        nationality: '',
        email: '',
        phone: '',
        nationalPlayerStatus: 'NONE',
        isPlayer: false,
        isOfficial: false,
        isStaff: false
    });

    const [emailError, setEmailError] = useState('');

    // Initialize form fields only when dialog opens or a different person is loaded
    useEffect(() => {
        if (person && isOpen) {
            setEmailError('');
            loadedFirstName.current = person.firstName || '';
            loadedLastName.current = person.lastName || '';
            loadedDob.current = person.dob || '';
            const rawGender = (person.gender || '').trim().toUpperCase();
            const initialGender = (rawGender === 'MALE' || rawGender === 'FEMALE') ? rawGender : '';
            loadedGender.current = rawGender;
            setFormData({
                firstName: person.firstName || '',
                lastName: person.lastName || '',
                dob: person.dob || '',
                gender: initialGender,
                nationality: person.nationality || '',
                email: person.email || '',
                phone: person.phone || '',
                nationalPlayerStatus: person.nationalPlayerStatus || 'NONE',
                isPlayer: person.isPlayer || false,
                isOfficial: person.isOfficial || false,
                isStaff: person.isStaff || false
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [person?.id, isOpen]);

    // Keep record verification state synchronized if person verification status updates
    useEffect(() => {
        if (person && isOpen) {
            setRecordVerification(person.recordVerification || null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [person?.recordVerification, isOpen]);

    const nameChanged = (formData.firstName.trim() !== loadedFirstName.current) || (formData.lastName.trim() !== loadedLastName.current);
    const genderChanged = Boolean(formData.gender) && formData.gender.trim().toUpperCase() !== loadedGender.current;
    const dobChanged = Boolean(formData.dob) && formData.dob !== loadedDob.current;

    const isVerified = recordVerification?.status === 'VERIFIED';
    const willResetVerification = isVerified && (nameChanged || dobChanged || genderChanged);

    const submitPerson = async (confirmPossibleDuplicate = false) => {
        if (!person) return;

        if (!formData.gender) {
            showToast.error('Please select a gender');
            return;
        }

        if (!formData.email.trim()) {
            setEmailError('Email is required.');
            showToast.error('Email is required.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                email: formData.email.trim(),
                confirmPossibleDuplicate
            };
            await updatePerson(person.id, payload as any);
            showToast.success('Person updated successfully');
            setShowDuplicateDialog(false);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Update failed', error.response?.status, error.response?.data?.errorCode);
            const errData = error.response?.data;
            if (errData?.errorCode === 'POSSIBLE_DUPLICATE_PERSON') {
                setDuplicateData({
                    visibleMatches: errData.matches || [],
                    otherOrganisationsCount: errData.otherOrganisationMatches || 0
                });
                setShowDuplicateDialog(true);
            } else if (errData?.errorCode === 'EMAIL_REQUIRED') {
                setEmailError(errData.message || 'This person has no email address. Add one to save changes.');
                showToast.error(errData.message || 'This person has no email address. Add one to save changes.');
            } else if (errData?.errorCode === 'DUPLICATE_EMAIL') {
                setEmailError(errData.message || 'A person with this email already exists.');
                showToast.error(errData.message || 'A person with this email already exists.');
            } else {
                showToast.error(errData?.message || 'Failed to update person');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitPerson(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={person?.registrationNo ? `Edit Person - ${person.firstName} ${person.lastName} (${person.registrationNo})` : "Edit Person Details"}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">First Name</label>
                        <Input
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Last Name</label>
                        <Input
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Date of Birth</label>
                        <Input
                            type="date"
                            required
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Gender</label>
                        <select
                            required
                            aria-label="Gender"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="" disabled>Select gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                        </select>
                        {loadedGender.current && loadedGender.current !== 'MALE' && loadedGender.current !== 'FEMALE' && !formData.gender && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Gender on file is not MALE or FEMALE — please select one.
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block">Nationality</label>
                    <Input
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                </div>

                <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border">
                    <label className="text-sm font-bold mb-3 block text-foreground">Updated Roles</label>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isPlayer}
                                onChange={(e) => setFormData({ ...formData, isPlayer: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Player</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isOfficial}
                                onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Official</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.isStaff}
                                onChange={(e) => setFormData({ ...formData, isStaff: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-sm font-medium group-hover:text-foreground text-muted">Staff</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Email *</label>
                        <Input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value });
                                if (emailError) setEmailError('');
                            }}
                        />
                        {emailError && (
                            <p className="text-xs text-red-500 mt-1">{emailError}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Phone</label>
                        <Input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block">National Player Status</label>
                    <select
                        title="National Player Status"
                        value={formData.nationalPlayerStatus}
                        onChange={(e) => setFormData({ ...formData, nationalPlayerStatus: e.target.value })}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="NONE">None</option>
                        <option value="ACTIVE">Active National Player</option>
                        <option value="FORMER">Former National Player</option>
                    </select>
                </div>

                {willResetVerification && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                        Saving changes to name, date of birth, or gender will reset the record verification.
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>

            {person && (
                <div className="pt-4 border-t">
                    <RecordVerificationPanel
                        personId={person.id}
                        recordVerification={recordVerification}
                        onVerificationChanged={(updated) => {
                            setRecordVerification(updated.recordVerification || null);
                            if (onPersonUpdated) {
                                onPersonUpdated(updated);
                            } else {
                                onSuccess();
                            }
                        }}
                        disabled={loading}
                    />
                </div>
            )}

            {showDuplicateDialog && duplicateData && (
                <PossibleDuplicateDialog
                    isOpen={showDuplicateDialog}
                    onClose={() => setShowDuplicateDialog(false)}
                    onConfirmAnyway={() => submitPerson(true)}
                    visibleMatches={duplicateData.visibleMatches}
                    otherOrganisationsCount={duplicateData.otherOrganisationsCount}
                    isSubmitting={loading}
                    title="Possible duplicate person detected"
                    confirmButtonText="Save anyway"
                />
            )}
        </Modal>
    );
};
