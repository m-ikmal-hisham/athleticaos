-- Fix existing tournament players marked as ineligible in open category tournaments
-- Players with eligibility_note = 'Open category' should be eligible

UPDATE tournament_players tp
SET is_eligible = true
WHERE tp.eligibility_note = 'Open category'
  AND tp.is_eligible = false;
