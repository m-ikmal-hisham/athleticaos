#!/bin/bash
export PGPASSWORD=postgres

echo "=== Step 1: Fetch Dynamic Official Roles ==="
curl -s http://localhost:8080/api/public/official-roles | python3 -m json.tool

TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@athleticaos.com", "password":"password123"}' | grep -o 'token":"[^"]*' | cut -d'"' -f3)
if [ -z "$TOKEN" ]; then echo "Failed to get token!"; exit 1; fi

PERSON_ID=$(psql -U postgres -h localhost -p 5432 -d athleticaos -t -c "SELECT id FROM persons LIMIT 1;" | xargs)
MATCH_ID=$(psql -U postgres -h localhost -p 5432 -d athleticaos -t -c "SELECT id FROM matches WHERE deleted = false LIMIT 1;" | xargs)
TOURNAMENT_ID=$(psql -U postgres -h localhost -p 5432 -d athleticaos -t -c "SELECT tournament_id FROM matches WHERE id = '$MATCH_ID' LIMIT 1;" | xargs)

echo -e "\nPerson ID: $PERSON_ID"
echo "Match ID: $MATCH_ID"
echo "Tournament ID: $TOURNAMENT_ID"

echo -e "\n=== Step 2: Register an Official (Person-based) ==="
RES2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8080/api/v1/officials/register" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"personId\": \"${PERSON_ID}\", \"accreditationLevel\": \"WORLD_RUGBY_L2\", \"primaryRole\": \"REFEREE\", \"badgeNumber\": \"WR-2026-001\"}")
echo "$RES2"

OFFICIAL_ID=$(echo $RES2 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Official ID: $OFFICIAL_ID"

echo -e "\n=== Step 3: List All Officials ==="
curl -s "http://localhost:8080/api/v1/officials" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo -e "\n=== Step 4: Assign Official to Match ==="
RES4=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8080/api/v1/officials/assignments/${MATCH_ID}" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"officialId\": \"${OFFICIAL_ID}\", \"officialRoleId\": 1}")
echo "$RES4"

ASSIGNMENT_ID=$(echo $RES4 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo -e "\n=== Step 5: List Officials for Match ==="
curl -s "http://localhost:8080/api/v1/officials/assignments/${MATCH_ID}" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo -e "\n=== Step 6: Add Official to Tournament Panel ==="
RES6=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8080/api/v1/officials/tournaments/${TOURNAMENT_ID}" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"officialId\": \"${OFFICIAL_ID}\", \"officialRoleId\": 1}")
echo "$RES6"

echo -e "\n=== Step 7: List Tournament Official Panel ==="
curl -s "http://localhost:8080/api/v1/officials/tournaments/${TOURNAMENT_ID}" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

