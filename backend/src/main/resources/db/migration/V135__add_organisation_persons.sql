-- 1. Person-Organisation direct link
CREATE TABLE organisation_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    person_id UUID NOT NULL REFERENCES persons(id),
    registered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organisation_id, person_id)
);

-- 2. Add organisation_id to official_registry (home org - nullable for existing compatibility)
ALTER TABLE official_registry ADD COLUMN organisation_id UUID REFERENCES organisations(id);

-- 3. Backfill from player_teams safely without breaking staging data
INSERT INTO organisation_persons (organisation_id, person_id)
SELECT DISTINCT t.organisation_id, pl.person_id
FROM player_teams pt
JOIN players pl ON pl.id = pt.player_id
JOIN teams t ON t.id = pt.team_id
WHERE t.organisation_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Backfill from team_staff
INSERT INTO organisation_persons (organisation_id, person_id)
SELECT DISTINCT t.organisation_id, ts.person_id
FROM team_staff ts
JOIN teams t ON t.id = ts.team_id
WHERE t.organisation_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Backfill existing official_registry rows based on player/staff records
UPDATE official_registry o
SET organisation_id = (
    SELECT op.organisation_id 
    FROM organisation_persons op 
    WHERE op.person_id = o.person_id 
    LIMIT 1
)
WHERE o.organisation_id IS NULL;
