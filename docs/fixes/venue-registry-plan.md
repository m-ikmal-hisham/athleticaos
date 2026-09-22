# Venue registry — findings and plan

> **Superseded in part.** An earlier revision of this document claimed 63
> redundant matches from repeated bracket generation. That was wrong. The
> tournament manual shows those are distinct age-group fixtures colliding on a
> match code that omits the age group. See "Correction" below.

Branch: `fix/tournament-venue-registry`
Investigated: 2026-09-22, against staging tournament
`2026 Johor Rugby Carnival` (`d4d27354-437f-4f8f-aad5-4791aa31cae8`).

## What the dropdown is actually showing

`matches.venue` is a free-text `VARCHAR(255)` (V8). Nothing validates it, and the
venue filter is built by taking `DISTINCT` over those strings
(`TournamentMatches.tsx:133-147`). So every string ever saved becomes a
permanent venue option.

Venue census for the Johor tournament (326 matches, 11 distinct values):

| matches | venue |
|---|---|
| 91 | `Stadium Olahraga` |
| 87 | `Stadium Ragbi Johor A` |
| 84 | `Stadium Ragbi Johor B` |
| 43 | `Stadium Ragbi Johor` |
| 7 | `Stadium Olahra` |
| 4 | `Stadium` |
| 3 | `Stadium Ola` |
| 3 | `Stadium Olahrag` |
| 2 | `Stadium Olahr` |
| 1 | `Stadium Olah` |
| 1 | `Stadium Olahraga A` |

## The typos are a symptom, not the disease

The fragments are not one match saved seven times. They are **seven separate
batches of knockout matches**, each created while the tournament venue string
was part-typed. The bracket generator stamps `tournament.getVenue()` onto every
match it creates (`BracketServiceImpl.java:384, 466, 798, 960, 1278, 1662, 1916`),
so each regeneration froze whatever the field said at that moment.

The real damage:

- **33 match codes exist 2–3 times each → 63 redundant matches** out of 326.
- All of them are in the `BU` category, all knockout. Pool matches (182) are clean.
- The copies are not identical — they are three different seedings of the same
  bracket (`Pool A U3` vs `RANK 17` vs `Lose 201`), so they disagree about who
  plays whom.
- Cross-venue feeder labels are now nonsense, e.g.
  `Lose 328 (Stadium Olahra)` and `Winner 328 (Stadium Ragbi Johor)`.

Nothing stops this: V100 (`update_match_codes_uniqueness`) only *prefixed* match
codes with the tournament slug. It never added a unique constraint, so the
generator can run again and silently duplicate the whole bracket.

**Good news for the cleanup:** all 96 duplicated matches are still `SCHEDULED`
with no scores. Nothing has to be un-played.

## Knock-on effect on match numbering

V161 made match numbers sequential **per venue**, keyed on the trimmed venue
string:

```sql
UNIQUE (tournament_id, COALESCE(NULLIF(TRIM(venue), ''), ''), match_number)
```

So each typo opened its own numbering sequence. `Stadium Olahra` and
`Stadium` both restarted around 328–333. Merging venue strings without
renumbering will collide on this index.

## Answer: yes, this needs a schema change

A dropdown-only fix would not hold — the free-text column is what lets bad
values in, and the numbering index depends on that same string.

### Proposed schema (V163)

```sql
CREATE TABLE tournament_venues (
    id            UUID PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id),
    name          VARCHAR(255) NOT NULL,
    short_name    VARCHAR(50),            -- for narrow bracket cards
    display_order INT NOT NULL DEFAULT 0,
    deleted       BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMP NOT NULL,
    updated_at    TIMESTAMP
);

CREATE UNIQUE INDEX uq_tournament_venue_name
    ON tournament_venues (tournament_id, LOWER(TRIM(name)))
    WHERE deleted = false;

ALTER TABLE matches ADD COLUMN venue_id UUID REFERENCES tournament_venues(id);
```

Then:

1. Backfill `tournament_venues` from existing distinct `matches.venue` values,
   **after** the Johor cleanup below, so the typos are not enshrined as venues.
2. Backfill `matches.venue_id` by exact trimmed name match.
3. Repoint the V161 numbering index at `venue_id`:
   ```sql
   UNIQUE (tournament_id, COALESCE(venue_id, '00000000-0000-0000-0000-000000000000'), match_number)
   ```
4. Keep `matches.venue` for one release as a read-only denormalised label so
   nothing breaks mid-deploy, then drop it in a later migration.
5. Add the guard that was missing all along:
   ```sql
   CREATE UNIQUE INDEX uq_matches_tournament_match_code
       ON matches (tournament_id, match_code) WHERE deleted = false;
   ```
   This cannot be created until the Johor duplicates are removed.

`tournaments.venue` (single, `NOT NULL`) stays as the tournament's headline
location. The new table is the list a match may choose from.

## Order of work

1. Run the diagnostic (`tmp/venue_diagnostic.sql`) — confirm generations.
2. Decide which bracket generation is the correct one (organiser's call).
3. Soft-delete the redundant copies, renumber, normalise venue strings.
4. Ship V163 + the code change.
5. Only then create the `match_code` unique index.


---

# Correction (2026-09-22, after reading the tournament manual)

Source: `TOURNAMENT MANUAL - JRC 2026.pdf`, section 5 (pp. 14-22).

## The "duplicates" are not duplicates

Knockout match codes do not encode age group. `BU-CUPQF-M1` is generated
identically for U11, U14 and U16. Cross-referencing kick-off times against the
manual:

| `BU-CUPF-M1` copy | Manual row | Actually is |
|---|---|---|
| 27 Sep 15:30 | Venue A #111 | U11 Cup Final |
| 27 Sep 16:06 | Venue A #113 | U14 Cup Final |
| 27 Sep 16:24 | Venue A #114 | U16 Cup Final |

The manual schedules **325 matches**; staging holds **326 rows**. The data is
essentially complete, not tripled. Do not dedupe, and do not add a
`(tournament_id, match_code)` unique index until the code template includes the
age group — the index is still the right guard, but the template must be fixed
first or it will reject valid fixtures.

## Authoritative venues

| Manual label | Stadium | Matches |
|---|---|---|
| VENUE A | Stadium Ragbi Johor, Mount Austin | 114 (nos 1-114) |
| VENUE B - PITCH A | Stadium Olahraga, Mount Austin | 116 (nos 1-116) |
| VENUE B - PITCH B | Stadium Olahraga, Mount Austin | 95 (nos 1-95) |

Numbering restarts at 1 per venue — exactly what V161's per-venue index
expects. Current staging numbers run to 343 and do not follow the manual.

## The stadium names are inverted

Matching staging fixtures to manual rows by date, kick-off time and team names
(218 of 326 resolved unambiguously) gives a consistent picture, confirmed by
spot-checking unambiguous pool fixtures:

| Current label | Resolves to | Confidence |
|---|---|---|
| `Stadium Olahraga` (60) | VENUE A | 60/60 clean |
| `Stadium Ragbi Johor A` (60) | VENUE B - PITCH A | 60/60 clean |
| `Stadium Ragbi Johor B` (50) | VENUE B - PITCH B | 49/50 |
| 7 typo fragments (14) | VENUE A | clean |
| `Stadium Ragbi Johor` (43) | splits across all three | **needs human decision** |

The pitch suffix is right; the stadium name is wrong on both. E.g. `ARPG BLACK
vs QRA`, 25 Sep 08:00, is labelled `Stadium Ragbi Johor A` but the manual puts
it at Venue B - Pitch A (Stadium Olahraga).

108 of 326 could not be resolved automatically — 87 where several venues ran
concurrently and team names did not disambiguate, 21 with no manual fixture at
that date and time. These need review with the manual open.

## Manual erratum

Venue B - Pitch A, 25 Sept: the manual prints no. 20 (14:45, MERC vs CYBER
BLITZ) as a second no. 10. Worth confirming with the organiser.

## Revised order of work

1. Section 0-1 of `tmp/jrc2026_venue_fix.sql` — verify the inversion, back up.
2. Section 3 — rename the clean labels. Low risk, reversible.
3. Section 4 — resolve the 43 `Stadium Ragbi Johor` matches by hand.
4. Section 5 — renumber to the manual's per-venue numbering.
5. Only then the V163 schema work, seeded with the three real venues.
6. Separately: fix the match-code template to include age group, then add the
   `(tournament_id, match_code)` unique index.
