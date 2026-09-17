-- CR-01: Diagnostic script to inspect missing email counts across persons.
-- Safe for execution in DBeaver or psql.
-- READ ONLY: Wraps in BEGIN TRANSACTION READ ONLY and always rolls back.
-- Reports aggregated COUNTS only; never outputs names, emails, registration numbers, or other PII.

BEGIN TRANSACTION READ ONLY;

-- Section 1-4: System-wide aggregate metrics
WITH role_counts AS (
    SELECT
        count(DISTINCT p.id) FILTER (WHERE p.email IS NOT NULL AND trim(p.email) <> '') AS with_email,
        count(DISTINCT p.id) FILTER (WHERE p.email IS NULL OR trim(p.email) = '') AS without_email,
        count(DISTINCT p.id) AS total_persons,
        count(DISTINCT p.id) FILTER (
            WHERE (p.email IS NULL OR trim(p.email) = '')
              AND (
                  EXISTS (SELECT 1 FROM players pl WHERE pl.person_id = p.id AND (pl.deleted IS FALSE OR pl.deleted IS NULL) AND pl.status = 'ACTIVE')
               OR EXISTS (SELECT 1 FROM official_registry o WHERE o.person_id = p.id AND o.is_active IS TRUE)
               OR EXISTS (SELECT 1 FROM team_staff ts WHERE ts.person_id = p.id)
              )
        ) AS without_email_with_active_roles
    FROM persons p
)
SELECT 'total_persons' AS metric, total_persons AS count FROM role_counts
UNION ALL
SELECT 'persons_with_email', with_email FROM role_counts
UNION ALL
SELECT 'persons_without_email', without_email FROM role_counts
UNION ALL
SELECT 'persons_without_email_active_roles', without_email_with_active_roles FROM role_counts;

-- Section 5: Breakdown by organisation (Top 20 organisations by missing email count)
SELECT
    o.id AS organisation_id,
    o.name AS organisation_name,
    count(DISTINCT p.id) FILTER (WHERE p.email IS NULL OR trim(p.email) = '') AS missing_email_count,
    count(DISTINCT p.id) AS total_persons_in_org
FROM organisations o
JOIN organisation_persons op ON op.organisation_id = o.id
JOIN persons p ON p.id = op.person_id
GROUP BY o.id, o.name
HAVING count(DISTINCT p.id) FILTER (WHERE p.email IS NULL OR trim(p.email) = '') > 0
ORDER BY missing_email_count DESC, o.name ASC
LIMIT 20;

ROLLBACK;
