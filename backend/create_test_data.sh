#!/bin/bash

# AthleticaOS Rugby - Test Data Creation Script
# This script creates all necessary test data for bracket testing

set -e

# JWT Token from authentication
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBhdGhsZXRpY2Fvcy5jb20iLCJpYXQiOjE3NjQzMzQyNDQsImV4cCI6MTc2NDQyMDY0NH0.DCXOVcFxPBGWp3moXcP2_x9uNN7fq0MKN8f4ot2-6sk"
BASE_URL="http://localhost:8080/api/v1"

echo "========================================="
echo "Creating Test Data for Bracket Testing"
echo "========================================="
echo ""

# Step 1: Create Organization
echo "Step 1: Creating Organization..."
ORG_RESPONSE=$(curl -s -X POST "$BASE_URL/organisations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Rugby Club",
    "orgType": "CLUB",
    "primaryColor": "#FF0000",
    "secondaryColor": "#0000FF"
  }')

echo "$ORG_RESPONSE" | jq '.'
ORG_ID=$(echo "$ORG_RESPONSE" | jq -r '.id')
echo "✅ Organization created: $ORG_ID"
echo ""

# Step 2: Create 8 Teams
echo "Step 2: Creating 8 Teams..."
TEAMS=("Alpha" "Bravo" "Charlie" "Delta" "Echo" "Foxtrot" "Golf" "Hotel")
TEAM_IDS=()

for TEAM_NAME in "${TEAMS[@]}"; do
  echo "Creating Team $TEAM_NAME..."
  TEAM_RESPONSE=$(curl -s -X POST "$BASE_URL/teams" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"organisationId\": \"$ORG_ID\",
      \"name\": \"Team $TEAM_NAME\",
      \"category\": \"MENS\",
      \"ageGroup\": \"U19\"
    }")
  
  TEAM_ID=$(echo "$TEAM_RESPONSE" | jq -r '.id')
  TEAM_IDS+=("$TEAM_ID")
  echo "  ✅ Team $TEAM_NAME: $TEAM_ID"
done
echo ""

# Step 3: Create Tournament
echo "Step 3: Creating Tournament..."
TOURNAMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/tournaments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Mixed Format Tournament\",
    \"level\": \"NATIONAL\",
    \"organiserOrgId\": \"$ORG_ID\",
    \"startDate\": \"2025-12-01\",
    \"endDate\": \"2025-12-07\",
    \"venue\": \"National Stadium\",
    \"isPublished\": true
  }")

echo "$TOURNAMENT_RESPONSE" | jq '.'
TOURNAMENT_ID=$(echo "$TOURNAMENT_RESPONSE" | jq -r '.id')
echo "✅ Tournament created: $TOURNAMENT_ID"
echo ""

# Save IDs to file
echo "Saving IDs to test_data_ids.txt..."
cat > test_data_ids.txt <<EOF
ORG_ID=$ORG_ID
TOURNAMENT_ID=$TOURNAMENT_ID
TEAM_ALPHA_ID=${TEAM_IDS[0]}
TEAM_BRAVO_ID=${TEAM_IDS[1]}
TEAM_CHARLIE_ID=${TEAM_IDS[2]}
TEAM_DELTA_ID=${TEAM_IDS[3]}
TEAM_ECHO_ID=${TEAM_IDS[4]}
TEAM_FOXTROT_ID=${TEAM_IDS[5]}
TEAM_GOLF_ID=${TEAM_IDS[6]}
TEAM_HOTEL_ID=${TEAM_IDS[7]}
EOF

echo "✅ IDs saved to test_data_ids.txt"
echo ""

echo "========================================="
echo "Test Data Creation Complete!"
echo "========================================="
echo "Organization ID: $ORG_ID"
echo "Tournament ID: $TOURNAMENT_ID"
echo "Team IDs:"
for i in "${!TEAMS[@]}"; do
  echo "  ${TEAMS[$i]}: ${TEAM_IDS[$i]}"
done
echo ""
echo "Next step: Generate mixed format bracket"
