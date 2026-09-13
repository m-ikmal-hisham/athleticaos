-- OBS-05B identity review worklist, for the reviewing administrator.
-- READ ONLY. Selects NO identification value, hash, date of birth or gender value.
-- The output still contains names and internal ids (personal data). Write it ONLY to a private file:
--   psql "<connection>" -X -q -A -F ',' -P footer=off \
--        -f backend/scripts/obs05b_identity_review_worklist.sql -o ~/obs05b_worklist.csv
--   chmod 600 ~/obs05b_worklist.csv
-- Never paste the output into chat, tickets, GitHub issues, commits or logs. Delete the file when the review is done.
-- Relies on persons.ic_or_passport plaintext: valid only BEFORE the hash-only cutover.
-- IC_BIRTHPLACE_UNASSIGNED is a heuristic ("suspect"), not proof: confirm against the official JPN code list.
BEGIN TRANSACTION READ ONLY;

WITH p AS (
    SELECT
        pe.id                                                                AS person_id,
        pl.id                                                                AS player_id,
        pe.first_name,
        pe.last_name,
        upper(coalesce(trim(pe.identification_type), ''))                    AS id_type,
        regexp_replace(upper(trim(pe.ic_or_passport)), '[^A-Z0-9]', '', 'g') AS norm,
        pe.dob,
        pe.gender                                                            AS g_raw,
        upper(coalesce(trim(pe.gender), ''))                                 AS g
    FROM persons pe
    LEFT JOIN players pl ON pl.person_id = pe.id AND coalesce(pl.deleted, false) = false
),
c AS (
    SELECT p.*,
        id_type NOT IN ('MALAYSIAN_IC', 'PASSPORT', 'OTHER') AS type_not_canonical,
        (norm ~ '^[0-9]{12}$')                                AS twelve_digits
    FROM p
),
ic AS (
    SELECT c.*,
        (id_type = 'MALAYSIAN_IC' OR (type_not_canonical AND twelve_digits)) AS treat_as_ic,
        CASE WHEN twelve_digits THEN substr(norm, 1, 2)::int END AS yy,
        CASE WHEN twelve_digits THEN substr(norm, 3, 2)::int END AS mm,
        CASE WHEN twelve_digits THEN substr(norm, 5, 2)::int END AS dd
    FROM c
),
r AS (
    SELECT ic.*,
        CASE WHEN twelve_digits THEN
            mm BETWEEN 1 AND 12 AND dd >= 1 AND dd <= CASE
                WHEN mm IN (1, 3, 5, 7, 8, 10, 12) THEN 31
                WHEN mm IN (4, 6, 9, 11)           THEN 30
                WHEN mm = 2 AND yy % 4 = 0         THEN 29
                WHEN mm = 2                        THEN 28
                ELSE 0 END
        END AS date_valid
    FROM ic
),
w AS (
    SELECT person_id, player_id, first_name, last_name,
        concat_ws(';',
            CASE WHEN id_type = '' THEN 'TYPE_MISSING' END,
            CASE WHEN id_type <> '' AND type_not_canonical THEN 'TYPE_NONCANONICAL' END,
            CASE WHEN id_type = 'MALAYSIAN_IC' AND NOT twelve_digits THEN 'IC_MALFORMED' END,
            CASE WHEN treat_as_ic AND twelve_digits AND date_valid IS NOT TRUE THEN 'IC_DATE_INVALID' END,
            CASE WHEN treat_as_ic AND twelve_digits AND to_char(dob, 'YYMMDD') <> substr(norm, 1, 6)
                 THEN 'IC_DOB_MISMATCH' END,
            CASE WHEN treat_as_ic AND twelve_digits AND g IN ('MALE', 'FEMALE') THEN
                CASE WHEN ((substr(norm, 12, 1)::int % 2) = 1) <> (g = 'MALE') THEN 'IC_GENDER_MISMATCH' END
            END,
            CASE WHEN treat_as_ic AND norm ~ '^([0-9])\1{11}$' THEN 'IC_REPEATED_DIGITS' END,
            CASE WHEN treat_as_ic AND norm IN ('123456789012', '012345678901') THEN 'IC_SEQUENTIAL' END,
            CASE WHEN treat_as_ic AND twelve_digits
                  AND substr(norm, 7, 2) IN ('00','17','18','19','20','69','70','73','80','81','94','95','96','97')
                 THEN 'IC_BIRTHPLACE_UNASSIGNED' END,
            CASE WHEN g NOT IN ('MALE', 'FEMALE') THEN 'GENDER_NOT_MALE_FEMALE' END,
            CASE WHEN g IN ('MALE', 'FEMALE') AND g_raw <> g THEN 'GENDER_CASE' END
        ) AS reasons
    FROM r
)
SELECT person_id, player_id, first_name, last_name, reasons
FROM w
WHERE reasons <> ''
ORDER BY reasons, last_name, first_name;

ROLLBACK;
