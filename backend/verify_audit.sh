#!/bin/bash

# Authenticate and get token
echo "Authenticating..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@athleticaos.com","password":"password123"}')

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Authentication failed!"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "Token obtained: ${TOKEN:0:10}..."

# Test Global Logs
echo "Testing Global Logs..."
curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/audit/recent/global

# Get Current User to find Org ID
echo "Fetching Current User..."
USER_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/users/me)
ORG_ID=$(echo $USER_RESPONSE | grep -o '"organisationId":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "User ID: $USER_ID"
echo "Org ID: $ORG_ID"

if [ ! -z "$ORG_ID" ]; then
    echo "Testing Org Logs for Org ID: $ORG_ID..."
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/audit/recent/org/$ORG_ID
else
    echo "No Organisation ID found for user."
fi

if [ ! -z "$USER_ID" ]; then
    echo "Testing User Logs for User ID: $USER_ID..."
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/audit/recent/user/$USER_ID
fi
