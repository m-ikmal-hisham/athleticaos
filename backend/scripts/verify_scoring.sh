#!/bin/bash

# Configuration
# Configuration
API_BASE="http://localhost:8080/api"
API_V1="$API_BASE/v1"
API_PUBLIC="$API_BASE/public"
MATCH_ID="11609b90-5e30-4209-b861-48fa6dd735f4"
TEAM_ID="81035387-c8de-487f-9313-18fdb8692e81"
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJnZW5lcmF0aW9uIjo0NjgsInN1YiI6ImFkbWluQGF0aGxldGljYW9zLmNvbSIsImlhdCI6MTc3MDAwOTM2MSwiZXhwIjoxNzcwMDk1NzYxfQ.xXKmvi8MSE8qNtA6p3B8kGA3k-EC1lnrjCY1BwiAPLk"

echo "Verifying Scoring Logic Fix..."

# 1. Add a TRY (5 points)
echo "Adding TRY event..."
curl -X POST "$API_V1/matches/$MATCH_ID/events" \
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
curl -X POST "$API_V1/matches/$MATCH_ID/events" \
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
curl -X GET "$API_PUBLIC/matches/$MATCH_ID" \
  -H "Content-Type: application/json"

echo -e "\n\nVerify that the score reflects 7 points (5 + 2)."
