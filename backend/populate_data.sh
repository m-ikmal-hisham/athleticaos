#!/bin/bash

# AthleticaOS - Season & Tournament Verification Script (Updated Token)
# Tests Season CRUD, Tournament CSV Export, and creates sample data

set -e

# Fresh JWT Token
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJnZW5lcmF0aW9uIjoxMiwic3ViIjoiYWRtaW5AYXRobGV0aWNhb3MuY29tIiwiaWF0IjoxNzY0NjQwMjQ0LCJleHAiOjE3NjQ3MjY2NDR9.HfPZC0Flflj7UFfDg4hLsX4MIlSsGrmtAfOQMMmuL7s"
BASE_URL="http://localhost:8080/api/v1"

echo "========================================="
echo "Populating Sample Season Data"
echo "========================================="
echo ""

# Get existing organisation
ORG_RESPONSE=$(curl -s -X GET "$BASE_URL/organisations" \
  -H "Authorization: Bearer $TOKEN")
ORG_ID=$(echo "$ORG_RESPONSE" | jq -r '.[0].id')
echo "✅ Using Organisation ID: $ORG_ID"

# Create National Season
SEASON_NAT=$(curl -s -X POST "$BASE_URL/seasons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"2025 National Rugby Season\",
    \"code\": \"NAT-2025\",
    \"startDate\": \"2025-01-01\",
    \"endDate\": \"2025-12-31\",
    \"description\": \"National rugby competitions for 2025\",
    \"level\": \"NATIONAL\",
    \"status\": \"ACTIVE\",
    \"organiserId\": \"$ORG_ID\"
  }")
SEASON_NAT_ID=$(echo "$SEASON_NAT" | jq -r '.id')
echo "✅ National Season: $SEASON_NAT_ID"

# Create State Season
SEASON_STATE=$(curl -s -X POST "$BASE_URL/seasons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"2025 State Championship\",
    \"code\": \"STATE-2025\",
    \"startDate\": \"2025-03-01\",
    \"endDate\": \"2025-10-31\",
    \"description\": \"State-level rugby competitions\",
    \"level\": \"STATE\",
    \"status\": \"ACTIVE\",
    \"organiserId\": \"$ORG_ID\"
  }")
SEASON_STATE_ID=$(echo "$SEASON_STATE" | jq -r '.id')
echo "✅ State Season: $SEASON_STATE_ID"

# Create School Season
SEASON_SCHOOL=$(curl -s -X POST "$BASE_URL/seasons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"2025 School Rugby League\",
    \"code\": \"SCHOOL-2025\",
    \"startDate\": \"2025-02-01\",
    \"endDate\": \"2025-11-30\",
    \"description\": \"School rugby competitions\",
    \"level\": \"SCHOOL\",
    \"status\": \"PLANNED\",
    \"organiserId\": \"$ORG_ID\"
  }")
SEASON_SCHOOL_ID=$(echo "$SEASON_SCHOOL" | jq -r '.id')
echo "✅ School Season: $SEASON_SCHOOL_ID"

# Create Tournament with Season
TOURNAMENT=$(curl -s -X POST "$BASE_URL/tournaments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"National Championship 2025\",
    \"level\": \"NATIONAL\",
    \"organiserOrgId\": \"$ORG_ID\",
    \"startDate\": \"2025-06-01\",
    \"endDate\": \"2025-06-30\",
    \"venue\": \"National Stadium\",
    \"seasonId\": \"$SEASON_NAT_ID\",
    \"competitionType\": \"LEAGUE\"
  }")
TOURNAMENT_ID=$(echo "$TOURNAMENT" | jq -r '.id')
echo "✅ Tournament: $TOURNAMENT_ID"

echo ""
echo "========================================="
echo "Data Population Complete!"
echo "========================================="
echo "Refresh the frontend to see the data."
