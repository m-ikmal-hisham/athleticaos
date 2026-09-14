import React, { useState } from 'react';
import { ShieldCheck, ShieldWarning, Shield, CheckCircle, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { showToast } from '@/lib/customToast';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/utils/date';
import {
    IdentityVerificationSummary,
    PersonResponseDTO,
    IDENTITY_VERIFICATION_METHODS,
    IdentityVerificationMethod,
    verifyPersonIdentity,
    revokePersonIdentityVerification
} from '@/api/persons.api';

interface IdentityVerificationPanelProps {
    personId: string;
    identityVerification?: IdentityVerificationSummary | null;
    onVerificationChanged?: (updated: PersonResponseDTO) => void;
    disabled?: boolean;
}

export const IdentityVerificationPanel: React.FC<IdentityVerificationPanelProps> = ({
    personId,
    identityVerification,
    onVerificationChanged,
    disabled = false
}) => {
    const { hasAnyRole } = useAuthStore();
    const isSuperAdmin = hasAnyRole(['ROLE_SUPER_ADMIN']);

    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form inputs for verification
    const [idValue, setIdValue] = useState('');
    const [method, setMethod] = useState<IdentityVerificationMethod>('PRE_REGISTRATION_RECORD');
    const [attested, setAttested] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const status = identityVerification?.status || 'UNVERIFIED';

    const closeVerifyModal = () => {
        setIsVerifyModalOpen(false);
        setIdValue('');
        setMethod('PRE_REGISTRATION_RECORD');
        setAttested(false);
        setErrorMessage('');
    };

    const handleVerifySubmit = async (e?: React.SyntheticEvent) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (!personId || !idValue.trim() || !attested) return;

        try {
            setSubmitting(true);
            setErrorMessage('');
            const updated = await verifyPersonIdentity(personId, {
                identificationValue: idValue.trim(),
                method,
                attested
            });
            showToast.success('Identity verified successfully');
            closeVerifyModal();
            onVerificationChanged?.(updated);
        } catch (err: unknown) {
            const error = err as { response?: { status?: number; data?: { errorCode?: string; message?: string } } };
            const resStatus = error?.response?.status;
            const errorCode = error?.response?.data?.errorCode;
            const message = error?.response?.data?.message;

            // Log ONLY status and errorCode to prevent logging sensitive inputs
            console.error('Identity verification failed', { status: resStatus, errorCode });

            if (errorCode === 'IDENTITY_VERIFICATION_MISMATCH') {
                setErrorMessage('The identification number entered does not match the record on file.');
            } else if (errorCode === 'IDENTITY_VERIFICATION_LOCKED' || resStatus === 429) {
                setErrorMessage('Too many verification attempts for this record. Try again in 15 minutes.');
            } else if (errorCode === 'IDENTITY_VERIFICATION_NOT_ALLOWED' || resStatus === 409) {
                setErrorMessage(message || 'Identity verification is not allowed for this record.');
            } else {
                setErrorMessage(message || 'Failed to verify identity. Please try again.');
            }
        } finally {
            setSubmitting(false);
            setIdValue('');
            setAttested(false);
        }
    };

    const handleRevokeSubmit = async (e?: React.SyntheticEvent) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (!personId) return;

        try {
            setSubmitting(true);
            const updated = await revokePersonIdentityVerification(personId);
            showToast.success('Identity verification revoked');
            setIsRevokeModalOpen(false);
            onVerificationChanged?.(updated);
        } catch (err: unknown) {
            const error = err as { response?: { status?: number; data?: { errorCode?: string; message?: string } } };
            const resStatus = error?.response?.status;
            const errorCode = error?.response?.data?.errorCode;
            console.error('Identity revocation failed', { status: resStatus, errorCode });
            showToast.error(error?.response?.data?.message || 'Failed to revoke identity verification');
        } finally {
            setSubmitting(false);
        }
    };

    const renderBadge = () => {
        switch (status) {
            case 'VERIFIED':
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle size={14} weight="bold" />
                        <span>VERIFIED</span>
                    </div>
                );
            case 'FLAGGED':
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        <WarningCircle size={14} weight="bold" />
                        <span>FLAGGED</span>
                    </div>
                );
            case 'LEGACY':
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        <Shield size={14} weight="bold" />
                        <span>LEGACY</span>
                    </div>
                );
            default:
                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        <Shield size={14} weight="bold" />
                        <span>UNVERIFIED</span>
                    </div>
                );
        }
    };

    return (
        <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={20} className="text-primary-500" />
                    <span className="text-sm font-semibold text-foreground">Identity Verification Attestation</span>
                </div>
                {renderBadge()}
            </div>

            {status === 'VERIFIED' ? (
                <div className="text-xs space-y-1.5 text-muted-foreground bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Verified by:</span>
                        <span className="font-semibold text-foreground">{identityVerification?.verifiedByName || 'Administrator'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Attestation Date:</span>
                        <span className="font-semibold text-foreground">{formatDate(identityVerification?.verifiedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Method:</span>
                        <span className="font-semibold text-foreground">
                            {IDENTITY_VERIFICATION_METHODS.find((m) => m.value === identityVerification?.method)?.label || identityVerification?.method || '—'}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">
                    {status === 'FLAGGED'
                        ? 'Resolve the duplicate identification conflict before this record can be verified.'
                        : status === 'LEGACY'
                            ? 'Imported record, not verified.'
                            : 'This record has not been verified against a physical or pre-registration source.'}
                </p>
            )}

            {isSuperAdmin ? (
                <div className="flex justify-end pt-2">
                    {status === 'VERIFIED' ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled || submitting}
                            onClick={() => setIsRevokeModalOpen(true)}
                            className="text-xs text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10"
                        >
                            <ArrowCounterClockwise size={14} className="mr-1.5" />
                            Revoke Verification
                        </Button>
                    ) : status === 'FLAGGED' ? (
                        <div className="flex flex-col items-end gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={true}
                                className="text-xs opacity-50 cursor-not-allowed"
                                title="Resolve the duplicate identification conflict before this record can be verified."
                            >
                                <ShieldCheck size={14} className="mr-1.5" />
                                Verify Identity
                            </Button>
                            <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                Resolve the duplicate identification conflict before this record can be verified.
                            </span>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled || submitting}
                            onClick={() => setIsVerifyModalOpen(true)}
                            className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                        >
                            <ShieldCheck size={14} className="mr-1.5" />
                            Verify Identity
                        </Button>
                    )}
                </div>
            ) : (
                <p className="text-[11px] text-muted-foreground italic">
                    Super Administrator privilege is required to verify or revoke attestations.
                </p>
            )}

            {/* Verify Modal */}
            <Modal isOpen={isVerifyModalOpen} onClose={closeVerifyModal} title="Verify Person Identity">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Re-type the identification number directly from the source document. The backend will compare it with the stored hash to confirm a match.
                    </p>

                    {errorMessage && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                            <ShieldWarning size={16} className="shrink-0 mt-0.5" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground block">
                            Identification Number from Source *
                        </label>
                        <Input
                            type="text"
                            value={idValue}
                            onChange={(e) => {
                                setIdValue(e.target.value);
                                if (errorMessage) setErrorMessage('');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleVerifySubmit(e);
                                }
                            }}
                            placeholder="Re-enter IC / Passport Number"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground block">
                            Verification Method *
                        </label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value as IdentityVerificationMethod)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {IDENTITY_VERIFICATION_METHODS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="attest_checkbox"
                            checked={attested}
                            onChange={(e) => {
                                setAttested(e.target.checked);
                                if (errorMessage) setErrorMessage('');
                            }}
                            className="mt-1 rounded border-border text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="attest_checkbox" className="text-xs text-foreground cursor-pointer select-none">
                            I confirm that I have personally compared this identification number against the source record or document.
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={closeVerifyModal}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleVerifySubmit}
                            disabled={submitting || !idValue.trim() || !attested}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {submitting ? 'Verifying...' : 'Confirm Verification'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Revoke Confirmation Modal */}
            <Modal isOpen={isRevokeModalOpen} onClose={() => setIsRevokeModalOpen(false)} title="Revoke Identity Verification">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to revoke this identity verification? The record will be reset to <strong className="text-foreground">UNVERIFIED</strong> status, and the previous attestation details will be cleared.
                    </p>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsRevokeModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            disabled={submitting}
                            onClick={handleRevokeSubmit}
                        >
                            {submitting ? 'Revoking...' : 'Revoke Verification'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
