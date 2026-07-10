# Architecture & Component Design

## 1. Backend Architecture
The backend uses a standard Layered Architecture pattern to ensure separation of concerns.

### Layers
1.  **Controller Layer (`com.athleticaos.backend.controllers`)**:
    -   Handles incoming HTTP requests.
    -   Validates input.
    -   Delegates business logic to Services.
    -   Return DTOs (Data Transfer Objects) to the client.
    -   **Separation**: Controllers are often separated by domain (e.g., `TournamentController`, `MatchController`) and audience (`PublicTournamentController` vs `TournamentController`).

2.  **Service Layer (`com.athleticaos.backend.services`)**:
    -   Contains core business logic.
    -   Handles transactions (`@Transactional`).
    -   Orchestrates calls to Repositories.
    -   Examples: `TournamentService`, `MatchService`, `EligibilityService`.

3.  **Repository Layer (`com.athleticaos.backend.repositories`)**:
    -   Interface with the database.
    -   Extends `JpaRepository`.
    -   Handles standard CRUD and custom JPQL/Native queries.

### API Boundaries
-   **Admin API**: Protected by JWT Authentication. accessible only to users with appropriate roles (SUPER_ADMIN, ORG_ADMIN, etc.).
-   **Public API**: Open endpoints (usually prefixed or specific controllers like `PublicTournamentController`) allowing read-only access to non-sensitive tournament data.

## 2. Frontend Architecture
The frontend is built as a single codebase but logically divided.

### Module Separation
-   **Public Module**: Pages accessible without login. Focuses on data presentation (Leaderboards, Match Centers, Tournament Brackets).
    -   Routes typically defined under `/public` or root paths for guests.
-   **Admin Module**: Protected routes requiring authentication. Focuses on forms, management tables, and data entry.
    -   Guarded by `<AuthGuard>` component.

### State Management (Zustand)
The application uses Zustand for global state management, split into domain-specific stores:
-   `auth.store.ts`: Manages User session, JWT token, and login/logout logic.
-   `ui.store.ts`: UI state (theme, sidebar) AND **Active Tournament Context** (`activeTournamentId`).
-   `tournaments.store.ts`: Handles fetching tournament lists.
-   `matches.store.ts`: Match operations and live scoring updates.
-   `stats.store.ts`: Leaderboard and statistics data aggregation.

## 3. Data Flow
1.  **Client Action**: User interacts with UI.
2.  **Store/Component**: Calls Service/API Utility (Axios).
3.  **API Request**: Hits Backend Controller.
4.  **Processing**: Service processes logic, Repository fetches Entity.
5.  **Response**: DTO returned to Client.
6.  **State Update**: Store updates state, UI re-renders.
