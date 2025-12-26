# Dashboard Stats & Analytics

## 1. Overview
The Stats engine aggregates data from Match Events to produce leaderboards and summary metrics.

## 2. Tournament Summary
Key Performance Indicators (KPIs) shown on the dashboard:
-   **Total Matches**: Count of all scheduled matches.
-   **Completed**: Count of matches with status `COMPLETED`.
-   **Total Tries**: Sum of all try events.
-   **Total Points**: Calculated from (Tries * 5) + (Conversions * 2) + (Penalties * 3).
-   **Yellow/Red Cards**: Discipline tracking.

## 3. Leaderboards

### Top Scorers
-   **Metric**: Total Points.
-   **Columns**: Rank, Player Name, Team, Tries, Total Points.
-   **Sorting**: Descending by Points.

### Discipline
-   **Metric**: Card Counts.
-   **Columns**: Rank, Player Name, Team, Yellow Cards, Red Cards.
-   **Sorting**: 
    1.  Red Cards (Descending)
    2.  Yellow Cards (Descending)

### Top Teams
-   **Metric**: League Table Points (Competition specific logic).
-   **Columns**: Rank, Team Name, Organisation, Wins, Table Points.
-   **Sorting**: Descending by Table Points.

## 4. Data Source
-   **Frontend**: `Stats.tsx` uses `useStatsStore`.
-   **Backend**: `StatisticsController` aggregates data via JPQL queries on `MatchEvent` and `Match` entities.
-   **Refresh**: Data is fetched per selected tournament.
