# Roadmap & Known Limitations

## 1. Known Limitations (Current Version)
-   **Payments**: No integrated payment gateway for team registration fees. Currently manual.
-   **Live Streaming**: Support is limited to external URL embedding (YouTube/Twitch). No native video ingestion.
-   **Mobile App**: No dedicated native mobile app (iOS/Android). Application is a Responsive Web App.
-   **Notifications**: Real-time push notifications (WebSockets) are partially implemented or planned for Match Events, but email notifications may be limited.

## 2. Future Enhancements (Post-Staging)
-   **Payment Integration**: Stripe/PayPal integration for automated tournament fees.
-   **Native Mobile App**: React Native wrapper for the existing frontend.
-   **Advanced Analytics**: Player heatmaps and more granular possession stats.
-   **Fantasy League**: Public fantasy rugby league based on tournament stats.

## 3. Tech Debt
-   **Test Coverage**: Unit test coverage should be increased for complex Service logic.
-   **Hardcoded Values**: Some UI styling constants in `Stats.tsx` could be moved to the theme config.
