-- V157: store "no email" as NULL (DEF-R01).
-- idx_persons_email_unique exempts only NULL, so blank-string emails collide with each other.
-- Only whitespace-only values are changed. Existing emails are NOT lower-cased here: doing so could make
-- two existing case-variant emails collide on the unique index. The application normalises on write from this release.
UPDATE persons
SET email = NULL
WHERE email IS NOT NULL
  AND trim(email) = '';
