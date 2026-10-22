import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DownloadSimple, PencilSimple, EyeSlash, HandPalm, Info, ArrowRight } from '@phosphor-icons/react';

interface RequestOptionDef {
    type: 'copy' | 'correct' | 'remove' | 'withdraw';
    titleKey: string;
    descriptionKey: string;
    actionKey: string;
    icon: typeof DownloadSimple;
}

const REQUEST_OPTIONS: RequestOptionDef[] = [
    {
        type: 'copy',
        titleKey: 'options.copy.title',
        descriptionKey: 'options.copy.description',
        actionKey: 'options.copy.action',
        icon: DownloadSimple,
    },
    {
        type: 'correct',
        titleKey: 'options.correct.title',
        descriptionKey: 'options.correct.description',
        actionKey: 'options.correct.action',
        icon: PencilSimple,
    },
    {
        type: 'remove',
        titleKey: 'options.remove.title',
        descriptionKey: 'options.remove.description',
        actionKey: 'options.remove.action',
        icon: EyeSlash,
    },
    {
        type: 'withdraw',
        titleKey: 'options.withdraw.title',
        descriptionKey: 'options.withdraw.description',
        actionKey: 'options.withdraw.action',
        icon: HandPalm,
    },
];

export default function DataRequests() {
    const { t, i18n } = useTranslation('dataRequests');

    useEffect(() => {
        document.title = t('pageTitle');
    }, [t, i18n.language]);

    return (
        <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-8">
            {/* Header */}
            <div className="space-y-3">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-content-primary">
                    {t('title')}
                </h1>
                <p className="text-base sm:text-lg text-content-secondary leading-relaxed">
                    {t('description')}
                </p>
                <div className="text-sm text-content-secondary">
                    <Link
                        to="/privacy#your-rights"
                        className="text-brand-text font-medium hover:underline inline-flex items-center gap-1"
                    >
                        {t('rightsLinkText')}
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            {/* Request Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {REQUEST_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                        <div
                            key={opt.type}
                            className="bg-surface-card border border-line-subtle rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-line-strong transition-colors"
                        >
                            <div className="space-y-3 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand-text flex items-center justify-center">
                                    <Icon size={24} weight="duotone" />
                                </div>
                                <h2 className="text-lg font-bold text-content-primary">
                                    {t(opt.titleKey)}
                                </h2>
                                <p className="text-sm text-content-secondary leading-relaxed">
                                    {t(opt.descriptionKey)}
                                </p>
                            </div>

                            <Link
                                to={`/contact?subject=PRIVACY_REQUEST&type=${opt.type}`}
                                className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-sunken hover:bg-brand hover:text-white border border-line-subtle transition-colors text-content-primary"
                            >
                                {t(opt.actionKey)}
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/* Reassurance & Parent/Guardian Notice */}
            <div className="rounded-2xl border border-line-subtle bg-surface-card p-6 flex items-start gap-4">
                <Info size={24} className="text-brand-text shrink-0 mt-0.5" weight="duotone" />
                <div className="space-y-2 text-sm text-content-secondary leading-relaxed">
                    <p className="font-semibold text-content-primary">
                        {t('guardian.heading')}
                    </p>
                    <p>
                        {t('guardian.body')}
                    </p>
                    <p className="text-content-primary font-medium">
                        {t('guardian.replyNotice')}
                    </p>
                </div>
            </div>
        </div>
    );
}
