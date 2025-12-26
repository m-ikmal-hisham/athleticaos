# Security & Access Control

## 1. Authentication
-   **Mechanism**: Stateless JWT (JSON Web Token).
-   **Token Storage**: Client-side (LocalStorage/Cookie).
-   **Filter Chain**: Spring Security `JwtAuthenticationFilter` intercepts requests.

## 2. User Roles
Roles are defined in `Role.java` and enforced via `@PreAuthorize`.

| Role | Scope | Permissions |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | Global | Full CRUD on all Organisations, Tournaments, Users. Can manage system settings. |
| **ORG_ADMIN** | Organisation | Manage their own Organisation and its children (e.g., Clubs). Create Tournaments. |
| **CLUB_ADMIN** | Club | Manage Team Rosters, Player Profiles. Cannot create Tournaments. |
| **PUBLIC** | None | Read-only access to published public endpoints. |

## 3. Permission Model
-   **Hierarchical**: `ORG_ADMIN` of "National Union" has implied access to "State Union" if logic permits (implementation dependent).
-   **Resource-Based**: Access to a Tournament is checked against the user's Organisation affiliation.

## 4. Route Protection
-   **Backend**:
    -   `/api/admin/**`: Requires Authentication.
    -   `/api/public/**`: Permitted All.
-   **Frontend**:
    -   `<AuthGuard>`: Checks for valid token. Redirects to login if missing/expired.
