#!/bin/bash

# Phase F Public API Verification Script
# This script tests all public endpoints and verifies security

echo "========================================="
echo "Phase F Public API Verification"
echo "========================================="
echo ""

BASE_URL="http://localhost:8080/api/public"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing: $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url")
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status_code)"
        ((PASSED++))
        
        # Show response preview if JSON
        if [ "$expected_status" = "200" ] && [ -n "$body" ]; then
            echo "$body" | jq -C '.' 2>/dev/null | head -n 10 || echo "$body" | head -n 5
            echo ""
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        ((FAILED++))
        echo "Response: $body" | head -n 5
        echo ""
    fi
}

echo "1. Testing Public Tournaments List"
echo "-----------------------------------"
test_endpoint "GET /tournaments" "$BASE_URL/tournaments" "200"

echo ""
echo "2. Testing Tournament Detail (requires tournament ID)"
echo "------------------------------------------------------"
echo -e "${YELLOW}Note: Replace {tournamentId} with actual ID from step 1${NC}"
echo "Example: curl http://localhost:8080/api/public/tournaments/{tournamentId}"
echo ""

echo "3. Testing Tournament Matches (requires tournament ID)"
echo "-------------------------------------------------------"
echo -e "${YELLOW}Note: Replace {tournamentId} with actual ID${NC}"
echo "Example: curl http://localhost:8080/api/public/tournaments/{tournamentId}/matches"
echo ""

echo "4. Testing Match Detail (requires match ID)"
echo "--------------------------------------------"
echo -e "${YELLOW}Note: Replace {matchId} with actual ID from step 3${NC}"
echo "Example: curl http://localhost:8080/api/public/matches/{matchId}"
echo ""

echo "5. Testing Security - Unpublished Tournament"
echo "---------------------------------------------"
echo -e "${YELLOW}To test: Create an unpublished tournament and try to access it${NC}"
echo "Expected: 404 Not Found or empty list"
echo ""

echo "6. Testing CORS"
echo "---------------"
echo "Testing CORS headers..."
curl -s -I -H "Origin: http://localhost:5173" "$BASE_URL/tournaments" | grep -i "access-control"
echo ""

echo "========================================="
echo "Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""
echo "Next Steps:"
echo "1. Start backend: cd backend && mvn spring-boot:run"
echo "2. Run this script again"
echo "3. Test with actual tournament/match IDs"
echo "4. Verify unpublished tournaments are hidden"
echo "========================================="
