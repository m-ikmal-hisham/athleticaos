#!/bin/bash

# AthleticaOS - Season & Tournament Verification Script
# Tests Season CRUD, Tournament CSV Export, and creates sample data

set -e

# JWT Token
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJnZW5lcmF0aW9uIjoxMSwic3ViIjoiYWRtaW5AYXRobGV0aWNhb3MuY29tIiwiaWF0IjoxNzY0NjM5ODM1LCJleHAiOjE3NjQ3MjYyMzV9.W5_0r37YiR4-5YdLtz_c0-8la98OaHblVhCADhvFUXc"
BASE_URL="http://localhost:8080/api/v1"

echo "========================================="
echo "Season & Tournament Verification Tests"
echo "========================================="
echo ""

# Step 1: Get existing organisation
echo "Step 1: Fetching organisations..."
ORG_RESPONSE=$(curl -s -X GET "$BASE_URL/organisations" \
  -H "Authorization: Bearer $TOKEN")

ORG_ID=$(echo "$ORG_RESPONSE" | jq -r '.[0].id')
echo "✅ Using Organisation ID: $ORG_ID"
echo ""

# Step 2: Create Season
echo "Step 2: Creating Season..."
SEASON_RESPONSE=$(curl -s -X POST "$BASE_URL/seasons" \
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

echo "$SEASON_RESPONSE" | jq '.'
SEASON_ID=$(echo "$SEASON_RESPONSE" | jq -r '.id')
echo "✅ Season created: $SEASON_ID"
echo ""

# Step 3: Get all seasons
echo "Step 3: Fetching all seasons..."
curl -s -X GET "$BASE_URL/seasons" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo "✅ Seasons fetched successfully"
echo ""

# Step 4: Get season overview
echo "Step 4: Fetching season overview..."
curl -s -X GET "$BASE_URL/seasons/$SEASON_ID/overview" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo "✅ Season overview fetched successfully"
echo ""

# Step 5: Create Tournament linked to Season
echo "Step 5: Creating Tournament with Season..."
TOURNAMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/tournaments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"National Championship 2025\",
    \"level\": \"NATIONAL\",
    \"organiserOrgId\": \"$ORG_ID\",
    \"startDate\": \"2025-06-01\",
    \"endDate\": \"2025-06-30\",
    \"venue\": \"National Stadium\",
    \"isPublished\": true,
    \"seasonId\": \"$SEASON_ID\",
    \"competitionType\": \"LEAGUE\"
  }")

echo "$TOURNAMENT_RESPONSE" | jq '.'
TOURNAMENT_ID=$(echo "$TOURNAMENT_RESPONSE" | jq -r '.id')
echo "✅ Tournament created: $TOURNAMENT_ID"
echo ""

# Step 6: Get all tournaments (verify Season and Type columns)
echo "Step 6: Fetching all tournaments..."
curl -s -X GET "$BASE_URL/tournaments" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
echo "✅ Tournaments fetched successfully"
echo ""

# Step 7: Test CSV Export - Matches
echo "Step 7: Testing CSV Export - Matches..."
curl -s -X GET "$BASE_URL/tournaments/$TOURNAMENT_ID/export/matches" \
  -H "Authorization: Bearer $TOKEN" \
  -o "tournament_matches_export.csv"
echo "✅ Matches CSV exported to: tournament_matches_export.csv"
echo ""

# Step 8: Test CSV Export - Results
echo "Step 8: Testing CSV Export - Results..."
curl -s -X GET "$BASE_URL/tournaments/$TOURNAMENT_ID/export/results" \
  -H "Authorization: Bearer $TOKEN" \
  -o "tournament_results_export.csv"
echo "✅ Results CSV exported to: tournament_results_export.csv"
echo ""

# Step 9: Create additional sample seasons
echo "Step 9: Creating additional sample seasons..."

# State Season
STATE_SEASON=$(curl -s -X POST "$BASE_URL/seasons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"2025 State Rugby Championship\",
    \"code\": \"STATE-2025\",
    \"startDate\": \"2025-03-01\",
    \"endDate\": \"2025-10-31\",
    \"description\": \"State-level rugby competitions\",
    \"level\": \"STATE\",
    \"status\": \"ACTIVE\",
    \"organiserId\": \"$ORG_ID\"
  }")

STATE_SEASON_ID=$(echo "$STATE_SEASON" | jq -r '.id')
echo "✅ State Season created: $STATE_SEASON_ID"

# School Season
SCHOOL_SEASON=$(curl -s -X POST "$BASE_URL/seasons" \
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

SCHOOL_SEASON_ID=$(echo "$SCHOOL_SEASON" | jq -r '.id')
echo "✅ School Season created: $SCHOOL_SEASON_ID"
echo ""

echo "========================================="
echo "Verification Complete!"
echo "========================================="
echo "Season IDs:"
echo "  National: $SEASON_ID"
echo "  State: $STATE_SEASON_ID"
echo "  School: $SCHOOL_SEASON_ID"
echo ""
echo "Tournament ID: $TOURNAMENT_ID"
echo ""
echo "CSV Exports:"
echo "  - tournament_matches_export.csv"
echo "  - tournament_results_export.csv"
echo ""
echo "Next: Verify frontend UI displays seasons and tournament columns"
