#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api"
MATCH_ID="<REPLACE_WITH_MATCH_ID>"
TEAM_ID="<REPLACE_WITH_TEAM_ID>"
TOKEN="<REPLACE_WITH_AUTH_TOKEN>"

echo "Verifying Scoring Logic Fix..."

# 1. Add a TRY (5 points)
echo "Adding TRY event..."
curl -X POST "$API_URL/matches/$MATCH_ID/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "'"$MATCH_ID"'",
    "teamId": "'"$TEAM_ID"'",
    "eventType": "TRY",
    "minute": 10
  }'

# 2. Add a CONVERSION (2 points)
echo -e "\nAdding CONVERSION event..."
curl -X POST "$API_URL/matches/$MATCH_ID/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "'"$MATCH_ID"'",
    "teamId": "'"$TEAM_ID"'",
    "eventType": "CONVERSION",
    "minute": 11
  }'

# 3. Check Match Details (Should have 7 points for that team)
echo -e "\nChecking Match Score..."
curl -X GET "$API_URL/public/matches/$MATCH_ID" \
  -H "Content-Type: application/json"

echo -e "\n\nVerify that the score reflects 7 points (5 + 2)."
