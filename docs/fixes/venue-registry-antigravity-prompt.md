# Antigravity prompt — tournament venue registry

Copy everything below the line.

---

## Context

Repo: AthleticaOS (Java Spring Boot backend in `backend/`, React + TypeScript +
Vite frontend in `frontend/`). Work on the existing branch
`fix/tournament-venue-registry`. Flyway migrations live in
`backend/src/main/resources/db/migration/`; the latest is `V162`.

## Problem

`matches.venue` is a free-text `VARCHAR(255)` column with no validation. The
match edit form is a plain text input (`frontend/src/components/modals/MatchModal.tsx`
around line 573, and the same field in `frontend/src/pages/dashboard/matches/EditMatch.tsx`
and `CreateMatch.tsx`). The venue filter dropdown is built by taking `DISTINCT`
over those strings (`frontend/src/pages/dashboard/tournament-tabs/TournamentMatches.tsx`
lines 133-157), so every typo becomes a permanent venue option. In production
staging data this produced eleven "venues" where there should be three or four,
including fragments like `Stadium`, `Stadium Ola`, `Stadium Olahr`.

Match numbering is sequential *per venue* and keyed on that same trimmed string
(migration `V161__match_number_per_venue.sql`), so each typo also opened its own
numbering sequence.

## Goal

Venues are declared once, per tournament, up front. A match can only be assigned
a venue from that tournament's declared list.

## Required changes

### 1. Migration `V163__tournament_venues.sql`

```sql
CREATE TABLE tournament_venues (
    id            UUID PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id),
    name          VARCHAR(255) NOT NULL,
    short_name    VARCHAR(50),
    display_order INT NOT NULL DEFAULT 0,
    deleted       BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP
);

CREATE UNIQUE INDEX uq_tournament_venue_name
    ON tournament_venues (tournament_id, LOWER(TRIM(name)))
    WHERE deleted = false;

ALTER TABLE matches ADD COLUMN venue_id UUID REFERENCES tournament_venues(id);
```

Then in the same migration:

- Backfill one `tournament_venues` row per distinct non-blank
  `TRIM(matches.venue)` per tournament, `display_order` by name.
- Also insert `tournaments.venue` as a row for each tournament if not already
  present (it is `NOT NULL` and is the tournament's headline location).
- Backfill `matches.venue_id` by exact trimmed, case-insensitive name match.
- Replace the V161 index with one keyed on `venue_id`:
  ```sql
  DROP INDEX IF EXISTS uq_matches_tournament_venue_match_number;
  CREATE UNIQUE INDEX uq_matches_tournament_venue_id_match_number
      ON matches (tournament_id,
                  COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid),
                  match_number)
      WHERE deleted = false;
  ```

Do **not** drop `matches.venue` in this migration. Keep it written as a
denormalised label so a mid-deploy rollback is safe; it will be dropped later.

Do **not** add a unique index on `(tournament_id, match_code)` in this
migration — existing data violates it. That is handled separately.

### 2. Backend

- New entity `TournamentVenue`, repository, service and DTOs, mirroring the
  conventions in the existing `entities/`, `repositories/`, `services/impl/`,
  `dtos/tournament/` packages.
- CRUD endpoints under the tournament, e.g.
  `GET/POST /api/v1/tournaments/{id}/venues`,
  `PUT/DELETE /api/v1/tournaments/{id}/venues/{venueId}`.
  Follow the authorisation pattern used by the existing tournament endpoints —
  do not invent a new one, and make sure the tournament scope is enforced on
  every read and write.
- Deleting a venue that still has matches assigned must fail with a clear
  message rather than orphaning matches.
- `MatchCreateRequest` / `MatchUpdateRequest`: accept `venueId` (nullable UUID)
  instead of a free-text `venue`. Validate the venue belongs to the match's
  tournament; reject otherwise. Keep writing `matches.venue` from the resolved
  venue's name.
- `MatchResponse` returns both `venueId` and `venueName`.
- `BracketServiceImpl` currently stamps `tournament.getVenue()` onto generated
  matches at lines 384, 466, 798, 960, 1278, 1662 and 1916. Change these to
  resolve and set the tournament's default (lowest `display_order`) venue as a
  `venue_id`.
- `VenueUtils.normalizeVenue` and the cross-venue feeder labelling in
  `VenueUtils.formatFeederPlaceholder` should compare venue IDs rather than
  strings.

### 3. Frontend

- Tournament create/edit (`pages/dashboard/tournaments/CreateTournament.tsx`,
  `EditTournament.tsx`, `components/modals/TournamentModal.tsx`): add a venue
  list editor — add, rename, reorder, remove. At least one venue required.
- Match forms (`components/modals/MatchModal.tsx`,
  `pages/dashboard/matches/CreateMatch.tsx`, `EditMatch.tsx`): replace the free
  text venue `Input` with a `SearchableSelect` populated from the tournament's
  venues. No free text entry. Keep "Venue TBC" (null) as an explicit option.
- `TournamentMatches.tsx`: build `venueOptions` from the tournament's venue
  list, not from `DISTINCT` match strings. Keep the "Venue TBC" bucket.
- `frontend/src/utils/venue.ts`: switch `hasMultipleVenues`,
  `formatMatchVenueLabel` and `formatFeederPlaceholder` to key off `venueId`,
  taking display names from the tournament venue list.
- Update `frontend/src/types/index.ts` and `frontend/src/api/matches.api.ts`
  accordingly, plus the other venue readers:
  `components/content/BracketEditor.tsx`, `BracketView.tsx`,
  `pages/dashboard/MatchDetail.tsx`, `Matches.tsx`, and the public pages
  (`pages/public/TournamentDetail.tsx`, `Home.tsx`,
  `pages/public/match/MatchHeroCard.tsx`).

### 4. Tests

- Migration backfill: distinct strings collapse to the right venue rows, and no
  match loses its venue.
- Rejecting a `venueId` from a different tournament.
- Rejecting deletion of a venue that has matches.
- Per-venue match numbering still behaves as `V161` intended, now keyed on
  `venue_id`.

## Constraints

- Do not drop `matches.venue` in this change.
- Do not add the `match_code` unique index in this change.
- Do not run any migration against staging or production. Local only.
- Match the existing code's naming, comment density and structure.
