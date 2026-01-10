import { useEffect, useRef, useState } from 'react';
import { SponsorAnalytics } from '../services/SponsorAnalytics';

interface UseSponsorTrackerProps {
    sponsorName: string;
    tier: string;
    location: string;
}

export const useSponsorTracker = ({ sponsorName, tier, location }: UseSponsorTrackerProps) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [hasImpression, setHasImpression] = useState(false);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element || hasImpression) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Element entered viewport - start timer
                        if (!timerRef.current) {
                            timerRef.current = window.setTimeout(() => {
                                SponsorAnalytics.trackImpression(sponsorName, tier, location);
                                setHasImpression(true);
                            }, 1000); // Must be visible for 1 second
                        }
                    } else {
                        // Element left viewport - clear timer if it hasn't fired yet
                        if (timerRef.current) {
                            window.clearTimeout(timerRef.current);
                            timerRef.current = null;
                        }
                    }
                });
            },
            {
                threshold: 0.5, // 50% of the element must be visible
            }
        );

        observer.observe(element);

        return () => {
            if (element) observer.unobserve(element);
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
        };
    }, [sponsorName, tier, location, hasImpression]);

    const trackClick = () => {
        SponsorAnalytics.trackClick(sponsorName, location);
    };

    return { elementRef, trackClick };
};
