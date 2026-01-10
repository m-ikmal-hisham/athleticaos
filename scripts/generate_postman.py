import json
import uuid

def generate_uuid():
    return str(uuid.uuid4())

def create_item(name, request, response=[]):
    return {
        "name": name,
        "item": [],
        "request": request,
        "response": response
    }

def create_folder(name, items):
    return {
        "name": name,
        "item": items
    }

def create_request(method, url_path, body=None, description=""):
    req = {
        "method": method,
        "header": [
            {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
            },
            {
                "key": "Content-Type",
                "value": "application/json",
                "type": "text"
            }
        ],
        "url": {
            "raw": "{{base_url}}" + url_path,
            "host": ["{{base_url}}"],
            "path": url_path.strip("/").split("/")
        },
        "description": description
    }
    if body:
        req["body"] = {
            "mode": "raw",
            "raw": json.dumps(body, indent=4)
        }
    return req

def create_test_script(script_lines):
    return {
        "listen": "test",
        "script": {
            "exec": script_lines,
            "type": "text/javascript"
        }
    }

collection = {
    "info": {
        "_postman_id": generate_uuid(),
        "name": "AthleticaOS Rugby – FULL API (Updated RBAC Version)",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": []
}

# Healthcheck
healthcheck = create_request("GET", "/actuator/health")
healthcheck_item = {
    "name": "Health Check",
    "request": healthcheck,
    "response": []
}
collection["item"].append(create_folder("Healthcheck", [healthcheck_item]))

# Auth
login_body = {
    "email": "admin@athleticaos.com",
    "password": "password"
}
login_req = create_request("POST", "/api/v1/auth/login", login_body)
# Remove Auth header for login
login_req["header"] = [h for h in login_req["header"] if h["key"] != "Authorization"]

login_test_script = [
    "var json = pm.response.json();",
    "pm.test(\"Status code is 200\", function () {",
    "    pm.response.to.have.status(200);",
    "});",
    "if (json.token) {",
    "    pm.environment.set(\"token\", json.token);",
    "}",
    "if (json.roles) {",
    "    pm.environment.set(\"roles\", JSON.stringify(json.roles));",
    "}",
    "if (json.scope) {",
    "    pm.environment.set(\"scope\", json.scope);",
    "}",
    "if (json.user_id) {",
    "    pm.environment.set(\"user_id\", json.user_id);",
    "} else if (json.id) {",
    "    pm.environment.set(\"user_id\", json.id);",
    "}",
    "// Decode JWT to verify claims",
    "var token = json.token;",
    "if (token) {",
    "    var base64Url = token.split('.')[1];",
    "    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');",
    "    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {",
    "        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);",
    "    }).join(''));",
    "    var payload = JSON.parse(jsonPayload);",
    "    if (payload.roles) {",
    "        pm.expect(payload.roles).to.be.an('array');",
    "    }",
    "    if (payload.scope) {",
    "        pm.expect(payload.scope).to.be.a('string');",
    "    }",
    "}"
]
login_item = {
    "name": "Login",
    "event": [create_test_script(login_test_script)],
    "request": login_req,
    "response": []
}

register_body = {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "password123",
    "roles": ["ROLE_USER"],
    "organisationId": ""
}
register_req = create_request("POST", "/api/v1/auth/register", register_body)
register_req["header"] = [h for h in register_req["header"] if h["key"] != "Authorization"]
register_item = {
    "name": "Register",
    "request": register_req,
    "response": []
}

collection["item"].append(create_folder("Auth", [login_item, register_item]))

# Users
user_list = {
    "name": "Get All Users",
    "request": create_request("GET", "/api/v1/users"),
    "response": []
}
user_get = {
    "name": "Get User By ID",
    "request": create_request("GET", "/api/v1/users/{{user_id}}"),
    "response": []
}
user_update_body = {
    "firstName": "John",
    "lastName": "Doe Updated",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "roles": ["ROLE_USER"],
    "organisationId": "",
    "isActive": True
}
user_update = {
    "name": "Update User",
    "request": create_request("PUT", "/api/v1/users/{{user_id}}", user_update_body),
    "response": []
}
collection["item"].append(create_folder("Users", [user_list, user_get, user_update]))

# Organisations
org_create_body = {
    "name": "New Organisation",
    "orgType": "UNION",
    "parentOrgId": None,
    "primaryColor": "#FFFFFF",
    "secondaryColor": "#000000",
    "logoUrl": "http://example.com/logo.png"
}
org_create = {
    "name": "Create Organisation",
    "request": create_request("POST", "/api/v1/organisations", org_create_body),
    "response": []
}
org_list = {
    "name": "Get All Organisations",
    "request": create_request("GET", "/api/v1/organisations"),
    "response": []
}
org_get = {
    "name": "Get Organisation By ID",
    "request": create_request("GET", "/api/v1/organisations/{{org_id}}"),
    "response": []
}
collection["item"].append(create_folder("Organisations", [org_create, org_list, org_get]))

# Clubs (Using Organisation endpoints but grouped separately for logical separation as requested)
club_create_body = {
    "name": "New Club",
    "orgType": "CLUB",
    "parentOrgId": "{{union_id}}",
    "primaryColor": "#FF0000",
    "secondaryColor": "#0000FF",
    "logoUrl": "http://example.com/club_logo.png"
}
club_create = {
    "name": "Create Club",
    "request": create_request("POST", "/api/v1/organisations", club_create_body),
    "response": []
}
collection["item"].append(create_folder("Clubs", [club_create]))

# Teams
team_create_body = {
    "organisationId": "{{club_id}}",
    "name": "Team A",
    "category": "MEN",
    "ageGroup": "SENIOR"
}
team_create = {
    "name": "Create Team",
    "request": create_request("POST", "/api/v1/teams", team_create_body),
    "response": []
}
team_list = {
    "name": "Get All Teams",
    "request": create_request("GET", "/api/v1/teams"),
    "response": []
}
team_get = {
    "name": "Get Team By ID",
    "request": create_request("GET", "/api/v1/teams/{{team_id}}"),
    "response": []
}
collection["item"].append(create_folder("Teams", [team_create, team_list, team_get]))

# Players
player_create_body = {
    "firstName": "Player",
    "lastName": "One",
    "gender": "MALE",
    "dob": "1990-01-01",
    "icOrPassport": "A1234567",
    "nationality": "Malaysia",
    "email": "player@example.com",
    "phone": "+60123456789",
    "address": "123 Street",
    "dominantHand": "RIGHT",
    "dominantLeg": "RIGHT",
    "heightCm": 180,
    "weightKg": 90
}
player_create = {
    "name": "Create Player",
    "request": create_request("POST", "/api/v1/players", player_create_body),
    "response": []
}
player_list = {
    "name": "Get All Players",
    "request": create_request("GET", "/api/v1/players"),
    "response": []
}
player_get = {
    "name": "Get Player By ID",
    "request": create_request("GET", "/api/v1/players/{{player_id}}"),
    "response": []
}
collection["item"].append(create_folder("Players", [player_create, player_list, player_get]))

# Tournaments
tourn_create_body = {
    "organiserOrgId": "{{union_id}}",
    "name": "National Cup",
    "level": "NATIONAL",
    "startDate": "2024-01-01",
    "endDate": "2024-01-10",
    "venue": "National Stadium"
}
tourn_create = {
    "name": "Create Tournament",
    "request": create_request("POST", "/api/v1/tournaments", tourn_create_body),
    "response": []
}
tourn_list = {
    "name": "Get All Tournaments",
    "request": create_request("GET", "/api/v1/tournaments"),
    "response": []
}
tourn_get = {
    "name": "Get Tournament By ID",
    "request": create_request("GET", "/api/v1/tournaments/{{tournament_id}}"),
    "response": []
}
collection["item"].append(create_folder("Tournaments", [tourn_create, tourn_list, tourn_get]))

# Matches
match_create_body = {
    "tournamentId": "{{tournament_id}}",
    "homeTeamId": "{{home_team_id}}",
    "awayTeamId": "{{away_team_id}}",
    "matchDate": "2024-01-05T15:00:00",
    "location": "Field A",
    "stage": "GROUP"
}
match_create = {
    "name": "Create Match",
    "request": create_request("POST", "/api/v1/matches", match_create_body),
    "response": []
}
match_list = {
    "name": "Get All Matches",
    "request": create_request("GET", "/api/v1/matches"),
    "response": []
}
match_get = {
    "name": "Get Match By ID",
    "request": create_request("GET", "/api/v1/matches/{{match_id}}"),
    "response": []
}
collection["item"].append(create_folder("Matches", [match_create, match_list, match_get]))

# Match Events
event_create_body = {
    "matchId": "{{match_id}}",
    "eventType": "TRY",
    "teamId": "{{team_id}}",
    "playerId": "{{player_id}}",
    "minute": 15,
    "details": "Great run"
}
event_create = {
    "name": "Create Match Event",
    "request": create_request("POST", "/api/v1/matches/events", event_create_body),
    "response": []
}
collection["item"].append(create_folder("Match Events", [event_create]))

# Branding
theme_update_body = {
    "organisationId": "{{org_id}}",
    "primaryColor": "#123456",
    "secondaryColor": "#654321",
    "logoUrl": "http://example.com/new_logo.png"
}
theme_update = {
    "name": "Update Theme",
    "request": create_request("PUT", "/api/v1/themes", theme_update_body),
    "response": []
}
theme_get = {
    "name": "Get Theme",
    "request": create_request("GET", "/api/v1/themes/{{org_id}}"),
    "response": []
}
collection["item"].append(create_folder("Branding", [theme_update, theme_get]))

# Placeholders for missing controllers
collection["item"].append(create_folder("Calendar", []))
collection["item"].append(create_folder("File Uploads", []))
collection["item"].append(create_folder("Utility", []))

with open("docs/api/postman/full/athleticaos_postman_full.json", "w") as f:
    json.dump(collection, f, indent=4)
