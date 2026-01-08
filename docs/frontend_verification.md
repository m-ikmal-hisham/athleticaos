# Phase F Frontend Verification Checklist

## Prerequisites
- Backend running on `http://localhost:8080`
- Frontend running on `http://localhost:5173`
- At least one published tournament with matches and events

## 1. Home Page (`/`)

### Navigation
- [ ] Page loads without errors
- [ ] Logo and "AthleticaOS Rugby" branding visible
- [ ] Top navigation shows "Tournaments" link
- [ ] "Admin Login" button visible
- [ ] Footer shows "Powered by AthleticaOS Rugby" and credits

### Content
- [ ] Hero section displays with title and subtitle
- [ ] "View All Tournaments" button works
- [ ] Featured tournaments section shows tournaments (if any published)
- [ ] LIVE badge appears for ongoing tournaments
- [ ] Tournament cards show: name, level, dates, venue
- [ ] Clicking tournament card navigates to detail page

### Responsive
- [ ] Mobile view (< 768px): Cards stack vertically
- [ ] Tablet view (768-1024px): 2 columns
- [ ] Desktop view (> 1024px): 3 columns

---

## 2. Tournaments List (`/tournaments`)

### Navigation
- [ ] Accessible from home page
- [ ] Back to home works (logo click)
- [ ] URL is `/tournaments`

### Search & Filters
- [ ] Search box accepts input
- [ ] Search filters by tournament name
- [ ] Search filters by venue
- [ ] "All" filter shows all tournaments
- [ ] "Live" filter shows only live tournaments
- [ ] "Upcoming" filter shows only upcoming tournaments
- [ ] "Completed" filter shows only completed tournaments
- [ ] Results count updates correctly

### Content
- [ ] Tournament cards display correctly
- [ ] Status badges (LIVE/UPCOMING/COMPLETED) show correctly
- [ ] Season name displays if available
- [ ] Competition type displays if available
- [ ] Clicking card navigates to tournament detail

### Edge Cases
- [ ] Empty state shows when no tournaments match filters
- [ ] Loading state shows while fetching data

---

## 3. Tournament Detail (`/tournaments/:id`)

### Navigation
- [ ] Accessible from tournaments list
- [ ] "Back to Tournaments" link works
- [ ] URL contains tournament ID

### Header
- [ ] Tournament name displays
- [ ] Level and competition type show
- [ ] Dates display correctly
- [ ] Venue displays
- [ ] LIVE indicator shows if tournament is ongoing
- [ ] Season name shows if available

### Teams Section
- [ ] Teams list displays (if teams added to tournament)
- [ ] Team names show correctly
- [ ] Team logos display (if available)

### Tabs
- [ ] "Fixtures" tab is default
- [ ] "Results" tab switches correctly
- [ ] Tab counts show correct numbers
- [ ] Active tab has blue underline

### Fixtures Tab
- [ ] Matches grouped by date
- [ ] Date headers formatted correctly
- [ ] Match cards show: teams, time, venue
- [ ] LIVE badge shows for ongoing matches
- [ ] Scores show for completed matches
- [ ] "View Match" link navigates to match center

### Results Tab
- [ ] Only completed matches show
- [ ] Final scores display
- [ ] Match cards clickable

### Edge Cases
- [ ] Empty state for no fixtures
- [ ] Empty state for no results
- [ ] 404 for unpublished tournament

---

## 4. Match Center (`/matches/:matchId`)

### Navigation
- [ ] Accessible from tournament detail
- [ ] "Back to Tournaments" link works
- [ ] URL contains match ID

### Match Header
- [ ] Status badge shows (LIVE/FULL TIME/SCHEDULED)
- [ ] Team names display
- [ ] Scores display prominently
- [ ] Match date and time show
- [ ] Venue displays
- [ ] Match code shows (if available)

### Live Polling (for LIVE matches)
- [ ] "Last updated" timestamp shows
- [ ] Timestamp updates every 15 seconds
- [ ] Score updates automatically
- [ ] Events update automatically
- [ ] No polling for non-live matches

### Statistics Section
- [ ] Team stats bars display
- [ ] Tries count shows
- [ ] Conversions count shows
- [ ] Penalties count shows
- [ ] Yellow cards count shows
- [ ] Red cards count shows
- [ ] Bars show correct proportions

### Timeline Section
- [ ] Events listed in reverse chronological order (newest first)
- [ ] Event minute displays
- [ ] Event icon shows (🏉 for try, etc.)
- [ ] Team name shows
- [ ] Player name shows (if available)
- [ ] Event type shows (TRY, CONVERSION, etc.)
- [ ] Points show for scoring events
- [ ] Empty state shows if no events

### Edge Cases
- [ ] 404 for match in unpublished tournament
- [ ] Handles matches with no events
- [ ] Handles matches with no stats

---

## 5. Security & Access Control

### Public Access
- [ ] All public pages accessible without login
- [ ] No authentication required
- [ ] No JWT token needed

### Admin Controls Hidden
- [ ] No "Edit" buttons visible
- [ ] No "Delete" buttons visible
- [ ] No "Add Match" buttons visible
- [ ] No admin sidebar visible
- [ ] No admin-only features accessible

### Unpublished Content
- [ ] Unpublished tournaments don't appear in list
- [ ] Direct URL to unpublished tournament returns 404
- [ ] Matches from unpublished tournaments return 404

---

## 6. Theme & Styling

### Glassmorphism
- [ ] Backdrop blur effects present
- [ ] Translucent backgrounds
- [ ] Subtle borders and shadows
- [ ] Consistent with admin dashboard theme

### Colors
- [ ] Blue primary color (#2563eb)
- [ ] Red for LIVE badges
- [ ] Slate for text
- [ ] Proper dark mode support

### Responsive Design
- [ ] Mobile: Single column, readable text
- [ ] Tablet: 2 columns where appropriate
- [ ] Desktop: 3 columns where appropriate
- [ ] Touch-friendly buttons (min 44px)

---

## 7. Performance

### Loading States
- [ ] Skeleton loaders show while fetching
- [ ] Smooth transitions
- [ ] No layout shifts

### Data Fetching
- [ ] Initial load is fast
- [ ] Subsequent navigation is instant (if cached)
- [ ] Live polling doesn't cause UI jank

---

## 8. SEO (View Page Source)

### Meta Tags
- [ ] Title tag present
- [ ] Description meta tag present
- [ ] Keywords meta tag present
- [ ] Author meta tag present
- [ ] Robots meta tag present

### Open Graph
- [ ] og:type present
- [ ] og:url present
- [ ] og:title present
- [ ] og:description present
- [ ] og:image present
- [ ] og:site_name present

### Twitter Cards
- [ ] twitter:card present
- [ ] twitter:title present
- [ ] twitter:description present
- [ ] twitter:image present

---

## Testing Workflow

1. **Start Backend**
   ```bash
   cd backend
   mvn spring-boot:run
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Prepare Test Data**
   - Login to admin dashboard (`/dashboard`)
   - Create/publish a tournament
   - Add teams to tournament
   - Create matches
   - Record match events (tries, conversions, etc.)

4. **Test Public Portal**
   - Open incognito window
   - Navigate to `http://localhost:5173/`
   - Follow checklist above

5. **Test Live Polling**
   - Set a match status to "LIVE" in admin
   - Open match center in public portal
   - Add events in admin
   - Verify events appear in public portal within 15 seconds

---

## Common Issues

### Backend not responding
- Check backend is running on port 8080
- Check CORS configuration
- Check SecurityConfig allows `/api/public/**`

### No tournaments showing
- Verify tournaments are published (`isPublished = true`)
- Check browser console for errors
- Verify API returns data: `curl http://localhost:8080/api/public/tournaments`

### Live polling not working
- Check match status is "LIVE" or "ONGOING"
- Check browser console for errors
- Verify interval is set (15 seconds)

### 404 errors
- Verify tournament/match IDs are correct
- Verify tournament is published
- Check backend logs for errors
