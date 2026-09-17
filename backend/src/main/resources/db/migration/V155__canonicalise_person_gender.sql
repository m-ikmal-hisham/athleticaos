-- V155: canonicalise persons.gender casing (OBS-05B / DEF-06C).
-- Deterministic and idempotent: only rows whose trimmed, upper-cased gender is exactly MALE or FEMALE are rewritten.
-- Any other stored value (for example OTHER or blank) is left untouched for manual review by an administrator;
-- the application rejects anything but MALE or FEMALE on write from this release.
-- A CHECK constraint is deliberately deferred until those rows are resolved: even a NOT VALID constraint is
-- enforced on every later UPDATE of an unresolved row, which would make those records uneditable.
UPDATE persons
SET gender = upper(trim(gender))
WHERE upper(trim(gender)) IN ('MALE', 'FEMALE')
  AND gender <> upper(trim(gender));
