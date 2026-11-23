import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
    ArrowsClockwise,
    CaretDown,
    CaretRight,
    Certificate,
    DownloadSimple,
    Eye,
    FilePdf,
    FileZip,
    FloppyDisk,
    Prohibit,
    Trash,
    UploadSimple,
    WarningCircle,
} from '@phosphor-icons/react';
import {
    certificatesApi,
    triggerBlobDownload,
    type CertificateDesign,
    type CertificateLanguage,
    type CertificatePlayerItem,
    type CertificateRoster,
    type CertificateSettings,
} from '@/api/certificates.api';
import { CertificateDesignPicker } from '@/components/certificates/CertificateDesignPicker';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ConfirmModal } from '@/components/ConfirmModal';

interface TournamentCertificatesProps {
    tournamentId: string;
}

const MAX_SIGNATURE_BYTES = 500 * 1024;
const ALLOWED_SIGNATURE_TYPES = new Set(['image/png', 'image/jpeg']);

export function TournamentCertificates({ tournamentId }: TournamentCertificatesProps) {
    const { t } = useTranslation('certificates');

    const [settings, setSettings] = useState<CertificateSettings | null>(null);
    const [roster, setRoster] = useState<CertificateRoster | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable form state
    const [design, setDesign] = useState<CertificateDesign>('MODERN');
    const [customTitle, setCustomTitle] = useState('');
    const [language, setLanguage] = useState<CertificateLanguage>('EN');
    const [issueDate, setIssueDate] = useState('');
    const [remark, setRemark] = useState('');
    const [showVerification, setShowVerification] = useState(true);
    const [sig1Name, setSig1Name] = useState('');
    const [sig1Title, setSig1Title] = useState('');
    const [sig2Name, setSig2Name] = useState('');
    const [sig2Title, setSig2Title] = useState('');
    const [teamAchievements, setTeamAchievements] = useState<Record<string, string>>({});
    const [dirty, setDirty] = useState(false);

    // Signature thumbnail object URLs (authenticated private fetch)
    const [sig1Thumb, setSig1Thumb] = useState<string | null>(null);
    const [sig2Thumb, setSig2Thumb] = useState<string | null>(null);
    const [uploadingSlot, setUploadingSlot] = useState<1 | 2 | null>(null);

    // Live PDF preview state
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(false);
    const previewUrlRef = useRef<string | null>(null);

    // Roster expand & download busy states
    const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<CertificatePlayerItem | null>(null);

    const loadSignatureThumb = useCallback(
        async (slot: 1 | 2, hasImage: boolean) => {
            const setter = slot === 1 ? setSig1Thumb : setSig2Thumb;
            setter((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            if (!hasImage) return;
            try {
                const blob = await certificatesApi.fetchSignatureBlob(tournamentId, slot);
                const url = URL.createObjectURL(blob);
                setter(url);
            } catch {
                setter(null);
            }
        },
        [tournamentId]
    );

    const loadPreview = useCallback(
        async (targetDesign: CertificateDesign) => {
            setPreviewLoading(true);
            setPreviewError(false);
            try {
                const blob = await certificatesApi.fetchPreviewPdf(tournamentId, targetDesign);
                const url = URL.createObjectURL(blob);
                if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current);
                }
                previewUrlRef.current = url;
                setPreviewUrl(url);
            } catch {
                setPreviewError(true);
            } finally {
                setPreviewLoading(false);
            }
        },
        [tournamentId]
    );

    const applySettingsToForm = useCallback(
        (s: CertificateSettings) => {
            setSettings(s);
            setDesign(s.design || 'MODERN');
            setCustomTitle(s.title ?? '');
            setLanguage(s.language || 'EN');
            setIssueDate(s.issueDate ?? '');
            setRemark(s.remark ?? '');
            setShowVerification(s.showVerification);
            setSig1Name(s.signatory1Name ?? '');
            setSig1Title(s.signatory1Title ?? '');
            setSig2Name(s.signatory2Name ?? '');
            setSig2Title(s.signatory2Title ?? '');
            setTeamAchievements(s.teamAchievements ?? {});
            setDirty(false);
            void loadSignatureThumb(1, s.hasSignature1);
            void loadSignatureThumb(2, s.hasSignature2);
        },
        [loadSignatureThumb]
    );

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [s, r] = await Promise.all([
                certificatesApi.getSettings(tournamentId),
                certificatesApi.getRoster(tournamentId),
            ]);
            applySettingsToForm(s);
            setRoster(r);
            void loadPreview(s.design || 'MODERN');
        } catch (err) {
            console.error('Failed to load certificates data', err);
            toast.error(t('preview.failed'));
        } finally {
            setLoading(false);
        }
    }, [tournamentId, applySettingsToForm, loadPreview, t]);

    useEffect(() => {
        void loadAll();
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, [loadAll]);

    const handleDesignChange = (nextDesign: CertificateDesign) => {
        setDesign(nextDesign);
        setDirty(true);
        void loadPreview(nextDesign);
    };

    const handleSaveSettings = async (overrideAchievements?: Record<string, string>) => {
        setSaving(true);
        try {
            const updated = await certificatesApi.updateSettings(tournamentId, {
                design,
                title: customTitle.trim() || null,
                language,
                remark: remark.trim() || null,
                issueDate: issueDate || null,
                signatory1Name: sig1Name.trim() || null,
                signatory1Title: sig1Title.trim() || null,
                signatory2Name: sig2Name.trim() || null,
                signatory2Title: sig2Title.trim() || null,
                showVerification,
                teamAchievements: overrideAchievements ?? teamAchievements,
            });
            applySettingsToForm(updated);
            toast.success(t('settings.saved'));
            void loadPreview(updated.design);
            const updatedRoster = await certificatesApi.getRoster(tournamentId);
            setRoster(updatedRoster);
        } catch (err) {
            console.error('Failed to save certificate settings', err);
            toast.error(t('roster.downloadFailed'));
        } finally {
            setSaving(false);
        }
    };

    const handleSignatureUpload = async (slot: 1 | 2, file: File | undefined) => {
        if (!file) return;
        if (!ALLOWED_SIGNATURE_TYPES.has(file.type)) {
            toast.error(t('settings.signatureInvalidType'));
            return;
        }
        if (file.size > MAX_SIGNATURE_BYTES) {
            toast.error(t('settings.signatureTooLarge'));
            return;
        }
        setUploadingSlot(slot);
        try {
            const updated = await certificatesApi.uploadSignature(tournamentId, slot, file);
            setSettings(updated);
            await loadSignatureThumb(slot, slot === 1 ? updated.hasSignature1 : updated.hasSignature2);
            toast.success(t('settings.signatureUploaded'));
            void loadPreview(design);
        } catch (err) {
            console.error('Signature upload failed', err);
            toast.error(t('settings.signatureInvalidType'));
        } finally {
            setUploadingSlot(null);
        }
    };

    const handleSignatureDelete = async (slot: 1 | 2) => {
        setUploadingSlot(slot);
        try {
            const updated = await certificatesApi.deleteSignature(tournamentId, slot);
            setSettings(updated);
            await loadSignatureThumb(slot, false);
            toast.success(t('settings.signatureRemoved'));
            void loadPreview(design);
        } catch (err) {
            console.error('Signature remove failed', err);
        } finally {
            setUploadingSlot(null);
        }
    };

    const handleDownloadError = (err: unknown) => {
        if (axios.isAxiosError(err) && err.response?.status === 429) {
            toast.error(t('roster.downloadBusy'));
            return;
        }
        toast.error(t('roster.downloadFailed'));
    };

    const handleDownloadTournamentZip = async () => {
        setBusyAction('all-zip');
        try {
            if (dirty) {
                await handleSaveSettings();
            }
            await certificatesApi.issue(tournamentId);
            const { blob, filename } = await certificatesApi.downloadTournamentZip(tournamentId);
            triggerBlobDownload(blob, filename);
            const refreshed = await certificatesApi.getRoster(tournamentId);
            setRoster(refreshed);
        } catch (err) {
            console.error('Tournament ZIP download failed', err);
            handleDownloadError(err);
        } finally {
            setBusyAction(null);
        }
    };

    const handleDownloadTeam = async (teamId: string, format: 'pdf' | 'zip') => {
        setBusyAction(`${teamId}-${format}`);
        try {
            if (dirty) {
                await handleSaveSettings();
            }
            await certificatesApi.issue(tournamentId, teamId);
            const result =
                format === 'pdf'
                    ? await certificatesApi.downloadTeamPdf(tournamentId, teamId)
                    : await certificatesApi.downloadTeamZip(tournamentId, teamId);
            triggerBlobDownload(result.blob, result.filename);
            const refreshed = await certificatesApi.getRoster(tournamentId);
            setRoster(refreshed);
        } catch (err) {
            console.error('Team certificate download failed', err);
            handleDownloadError(err);
        } finally {
            setBusyAction(null);
        }
    };

    const handleConfirmRevoke = async () => {
        if (!revokeTarget?.certificateId) return;
        try {
            await certificatesApi.revoke(tournamentId, revokeTarget.certificateId);
            toast.success(t('roster.revokedToast'));
            setRevokeTarget(null);
            const refreshed = await certificatesApi.getRoster(tournamentId);
            setRoster(refreshed);
        } catch (err) {
            console.error('Failed to revoke certificate', err);
            toast.error(t('roster.downloadFailed'));
        }
    };

    if (loading) {
        return (
            <GlassCard className="p-8 text-center text-slate-500">
                {t('preview.loading')}
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* Design Picker */}
            <GlassCard className="p-4 sm:p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Certificate className="w-5 h-5 text-navy dark:text-navy-tint" />
                        {t('design.heading')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('design.help')}
                    </p>
                </div>
                <CertificateDesignPicker
                    value={design}
                    onChange={handleDesignChange}
                    organiserPrimaryColor={settings?.organiserPrimaryColor}
                    organiserSecondaryColor={settings?.organiserSecondaryColor}
                />
            </GlassCard>

            {/* Settings + Live Preview grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Settings Form */}
                <GlassCard className="p-4 sm:p-6 xl:col-span-7 space-y-5">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-foreground">
                            {t('settings.heading')}
                        </h3>
                        <Button
                            size="sm"
                            onClick={() => void handleSaveSettings()}
                            disabled={saving}
                            className="gap-1.5"
                        >
                            <FloppyDisk className="w-4 h-4" />
                            {saving ? t('settings.saving') : t('settings.save')}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                {t('settings.customTitle')}
                            </label>
                            <input
                                type="text"
                                maxLength={160}
                                value={customTitle}
                                onChange={(e) => {
                                    setCustomTitle(e.target.value);
                                    setDirty(true);
                                }}
                                placeholder={t('settings.customTitlePlaceholder')}
                                className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/60 px-3 py-2 text-sm text-foreground"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                {t('settings.language')}
                            </label>
                            <select
                                value={language}
                                onChange={(e) => {
                                    setLanguage(e.target.value as CertificateLanguage);
                                    setDirty(true);
                                }}
                                className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/60 px-3 py-2 text-sm text-foreground"
                            >
                                <option value="EN">{t('settings.langEn')}</option>
                                <option value="MS">{t('settings.langMs')}</option>
                                <option value="BOTH">{t('settings.langBoth')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                {t('settings.issueDate')}
                            </label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => {
                                    setIssueDate(e.target.value);
                                    setDirty(true);
                                }}
                                className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/60 px-3 py-2 text-sm text-foreground"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                {t('settings.remark')}
                            </label>
                            <textarea
                                rows={3}
                                maxLength={500}
                                value={remark}
                                onChange={(e) => {
                                    setRemark(e.target.value);
                                    setDirty(true);
                                }}
                                placeholder={t('settings.remarkPlaceholder')}
                                className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/60 px-3 py-2 text-sm text-foreground"
                            />
                        </div>
                    </div>

                    {/* Verification Toggle */}
                    <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5 bg-slate-50/70 dark:bg-white/5 space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showVerification}
                                onChange={(e) => {
                                    setShowVerification(e.target.checked);
                                    setDirty(true);
                                }}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy"
                            />
                            <div>
                                <span className="text-sm font-medium text-foreground block">
                                    {t('settings.showVerification')}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('settings.showVerificationHint')}
                                </span>
                            </div>
                        </label>
                        {settings && !settings.verificationUrlConfigured && (
                            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-lg px-2.5 py-2">
                                <WarningCircle className="w-4 h-4 shrink-0" />
                                <span>{t('settings.verificationUrlMissing')}</span>
                            </div>
                        )}
                    </div>

                    {/* Signatories */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        {([1, 2] as const).map((slot) => {
                            const nameVal = slot === 1 ? sig1Name : sig2Name;
                            const titleVal = slot === 1 ? sig1Title : sig2Title;
                            const setNameVal = slot === 1 ? setSig1Name : setSig2Name;
                            const setTitleVal = slot === 1 ? setSig1Title : setSig2Title;
                            const thumb = slot === 1 ? sig1Thumb : sig2Thumb;
                            const hasSig = slot === 1 ? settings?.hasSignature1 : settings?.hasSignature2;

                            return (
                                <div
                                    key={slot}
                                    className="rounded-xl border border-slate-200 dark:border-white/10 p-3.5 space-y-3 bg-white/50 dark:bg-white/[0.03]"
                                >
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {slot === 1 ? t('settings.signatory1') : t('settings.signatory2')}
                                    </h4>
                                    <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                                            {t('settings.signatoryName')}
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={120}
                                            value={nameVal}
                                            onChange={(e) => {
                                                setNameVal(e.target.value);
                                                setDirty(true);
                                            }}
                                            placeholder={t('settings.signatoryNamePlaceholder')}
                                            className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/60 px-2.5 py-1.5 text-sm text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                                            {t('settings.signatoryTitle')}
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={120}
                                            value={titleVal}
                                            onChange={(e) => {
                                                setTitleVal(e.target.value);
                                                setDirty(true);
                                            }}
                                            placeholder={t('settings.signatoryTitlePlaceholder')}
                                            className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/60 px-2.5 py-1.5 text-sm text-foreground"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="block text-xs text-slate-600 dark:text-slate-300">
                                            {t('settings.signatureImage')}
                                        </span>
                                        {thumb && (
                                            <div className="h-14 rounded-lg border border-dashed border-slate-300 dark:border-white/20 bg-white flex items-center justify-center p-1.5">
                                                <img
                                                    src={thumb}
                                                    alt={t('settings.signatureImage')}
                                                    className="max-h-11 max-w-full object-contain"
                                                />
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-navy/10 dark:bg-white/10 text-navy dark:text-white hover:bg-navy/15 cursor-pointer transition-colors">
                                                <UploadSimple className="w-3.5 h-3.5" />
                                                {uploadingSlot === slot
                                                    ? t('settings.saving')
                                                    : hasSig
                                                        ? t('settings.replaceSignature')
                                                        : t('settings.uploadSignature')}
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg"
                                                    className="sr-only"
                                                    disabled={uploadingSlot !== null}
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        e.target.value = '';
                                                        void handleSignatureUpload(slot, f);
                                                    }}
                                                />
                                            </label>
                                            {hasSig && (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleSignatureDelete(slot)}
                                                    disabled={uploadingSlot !== null}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-crimson hover:bg-crimson/10 transition-colors"
                                                >
                                                    <Trash className="w-3.5 h-3.5" />
                                                    {t('settings.removeSignature')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>

                {/* Live PDF Preview */}
                <GlassCard className="p-4 sm:p-6 xl:col-span-5 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                                <Eye className="w-4 h-4 text-navy dark:text-navy-tint" />
                                {t('preview.heading')}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t('preview.help')}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void loadPreview(design)}
                                disabled={previewLoading}
                                className="gap-1.5"
                            >
                                <ArrowsClockwise className={`w-3.5 h-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
                                {t('preview.refresh')}
                            </Button>
                            {previewUrl && (
                                <a
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-white/15 text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <FilePdf className="w-3.5 h-3.5" />
                                    {t('preview.openNewTab')}
                                </a>
                            )}
                        </div>
                    </div>

                    {dirty && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">
                            {t('preview.unsavedHint')}
                        </p>
                    )}

                    <div className="w-full aspect-[297/210] rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                        {previewLoading ? (
                            <span className="text-sm text-slate-500">{t('preview.loading')}</span>
                        ) : previewError || !previewUrl ? (
                            <span className="text-sm text-crimson">{t('preview.failed')}</span>
                        ) : (
                            <iframe
                                src={`${previewUrl}#toolbar=0&navpanes=0&view=Fit`}
                                title={t('preview.heading')}
                                className="w-full h-full border-0"
                            />
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Category > Team > Players + Downloads */}
            <GlassCard className="p-4 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{t('roster.heading')}</h3>
                        {roster && (
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {t('roster.summary', {
                                    active: roster.totalActivePlayers,
                                    issued: roster.totalIssued,
                                    revoked: roster.totalRevoked,
                                })}
                            </p>
                        )}
                    </div>
                    {roster && roster.totalActivePlayers > 0 && (
                        <Button
                            onClick={() => void handleDownloadTournamentZip()}
                            disabled={busyAction !== null}
                            className="gap-2"
                        >
                            <DownloadSimple className="w-4 h-4" />
                            {busyAction === 'all-zip' ? t('roster.downloading') : t('roster.downloadAllZip')}
                        </Button>
                    )}
                </div>

                {!roster || roster.categories.length === 0 || roster.totalActivePlayers === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                        {t('roster.empty')}
                    </div>
                ) : (
                    <div className="space-y-5">
                        {roster.categories.map((cat) => (
                            <div key={cat.categoryId || cat.categoryName} className="space-y-3">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-navy dark:text-navy-tint border-b border-slate-200 dark:border-white/10 pb-1.5">
                                    {cat.categoryName}
                                </h4>
                                <div className="space-y-3">
                                    {cat.teams.map((team) => {
                                        const isExpanded = Boolean(expandedTeams[team.teamId]);
                                        const achVal = teamAchievements[team.teamId] ?? '';
                                        return (
                                            <div
                                                key={team.teamId}
                                                className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] overflow-hidden"
                                            >
                                                <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setExpandedTeams((prev) => ({
                                                                        ...prev,
                                                                        [team.teamId]: !prev[team.teamId],
                                                                    }))
                                                                }
                                                                className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-navy dark:hover:text-navy-tint"
                                                            >
                                                                {isExpanded ? (
                                                                    <CaretDown className="w-4 h-4 shrink-0" />
                                                                ) : (
                                                                    <CaretRight className="w-4 h-4 shrink-0" />
                                                                )}
                                                                <span className="truncate">{team.teamName}</span>
                                                            </button>
                                                            <Badge variant="outline" className="text-xs">
                                                                {t('roster.playersCount', { count: team.activePlayerCount })}
                                                            </Badge>
                                                            {team.issuedCount > 0 && (
                                                                <Badge variant="primary" className="text-xs">
                                                                    {t('roster.issuedCount', { count: team.issuedCount })}
                                                                </Badge>
                                                            )}
                                                            {team.revokedCount > 0 && (
                                                                <Badge variant="secondary" className="text-xs text-crimson">
                                                                    {t('roster.revokedCount', { count: team.revokedCount })}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Optional achievement line per team */}
                                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                                            <input
                                                                type="text"
                                                                maxLength={160}
                                                                value={achVal}
                                                                onChange={(e) => {
                                                                    const next = {
                                                                        ...teamAchievements,
                                                                        [team.teamId]: e.target.value,
                                                                    };
                                                                    setTeamAchievements(next);
                                                                    setDirty(true);
                                                                }}
                                                                placeholder={t('roster.achievementPlaceholder')}
                                                                aria-label={t('roster.achievementLabel')}
                                                                className="w-full sm:w-64 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900/60 px-2.5 py-1 text-xs text-foreground"
                                                            />
                                                            {dirty && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void handleSaveSettings()}
                                                                    disabled={saving}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-navy text-white hover:bg-navy/90"
                                                                >
                                                                    {t('roster.saveAchievement')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            disabled={team.activePlayerCount === 0 || busyAction !== null}
                                                            onClick={() => void handleDownloadTeam(team.teamId, 'pdf')}
                                                            className="gap-1.5"
                                                        >
                                                            <FilePdf className="w-4 h-4" />
                                                            {busyAction === `${team.teamId}-pdf`
                                                                ? t('roster.downloading')
                                                                : t('roster.teamPdf')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={team.activePlayerCount === 0 || busyAction !== null}
                                                            onClick={() => void handleDownloadTeam(team.teamId, 'zip')}
                                                            className="gap-1.5"
                                                        >
                                                            <FileZip className="w-4 h-4" />
                                                            {busyAction === `${team.teamId}-zip`
                                                                ? t('roster.downloading')
                                                                : t('roster.teamZip')}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="border-t border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5">
                                                        {team.players.map((player) => (
                                                            <div
                                                                key={player.playerId}
                                                                className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-foreground truncate">
                                                                        {player.fullName}
                                                                    </div>
                                                                    {player.code && (
                                                                        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                                                            {player.code}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant={
                                                                            player.status === 'VALID'
                                                                                ? 'primary'
                                                                                : player.status === 'REVOKED'
                                                                                    ? 'secondary'
                                                                                    : 'outline'
                                                                        }
                                                                        className={
                                                                            player.status === 'REVOKED'
                                                                                ? 'text-crimson border-crimson/30'
                                                                                : undefined
                                                                        }
                                                                    >
                                                                        {t(`roster.status.${player.status}`)}
                                                                    </Badge>
                                                                    {player.status === 'VALID' && player.certificateId && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setRevokeTarget(player)}
                                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-crimson hover:bg-crimson/10 transition-colors"
                                                                        >
                                                                            <Prohibit className="w-3.5 h-3.5" />
                                                                            {t('roster.revoke')}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

            <ConfirmModal
                isOpen={Boolean(revokeTarget)}
                onClose={() => setRevokeTarget(null)}
                onConfirm={() => void handleConfirmRevoke()}
                title={t('roster.revokeTitle')}
                message={t('roster.revokeMessage', {
                    name: revokeTarget?.fullName ?? '',
                    code: revokeTarget?.code ?? '',
                })}
                confirmText={t('roster.revokeConfirm')}
                variant="destructive"
            />
        </div>
    );
}
