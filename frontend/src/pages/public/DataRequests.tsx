import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DownloadSimple, PencilSimple, EyeSlash, HandPalm, Info, ArrowRight } from '@phosphor-icons/react';

interface RequestOption {
    type: 'copy' | 'correct' | 'remove' | 'withdraw';
    title: string;
    description: string;
    actionLabel: string;
    icon: typeof DownloadSimple;
}

const REQUEST_OPTIONS: RequestOption[] = [
    {
        type: 'copy',
        title: 'Get a copy of my data',
        description: 'Request an export of the personal data we hold about you across tournaments, teams, and match records.',
        actionLabel: 'Request my data',
        icon: DownloadSimple,
    },
    {
        type: 'correct',
        title: 'Correct my details',
        description: 'Ask us to update incorrect or outdated details, such as misspelled names or outdated information.',
        actionLabel: 'Request a correction',
        icon: PencilSimple,
    },
    {
        type: 'remove',
        title: 'Remove or hide my public profile',
        description: 'Ask to remove your public player profile, hide specific details, or anonymise your public records.',
        actionLabel: 'Request removal or masking',
        icon: EyeSlash,
    },
    {
        type: 'withdraw',
        title: 'Withdraw consent',
        description: 'Withdraw your consent or request limits on how your personal data is processed on the platform.',
        actionLabel: 'Withdraw consent',
        icon: HandPalm,
    },
];

export default function DataRequests() {
    useEffect(() => {
        document.title = 'Data requests — AthleticaOS';
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-8">
            {/* Header */}
            <div className="space-y-3">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-content-primary">
                    Personal data requests
                </h1>
                <p className="text-base sm:text-lg text-content-secondary leading-relaxed">
                    Under the Personal Data Protection Act, you have rights over how your personal data is handled.
                    Choose a request type below to send your request directly to our privacy team.
                </p>
                <div className="text-sm text-content-secondary">
                    Learn more in the{' '}
                    <Link
                        to="/privacy#your-rights"
                        className="text-brand-text font-medium hover:underline inline-flex items-center gap-1"
                    >
                        Your rights section of our Privacy notice
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
                                    {opt.title}
                                </h2>
                                <p className="text-sm text-content-secondary leading-relaxed">
                                    {opt.description}
                                </p>
                            </div>

                            <Link
                                to={`/contact?subject=PRIVACY_REQUEST&type=${opt.type}`}
                                className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-sunken hover:bg-brand hover:text-white border border-line-subtle transition-colors text-content-primary"
                            >
                                {opt.actionLabel}
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
                        Acting for a child under 18?
                    </p>
                    <p>
                        Parents and legal guardians can submit any of these requests on behalf of their child.
                        Please mention that you are a parent or guardian when submitting your enquiry.
                    </p>
                    <p className="text-content-primary font-medium">
                        We reply within 21 days.
                    </p>
                </div>
            </div>
        </div>
    );
}
