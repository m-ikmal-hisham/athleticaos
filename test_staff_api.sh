#!/bin/bash
export PGPASSWORD=postgres
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@athleticaos.com", "password":"password123"}' | grep -o 'token":"[^"]*' | cut -d'"' -f3)
if [ -z "$TOKEN" ]; then echo "Failed to get token!"; exit 1; fi

TEAM_ID=$(psql -U postgres -h localhost -p 5432 -d athleticaos -t -c "SELECT team_id FROM tournament_teams LIMIT 1;" | xargs)
TOURNAMENT_ID=$(psql -U postgres -h localhost -p 5432 -d athleticaos -t -c "SELECT tournament_id FROM tournament_teams WHERE team_id = '$TEAM_ID' LIMIT 1;" | xargs)
PERSON_ID=$(psql -U postgres -h localhost -p 5432 -d athleticaos -t -c "SELECT id FROM persons LIMIT 1;" | xargs)

echo "--- Step 2: Add Staff to Team ---"
RES2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8080/api/v1/teams/${TEAM_ID}/staff" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"personId\": \"${PERSON_ID}\", \"staffRoleId\": 1}")
echo "$RES2"

STAFF_ASSIGNMENT_ID=$(echo $RES2 | grep -o 'id":"[^"]*' | head -1 | cut -d'"' -f3)

echo -e "\n--- Step 3: List Team Staff ---"
curl -s "http://localhost:8080/api/v1/teams/${TEAM_ID}/staff" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n--- Step 4: Remove Staff from Team ---"
if [ ! -z "$STAFF_ASSIGNMENT_ID" ]; then
  curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "http://localhost:8080/api/v1/teams/${TEAM_ID}/staff/${STAFF_ASSIGNMENT_ID}" \
       -H "Authorization: Bearer $TOKEN"
fi

echo -e "\n\n--- Step 5: Add Staff to Tournament Roster ---"
RES5=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "http://localhost:8080/api/v1/tournaments/${TOURNAMENT_ID}/roster/${TEAM_ID}/staff" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"teamId\": \"${TEAM_ID}\", \"personId\": \"${PERSON_ID}\", \"staffRoleId\": 1}")
echo "$RES5"

echo -e "\n--- Step 6: List Tournament Staff ---"
curl -s "http://localhost:8080/api/v1/tournaments/${TOURNAMENT_ID}/roster/${TEAM_ID}/staff" -H "Authorization: Bearer $TOKEN"
