# Phase F Verification Guide

## Quick Start

### 1. Start Backend
```bash
cd /Users/futureflash/Desktop/Projects/athleticaos/backend
mvn spring-boot:run
```

Wait for: `Started BackendApplication in X seconds`

### 2. Start Frontend
```bash
cd /Users/futureflash/Desktop/Projects/athleticaos/frontend
npm run dev
```

Wait for: `Local: http://localhost:5173/`

---

## Backend Verification

### Automated Testing
```bash
cd /Users/futureflash/Desktop/Projects/athleticaos
./verify_public_api.sh
```

### Manual Testing

#### 1. Test Public Tournaments List
```bash
curl http://localhost:8080/api/public/tournaments | jq '.'
```

**Expected**: JSON array of published tournaments
**Verify**: Only tournaments with `isPublished: true` appear

#### 2. Test Tournament Detail
```bash
# Get a tournament ID from step 1, then:
curl http://localhost:8080/api/public/tournaments/{TOURNAMENT_ID} | jq '.'
```

**Expected**: Tournament detail with teams array populated
**Verify**: 
- Teams list is not empty (if teams added)
- Organiser name is fetched (not just "Organiser")

#### 3. Test Tournament Matches
```bash
curl http://localhost:8080/api/public/tournaments/{TOURNAMENT_ID}/matches | jq '.'
```

**Expected**: JSON array of matches for that tournament
**Verify**: Match details include scores, status, teams

#### 4. Test Match Detail with Events
```bash
# Get a match ID from step 3, then:
curl http://localhost:8080/api/public/matches/{MATCH_ID} | jq '.'
```

**Expected**: Match detail with events and stats
**Verify**:
- `events` array populated (if events recorded)
- `homeStats` and `awayStats` objects present
- Stats show tries, conversions, penalties, cards

#### 5. Test Security - Unpublished Tournament

**Setup**: Create a tournament in admin but don't publish it

```bash
curl http://localhost:8080/api/public/tournaments/{UNPUBLISHED_ID}
```

**Expected**: 404 Not Found or empty response
**Verify**: Unpublished tournament is NOT accessible

#### 6. Test CORS
```bash
curl -I -H "Origin: http://localhost:5173" http://localhost:8080/api/public/tournaments
```

**Expected**: Headers include:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

---

## Frontend Verification

### Prerequisites
1. Backend running on `http://localhost:8080`
2. Frontend running on `http://localhost:5173`
3. Test data:
   - At least 1 published tournament
   - At least 2 teams added to tournament
   - At least 2 matches created
   - At least 5 match events recorded (tries, conversions, etc.)

### Testing Workflow

#### 1. Home Page Test
1. Open incognito window: `http://localhost:5173/`
2. **Verify**:
   - ✓ Page loads without errors
   - ✓ Hero section displays
   - ✓ Featured tournaments show (if any published)
   - ✓ LIVE badge for ongoing tournaments
   - ✓ Footer credits visible
3. Click "View All Tournaments"

#### 2. Tournaments List Test
1. **Verify**:
   - ✓ All published tournaments display
   - ✓ Search box filters by name/venue
   - ✓ Status filters work (All/Live/Upcoming/Completed)
   - ✓ Results count updates
2. Click on a tournament card

#### 3. Tournament Detail Test
1. **Verify**:
   - ✓ Tournament info displays
   - ✓ Teams list shows (with logos if available)
   - ✓ Fixtures tab shows upcoming/live matches
   - ✓ Results tab shows completed matches
   - ✓ Matches grouped by date
2. Click "View Match" on a match

#### 4. Match Center Test
1. **Verify**:
   - ✓ Score display prominent
   - ✓ Match timeline shows events
   - ✓ Team statistics bars display
   - ✓ Events sorted newest first
   - ✓ Player names show (if available)

#### 5. Live Polling Test
1. In admin dashboard, set a match status to "LIVE"
2. Open match center for that match in public portal
3. In admin, add a new match event (try, conversion, etc.)
4. **Verify**:
   - ✓ "Last updated" timestamp shows
   - ✓ Within 15 seconds, new event appears
   - ✓ Score updates automatically
   - ✓ Stats update automatically

#### 6. Security Test
1. **Verify NO admin controls visible**:
   - ✓ No "Edit" buttons
   - ✓ No "Delete" buttons
   - ✓ No "Add Match" buttons
   - ✓ No admin sidebar
2. Try accessing unpublished tournament directly
3. **Verify**: 404 or "Tournament not found"

#### 7. Responsive Test
1. Resize browser to mobile (< 768px)
2. **Verify**:
   - ✓ Single column layout
   - ✓ Navigation collapses appropriately
   - ✓ Cards stack vertically
   - ✓ Text remains readable

#### 8. SEO Test
1. View page source (Ctrl+U / Cmd+Option+U)
2. **Verify meta tags present**:
   - ✓ `<title>AthleticaOS Rugby - Malaysia Rugby Competitions</title>`
   - ✓ `<meta name="description" ...>`
   - ✓ `<meta property="og:title" ...>`
   - ✓ `<meta property="og:image" ...>`
   - ✓ `<meta property="twitter:card" ...>`

---

## Common Issues & Solutions

### Backend Issues

**Issue**: `Connection refused` on port 8080
**Solution**: 
```bash
cd backend
mvn spring-boot:run
```

**Issue**: No tournaments returned
**Solution**: 
- Check tournaments are published in admin
- Verify database has data: `SELECT * FROM tournaments WHERE is_published = true;`

**Issue**: 404 on public endpoints
**Solution**: 
- Verify SecurityConfig allows `/api/public/**`
- Check backend logs for errors

### Frontend Issues

**Issue**: `ERR_CONNECTION_REFUSED` on port 5173
**Solution**:
```bash
cd frontend
npm run dev
```

**Issue**: No tournaments showing
**Solution**:
- Check browser console for errors
- Verify backend is running and returning data
- Check CORS headers

**Issue**: Live polling not working
**Solution**:
- Verify match status is "LIVE" or "ONGOING"
- Check browser console for interval errors
- Verify API returns updated data

---

## Verification Checklist

### Backend ✓
- [ ] `/api/public/tournaments` returns published tournaments
- [ ] `/api/public/tournaments/{id}` returns tournament with teams
- [ ] `/api/public/tournaments/{id}/matches` returns matches
- [ ] `/api/public/matches/{id}` returns match with events and stats
- [ ] Unpublished tournaments return 404
- [ ] CORS headers present

### Frontend ✓
- [ ] Home page loads and displays tournaments
- [ ] Tournaments list with search/filters works
- [ ] Tournament detail shows teams and matches
- [ ] Match center shows events and stats
- [ ] Live polling works (15s interval)
- [ ] No admin controls visible
- [ ] Responsive design works
- [ ] SEO meta tags present

---

## Next Steps After Verification

1. **Fix any failing tests**
2. **Add real tournament data** for demo
3. **Create OG image** at `/public/og-image.jpg`
4. **Deploy to staging** for user testing
5. **Gather feedback** and iterate

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for exceptions
3. Verify database has test data
4. Review `FRONTEND_VERIFICATION.md` for detailed checklist
5. Run `./verify_public_api.sh` for automated backend tests
