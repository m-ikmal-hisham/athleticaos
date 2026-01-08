#!/usr/bin/env bash

# Configuration
BASE_URL="http://localhost:8080/api/v1"
ADMIN_EMAIL="admin@athleticaos.com"
ADMIN_PASSWORD="password123"

# 1. Login
echo "Logging in..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "Login failed"
    exit 1
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"
echo "Logged in."

# 2. Get/Create Organisation
echo "Getting Organisation..."
ORG_ID=$(curl -s -X POST "$BASE_URL/organisations" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Org For Matches","orgType":"CLUB","primaryColor":"#FF0000","secondaryColor":"#00FF00"}' | jq -r '.id')

# 3. Get/Create Teams
echo "Creating Teams..."
TEAM_ID_1=$(curl -s -X POST "$BASE_URL/teams" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organisationId\": \"$ORG_ID\", \"name\": \"Lions\", \"category\": \"Senior\", \"ageGroup\": \"Open\"}" | jq -r '.id')

TEAM_ID_2=$(curl -s -X POST "$BASE_URL/teams" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organisationId\": \"$ORG_ID\", \"name\": \"Tigers\", \"category\": \"Senior\", \"ageGroup\": \"Open\"}" | jq -r '.id')

# 4. Get/Create Tournament
echo "Creating Tournament..."
TOURNAMENT_ID=$(curl -s -X POST "$BASE_URL/tournaments" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"organiserOrgId\": \"$ORG_ID\", \"name\": \"Winter Cup\", \"level\": \"Regional\", \"startDate\": \"2025-12-01\", \"endDate\": \"2025-12-31\", \"venue\": \"City Stadium\"}" | jq -r '.id')

# 5. Create Matches
echo "Creating Matches..."

# Match 1: ONGOING
MATCH_ID_1=$(curl -s -X POST "$BASE_URL/matches" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"tournamentId\":\"$TOURNAMENT_ID\",\"homeTeamId\":\"$TEAM_ID_1\",\"awayTeamId\":\"$TEAM_ID_2\",\"matchDate\":\"2025-12-10\",\"kickOffTime\":\"14:00\",\"venue\":\"Field A\",\"phase\":\"Group\",\"matchCode\":\"M-ONGOING\"}" | jq -r '.id')

# Match 2: COMPLETED
MATCH_ID_2=$(curl -s -X POST "$BASE_URL/matches" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"tournamentId\":\"$TOURNAMENT_ID\",\"homeTeamId\":\"$TEAM_ID_2\",\"awayTeamId\":\"$TEAM_ID_1\",\"matchDate\":\"2025-12-11\",\"kickOffTime\":\"16:00\",\"venue\":\"Field B\",\"phase\":\"Group\",\"matchCode\":\"M-COMPLETED\"}" | jq -r '.id')

# Match 3: CANCELLED
MATCH_ID_3=$(curl -s -X POST "$BASE_URL/matches" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"tournamentId\":\"$TOURNAMENT_ID\",\"homeTeamId\":\"$TEAM_ID_1\",\"awayTeamId\":\"$TEAM_ID_2\",\"matchDate\":\"2025-12-12\",\"kickOffTime\":\"10:00\",\"venue\":\"Field C\",\"phase\":\"Group\",\"matchCode\":\"M-CANCELLED\"}" | jq -r '.id')

# 6. Update Statuses
echo "Updating Statuses..."

# Update Match 1 to ONGOING
curl -s -X PUT "$BASE_URL/matches/$MATCH_ID_1" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"matchDate\":\"2025-12-10\",\"kickOffTime\":\"14:00\",\"venue\":\"Field A\",\"status\":\"ONGOING\",\"homeScore\":10,\"awayScore\":5,\"phase\":\"Group\",\"matchCode\":\"M-ONGOING\"}" | jq -r '.status'

# Update Match 2 to COMPLETED
curl -s -X PUT "$BASE_URL/matches/$MATCH_ID_2" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"matchDate\":\"2025-12-11\",\"kickOffTime\":\"16:00\",\"venue\":\"Field B\",\"status\":\"COMPLETED\",\"homeScore\":24,\"awayScore\":12,\"phase\":\"Group\",\"matchCode\":\"M-COMPLETED\"}" | jq -r '.status'

# Update Match 3 to CANCELLED
curl -s -X PUT "$BASE_URL/matches/$MATCH_ID_3" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"matchDate\":\"2025-12-12\",\"kickOffTime\":\"10:00\",\"venue\":\"Field C\",\"status\":\"CANCELLED\",\"homeScore\":0,\"awayScore\":0,\"phase\":\"Group\",\"matchCode\":\"M-CANCELLED\"}" | jq -r '.status'

echo "Done. Created 3 matches with different statuses."
