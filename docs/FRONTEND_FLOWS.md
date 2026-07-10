# Frontend Flows & UX

## 1. Authentication Flow
-   **Login**: `/login` (Public).
-   **Success**: Stores JWT in local storage/cookie. Redirects to `/dashboard`.
-   **Failure**: Shows error message.
-   **Guard**: `AuthGuard` wraps protected routes. Redirects unauthenticated users to `/login`.

## 2. Public Portal Flow
Designed for anonymous users (fans, parents).
-   **Landing Page**: `/` (Home).
-   **Tournament List**: `/tournaments` - Browse active competitions.
-   **Tournament Detail**: `/tournaments/:slug`
    -   **Tabs**: Overview, Standings, Fixtures, Stats.
-   **Match Center**: `/matches/:id`
    -   Live scores, events (tries, cards), team lineups.

## 3. Admin Dashboard Flow
Designed for Organisation and Club Admins.
-   **Layout**: Sidebar navigation + Top bar.
-   **Home**: `/dashboard` - Overview of recent activity.
-   **Tournaments**: `/dashboard/tournaments`
    -   **Create**: Multi-step wizard (Details -> Format -> Teams).
    -   **Manage**: Dashboard for specific tournament (Fixtures, Tables).
-   **Organisations**: `/dashboard/organisations`
    -   Manage hierarchy (State -> Club).
-   **Stats**: `/dashboard/stats`
    -   Global statistics view.

## 4. Key UX Patterns
-   **Bento Grid**: Used in dashboards for high-density data visualization.
-   **Glassmorphism**: Visual style for cards and overlays (files: `GlassCard.tsx`).
-   **Modals**: For quick actions (e.g., "Add Team", "Edit Score").
-   **Toast Notifications**: For success/error feedback.
