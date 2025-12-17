-- Link all STATE level organisations to Malaysia Rugby (Country)
UPDATE organisations 
SET parent_org_id = (SELECT id FROM organisations WHERE name = 'Malaysia Rugby' AND org_level = 'COUNTRY')
WHERE org_level = 'STATE' 
AND parent_org_id IS NULL;

-- Link Mukah Division to Sarawak
UPDATE organisations
SET parent_org_id = (SELECT id FROM organisations WHERE name = 'Kesatuan Ragbi Negeri Sarawak')
WHERE name = 'Persatuan Ragbi Bahagian Mukah';
