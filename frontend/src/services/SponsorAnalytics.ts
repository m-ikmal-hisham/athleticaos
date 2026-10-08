/**
 * Service to handle Sponsor Analytics (Impressions/Clicks)
 * Events are not sent anywhere yet.
 */

export const SponsorAnalytics = {
    /**
     * Track a valid impression (element visible for >1s)
     */
    trackImpression: async (sponsorName: string, tier: string, location: string) => {
        if (import.meta.env.DEV) {
            console.log(`[Analytics] Impression Recorded: ${sponsorName} (${tier}) at ${location}`);
        }
    },

    /**
     * Track a click on a sponsor logo
     */
    trackClick: async (sponsorName: string, location: string) => {
        if (import.meta.env.DEV) {
            console.log(`[Analytics] Click Recorded: ${sponsorName} at ${location}`);
        }
    }
};
