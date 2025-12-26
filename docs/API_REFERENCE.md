# API Reference (Backend)

## 1. Overview
The backend exposes a RESTful API.
-   **Base URL**: `/api/v1` (typical convention)
-   **Documentation**: Swagger UI is available at `/swagger-ui.html` (or `/v3/api-docs`).

## 2. Authentication & Security
-   **Type**: JWT (Bearer Token).
-   **Endpoints**:
    -   `POST /api/auth/login`: Authenticate and receive JWT.
    -   `POST /api/auth/register`: Create new user account.
    -   `POST /api/auth/refresh`: Refresh expired token.
-   **Roles**:
    -   `SUPER_ADMIN`: Full access.
    -   `ORG_ADMIN`: specific to Organisation resources.
    -   `CLUB_ADMIN`: Specific to Club resources.

## 3. Public API
Accessible without authentication. tailored for the Public Portal.
-   **Controller**: `PublicTournamentController`
-   **Key Endpoints**:
    -   `GET /api/public/tournaments`: List active/published tournaments.
    -   `GET /api/public/tournaments/{slug}`: Get details (standings, matches).
    -   `GET /api/public/matches/{id}`: Live scores and events.

## 4. Admin API (Protected)
Requires Valid JWT and appropriate Role.
-   **Tournaments** (`TournamentController`)
    -   `POST /api/tournaments`: Create Draft.
    -   `PUT /api/tournaments/{id}/publish`: Publish tournament.
    -   `POST /api/tournaments/{id}/generate-fixture`: Trigger auto-scheduling.
-   **Matches** (`MatchController`)
    -   `PUT /api/matches/{id}/score`: Update score (Officials only).
    -   `POST /api/matches/{id}/events`: Add card/try/conversion.
-   **Organisations** (`OrganisationController`)
    -   `POST /api/organisations`: Onboard new club/union.

## 5. Error Handling
Standard HTTP Status Codes are used:
-   `200 OK`: Success.
-   `400 Bad Request`: Validation failure.
-   `401 Unauthorized`: Missing/Invalid Token.
-   `403 Forbidden`: Valid Token but insufficient permissions.
-   `404 Not Found`: Resource does not exist.
-   `422 Unprocessable Entity`: Business logic violation.
