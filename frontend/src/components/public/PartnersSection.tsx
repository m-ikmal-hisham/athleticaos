import { Link } from 'react-router-dom';
import { PARTNERS, Partner } from '@/config/partners';
import { PartnerLogo } from '@/components/public/PartnerLogo';
import { useSponsorTracker } from '@/hooks/useSponsorTracker';

interface PartnersSectionProps {
    variant?: 'default' | 'compact';
    className?: string;
    showHeading?: boolean;
}

interface TrackedPartnerProps {
    partner: Partner;
    children: React.ReactNode;
    location: string;
    className?: string;
}

const TrackedPartner = ({ partner, children, location, className = '' }: TrackedPartnerProps) => {
    const { elementRef, trackClick } = useSponsorTracker({
        sponsorName: partner.name,
        tier: partner.role,
        location,
    });

    return (
        <div
            ref={elementRef}
            onClick={trackClick}
            className={`${partner.url ? 'cursor-pointer' : ''} ${className}`}
        >
            {children}
        </div>
    );
};

export const PartnersSection = ({
    variant = 'default',
    className = '',
    showHeading = true,
}: PartnersSectionProps) => {
    if (variant === 'compact') {
        return (
            <div className={`py-4 flex flex-wrap items-center justify-center gap-4 ${className}`}>
                <span className="text-xs font-semibold text-black/70 dark:text-white/70">
                    Partners
                </span>
                {PARTNERS.map((partner) => (
                    <TrackedPartner
                        key={partner.id}
                        partner={partner}
                        location="match-footer-compact"
                    >
                        <PartnerLogo partner={partner} maxHeight={40} />
                    </TrackedPartner>
                ))}
            </div>
        );
    }

    return (
        <section className={`py-0 ${className}`}>
            {showHeading && (
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-black dark:text-white">
                        Our partners
                    </h2>
                </div>
            )}

            <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
                {PARTNERS.map((partner) => (
                    <TrackedPartner
                        key={partner.id}
                        partner={partner}
                        location="partners-section"
                        className="w-full sm:w-80"
                    >
                        <div className="bg-white dark:bg-deep-navy border border-black/10 dark:border-white/12 rounded-[14px] p-4 sm:p-6 flex flex-col items-center justify-center gap-3 text-center">
                            <PartnerLogo partner={partner} maxHeight={112} />
                            <span className="text-xs text-black/70 dark:text-white/70">
                                {partner.role}
                            </span>
                        </div>
                    </TrackedPartner>
                ))}
            </div>

            <div className="mt-8 max-w-2xl mx-auto bg-white dark:bg-deep-navy border border-black/10 dark:border-white/12 rounded-[14px] p-6 sm:p-8 text-center">
                <h3 className="text-base sm:text-lg font-semibold text-black dark:text-white">
                    Partner with us
                </h3>
                <p className="text-sm text-black/70 dark:text-white/70 mt-2">
                    Organisations and companies interested in working with AthleticaOS can register their interest.
                </p>
                <div className="mt-6 flex justify-center">
                    <Link
                        to="/contact?subject=PARTNERSHIP"
                        className="inline-flex items-center justify-center px-4 py-2 min-h-[44px] text-sm font-medium rounded-xl border border-black/10 dark:border-white/12 bg-white dark:bg-deep-navy text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        Get in touch
                    </Link>
                </div>
            </div>
        </section>
    );
};
