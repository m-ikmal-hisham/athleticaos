#!/usr/bin/env bash

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
BASE_URL="http://localhost:8080/api/v1"
ADMIN_EMAIL="admin@athleticaos.com"
ADMIN_PASSWORD="password123"

# Helper function for authenticated requests
auth_header() {
  echo "-H 'Authorization: Bearer $TOKEN'"
}

echo "------------------------------------------------------------"
echo "1. Login to obtain JWT token"
echo "------------------------------------------------------------"
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to login. Exiting."
  exit 1
fi

echo "Obtained JWT token"
AUTH_HEADER="Authorization: Bearer $TOKEN"

echo "------------------------------------------------------------"
echo "2. Setup Data (Org, Teams, Tournament, Player, Match, Event)"
echo "------------------------------------------------------------"

# Create Org
ORG_ID=$(curl -s -X POST "$BASE_URL/organisations" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Stats Test Org","orgType":"CLUB","primaryColor":"#FF0000","secondaryColor":"#00FF00","logoUrl":"http://example.com/logo.png"}' | jq -r '.id')
echo "Created Organisation ID: $ORG_ID"

# Create Teams
TEAM_ID_1=$(curl -s -X POST "$BASE_URL/teams" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organisationId\": \"$ORG_ID\", \"name\": \"Stats Team A\", \"category\": \"Senior\", \"ageGroup\": \"Open\"}" | jq -r '.id')
echo "Created Team 1 ID: $TEAM_ID_1"

TEAM_ID_2=$(curl -s -X POST "$BASE_URL/teams" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organisationId\": \"$ORG_ID\", \"name\": \"Stats Team B\", \"category\": \"Senior\", \"ageGroup\": \"Open\"}" | jq -r '.id')
echo "Created Team 2 ID: $TEAM_ID_2"

# Create Tournament
TOURNAMENT_ID=$(curl -s -X POST "$BASE_URL/tournaments" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organiserOrgId\": \"$ORG_ID\", \"name\": \"Stats Tournament\", \"level\": \"National\", \"startDate\": \"2025-12-01\", \"endDate\": \"2025-12-10\", \"venue\": \"Stats Arena\"}" | jq -r '.id')
echo "Created Tournament ID: $TOURNAMENT_ID"

# Create Player
TIMESTAMP=$(date +%s)
PLAYER_RESP=$(curl -s -X POST "$BASE_URL/users" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Stats","lastName":"Player","email":"stats.player.'$TIMESTAMP'@example.com","password":"Pass123!","role":"PLAYER"}')
PLAYER_ID=$(echo "$PLAYER_RESP" | jq -r '.id')
echo "Created Player ID: $PLAYER_ID"

# Create Match
MATCH_RESP=$(curl -s -X POST "$BASE_URL/matches" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"tournamentId\":\"$TOURNAMENT_ID\",\"homeTeamId\":\"$TEAM_ID_1\",\"awayTeamId\":\"$TEAM_ID_2\",\"matchDate\":\"2025-12-05\",\"kickOffTime\":\"15:00\",\"venue\":\"Stats Arena\",\"pitch\":\"1\",\"phase\":\"Group\",\"matchCode\":\"S001\"}")
MATCH_ID=$(echo "$MATCH_RESP" | jq -r '.id')
echo "Created Match ID: $MATCH_ID"

# Create Match Event (Try for Player on Team 1)
EVENT_RESP=$(curl -s -X POST "$BASE_URL/matches/$MATCH_ID/events" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"teamId\": \"$TEAM_ID_1\", \"playerId\": \"$PLAYER_ID\", \"eventType\": \"TRY\", \"minute\": 10}")
echo "Created Match Event (TRY)"

# Update Match Score (Optional, but good for team stats if we implemented score updates via events or manually)
# Assuming score is updated manually for now as per previous implementation or default 0-0
# Let's just rely on events for now as per stats logic

echo "------------------------------------------------------------"
echo "3. Verify Statistics Endpoints"
echo "------------------------------------------------------------"

echo ">>> Tournament Summary"
curl -s "$BASE_URL/stats/tournaments/$TOURNAMENT_ID/summary" -H "$AUTH_HEADER" | jq '.'

echo ">>> Player Stats"
curl -s "$BASE_URL/stats/tournaments/$TOURNAMENT_ID/players" -H "$AUTH_HEADER" | jq '.'

echo ">>> Team Stats"
curl -s "$BASE_URL/stats/tournaments/$TOURNAMENT_ID/teams" -H "$AUTH_HEADER" | jq '.'

echo ">>> Leaderboard"
curl -s "$BASE_URL/stats/tournaments/$TOURNAMENT_ID/leaderboard" -H "$AUTH_HEADER" | jq '.'

echo "------------------------------------------------------------"
echo "Done."
