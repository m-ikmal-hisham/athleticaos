-- OBS-05B: DOB/gender consistency of stored Malaysian IC holders.
-- READ ONLY. Outputs counts only; never selects identification values, hashes, names or dates.
-- Relies on persons.ic_or_passport plaintext: valid only BEFORE the hash-only cutover.
-- Normalisation mirrors IdentificationUtil.normalize: trim, upper-case, strip non [A-Z0-9].
BEGIN TRANSACTION READ ONLY;

WITH p AS (
    SELECT
        upper(coalesce(trim(identification_type), ''))                    AS id_type,
        regexp_replace(upper(trim(ic_or_passport)), '[^A-Z0-9]', '', 'g')  AS norm,
        dob,
        gender                                                            AS g_raw,
        upper(coalesce(trim(gender), ''))                                 AS g
    FROM persons
),
ic AS (
    SELECT
        g_raw, g,
        (norm ~ '^[0-9]{12}$') AS well_formed,
        CASE WHEN norm ~ '^[0-9]{12}$' AND dob IS NOT NULL
             THEN to_char(dob, 'YYMMDD') <> substr(norm, 1, 6) END AS dob_mismatch,
        CASE WHEN norm ~ '^[0-9]{12}$' AND upper(coalesce(trim(g_raw), '')) IN ('MALE', 'FEMALE')
             THEN ((substr(norm, 12, 1)::int % 2) = 1) <> (upper(trim(g_raw)) = 'MALE') END AS parity_mismatch,
        dob IS NULL AS dob_null
    FROM p
    WHERE id_type = 'MALAYSIAN_IC'
)
SELECT 'ic_holders_total'              AS metric, count(*) AS n FROM ic
UNION ALL SELECT 'ic_malformed_not_12_digits',   count(*) FROM ic WHERE NOT well_formed
UNION ALL SELECT 'ic_dob_null',                  count(*) FROM ic WHERE well_formed AND dob_null
UNION ALL SELECT 'ic_dob_prefix_mismatch',       count(*) FROM ic WHERE dob_mismatch IS TRUE
UNION ALL SELECT 'ic_gender_not_male_female',    count(*) FROM ic WHERE well_formed AND g NOT IN ('MALE', 'FEMALE')
UNION ALL SELECT 'ic_gender_parity_mismatch',    count(*) FROM ic WHERE parity_mismatch IS TRUE
UNION ALL SELECT 'ic_gender_noncanonical_case',  count(*) FROM ic WHERE g IN ('MALE', 'FEMALE') AND g_raw <> g
UNION ALL SELECT 'ic_any_inconsistency',         count(*) FROM ic
          WHERE NOT well_formed OR dob_null OR dob_mismatch IS TRUE
             OR g NOT IN ('MALE', 'FEMALE') OR parity_mismatch IS TRUE
UNION ALL SELECT 'type_PASSPORT',                count(*) FROM p WHERE id_type = 'PASSPORT'
UNION ALL SELECT 'type_OTHER',                   count(*) FROM p WHERE id_type = 'OTHER'
UNION ALL SELECT 'type_null_or_noncanonical',    count(*) FROM p WHERE id_type NOT IN ('MALAYSIAN_IC', 'PASSPORT', 'OTHER')
UNION ALL SELECT 'noncanonical_type_looks_like_ic', count(*) FROM p
          WHERE id_type NOT IN ('MALAYSIAN_IC', 'PASSPORT', 'OTHER') AND norm ~ '^[0-9]{12}$'
UNION ALL SELECT 'all_gender_not_male_female',   count(*) FROM p WHERE g NOT IN ('MALE', 'FEMALE')
UNION ALL SELECT 'all_gender_noncanonical_case', count(*) FROM p WHERE g IN ('MALE', 'FEMALE') AND g_raw <> g;

ROLLBACK;
