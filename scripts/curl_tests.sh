#!/usr/bin/env bash

# ------------------------------------------------------------
# Configuration (replace with actual values)
# ------------------------------------------------------------
# ------------------------------------------------------------
# Configuration (replace with actual values)
# ------------------------------------------------------------
BASE_URL="http://localhost:8080/api/v1"
ADMIN_EMAIL="admin@athleticaos.com"
ADMIN_PASSWORD="password123"

# Helper function for authenticated requests
auth_header() {
  echo "-H 'Authorization: Bearer $TOKEN'"
}

# ------------------------------------------------------------
# 1. Login to obtain JWT token
# ------------------------------------------------------------
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.token')

echo "Obtained JWT token: $TOKEN"

AUTH_HEADER="Authorization: Bearer $TOKEN"

# ------------------------------------------------------------
# 2. Organisations
# ------------------------------------------------------------
ORG_ID=$(curl -s -X POST "$BASE_URL/organisations" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Org","orgType":"CLUB","primaryColor":"#FF0000","secondaryColor":"#00FF00","logoUrl":"http://example.com/logo.png"}' | jq -r '.id')

echo "Created Organisation ID: $ORG_ID"

# ------------------------------------------------------------
# 3. Teams
# ------------------------------------------------------------
TEAM_ID=$(curl -s -X POST "$BASE_URL/teams" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organisationId\": \"$ORG_ID\", \"name\": \"Test Team 1\", \"category\": \"Senior\", \"ageGroup\": \"U20\"}" | jq -r '.id')

echo "Created Team 1 ID: $TEAM_ID"

TEAM_ID_2=$(curl -s -X POST "$BASE_URL/teams" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organisationId\": \"$ORG_ID\", \"name\": \"Test Team 2\", \"category\": \"Senior\", \"ageGroup\": \"U20\"}" | jq -r '.id')

echo "Created Team 2 ID: $TEAM_ID_2"

# ------------------------------------------------------------
# 4. Tournaments
# ------------------------------------------------------------
TOURNAMENT_ID=$(curl -s -X POST "$BASE_URL/tournaments" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organiserOrgId\": \"$ORG_ID\", \"name\": \"Test Tournament\", \"level\": \"National\", \"startDate\": \"2025-12-01\", \"endDate\": \"2025-12-10\", \"venue\": \"Test Stadium\"}" | jq -r '.id')

echo "Created Tournament ID: $TOURNAMENT_ID"

# ------------------------------------------------------------
# 5. Players (User with PLAYER role)
# ------------------------------------------------------------
TIMESTAMP=$(date +%s)
RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john.doe.'$TIMESTAMP'@example.com","password":"Pass123!","role":"PLAYER"}')

echo "Create Player Response: $RESPONSE"
PLAYER_ID=$(echo "$RESPONSE" | jq -r '.id')

echo "Created Player (User) ID: $PLAYER_ID"

# ------------------------------------------------------------
# 6. Matches
# ------------------------------------------------------------
RESPONSE=$(curl -s -X POST "$BASE_URL/matches" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"tournamentId":"'$TOURNAMENT_ID'","homeTeamId":"'$TEAM_ID'","awayTeamId":"'$TEAM_ID_2'","matchDate":"2025-12-05","kickOffTime":"15:00","venue":"Test Stadium","pitch":"Main Pitch","phase":"Group Stage","matchCode":"M001"}')

echo "Create Match Response: $RESPONSE"
MATCH_ID=$(echo "$RESPONSE" | jq -r '.id')

echo "Created Match ID: $MATCH_ID"

# ------------------------------------------------------------
# 7. Match Events
# ------------------------------------------------------------
RESPONSE=$(curl -s -X POST "$BASE_URL/matches/$MATCH_ID/events" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"teamId\": \"$TEAM_ID\", \"playerId\": \"$PLAYER_ID\", \"eventType\": \"TRY\", \"minute\": 23}")

echo "Create Match Event Response: $RESPONSE"
EVENT_ID=$(echo "$RESPONSE" | jq -r '.id')

echo "Created Match Event ID: $EVENT_ID"

# ------------------------------------------------------------
# 8. Verification (GET endpoints)
# ------------------------------------------------------------
curl -s "$BASE_URL/organisations/$ORG_ID" -H "$AUTH_HEADER" | jq '.'
curl -s "$BASE_URL/teams/$TEAM_ID" -H "$AUTH_HEADER" | jq '.'
curl -s "$BASE_URL/tournaments/$TOURNAMENT_ID" -H "$AUTH_HEADER" | jq '.'
curl -s "$BASE_URL/users/$PLAYER_ID" -H "$AUTH_HEADER" | jq '.'
curl -s "$BASE_URL/matches/$MATCH_ID" -H "$AUTH_HEADER" | jq '.'
curl -s "$BASE_URL/matches/$MATCH_ID/events" -H "$AUTH_HEADER" | jq '.'

# ------------------------------------------------------------
# 9. Cleanup (optional)
# ------------------------------------------------------------
# Uncomment to delete created resources
# curl -X DELETE "$BASE_URL/matches/$MATCH_ID" -H "$AUTH_HEADER"
# curl -X DELETE "$BASE_URL/tournaments/$TOURNAMENT_ID" -H "$AUTH_HEADER"
# curl -X DELETE "$BASE_URL/teams/$TEAM_ID" -H "$AUTH_HEADER"
# curl -X DELETE "$BASE_URL/organisations/$ORG_ID" -H "$AUTH_HEADER"
# curl -X DELETE "$BASE_URL/users/$PLAYER_ID" -H "$AUTH_HEADER"
