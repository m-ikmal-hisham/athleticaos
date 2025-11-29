#!/bin/bash

# Load test data IDs
source test_data_ids.txt

TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBhdGhsZXRpY2Fvcy5jb20iLCJpYXQiOjE3NjQzMzQyNDQsImV4cCI6MTc2NDQyMDY0NH0.DCXOVcFxPBGWp3moXcP2_x9uNN7fq0MKN8f4ot2-6sk"
BASE_URL="http://localhost:8080/api/v1"

echo "========================================="
echo "Step 3: Generate Mixed Format Bracket"
echo "========================================="
echo ""
echo "Tournament ID: $TOURNAMENT_ID"
echo ""

# Generate bracket
BRACKET_RESPONSE=$(curl -s -X POST "$BASE_URL/tournaments/$TOURNAMENT_ID/bracket/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"format\": \"MIXED\",
    \"numberOfPools\": 2,
    \"includePlacementStages\": true,
    \"teamIds\": [
      \"$TEAM_ALPHA_ID\",
      \"$TEAM_BRAVO_ID\",
      \"$TEAM_CHARLIE_ID\",
      \"$TEAM_DELTA_ID\",
      \"$TEAM_ECHO_ID\",
      \"$TEAM_FOXTROT_ID\",
      \"$TEAM_GOLF_ID\",
      \"$TEAM_HOTEL_ID\"
    ]
  }")

echo "Bracket generated!"
echo ""
echo "Stages created:"
echo "$BRACKET_RESPONSE" | jq -r '.stages[] | "\(.stage.name) (\(.stage.stageType)) - \(.matches | length) matches"'
echo ""

# Save bracket to file for inspection
echo "$BRACKET_RESPONSE" | jq '.' > bracket_structure.json
echo "✅ Full bracket structure saved to bracket_structure.json"
echo ""

# Extract and display pool match IDs
echo "Pool A Matches:"
echo "$BRACKET_RESPONSE" | jq -r '.stages[0].matches[] | "\(.id): \(.homeTeamName) vs \(.awayTeamName)"'
echo ""

echo "Pool B Matches:"
echo "$BRACKET_RESPONSE" | jq -r '.stages[1].matches[] | "\(.id): \(.homeTeamName) vs \(.awayTeamName)"'
echo ""

echo "Next step: Complete pool matches"
