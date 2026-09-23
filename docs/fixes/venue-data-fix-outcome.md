# JRC 2026 venue data fix — outcome

Applied to staging 2026-09-23 against tournament
`d4d27354-437f-4f8f-aad5-4791aa31cae8`, following `venue-runbook.md`.

## Final state

| Venue | Matches | Manual |
|---|---|---|
| STADIUM RAGBI JOHOR A | 116 | 116 |
| STADIUM OLAHRAGA | 113 | 114 |
| STADIUM RAGBI JOHOR B | 97 | 95 |

All readiness checks pass: 3 distinct venues, 0 duplicate `(venue, match_number)`
pairs, 326 matches, none missing a venue, date, time or team slot.

Backup retained as `matches_venue_backup_20260922`. Helper tables `jrc_ref`
and `jrc_fix` retained until the code change ships.

## What was changed

- **317 matches** normalised to the three canonical venue names, replacing
  eleven spellings (seven of them truncations such as `Stadium Ola`).
- **28 matches** renumbered, purely to resolve collisions created by merging
  venue labels. All knockout; no pool match changed number.
- **9 matches** on the unsuffixed `Stadium Ragbi Johor` resolved individually,
  5 of which needed a free number at the destination.
- **Category: nothing changed.** The existing data was already correct.

## Two corrections made during the work

**Step 5 as first written was wrong.** It updated only the 48 incorrect venues.
That fails twice over: merging labels collides on V161's
`(tournament_id, TRIM(venue), match_number)` index, because numbers here are
unique only within a venue; and leaving the other 247 on mixed-case labels
would have split each venue into two dropdown entries and two numbering
sequences. All 326 had to normalise in one transaction.

**Step 7 would have corrupted four brackets.** The category diff showed 4
mismatches, all from the `MANUAL` signal, which derives category from kick-off
time. Because staging's schedule drifts from the manual, those were artifacts:
applying them would have left the U16 Cup QF bracket with one match and given
`BU-SPQF-M3` two U16 entries and no U14. Caught by the read-only pre-check.

The general lesson: a signal derived from a field that is itself wrong will
look confident and be wrong. Read-only verification in front of every write is
what caught both.

## Outstanding — organiser decisions, not schema

1. **9 Sunday matches scheduled after the tournament's close.** The manual
   (p.5) gives Day 3 as 08:00-16:39. These run 20:00-23:54, four of them after
   23:00, including two Cup semi-finals.
2. **3 play-off fixtures absent from the manual**: `BU-CUPPO-M1`,
   `GU-CUPPO-M1`, `GU-BWLPO-M1`, all Sunday 12:00. The manual's prize table
   awards "KE 3 BERSAMA CUP" (joint third), so the two Cup play-offs arguably
   should not exist.
3. **~21 matches whose date and time match no manual fixture**, including the
   U14 Cup QF set scheduled on Sunday when the manual puts all Cup QFs on
   Saturday. Detail in `tmp/scheduling_discrepancies.csv`.
4. **Venue totals differ from the manual** by -1 at Olahraga and +2 at Pitch B,
   consistent with items 2 and 3.

None of these block the code change.

## Note on the stale API read

After the final commit the public API briefly returned the previous state.
The backend has no caching (`open-in-view: false`, no second-level or query
cache, default Hikari, READ_COMMITTED), and the app and DBeaver were confirmed
to be on the same database host. A restart cleared it. Most likely a timing
artifact around the commit rather than a cache bug — but if an ordinary admin
edit ever shows a stale read, this is worth revisiting.

## Next

The venue list is clean, so V163's backfill will seed `tournament_venues` from
three names. Proceed with `venue-registry-antigravity-prompt.md`, keeping its
two constraints: do not drop `matches.venue` in V163, and do not add the
`(tournament_id, match_code)` unique index until the match-code template
includes the age group.
