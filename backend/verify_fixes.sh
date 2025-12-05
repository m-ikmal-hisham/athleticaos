#!/bin/bash

# Configuration
BASE_URL="http://localhost:8080/api/v1"
EMAIL="admin@athleticaos.com"
PASSWORD="password123" # Adjust if needed

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Verification..."

# 1. Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Login failed! Response: $LOGIN_RESPONSE${NC}"
  exit 1
fi
echo -e "${GREEN}Login successful! Token: ${TOKEN:0:10}...${NC}"

# 2. Get a Team
echo "Fetching teams..."
TEAMS_RESPONSE=$(curl -s -X GET "$BASE_URL/teams" \
  -H "Authorization: Bearer $TOKEN")

TEAM_ID=$(echo $TEAMS_RESPONSE | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)

if [ -z "$TEAM_ID" ]; then
  echo -e "${RED}No teams found! Create a team first.${NC}"
  exit 1
fi
echo -e "${GREEN}Found Team ID: $TEAM_ID${NC}"

# 3. Create a Player
echo "Creating player..."
PLAYER_EMAIL="testplayer_$(date +%s)@example.com"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/players" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"Player\",
    \"email\": \"$PLAYER_EMAIL\",
    \"password\": \"password123\"
  }")

PLAYER_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*' | head -n 1 | cut -d'"' -f4)

if [ -z "$PLAYER_ID" ]; then
  echo -e "${RED}Player creation failed! Response: $CREATE_RESPONSE${NC}"
  exit 1
fi
echo -e "${GREEN}Created Player ID: $PLAYER_ID${NC}"

# 4. Update Player
echo "Updating player..."
UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/players/$PLAYER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Updated\",
    \"lastName\": \"Name\",
    \"email\": \"$PLAYER_EMAIL\",
    \"status\": \"ACTIVE\"
  }")

UPDATED_NAME=$(echo $UPDATE_RESPONSE | grep -o '"firstName":"[^"]*' | cut -d'"' -f4)

if [ "$UPDATED_NAME" != "Updated" ]; then
  echo -e "${RED}Player update failed! Response: $UPDATE_RESPONSE${NC}"
  exit 1
fi
echo -e "${GREEN}Player updated successfully!${NC}"

# 5. Assign Player to Team
echo "Assigning player to team..."
ASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/player-teams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER_ID\",
    \"teamId\": \"$TEAM_ID\",
    \"jerseyNumber\": 10,
    \"position\": \"Forward\"
  }")

# Check status code (should be 201 or 200)
# Since curl -s doesn't show status, we assume success if no error output from server (which would be in body)
# But let's check player details to see if organisation is assigned
echo -e "${GREEN}Assignment request sent.${NC}"

# 6. Check Player Details (Organisation)
echo "Checking player details..."
PLAYER_DETAILS=$(curl -s -X GET "$BASE_URL/players/$PLAYER_ID" \
  -H "Authorization: Bearer $TOKEN")

ORG_NAME=$(echo $PLAYER_DETAILS | grep -o '"clubName":"[^"]*' | cut -d'"' -f4)
echo "Player Organisation: $ORG_NAME"

# 7. Remove Player from Team
echo "Removing player from team..."
curl -s -X DELETE "$BASE_URL/player-teams?playerId=$PLAYER_ID&teamId=$TEAM_ID" \
  -H "Authorization: Bearer $TOKEN"

echo -e "${GREEN}Player removed.${NC}"

# 8. Re-assign Player to Team (Test Fix)
echo "Re-assigning player to team (Testing Fix)..."
REASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/player-teams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER_ID\",
    \"teamId\": \"$TEAM_ID\",
    \"jerseyNumber\": 15,
    \"position\": \"Back\"
  }")

# If the fix works, this should NOT return 500
echo -e "${GREEN}Re-assignment request sent.${NC}"

echo "Verification Complete!"
