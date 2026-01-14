import requests
import json
import random
import sys

BASE_URL = "http://localhost:8080/api/v1"
EMAIL = "admin@athleticaos.com"
PASSWORD = "password123"

def login():
    url = f"{BASE_URL}/auth/login"
    payload = {"email": EMAIL, "password": PASSWORD}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json()["token"]
    except Exception as e:
        print(f"Login failed: {e}")
        print(response.text)
        sys.exit(1)

def get_first_organisation(headers):
    url = f"{BASE_URL}/organisations"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        orgs = response.json()
        if orgs:
            return orgs[0]["id"]
    
    # Create one if missing
    print("No organisations found. Creating 'Malaysia Rugby'...")
    url = f"{BASE_URL}/organisations"
    payload = {
        "name": "Malaysia Rugby",
        "orgType": "FEDERATION",
        "primaryColor": "#FFD700",
        "secondaryColor": "#000000"
    }
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()["id"]

def create_team(headers, name, org_id):
    # Try to find existing first
    url = f"{BASE_URL}/teams"
    # Filtering by organistionId not directly supported in list generally unless params, let's list all?
    # Or just try create and if fail, list all and find.
    
    # Try create
    payload = {
        "organisationId": org_id,
        "name": name,
        "category": "WOMENS",
        "ageGroup": "SENIOR"
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        print(f"Created Team: {name}")
        return response.json()["id"]
    
    # If failed, look for it in org teams
    print(f"Team {name} might exist, looking up...")
    list_url = f"{BASE_URL}/teams?organisationId={org_id}"
    list_resp = requests.get(list_url, headers=headers)
    if list_resp.status_code == 200:
        teams = list_resp.json()
        for t in teams:
            if t["name"] == name:
                print(f"Found existing Team: {name}")
                return t["id"]
    
    print(f"Could not create or find team {name}")
    return None

def create_player(headers, first_name, last_name):
    url = f"{BASE_URL}/players"
    payload = {
        "firstName": first_name,
        "lastName": last_name,
        "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
        "gender": "FEMALE",
        "dob": "2000-01-01",  # Changed from dateOfBirth
        "icOrPassport": f"P{random.randint(1000000, 9999999)}", # Changed from icOrPassportNumber
        "nationality": "Malaysian" # Added
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        return response.json()["id"]
    else:
        # print(f"Failed to create player {first_name} {last_name}: {response.text}")
        # If duplicated IC, retry?
        if "IC or Passport" in response.text:
             payload["icOrPassport"] = f"P{random.randint(1000000, 9999999)}"
             return requests.post(url, json=payload, headers=headers).json().get("id")
        return None

def assign_player(headers, player_id, team_id):
    url = f"{BASE_URL}/player-teams"
    payload = {
        "playerId": player_id,
        "teamId": team_id
    }
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 201:
        pass # print("Assigned.")
    else:
        print(f"Failed to assign: {response.text}")

def main():
    print("Logging in...")
    token = login()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    print("Getting Organisation...")
    org_id = get_first_organisation(headers)
    print(f"Using Organisation ID: {org_id}")
    
    teams = [
        "Johor Women's", 
        "Sarawak Women's", 
        "Melaka Women's", 
        "Selangor Women's"
    ]
    
    for team_name in teams:
        print(f"\nProcessing Team: {team_name}")
        team_id = create_team(headers, team_name, org_id)
        if not team_id:
            # Maybe slug search?
            print("Skipping players for this team due to creation failure.")
            continue
            
        print(f"  Creating 20 players...")
        for i in range(1, 21):
            p_first = f"Player"
            p_last = f"{team_name.split()[0]}-{i}"
            
            pid = create_player(headers, p_first, p_last)
            if pid:
                assign_player(headers, pid, team_id)
                sys.stdout.write(".")
                sys.stdout.flush()
        print("\n  Done.")

if __name__ == "__main__":
    main()
