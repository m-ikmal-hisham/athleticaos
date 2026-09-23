# JRC 2026 venue + category fix — runbook

Tournament `d4d27354-437f-4f8f-aad5-4791aa31cae8` on **staging**.
Script: `tmp/jrc2026_dbeaver.sql` (DBeaver) or `tmp/jrc2026_venue_category_fix.sql` (psql).

Nothing in this runbook deletes, re-teams or re-seeds a match. Only `venue`,
`category_id` and optionally `match_number` are written.

## Before you start

**Use the DBeaver script, not the psql one**, unless you are actually in psql.
The psql version uses `\set` / `:'tid'`, which DBeaver cannot parse.

In DBeaver:

1. Connect to the staging database.
2. Toolbar commit mode: switch **Auto** → **Manual Commit**. This is the whole
   safety mechanism — without it every `UPDATE` lands instantly.
3. Run **one statement at a time** with `Cmd+Enter`. Do not use `Alt+X`
   (Execute script), which would run all ten steps in one go.
4. Stay on the same connection for the whole session.

## Steps

| Step | Type | What it does | Expected |
|---|---|---|---|
| 1 | WRITE | Backup table `matches_venue_backup_20260922` | 326 rows. **Commit.** |
| 2 | WRITE | Build reference table `jrc_ref` from the manual | 326 rows. **Commit.** |
| 3 | READ | Sanity-check reference against live data | `missing_in_db` 0, `code_mismatch` 0 |
| 4 | READ | Venue diff | exactly **48** rows |
| 5 | WRITE | Apply venue fix | `Updated Rows: 48` |
| 6 | READ | Category diff | review 6b before writing |
| 7 | WRITE | Apply category fix | commit or rollback |
| 8 | READ | List the 31 unresolved | decide by hand |
| 9 | WRITE | *Optional* renumber | hold until organiser agrees |
| 10 | — | Cleanup + rollback recipe | keep backup until code ships |

`jrc_ref` is a real table, not `TEMP`, deliberately: a rollback in steps 5, 7
or 9 would otherwise destroy it and you would have to start over.

### Step 3 — do not skip

This is the step that proves the reference table actually lines up with the
live rows before you write anything. `missing_in_db` and `code_mismatch` must
both be 0. The spot-check underneath should show one Friday 08:00 fixture at
each of the three venues.

### Step 5 — what "right" looks like

After the update, the venue census should show only:

```
STADIUM OLAHRAGA          ~... 
STADIUM RAGBI JOHOR A     ~...
STADIUM RAGBI JOHOR B     ~...
```

plus a residue of **31** rows still on old labels — those are the unresolved
ones from step 8, left alone on purpose. If you see any other spelling, roll
back.

### Step 8 — the two kinds of unresolved

- **AMBIGUOUS (10)** — several venues ran a fixture at that date and time, and
  the placeholder names (`Winner 61`, `RANK 9`) did not disambiguate. Resolve
  from the manual by looking at what else is scheduled around it.
- **NO_SLOT (21)** — the manual has *no* fixture at that date and time at all.
  This is a separate discrepancy worth raising with the organiser: either the
  kick-off time in staging is wrong, or the fixture is not in the manual.

### Step 9 — why it is held back

Renumbering rewrites the `Winner 61` / `Lose 73` placeholders shown on bracket
cards, so it is organiser-visible. It also collides with a misprint in the
manual (Venue B - Pitch A, 25 Sept: no. 20 is printed as a second no. 10).

Run 9a and 9b back to back **without committing in between** — the `+10000`
offset is what keeps `uq_matches_tournament_venue_match_number` satisfied
while rows are rewritten. `still_unassigned` must reach 0 before you commit.
Expect to roll back on the first pass.

## If it goes wrong

While `matches_venue_backup_20260922` still exists:

```sql
UPDATE matches m
SET venue = b.venue, match_number = b.match_number, category_id = b.category_id
FROM matches_venue_backup_20260922 b
WHERE m.id = b.id;
```

Keep that table until the code change has shipped and been verified.

## Then, and only then: the code change

Order matters. The data fix comes first so the V163 backfill seeds
`tournament_venues` from three clean venue names instead of eleven.

1. Steps 1-8 committed, step 9 decided.
2. Confirm the venue census shows exactly three venues (plus any deliberate
   `Venue TBC`).
3. Run the Antigravity prompt in `venue-registry-antigravity-prompt.md`.
4. Test the V163 migration against a **local** restore of staging, never
   against staging itself.

Two constraints in that prompt still hold:

- Do not drop `matches.venue` in V163 — keep it one release for rollback
  safety.
- Do not add a `(tournament_id, match_code)` unique index yet. Knockout codes
  omit the age group (`BU-CUPQF-M1` is generated identically for U11, U14 and
  U16), so the index would reject valid fixtures. Fix the code template first;
  that is a separate change.
