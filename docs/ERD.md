# Entity Relationship Diagram & Data Model

## 1. Organisation Hierarchy
The system uses a recursive hierarchy for organisations.
-   **Entity**: `Organisation`
-   **Relationships**:
    -   `parentOrg`: Self-referencing Many-to-One. Allows structures like Country -> State -> Zone -> Club.
    -   `orgType`: ENUM (e.g., STATE_UNION, CLUB).
    -   `orgLevel`: ENUM (e.g., CLUB vs ORGANISER).

## 2. Tournament & Competition Structure
-   **Entity**: `Tournament`
    -   **Relationships**:
        -   `organiserOrg`: Many-to-One to `Organisation`.
        -   `season`: Many-to-One to `Season`.
        -   `categories`: One-to-Many to `TournamentCategory` (e.g., Men's Premier, Women's Div 1).
-   **Entity**: `TournamentStage`
    -   **Purpose**: Defines phases like "Pool Stage", "Knockout Stage".
-   **Entity**: `TournamentCategory`
    -   **Purpose**: Divisions within a tournament.

## 3. Match Management
-   **Entity**: `Match`
    -   **Relationships**:
        -   `tournament`: Many-to-One to `Tournament`.
        -   `homeTeam`, `awayTeam`: Many-to-One to `Team`.
        -   `stage`: Many-to-One to `TournamentStage`.
    -   **Key Fields**:
        -   `status`: SCHEDULED, IN_PROGRESS, COMPLETED, ABANDONED.
        -   `homeScore`, `awayScore`.
        -   `nextMatchIdForWinner/Loser`: For bracket progression.

## 4. People & Players
-   **Entity**: `User`
    -   **Purpose**: Authentication, system access, and personal details (Name, Address, Contact).
    -   **Key Fields**: `email`, `passwordHash`, `firstName`, `lastName`, `roles`, `organisation`.
    -   **Note**: Unlike the initial design, `User` contains personal details directly and does not link to a separate `Person` entity.
-   **Entity**: `Player`
    -   **Purpose**: Represents a profile for competition participation.
    -   **Relationship**: Links to `Person` (Conceptually, though implementation may vary, `Player` holds the athletic profile). linked to `User` implicitly or via `Person` record in future iterations. current implementation has `Player` linking to `Person` but `User` is standalone.
-   **Entity**: `TeamPlayer` (Roster)
    -   Links `Player` to `Team` for a duration.

## 5. Summary Data Dictionary

| Table | Key FKs | Description |
| :--- | :--- | :--- |
| \`organisations\` | \`parent_org_id\` | Core business entity. Clubs, Unions, governing bodies. |
| \`tournaments\` | \`organiser_org_id\` | Competition event managed by an organisation. |
| \`matches\` | \`tournament_id\`, \`home/away_team_id\` | Individual games. Stores scores and status. |
| \`users\` | \`person_id\` | System logins. Stores hashed passwords and specific roles. |
| \`audit_logs\` | \`user_id\`, \`target_id\` | Tracks changes for security and compliance. |
