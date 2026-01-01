import { GlassCard } from '@/components/GlassCard';
import { useSponsorTracker } from '@/hooks/useSponsorTracker';

interface Sponsor {
    name: string;
    tier: 'TITLE' | 'GOLD' | 'SILVER';
    logoUrl?: string; // Optional, use placeholder if missing
}

// Mock Data for Phase 1 - In Phase 2 this will come from API
const MOCK_SPONSORS: Sponsor[] = [
    { name: 'National Rugby', tier: 'TITLE', logoUrl: '/sponsors/title-placeholder.png' },
    { name: 'TechPartner', tier: 'GOLD', logoUrl: '/sponsors/gold-1.png' },
    { name: 'BeverageCo', tier: 'GOLD', logoUrl: '/sponsors/gold-2.png' },
    { name: 'LocalBank', tier: 'SILVER', logoUrl: '/sponsors/silver-1.png' },
    { name: 'CityCouncil', tier: 'SILVER', logoUrl: '/sponsors/silver-2.png' },
];

interface SponsorsSectionProps {
    variant?: 'default' | 'compact';
    className?: string;
}

// Wrapper component to handle hooks for each item
const TrackedSponsor = ({ sponsor, children, location }: { sponsor: Sponsor, children: React.ReactNode, location: string }) => {
    const { elementRef, trackClick } = useSponsorTracker({
        sponsorName: sponsor.name,
        tier: sponsor.tier,
        location
    });

    return (
        <div ref={elementRef} onClick={trackClick} className="cursor-pointer transition-transform hover:scale-105">
            {children}
        </div>
    );
};

export const SponsorsSection = ({ variant = 'default', className = '' }: SponsorsSectionProps) => {

    // Group sponsors
    const titleSponsors = MOCK_SPONSORS.filter(s => s.tier === 'TITLE');
    const goldSponsors = MOCK_SPONSORS.filter(s => s.tier === 'GOLD');
    const silverSponsors = MOCK_SPONSORS.filter(s => s.tier === 'SILVER');

    if (variant === 'compact') {
        // Compact view: Just show logos in a row, smaller
        return (
            <div className={`flex flex-wrap items-center justify-center gap-6 opacity-80 ${className}`}>
                {MOCK_SPONSORS.slice(0, 4).map((sponsor, idx) => (
                    <TrackedSponsor key={idx} sponsor={sponsor} location="match-footer-compact">
                        <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all cursor-default">
                            {/* Placeholder Logo */}
                            <div className="h-6 w-auto px-2 flex items-center font-bold text-xs uppercase tracking-widest text-white/70">
                                {sponsor.name}
                            </div>
                        </div>
                    </TrackedSponsor>
                ))}
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Official Partners</span>
            </div>
        );
    }

    return (
        <section className={`py-12 ${className}`}>
            <div className="text-center mb-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-widest opacity-90">
                    Trusted By Champions
                </h3>
                <div className="h-1 w-12 bg-blue-500 rounded-full mx-auto mt-4" />
            </div>

            <div className="space-y-12">
                {/* Title Sponsors */}
                {titleSponsors.length > 0 && (
                    <div className="flex flex-col items-center gap-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Title Partner</span>
                        <div className="flex flex-wrap justify-center gap-8">
                            {titleSponsors.map((sponsor, idx) => (
                                <TrackedSponsor key={idx} sponsor={sponsor} location="sponsors-section-title">
                                    <GlassCard className="px-12 py-8 min-w-[200px] flex items-center justify-center bg-white/40 dark:bg-white/5 border-blue-500/30">
                                        <span className="text-2xl font-black text-slate-800 dark:text-white uppercase">{sponsor.name}</span>
                                    </GlassCard>
                                </TrackedSponsor>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gold Sponsors */}
                {goldSponsors.length > 0 && (
                    <div className="flex flex-col items-center gap-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Gold Partners</span>
                        <div className="flex flex-wrap justify-center gap-6">
                            {goldSponsors.map((sponsor, idx) => (
                                <TrackedSponsor key={idx} sponsor={sponsor} location="sponsors-section-gold">
                                    <GlassCard className="px-8 py-6 min-w-[160px] flex items-center justify-center bg-white/30 dark:bg-white/5">
                                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase">{sponsor.name}</span>
                                    </GlassCard>
                                </TrackedSponsor>
                            ))}
                        </div>
                    </div>
                )}

                {/* Silver Sponsors */}
                {silverSponsors.length > 0 && (
                    <div className="flex flex-col items-center gap-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Silver Partners</span>
                        <div className="flex flex-wrap justify-center gap-4">
                            {silverSponsors.map((sponsor, idx) => (
                                <TrackedSponsor key={idx} sponsor={sponsor} location="sponsors-section-silver">
                                    <div className="px-6 py-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">{sponsor.name}</span>
                                    </div>
                                </TrackedSponsor>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
