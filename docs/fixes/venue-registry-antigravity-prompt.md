# Antigravity prompt — tournament venue registry

Everything below the line is the prompt. Paste it as-is.

---

## Context

Repo: **AthleticaOS**. Java 17 / Spring Boot backend in `backend/`, React +
TypeScript + Vite frontend in `frontend/`. Flyway migrations in
`backend/src/main/resources/db/migration/`; latest is **V162**, so the new one
is **V163**.

Work on the existing branch **`fix/tournament-venue-registry`**. Do not create
a new branch and do not merge.

## Problem

`matches.venue` is a free-text `VARCHAR(255)` (added in V8) with no validation.
The match forms are plain text inputs, and the venue filter dropdown is built
by taking `DISTINCT` over those strings
(`frontend/src/pages/dashboard/tournament-tabs/TournamentMatches.tsx:133-157`),
so every typo becomes a permanent venue option. Real tournament data ended up
with eleven "venues" where there were three, including fragments like
`Stadium`, `Stadium Ola`, `Stadium Olahr` — each of which also opened its own
match-numbering sequence.

Match numbering is sequential **per venue**, keyed on that same trimmed string
(`V161__match_number_per_venue.sql`):

```sql
UNIQUE (tournament_id, COALESCE(NULLIF(TRIM(venue), ''), ''), match_number)
WHERE deleted = false
```

Match numbers are therefore unique only *within* a venue, never
tournament-wide. This matters for the migration.

## Goal

Venues are declared once, per tournament, up front. A match may only be
assigned a venue from that tournament's declared list. Free-text venue entry
is removed.

## State of the data

The affected tournament has already been cleaned up by hand, so the backfill
will find clean values. Do not write data-repair logic into the migration.

---

## 1. Migration `V163__tournament_venues.sql`

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
CREATE INDEX idx_matches_venue_id ON matches (venue_id);
```

Then, in the same migration:

**1a. Backfill `tournament_venues` from distinct `matches.venue` values**, one
row per `(tournament_id, TRIM(venue))` where venue is non-blank. Order
`display_order` by name.

**1b. Only for tournaments that have NO match with a non-blank venue**, insert
a single row from `tournaments.venue`.

> This condition is important. `tournaments.venue` is a separate, free-text,
> `NOT NULL` column holding the tournament's headline location, and it often
> does **not** match any venue its matches actually use. In real data one
> tournament has `tournaments.venue = 'Stadium Ragbi Johor'` while its matches
> are at `STADIUM OLAHRAGA`, `STADIUM RAGBI JOHOR A` and
> `STADIUM RAGBI JOHOR B`. Inserting it unconditionally would fabricate a
> fourth venue that nothing plays at. Do not do that.

**1c. Backfill `matches.venue_id`** by matching `TRIM(matches.venue)` to
`TRIM(tournament_venues.name)` within the same tournament, case-insensitively.

**1d. Repoint the numbering index at `venue_id`:**

```sql
DROP INDEX IF EXISTS uq_matches_tournament_venue_match_number;
CREATE UNIQUE INDEX uq_matches_tournament_venue_id_match_number
    ON matches (tournament_id,
                COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'::uuid),
                match_number)
    WHERE deleted = false;
```

**1e. Verify before finishing**: every match that had a non-blank venue must
end up with a non-null `venue_id`. If the migration can assert this, do so.

### Migration constraints

- **Do NOT drop `matches.venue`.** Keep it populated as a denormalised label
  for one release so a mid-deploy rollback is safe. A later migration drops it.
- **Do NOT add a unique index on `(tournament_id, match_code)`.** Knockout
  match codes omit the age group — `BU-CUPQF-M1` is generated identically for
  U11, U14 and U16 — so real data legitimately contains repeated codes and the
  index would reject valid fixtures. Fixing the code template is a separate
  change.
- **Do not run any migration against staging or production.** Local only.

---

## 2. Backend

### 2a. New persistence layer

- Entity `TournamentVenue` in `entities/`, mirroring the conventions in
  `entities/TournamentCategory.java` (which is the closest analogue: a
  tournament-scoped lookup table).
- `TournamentVenueRepository` in `repositories/`.
- Service interface + impl in `services/` and `services/impl/`.
- DTOs in `dtos/tournament/`: create, update and response.

### 2b. Endpoints

Under the tournament, following the existing patterns in
`controllers/TournamentController.java`:

```
GET    /api/v1/tournaments/{idOrSlug}/venues
POST   /api/v1/tournaments/{idOrSlug}/venues
PUT    /api/v1/tournaments/{idOrSlug}/venues/{venueId}
DELETE /api/v1/tournaments/{idOrSlug}/venues/{venueId}
```

Use the same authorisation annotations and tournament-scoping as the
neighbouring endpoints in that controller — do not invent a new scheme, and
make sure `tournament_id` is enforced on every read and write so a venue from
one tournament can never be read or modified through another.

Deleting a venue that still has matches assigned must fail with a clear
message rather than orphaning matches.

### 2c. Match create/update

- `dtos/match/MatchCreateRequest.java` and `MatchUpdateRequest.java`: accept
  `venueId` (nullable `UUID`) in place of the free-text `venue`.
- `services/impl/MatchServiceImpl.java:295-302` currently trims the incoming
  string and stores `null` when blank. Replace with: resolve `venueId`,
  **validate it belongs to the match's tournament** and reject otherwise, set
  `venue_id`, and keep `matches.venue` written from the resolved venue's name.
  Preserve the existing "null means leave unchanged, explicit clear means Venue
  TBC" semantics, now expressed through `venueId`.
- `dtos/match/MatchResponse.java:35` currently exposes `venue`. Add `venueId`
  and `venueName`; keep `venue` for one release.

### 2d. Bracket generation — this is the original cause

`services/impl/BracketServiceImpl.java` stamps `tournament.getVenue()` (the
tournament's free-text headline location) onto every generated match at lines
**384, 466, 798, 960, 1278, 1662, 1916**. That is how partially-typed venue
strings got frozen onto batches of matches.

Replace these with the tournament's default venue — the non-deleted
`tournament_venues` row with the lowest `display_order` — assigned as
`venue_id`. Line **1622** uses `match.getVenue()` to copy from another match;
change it to copy `venue_id`.

### 2e. Other venue readers

Update these to work from `venue_id`:

- `utils/VenueUtils.java` — `normalizeVenue` and the cross-venue comparison in
  `formatFeederPlaceholder` should compare venue **IDs**, not trimmed strings.
  Display names come from the venue record.
- `services/impl/FormatServiceImpl.java:445-448` — `nextMatchNumber(tournament,
  venue)` must key on `venue_id`.
- `services/impl/BracketServiceImpl.java:1841-1844` — same helper, same change.
- `services/impl/ProgressionServiceImpl.java`
- `controllers/PublicTournamentController.java`
- `services/impl/TournamentServiceImpl.java` — note lines 161 and 625 read
  `tournaments.venue`, which stays as-is; line 273 sets it. Leave those alone.

### 2f. Renumber endpoint

`POST /api/v1/tournaments/{idOrSlug}/matches/renumber` (declared at
`controllers/TournamentController.java:118`) renumbers matches sequentially per
venue. `dtos/match/MatchRenumberResponse.java` carries
`VenueBreakdown { String venue; int matchCount; }` and
`MatchRenumberChange { UUID matchId; String venue; ... }`.

Change both to carry `venueId` **and** `venueName`, and key the renumbering
itself on `venue_id`.

---

## 3. Frontend

### 3a. Tournament venue management (new)

In `pages/dashboard/tournaments/CreateTournament.tsx`,
`pages/dashboard/tournaments/EditTournament.tsx` and
`components/modals/TournamentModal.tsx`: add a venue list editor — add,
rename, reorder, remove. At least one venue required. `TournamentModal.tsx:28`
currently validates a single required `venue` string; keep that field (it is
the tournament's headline location) and add the list alongside it.

### 3b. Match forms — remove free text

In `components/modals/MatchModal.tsx` (the venue `Input` is at line **573**),
`pages/dashboard/matches/CreateMatch.tsx:189` and
`pages/dashboard/matches/EditMatch.tsx:179`: replace the text `Input` with a
`SearchableSelect` populated from the tournament's venues. No free-text entry.
Keep an explicit "Venue TBC" option meaning `venueId = null`.

### 3c. Venue filter — stop deriving from match data

`pages/dashboard/tournament-tabs/TournamentMatches.tsx:133-157` builds
`venueOptions` from `DISTINCT` match venue strings. Build it from the
tournament's venue list instead. Keep the "Venue TBC" bucket. The renumber
preview at lines 74-81 reads `preview.venueBreakdown[].venue` — update for the
new shape.

### 3d. Everything else reading a match venue

Update these for `venueId` / `venueName`:

```
frontend/src/types/index.ts
frontend/src/api/matches.api.ts
frontend/src/api/public.api.ts
frontend/src/store/matches.store.ts
frontend/src/utils/venue.ts
frontend/src/components/content/BracketEditor.tsx
frontend/src/components/content/BracketView.tsx
frontend/src/components/dashboard/FeaturedTournamentCard.tsx
frontend/src/components/admin/officials/OfficialHistoryModal.tsx
frontend/src/pages/dashboard/MatchDetail.tsx
frontend/src/pages/dashboard/Matches.tsx
frontend/src/pages/dashboard/TournamentDetail.tsx
frontend/src/pages/dashboard/Tournaments.tsx
frontend/src/pages/public/Home.tsx
frontend/src/pages/public/TournamentDetail.tsx
frontend/src/pages/public/TournamentsList.tsx
frontend/src/pages/public/match/MatchHeroCard.tsx
```

In `utils/venue.ts`, `hasMultipleVenues`, `formatMatchVenueLabel` and
`formatFeederPlaceholder` must key off `venueId`, taking display names from the
tournament venue list.

---

## 4. Tests

- Migration backfill: distinct venue strings collapse to the right venue rows;
  no match that had a venue loses it; a tournament whose matches have venues
  does **not** get an extra row from `tournaments.venue`.
- A `venueId` from a different tournament is rejected on match create and
  update.
- Deleting a venue that still has matches is rejected.
- Per-venue match numbering still behaves as V161 intended, now keyed on
  `venue_id`, including the "Venue TBC" (null) bucket sharing one sequence.
- `formatFeederPlaceholder` annotates a cross-venue feeder and does not
  annotate a same-venue one, now comparing IDs.

---

## 5. Out of scope — do not touch

- `matches.pitch` — a separate existing column. Some tournaments encode the
  pitch inside the venue name instead (e.g. `STADIUM OLAHRAGA VENUE B - PITCH
  A`). Unifying the two is a later design decision.
- `tournaments.venue` — stays as the tournament's headline location.
- The match-code template that omits the age group.
- Any data repair; the affected tournament is already clean.
