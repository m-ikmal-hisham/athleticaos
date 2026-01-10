# AthleticaOS Rugby - Bracket System Testing Guide

## Prerequisites

1. **Backend Running**: `mvn spring-boot:run` on port 8080
2. **Swagger UI**: http://localhost:8080/swagger-ui/index.html
3. **Database**: PostgreSQL running with migrations applied

## Test Data Setup

### 1. Authentication

First, get an authentication token:

```bash
# Sign in as super admin
POST /api/v1/auth/signin
{
  "email": "admin@athleticaos.com",
  "password": "admin123"
}

# Save the returned JWT token for subsequent requests
```

### 2. Create Test Organization

```bash
POST /api/v1/organisations
Authorization: Bearer {token}
{
  "name": "Test Rugby Club",
  "orgType": "CLUB",
  "primaryColor": "#FF0000",
  "secondaryColor": "#0000FF"
}

# Save organisation ID
```

### 3. Create Test Teams (8 teams for mixed format)

```bash
POST /api/v1/teams
Authorization: Bearer {token}
{
  "organisationId": "{org_id}",
  "name": "Team Alpha",
  "category": "MENS",
  "ageGroup": "U19"
}

# Repeat for Team Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel
# Save all 8 team IDs
```

### 4. Create Test Tournament

```bash
POST /api/v1/tournaments
Authorization: Bearer {token}
{
  "name": "Test Mixed Format Tournament",
  "level": "NATIONAL",
  "organiserOrgId": "{org_id}",
  "startDate": "2025-12-01",
  "endDate": "2025-12-07",
  "venue": "National Stadium",
  "isPublished": true
}

# Save tournament ID
```

---

## Test 1: Mixed Format Bracket Generation

### Generate Mixed Format Bracket

```bash
POST /api/v1/tournaments/{tournament_id}/bracket/generate
Authorization: Bearer {token}
{
  "format": "MIXED",
  "numberOfPools": 2,
  "includePlacementStages": true,
  "teamIds": [
    "{team_alpha_id}",
    "{team_bravo_id}",
    "{team_charlie_id}",
    "{team_delta_id}",
    "{team_echo_id}",
    "{team_foxtrot_id}",
    "{team_golf_id}",
    "{team_hotel_id}"
  ]
}
```

### Verify Bracket Structure

```bash
GET /api/v1/tournaments/{tournament_id}/bracket
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "tournament": {...},
  "stages": [
    {
      "stage": {
        "name": "Pool A",
        "stageType": "POOL",
        "groupStage": true,
        "knockoutStage": false
      },
      "matches": [6 matches] // 4 teams = 6 round-robin matches
    },
    {
      "stage": {
        "name": "Pool B",
        "stageType": "POOL",
        "groupStage": true,
        "knockoutStage": false
      },
      "matches": [6 matches]
    },
    {
      "stage": {
        "name": "Semi Finals",
        "stageType": "SEMI_FINAL",
        "knockoutStage": true
      },
      "matches": [2 matches with null teams]
    },
    {
      "stage": {
        "name": "Final",
        "stageType": "FINAL",
        "knockoutStage": true
      },
      "matches": [1 match with null teams]
    },
    {
      "stage": {
        "name": "Plate Final",
        "stageType": "PLATE",
        "knockoutStage": true
      },
      "matches": [1 match with null teams]
    }
  ]
}
```

**Verification Checklist:**
- ✅ Pool A created with 4 teams
- ✅ Pool B created with 4 teams
- ✅ 6 matches in each pool (round-robin)
- ✅ Semi Finals created with TBD teams
- ✅ Final created with TBD teams
- ✅ Plate Final created (placement stage)

---

## Test 2: Pool Stage Completion

### Complete Pool A Matches

```bash
# Pool A Match 1: Alpha vs Bravo
PUT /api/v1/matches/{pool_a_match_1_id}
Authorization: Bearer {token}
{
  "homeScore": 35,
  "awayScore": 14,
  "status": "COMPLETED"
}

# Pool A Match 2: Alpha vs Charlie
PUT /api/v1/matches/{pool_a_match_2_id}
{
  "homeScore": 28,
  "awayScore": 21,
  "status": "COMPLETED"
}

# Pool A Match 3: Alpha vs Delta
PUT /api/v1/matches/{pool_a_match_3_id}
{
  "homeScore": 42,
  "awayScore": 7,
  "status": "COMPLETED"
}

# Pool A Match 4: Bravo vs Charlie
PUT /api/v1/matches/{pool_a_match_4_id}
{
  "homeScore": 21,
  "awayScore": 21,
  "status": "COMPLETED"
}

# Pool A Match 5: Bravo vs Delta
PUT /api/v1/matches/{pool_a_match_5_id}
{
  "homeScore": 24,
  "awayScore": 17,
  "status": "COMPLETED"
}

# Pool A Match 6: Charlie vs Delta
PUT /api/v1/matches/{pool_a_match_6_id}
{
  "homeScore": 31,
  "awayScore": 10,
  "status": "COMPLETED"
}
```

**Expected Pool A Standings:**
1. **Team Alpha**: 13 pts (3 wins, 105 for, 42 against, +63 diff, 1 bonus)
2. **Team Bravo**: 7 pts (1 win, 1 draw, 59 for, 76 against, -17 diff)
3. **Team Charlie**: 6 pts (1 win, 1 draw, 73 for, 76 against, -3 diff)
4. **Team Delta**: 0 pts (3 losses, 34 for, 97 against, -63 diff)

### Complete Pool B Matches

```bash
# Pool B Match 1: Echo vs Foxtrot
PUT /api/v1/matches/{pool_b_match_1_id}
{
  "homeScore": 38,
  "awayScore": 10,
  "status": "COMPLETED"
}

# Pool B Match 2: Echo vs Golf
PUT /api/v1/matches/{pool_b_match_2_id}
{
  "homeScore": 45,
  "awayScore": 7,
  "status": "COMPLETED"
}

# Pool B Match 3: Echo vs Hotel
PUT /api/v1/matches/{pool_b_match_3_id}
{
  "homeScore": 52,
  "awayScore": 3,
  "status": "COMPLETED"
}

# Pool B Match 4: Foxtrot vs Golf
PUT /api/v1/matches/{pool_b_match_4_id}
{
  "homeScore": 28,
  "awayScore": 14,
  "status": "COMPLETED"
}

# Pool B Match 5: Foxtrot vs Hotel
PUT /api/v1/matches/{pool_b_match_5_id}
{
  "homeScore": 35,
  "awayScore": 7,
  "status": "COMPLETED"
}

# Pool B Match 6: Golf vs Hotel
PUT /api/v1/matches/{pool_b_match_6_id}
{
  "homeScore": 21,
  "awayScore": 14,
  "status": "COMPLETED"
}
```

**Expected Pool B Standings:**
1. **Team Echo**: 15 pts (3 wins, 135 for, 20 against, +115 diff, 3 bonus)
2. **Team Foxtrot**: 12 pts (3 wins, 73 for, 56 against, +17 diff)
3. **Team Golf**: 4 pts (1 win, 42 for, 93 against, -51 diff)
4. **Team Hotel**: 0 pts (3 losses, 24 for, 105 against, -81 diff)

---

## Test 3: Pool-to-Knockout Progression

### Progress Pools to Knockout

```bash
POST /api/v1/tournaments/{tournament_id}/progress-pools
Authorization: Bearer {token}
```

### Verify Seeding

```bash
GET /api/v1/tournaments/{tournament_id}/bracket
```

**Expected Semi Final Seeding:**
- **SF1**: Team Alpha (Pool A 1st) vs Team Foxtrot (Pool B 2nd)
- **SF2**: Team Echo (Pool B 1st) vs Team Bravo (Pool A 2nd)

**Verification Checklist:**
- ✅ Pool standings calculated correctly
- ✅ Top 2 from each pool identified
- ✅ Cross-pool seeding applied
- ✅ Higher seeds get home advantage

---

## Test 4: Knockout Stage with Loser Routing

### Complete Semi Final 1

```bash
# SF1: Alpha vs Foxtrot
PUT /api/v1/matches/{sf1_id}
{
  "homeScore": 28,
  "awayScore": 21,
  "status": "COMPLETED"
}

# Progress the match
POST /api/v1/matches/{sf1_id}/progress
Authorization: Bearer {token}
```

**Expected Results:**
- ✅ Team Alpha advances to Final (home team)
- ✅ Team Foxtrot routes to Plate Final

### Complete Semi Final 2

```bash
# SF2: Echo vs Bravo
PUT /api/v1/matches/{sf2_id}
{
  "homeScore": 35,
  "awayScore": 14,
  "status": "COMPLETED"
}

# Progress the match
POST /api/v1/matches/{sf2_id}/progress
```

**Expected Results:**
- ✅ Team Echo advances to Final (away team)
- ✅ Team Bravo routes to Plate Final

### Verify Final and Plate Assignments

```bash
GET /api/v1/tournaments/{tournament_id}/bracket
```

**Expected:**
- **Final**: Team Alpha vs Team Echo
- **Plate Final**: Team Foxtrot vs Team Bravo

---

## Test 5: Complete Tournament

### Complete Final

```bash
PUT /api/v1/matches/{final_id}
{
  "homeScore": 24,
  "awayScore": 31,
  "status": "COMPLETED"
}
```

**Result:**
- 🏆 **Champion**: Team Echo
- 🥈 **Runner-up**: Team Alpha

### Complete Plate Final

```bash
PUT /api/v1/matches/{plate_final_id}
{
  "homeScore": 28,
  "awayScore": 24,
  "status": "COMPLETED"
}
```

**Result:**
- 🥉 **3rd Place**: Team Foxtrot
- **4th Place**: Team Bravo

---

## Test 6: Knockout with Placement Stages

### Generate Knockout Bracket

```bash
POST /api/v1/tournaments/{new_tournament_id}/bracket/generate
{
  "format": "KNOCKOUT",
  "includePlacementStages": true,
  "teamIds": [8 team IDs]
}
```

### Complete Quarter Finals

```bash
# QF1: Team A wins
PUT /api/v1/matches/{qf1_id}
{ "homeScore": 28, "awayScore": 14, "status": "COMPLETED" }
POST /api/v1/matches/{qf1_id}/progress

# QF2: Team C wins
PUT /api/v1/matches/{qf2_id}
{ "homeScore": 21, "awayScore": 17, "status": "COMPLETED" }
POST /api/v1/matches/{qf2_id}/progress

# QF3: Team E wins
PUT /api/v1/matches/{qf3_id}
{ "homeScore": 35, "awayScore": 7, "status": "COMPLETED" }
POST /api/v1/matches/{qf3_id}/progress

# QF4: Team G wins
PUT /api/v1/matches/{qf4_id}
{ "homeScore": 24, "awayScore": 21, "status": "COMPLETED" }
POST /api/v1/matches/{qf4_id}/progress
```

**Expected:**
- ✅ Winners (A, C, E, G) advance to Semi Finals
- ✅ Losers (B, D, F, H) route to Bowl bracket

### Verify Bowl Assignments

```bash
GET /api/v1/tournaments/{tournament_id}/bracket
```

**Expected Bowl Matches:**
- Bowl SF1: Team B vs Team D
- Bowl SF2: Team F vs Team H

---

## Test 7: Batch Progression

### Progress Entire Tournament

```bash
POST /api/v1/tournaments/{tournament_id}/progress
Authorization: Bearer {token}
```

**Response:**
```json
{
  "progressedCount": 4
}
```

**Verification:**
- ✅ All completed matches progressed
- ✅ Winners advanced
- ✅ Losers routed
- ✅ Count matches number of progressed matches

---

## Test 8: Edge Cases

### Test 1: Can Progress Check

```bash
GET /api/v1/matches/{match_id}/can-progress
```

**Test Cases:**
- ❌ Match not completed → false
- ❌ Match has no scores → false
- ❌ Match is a draw → false
- ❌ Match is in pool stage → false
- ✅ Completed knockout match with winner → true

### Test 2: Empty Pool Progression

```bash
# Try to progress pools before matches complete
POST /api/v1/tournaments/{tournament_id}/progress-pools
```

**Expected:**
- ⚠️ Warning logged
- No teams assigned to knockout

### Test 3: Duplicate Progression

```bash
# Progress same match twice
POST /api/v1/matches/{match_id}/progress
POST /api/v1/matches/{match_id}/progress
```

**Expected:**
- ✅ First call succeeds
- ⚠️ Second call logs warning (already progressed)

---

## Validation Checklist

### Mixed Format
- ✅ Pool stages generated correctly
- ✅ Round-robin matches created
- ✅ Knockout stages with TBD teams
- ✅ Placement stages created
- ✅ Pool standings calculated accurately
- ✅ Seeding logic correct
- ✅ Top 2 teams advance

### Loser Routing
- ✅ QF losers → Bowl
- ✅ SF losers → Plate
- ✅ Placement matches populated
- ✅ No duplicate assignments

### Pool Standings
- ✅ Win = 4 points
- ✅ Draw = 2 points
- ✅ Loss = 0 points
- ✅ Bonus point for 28+ score
- ✅ Tie-breaking by differential
- ✅ Tie-breaking by points for

### Progression
- ✅ Winners advance to next round
- ✅ Losers route to placement
- ✅ Match creation automatic
- ✅ Home/away assignment correct
- ✅ Batch progression works

---

## Performance Testing

### Load Test: Large Tournament

```bash
# Generate 32-team knockout
POST /api/v1/tournaments/{id}/bracket/generate
{
  "format": "KNOCKOUT",
  "includePlacementStages": true,
  "teamIds": [32 team IDs]
}
```

**Expected:**
- Round of 16: 16 matches
- Quarter Finals: 8 matches
- Semi Finals: 4 matches
- Final: 1 match
- Placement stages: Multiple levels

**Verify:**
- ✅ All stages created
- ✅ Response time < 2 seconds
- ✅ No database errors

---

## Deployment Checklist

### Pre-Deployment
- ✅ All tests passing
- ✅ Build successful
- ✅ Database migrations ready
- ✅ Environment variables configured
- ✅ Swagger documentation complete

### Staging Deployment
1. Set environment variables
2. Run database migrations
3. Deploy application
4. Verify health endpoint
5. Test authentication
6. Test bracket generation
7. Test progression
8. Monitor logs

### Post-Deployment Verification
- ✅ Swagger UI accessible
- ✅ All endpoints responding
- ✅ Database connections stable
- ✅ No errors in logs
- ✅ Performance acceptable
