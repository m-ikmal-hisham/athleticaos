# AthleticaOS UI Style Guide & Design Tokens

Status: v1 draft (2026-10-06). Source of truth for every UI change, public and admin.
If code and this guide disagree, the guide wins and the code is a migration item.

---

## 1. Principles

1. **Real or nothing.** No mock data, fake success states, placeholder names, or
   invented stats in any environment except `dev`. If a feature is not ready, it is
   hidden behind a feature flag (section 9), not faked.
2. **Content first, chrome second.** Scores, fixtures and names carry the page.
   Decoration (gradients, blur, glow, hover-scale) is the exception, not the default.
3. **One way to do each thing.** One primary button, one card, one table, one modal,
   one empty state, one date format. New variants need a reason written here.
4. **Same component on every screen size.** Layout adapts; components do not fork
   into "mobile version" copies. This keeps the PWA and a future native app reusable.
5. **Plain, specific copy.** Say what the thing is. No "Experience X like never
   before", "Trusted by champions", "Powering the future of".

### Anti-slop checklist (review every PR against this)

- [ ] No gradient on buttons, headings, or badges (gradients allowed only in the
      public hero background, max one per page)
- [ ] No `backdrop-blur` on cards; blur only on sticky nav bars, the tournament pill,
      and modal scrims
- [ ] No `hover:scale-*` on cards or tiles
- [ ] Only Navy, Crimson, Deep Navy, black and white (section 2). No hard-coded
      hex and no raw `slate-*`/`gray-*`/`blue-*`/`red-*`/`green-*` classes in TSX;
      use tokens
- [ ] No text smaller than 12px
- [ ] No placeholder people ("John Doe"), companies, or numbers
- [ ] No "Loading..." strings; use `Skeleton` or `Spinner`
- [ ] Icons from Phosphor only, `duotone` by default (set once in IconContext); `fill` only for active/selected state and small solid status marks; `bold` only below 16px
- [ ] Animated backgrounds only through the shared engine, within the budget

---

## 2. Colour tokens

Defined once as CSS variables in `frontend/src/styles/theme.css` (shape in
section 8). Components use **semantic** names (`brand`, `accent`, `surface-*`,
`content-*`), never palette names or hex values.

### 2.1 Palette (the only colours)

| Name | Hex | Role |
|---|---|---|
| Navy Blue | `#0047AB` | Brand. Primary actions, links, active nav, focus ring |
| Crimson | `#C1121F` | Accent. LIVE, destructive actions, errors, red card |
| Deep Navy | `#0D1B2A` | Dark surfaces (dark-mode cards, brand bands such as the public hero/footer), hover state of navy fills |
| Black | `#000000` | Text on light; dark-mode page |
| White | `#FFFFFF` | Text on dark and on navy/crimson fills; light-mode surfaces |

Everything else is **black or white at an opacity** (borders, secondary text,
subtle fills). No greys, slates, greens or ambers as separate hues.

**Dark-mode tints (required).** Navy and crimson are too dark to read as text or
thin icons on dark surfaces (navy on deep navy 2.06:1, crimson on deep navy 2.79:1,
navy on black 2.49:1; AA needs 4.5:1). In dark mode, *text, links, icons and focus
rings* use lighter tints of the same hues. *Fills* (buttons, LIVE badge) keep the
original colours with white text.

| Tint | Hex | Made from | Contrast on Deep Navy |
|---|---|---|---|
| Navy tint | `#8CACD9` | Navy + 55% white | 7.47 |
| Crimson tint | `#D7656D` | Crimson + 35% white | 4.95 |

### 2.2 Semantic tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand` | `#0047AB` | `#0047AB` | Fills: primary button, active pill, selected tab |
| `--brand-hover` | `#0D1B2A` | navy + 12% white (`#1F5BB3`) | Hover on brand fills (deep navy would vanish on a black page) |
| `--brand-text` | `#0047AB` | `#8CACD9` | Links, active nav label, brand icons, focus ring |
| `--brand-subtle` | navy 8% | navy tint 12% | Selected rows, active nav background |
| `--accent` | `#C1121F` | `#C1121F` | Fills: LIVE badge, danger button |
| `--accent-text` | `#C1121F` | `#D7656D` | Error text, destructive links, red-card label |
| `--surface-page` | `#FFFFFF` | `#000000` | Page background |
| `--surface-card` | `#FFFFFF` + border | `#0D1B2A` | Cards, tables, panels (solid, no blur) |
| `--surface-raised` | `#FFFFFF` + shadow | white 6% over `#0D1B2A` | Modals, popovers, dropdowns |
| `--surface-sunken` | black 4% | white 6% | Inputs, table header, hover rows |
| `--border-subtle` | black 10% | white 12% | Card and row dividers |
| `--border-strong` | black 24% | white 28% | Inputs, outlines |
| `--text-primary` | `#000000` at 90% | `#FFFFFF` at 92% | Headings, body, data |
| `--text-secondary` | black 72% | white 72% | Labels, meta, captions |
| `--text-tertiary` | black 60% | white 60% | Placeholder, disabled, timestamps |
| `--text-on-fill` | `#FFFFFF` | `#FFFFFF` | Text on navy, crimson, deep navy |

Never go below 60% opacity for text: black at 50% on white is 3.95:1 and fails.

Measured contrast (WCAG AA needs 4.5:1):

| Pair | Ratio |
|---|---|
| navy on white / white on navy | 8.44 |
| crimson on white / white on crimson | 6.22 |
| white on deep navy | 17.39 |
| black 72% on white | 9.29 |
| black 60% on white | 5.74 |
| white 72% on deep navy | 9.40 |
| white 60% on deep navy | 6.91 |
| navy tint on deep navy | 7.47 |
| crimson tint on deep navy | 4.95 |
| navy next to crimson | 1.36: never put one on the other; separate with white/black |

Retire: Tailwind `primary-*` (#3b82f6 family), `secondary-*` (#D32F2F),
`--athos-blue` (#0053F0), `--athos-red` (#D0021B), `--highlight-color` (it flips
blue→red between themes), all `slate-*`, `gray-*`, `zinc-*`, `green-*`, `amber-*`
classes in components.

### 2.3 Status

With a two-hue palette, status is carried by **icon + label first**, colour second.

| Status | Colour | Icon (Phosphor) | Use |
|---|---|---|---|
| Live | Crimson fill, white text, pulsing dot | — | LIVE badge only |
| Error / destructive | `--accent-text` | `WarningCircle` | Form errors, failed actions, delete |
| Success / completed | `--brand-text` | `CheckCircle` | Saved, verified, full time |
| Pending / warning | `--text-primary` on `--surface-sunken` | `Clock` / `Warning` | Pending, needs attention |
| Neutral / info | `--text-secondary` | `Info` | Scheduled, draft, notices |

**Exception: rugby discipline cards.** Yellow and red cards are match data, not
decoration. The card icon itself may use a literal yellow `#FFC800` and Crimson,
as a small filled rectangle with a black 24% outline. No text is ever set on the
yellow.

---

## 3. Typography

- **Family:** Inter for UI text. Oswald (`font-score`) only for scores, team short
  names and public page headings (decided 2026-10-07). Use
  `font-variant-numeric: tabular-nums` (`tabular-nums`) on scores, clocks, tables,
  and stats so digits do not jump.
- **Minimum size:** 12px. The 148 current uses of `text-[9|10|11px]` migrate to
  `text-xs` (12px) or are removed.

| Token / class | Size / line | Weight | Use |
|---|---|---|---|
| `text-display` | 40/44 (mobile 32/36) | 700 | Public hero only |
| `text-h1` | 30/36 (mobile 24/32) | 700 | Page title (one per page, inside `PageHeader`) |
| `text-h2` | 20/28 | 600 | Section title |
| `text-h3` | 16/24 | 600 | Card title |
| `text-body` | 15/24 | 400 | Default text |
| `text-sm` | 14/20 | 400 | Table cells, form inputs, secondary text |
| `text-xs` | 12/16 | 500 | Badges, captions, meta |
| `text-eyebrow` | 12/16, uppercase, tracking 0.06em | 600 | Section labels; max one per section |
| `text-score` | 48/48 (mobile 36/36), tabular | 800 | Match scores |

Sentence case for headings, buttons and nav ("Add player", not "Add Player").
UPPERCASE only for `text-eyebrow` and the LIVE badge.

---

## 4. Spacing, radius, elevation, motion, layers

**Spacing:** 4px base. Use Tailwind steps 1, 2, 3, 4, 6, 8, 12, 16 only.
Card padding: 16px mobile, 24px ≥768px. Page gutter: 16px mobile, 24px tablet,
32px desktop. Section gap: 32px (`space-y-8`).

**Radius**

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Badges, chips |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 14px | Cards, tables, sidebar |
| `--radius-xl` | 20px | Modals, bottom sheets |
| `--radius-full` | 9999px | Avatars, pills, the tournament pill |

Retire the current 18px and 24px card radii.

**Glass materials:**
1. **Chrome glass:** used by the public and admin floating glass tab bars, their accessories, and the public/admin sticky top bars.
   - Tokens (CSS variables in `frontend/src/styles/theme.css`, light / dark):
     - `--glass-bg`: `rgb(255 255 255 / 0.72)` / `rgb(13 27 42 / 0.72)` (deep navy `#0D1B2A`)
     - `--glass-border`: `rgb(255 255 255 / 0.55)` / `rgb(255 255 255 / 0.12)` (1px inner hairline, "glass edge")
     - `--glass-outline`: `rgb(0 0 0 / 0.08)` / `rgb(0 0 0 / 0.40)` (1px outer line so it separates from white pages)
     - `--glass-blur`: `20px`, saturate `180%`
     - `--glass-shadow`: the existing `--shadow-md` (no new shadow level, no coloured glow)
2. **Public glass cards (`surface="glass"`):** owner request 25 Oct. Public pages only (admin pages, tables, forms, bottom sheets/dialogs, dense match lists, and legal pages keep solid cards).
   - Light: background white ~78% with faint navy tint gradient (`--glass-card-bg`, `--glass-card-gradient`), 1px glass edge (white ~55%, `--glass-card-edge`) + 1px navy ~8% outline (`--glass-card-outline`), `shadow-sm`.
   - Dark: deep navy ~72% with navy-tint 6–8% (`--glass-card-bg`, `--glass-card-gradient`), 1px white ~10% edge (`--glass-card-edge`) + 1px black ~40% outline (`--glass-card-outline`).
   - Blur: `backdrop-filter: blur(12px) saturate(140%)` strictly at $\ge$ lg; below lg tint at ~88% opacity, no blur. Hover on links: border and tint slightly stronger, no scale.
   - Solid fallback (today's `--surface-card`): triggers under `prefers-reduced-transparency: reduce`, unsupported `backdrop-filter`, `?bg=off` / motion disallowed, and when the animated background flag is off in production (keeps today's solid look).

Fallbacks: `@supports not (backdrop-filter or -webkit-backdrop-filter)` AND `@media (prefers-reduced-transparency: reduce)` → solid `--surface-card` with the same border. Must stay readable (contrast AA) on the busiest background (hero image, dark mode red dots).
Note on top inset: the sticky top bar and the EnvironmentRibbon above it both receive `padding-top: env(safe-area-inset-top)`. This ensures nothing sits under the status bar when edge-to-edge; in dev/staging where the ribbon renders, both elements having the inset is intended and safe.

**Elevation:** three levels only.
`--shadow-sm` (cards, optional), `--shadow-md` (dropdowns, sticky bars),
`--shadow-lg` (modals). No coloured glows (`shadow-blue-500/30` and similar).

**Motion:** 150ms (hover, press), 200ms (dropdown, tab), 300ms (modal, drawer),
easing `cubic-bezier(0.2, 0, 0, 1)`. Wrap all non-essential animation in
`motion-safe:`. Allowed animations: fade, slide ≤8px, the LIVE dot pulse, skeleton
shimmer. Two named exceptions only:
1. **tab press:** scale to `0.96` for 150ms on tab-bar items only.
2. **tab bar minimise:** the bar/accessory morph on scroll, 300ms, standard easing.
3. **animated background:** calm 3D rugby pitch inside a stylized stadium bowl framing the pitch (inspired by National Stadium Bukit Jalil; generic naming, no stadium name or logo anywhere in UI). Markings ~22% light / ~30% dark, grass ~13% light / ~19% dark, stands ~15% light / ~22% dark, roof membrane ~20% light / ~28% dark, seats faint (~8–10%), posts ~45% with crimson pads, subtle sideline benches, ≤ 35% in auth panel. Dense stylized interactive grass (~16,000 fine blades, 0.45–0.75m tall, tips bend up to ~0.6m in the wake with white/deep-navy brightening, wind gust sweeping every 8–12s), click to kick (parabolic arc ≤ 1.2s, 1.2m 3× life size ball, crimson spark trail, goal post flash on score + inner roof floodlight glow for ~600ms), desktop slow crowd shimmer (≤ 2% of seats at a time; stops with desktop idle pause and settle mode), settle mode on touch/standalone PWA (6s initial sway + gust, then pauses loop on last frame; replays on calm navigation and tab visibility), desktop idle pause (stops render loop after 30s of inactivity; resumes on input), default cursor (no custom cursor), pausing when off-screen or tab hidden, completely disabled under `prefers-reduced-motion`, `saveData`, missing WebGL, or `?bg=off` (fading back to static SVG with stadium outline).
All three exceptions switch off under `prefers-reduced-motion` (state switches instantly). Nothing else animates.

### 4.1 Background system

The public site and sign-in pages use a calm 3D rugby pitch inside a stylized stadium bowl made of lines, points, and membranes built on the shared WebGL engine (`components/public/background/engine/`).

1. **Scenes per route:**
   - **Calm pitch + stadium framing (persistent WebGL canvas):** `/`, `/journey`, `/tournaments`, `/tournaments/:id`, `/teams`, `/teams/:id`, `/players`, `/players/:id`, `/partners`, `/sponsors`, `/how-it-works`.
     - Presets: `bgStadiumSideline` at $\ge 1024\text{px}$ (main stand at halfway, ~25m up, ~45m back from near touchline, looking across pitch); `bgStadiumEnd` below $1024\text{px}$ (end stand behind posts).
     - Geometry: merged into $\le 3$ extra draw calls (`LineSegments` for 400m 8-lane track, tier rims, vomitory aisles, roof rims/cables; `Points` for seats + inner roof floodlights; `Mesh` for translucent roof membrane).
   - **Static SVG pitch + stadium (canvas paused, faded out, render loop stopped):** `/matches/:matchId`, `/media/matches/:matchId`, `/contact`, `/privacy`, `/terms`, `/data-requests`, and unknown routes.
     - `PitchBackdropSvg` renders simplified track ring, tier boundaries, and roof rings matching the 3D projection, updating preset on crossing 1024px.
   - **/journey:** Uses the calm stadium background as its field (`routeType = 'calm'`). Milestones sit directly on the pitch between the H-posts via a fixed overlay, with click-to-kick disabled so interaction is reserved for milestone navigation.
   - **Sign-in pages:** The right-hand desktop panel (`hidden lg:flex`) renders `AuthPanelBackground` (tall behind-the-posts framing, pitch-only scene without stadium, opacity ≤ 35%, disposed on unmount, desktop hover wake active, no click kick). Mobile loads nothing in this panel.
2. **Distraction & Performance budgets:**
   - Opacities: pitch markings ~22% light / ~30% dark; grass ~13% light / ~19% dark; stands ~15% light / ~22% dark; roof membrane ~20% light / ~28% dark; seats ~8–10%; H-posts ~45% with crimson post pads; auth panel ≤ 35%. Crimson try lines accent marks.
   - Real 400m athletics track: 8 lanes × 1.22m, 84.39m straights, 36.5m inner radius, centred around the 120 × 70m pitch. Lower stand starts ~3m outside lane 8 (approx 91m × 49.5m from centre).
   - Click to kick (desktop fine pointer on calm routes): window click launches a 1.2 m 3D rugby ball (3× life size) on a parabolic arc (≤ 1.2 s) with crimson spark trail and grass ripple at kick point. Uprights and roof floodlights flash/glow if ball passes between uprights above crossbar. Single ball at a time. Verified against interactive elements, `[data-no-kick]`, text selections, and non-transparent backgrounds between click target and `<main>`.
   - Settle mode: touch devices (`pointer: coarse`) and installed PWA (`display-mode: standalone`) run idle sway + 1 wind gust for ~6 s on arriving at a calm route, then stop the render loop and keep the last frame (no continuous rendering). Replays on route change to a calm route and tab visibility. Crowd shimmer is disabled.
   - Desktop idle pause: stops render loop after 30 s without pointermove, scroll, wheel, or keydown; resumes on input. Frame remains visible while paused. Crowd shimmer freezes with pause.
   - Pure SVG & projection: `backgroundProjection.ts`, `stadiumGeometry.ts`, and `PitchBackdropSvg` remain pure with zero Three.js imports for native app reusability.
   - Purely decorative: `aria-hidden="true"`, pointer-events none on canvas, zero text/interactive elements, no new i18n keys.
3. **Environment switch & Fallbacks:**
   - **Production:** Switch stays OFF by default (renders legacy PNG background + overlay gradient exactly as before). Enabled only when `VITE_FEATURES` contains `animatedBackground`.
   - **Development & Staging:** Switch is ON by default by environment.
   - **Rollback / Override:** Staging is always on by environment; use `?bg=off` per browser for debugging, or revert the branch.
   - **Fallbacks:** Reduced motion (`prefers-reduced-motion: reduce`), Save-Data (`navigator.connection.saveData`), missing WebGL, or `?bg=off` render the zero-JS-animation static SVG pitch (`PitchBackdropSvg`).
4. **Admin background:** one static abstract SVG (Ascent) in brand colours; light/dark; no animation; cards stay solid; off in print and high-contrast.


**Z-index scale:** `base 0` · `sticky 20` · `nav 30` (floating tab bar) · `pill 35` (live accessory, tournament accessory) · `drawer 40` · `modal 50` · `toast 60`. Sheets and modals (40/50) always cover both tab bar and accessory. No arbitrary `z-[999]`.

---

## 5. Layout & platforms

### 5.1 Breakpoints

| Name | Width | Target | Admin shell | Public shell |
|---|---|---|---|---|
| base | <640 | Phone | Top bar + floating glass tab bar (+ tournament accessory) | Top bar + floating glass tab bar (+ live accessory) |
| `sm` | ≥640 | Large phone | same | Top bar + floating glass tab bar (+ live accessory) |
| `md` | ≥768 | Tablet portrait | same | Inline nav |
| `lg` | ≥1024 | Tablet landscape / laptop | Icon rail (72px), expandable (collapsed by default) | Inline nav |
| `xl` | ≥1280 | Desktop | Full sidebar (240px, expanded by default) | Inline nav |

Tablets are first-class: no layout may jump straight from phone drawer to full
desktop sidebar.

### 5.2 Page structure (admin)

```
PageHeader   title · optional description · Breadcrumbs (when depth ≥2) · primary action (right)
FilterBar    search + filters (sticky under header on mobile)
Content      Table (≥768) or Card list (<768) from the same data
```

Every admin page uses `PageHeader`. Max one primary button per page header.

### 5.3 Platform rules (PWA now, native later)

- Respect safe areas: fixed/sticky bars use `env(safe-area-inset-*)` padding.
- Touch targets ≥44×44px on anything tappable (icon buttons use 44px hit area even
  if the icon is 20px).
- Use `100dvh`, never `100vh`, for full-height layouts.
- No hover-only affordances: anything revealed on hover must also be reachable by tap/focus.
- Data fetching lives in `api/` + hooks, not inside page components, so screens can
  be re-skinned for a native shell without rewriting logic.

---

## 6. Components (the only allowed versions)

| Need | Use | Not |
|---|---|---|
| Button | `Button` variants: `primary` (solid brand), `secondary` (surface + border), `ghost`, `danger`. Sizes `sm` 36px, `md` 44px, `lg` 48px | gradients, `.btn-primary` CSS class, raw `<button>` with styles |
| Icon-only button | `IconButton` (44px hit area, required `aria-label`) | bare `<button><Icon/></button>` |
| Icon | Phosphor duotone, sizes 16/20/24 (32/48 empty states), colour = `currentColor` | other icon libraries, non-standard sizes, hardcoded icon colours |
| Card | `Card` (solid `surface-card`, `border-subtle`, `radius-lg`) | `GlassCard`, `glass-card` (retire) |
| Table | `Table` with sticky header, `tabular-nums` numeric columns, row → card on mobile | raw `<table>`, `glass-table` |
| Modal / sheet | `Modal` (centered ≥640, bottom sheet <640) | hand-rolled `fixed inset-0` overlays |
| Confirm | `ConfirmModal`; destructive confirm button is `danger`, cancel is `secondary` | `window.confirm` |
| Toast | `showToast` from `lib/customToast` (success / error / info) | direct `react-hot-toast` calls |
| Status | `StatusPill` with the status tokens | ad-hoc coloured spans |
| Empty | `EmptyState` (icon, one-line title, one-line hint, optional action) | inline "No data" text |
| Loading | `Skeleton` matching final layout; `Spinner` only inside buttons | "Loading..." text |
| Error | `ErrorState` (what failed + Retry) | `console.error` only, silent blank |
| Form field | `Field` = `Label` + `Input`/`Select`/`Textarea` + hint + error, error text in `--danger` | label/input pairs styled per page |
| Dropdown | `Select` (searchable when > 7 options, bottom sheet on phones) | native `<select>`, per-page custom menus |
| Tab bar / Live accessory | `GlassTabBar`, `PublicTabBar`, `PublicNowAccessory` (capsule floating nav with scroll minimise) | custom bottom navs, hardcoded floating menus |

### 6.1 Page or pop-up (CRUD rule)

| Use a **full page** (`/x/new`, `/x/:id/edit`) when | Use a **pop-up** (`Modal`; bottom sheet on phones) when |
|---|---|
| It creates or edits a main record: user, person, player, team, organisation, season, tournament, match | It is a short action inside another page: confirm, assign, add to roster, record an event, link a user |
| The form has more than ~5 fields or sections | The form has ~5 fields or fewer, one column |
| Someone may want to link to it, reload it, or come back to it | The user must stay in context and return to the same spot |

Rules:
- **One pattern per record type.** If a match is created on a page, it is created on
  that page from everywhere (e.g. from a tournament: go to `/dashboard/matches/new?tournamentId=…`,
  return to the tournament after saving).
- **No pop-up on top of a pop-up.** If a step needs a second dialog (e.g. a possible
  duplicate warning), show it inline in the first one or move the flow to a page.
- **Never the browser's own dialogs** (`window.confirm`, `alert`, `prompt`). Use `ConfirmModal`.
- **One confirm component.** `ConfirmModal` with a `danger` variant for deletes;
  `ConfirmDeleteModal` merges into it.
- Pages with forms warn before leaving with unsaved changes.
- After saving on a page, go back to where the user came from and show a success toast.

---

## 7. Content & data formatting

- **Locale:** `en-MY`, timezone `Asia/Kuala_Lumpur` for all display.
- **Dates:** `Sat, 4 Oct 2026` (`EEE, d MMM yyyy`). Ranges: `4–6 Oct 2026`.
  **Times:** `3:30 PM`. One helper in `utils/formatters.ts`; no direct
  `toLocaleDateString()` in components.
- **Roles:** never show `ROLE_*` or `SUPER_ADMIN`. Use a single map:
  Super admin · Organisation admin · Club admin · Official · Coach · Player.
- **Scores:** `24 – 17` (en dash, spaces), tabular numbers, winner in `text-primary`
  700, loser in `text-secondary`.
- **Empty values:** `—` (em dash), never `null`, `N/A`, or blank.
- **Voice:** short, direct, Malaysian-English spelling (organisation, colour,
  favourite). Buttons are verbs ("Save changes", "Add team").
- **Bilingual public site (EN + BM):** every branch that adds or changes public
  text ships EN + MS keys in `frontend/src/i18n/locales/` (verified by CI
  `check-i18n.mjs`). User content (team names, player names, tournament names,
  venues) is never translated. World Rugby terms stay in English inside BM (try,
  conversion, penalty try, drop goal, scrum, lineout, ruck, maul, sin bin,
  yellow card, red card).

---

## 8. Implementation notes

`theme.css` (shape, not final code):

Palette colours are stored as RGB channels (so `bg-brand/10` works). Neutrals are
complete `rgb(... / alpha)` values because they already carry their opacity.

```css
:root, [data-theme="light"] {
  --brand: 0 71 171;              /* #0047AB */
  --brand-hover: 13 27 42;        /* #0D1B2A */
  --brand-text: 0 71 171;
  --accent: 193 18 31;            /* #C1121F */
  --accent-text: 193 18 31;
  --surface-page: rgb(255 255 255);
  --surface-card: rgb(255 255 255);
  --surface-sunken: rgb(0 0 0 / 0.04);
  --line-subtle: rgb(0 0 0 / 0.10);
  --line-strong: rgb(0 0 0 / 0.24);
  --content-primary: rgb(0 0 0 / 0.90);
  --content-secondary: rgb(0 0 0 / 0.72);
  --content-tertiary: rgb(0 0 0 / 0.60);
}
[data-theme="dark"] {
  --brand-hover: 31 91 179;       /* #1F5BB3 */
  --brand-text: 140 172 217;      /* #8CACD9 navy tint */
  --accent-text: 215 101 109;     /* #D7656D crimson tint */
  --surface-page: rgb(0 0 0);
  --surface-card: rgb(13 27 42);  /* #0D1B2A */
  --surface-sunken: rgb(255 255 255 / 0.06);
  --line-subtle: rgb(255 255 255 / 0.12);
  --line-strong: rgb(255 255 255 / 0.28);
  --content-primary: rgb(255 255 255 / 0.92);
  --content-secondary: rgb(255 255 255 / 0.72);
  --content-tertiary: rgb(255 255 255 / 0.60);
}
```

`tailwind.config.js` maps semantic names:

```js
colors: {
  brand:   { DEFAULT: 'rgb(var(--brand) / <alpha-value>)', hover: 'rgb(var(--brand-hover) / <alpha-value>)', text: 'rgb(var(--brand-text) / <alpha-value>)' },
  accent:  { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', text: 'rgb(var(--accent-text) / <alpha-value>)' },
  surface: { page: 'var(--surface-page)', card: 'var(--surface-card)', sunken: 'var(--surface-sunken)' },
  content: { primary: 'var(--content-primary)', secondary: 'var(--content-secondary)', tertiary: 'var(--content-tertiary)' },
  line:    { subtle: 'var(--line-subtle)', strong: 'var(--line-strong)' },
  'card-yellow': '#FFC800',   // discipline card icon only
}
```

Usage: `bg-surface-card text-content-primary border-line-subtle`,
`bg-brand text-white hover:bg-brand-hover`, links `text-brand-text`,
errors `text-accent-text`, LIVE badge `bg-accent text-white`.

Keep `darkMode: 'class'` **and** `[data-theme]`; both are set by the boot script in
`index.html`. Tokens switch via `[data-theme]`, so components should rarely need
`dark:` variants.

### Guardrails (CI, after migration)

- Grep check fails the build on new `#[0-9a-fA-F]{6}` in `*.tsx`.
- Grep check fails on `text-\[(9|10|11)px\]`, `hover:scale-`, `from-blue-`, `window.confirm`.

---

## 9. Feature flags (unfinished features)

- Frontend: `VITE_FEATURES` (comma list, `*` = all). `useFeature('monetization')`
  hides nav entries and routes (route renders `NotFoundPage`).
- Resolution: if `VITE_FEATURES` is set, use it. If unset and running `npm run dev`
  (`import.meta.env.DEV`), everything is on. If unset in any build, every flagged
  feature is off.
- Staging lists released features in `frontend/.env.staging` (tracked, used by
  `deploy-frontend-staging.yml`). Production does the same in its env file.
- Known flags: `signup`, `monetization`, `federation`, `analytics`, `operations`.
- Decision (2026-10-06): `federation`, `analytics`, `operations` and `monetization`
  stay **off in staging and production** until the style migration is done and
  current bugs are stable. They keep running in `dev`. `signup` stays off until
  public registration is prepared.
- Frontend flags hide UI only. The backend endpoints stay role-protected; add
  server-side flags when a flagged feature touches public or sensitive data.
- `signup` stays **off** until public registration is ready. The Signup page code is
  kept (planned feature, not dead code).

---

## 10. Migration order

1. Trust fixes (no mock content, real contact form, real partners, feature flags).
2. Tokens: add new variables + Tailwind mapping alongside old ones; fix broken
   classes (`text-muted-foreground`, `border-input`, `bg-accent`).
3. Core components: `Button`, `IconButton`, `Card`, `Field`, `Skeleton`,
   `ErrorState`, `Modal` bottom sheet.
4. Shells: public layout, admin sidebar (icon rail on tablet), safe areas, PWA manifest.
5. Pages: admin pages adopt `PageHeader`/`Table`/`EmptyState`; public pages adopt
   tokens. One area per PR (e.g. Players + Teams, then Tournaments + Matches).
6. Remove retired tokens/classes, enable CI guardrails.

---

## 11. Profile Heroes & Brand Backgrounds

### 11.1 Brand Background v2 (`BrandBackground`)
- **Assets**: `admin-bg-ascent2-light.svg` and `admin-bg-ascent2-dark.svg` in `/brand/`.
- **Usage**:
  - Admin shell (`AppLayout`): full viewport behind content (`-z-10`, `print:hidden`, `contrast-more:hidden`).
  - Sign-in shell (`AuthLayout`): rendered once at the root layout level behind Login, Forgot password, Reset password, Accept invite, and Sign-up.
  - Auth page roots and right-hand panels are transparent (`bg-transparent`), letting the background show through.
  - Right-hand headline text uses `text-black dark:text-white` with `text-navy dark:text-navy-tint` accents to maintain AA contrast in both themes.

### 11.2 Unified Hero System (`ProfileHero`)
One shared hero component for Team, Player, and Organisation profiles across public and admin interfaces:
- **Surface**: Deep Navy (`#0D1B2A`) base with subtle horizontal jersey hoops (`JerseyHoops`) tinted with the organisation's primary and secondary colours, and an ambient diagonal wash.
- **Variants**:
  - `variant="team"`: rounded square crest tile with primary colour glow ring. Watermark uses team `shortName`, falling back to 2–3 uppercase initials (no truncated words).
  - `variant="player"`: circular avatar with crimson jersey number badge. Watermark uses jersey number (omitted if unavailable). Supports half-pitch `PositionPitch` aside.
  - `variant="organisation"`: circular logo tile with 4px primary colour ring (`boxShadow: 0 0 0 4px ${primary}`). Watermark uses organisation initials.
- **Breadcrumbs & Back Link Placement**:
  - Placed in the top row inside the hero for consistent alignment across all 5 profile views.
  - **Public pages**: Breadcrumbs appear on desktop (`>= lg`). On mobile (`< lg`), hero breadcrumbs are hidden because `PublicLayout` provides the dedicated phone Back row (`PUBLIC_DETAIL_PARENTS`).
  - **Admin pages**: Full breadcrumbs on desktop (`>= lg`); mobile (`< lg`) renders the hero's single Back link.
  - **Contrast on dark**: Links use `text-white/75 hover:text-white underline-offset-2 hover:underline decoration-white/40`, active item uses `text-white font-semibold`, and carets use `text-white/40`.
- **Contrast & Legibility Standards**:
  - All text and chips inside the hero must meet $\ge$ 4.5:1 WCAG AA contrast against `#0D1B2A`.
  - Stats band: numbers use `text-white font-bold` (17.4:1); stat labels use `text-white/70 uppercase tracking-wider text-[10px] sm:text-[11px]` (12.2:1).
  - Level pills with primary colour background compute text colour dynamically via `readableOn(primary)` (`#0D1B2A` or `#FFFFFF`).
- **Consistent Vocabulary (EN & BM)**:
  - Player appearances: always "Appearances" / "Penampilan" (never "Matches").
  - Player tries: always "Tries" / "Try".
  - Team tries: always "Tries scored" / "Try dijaringkan".
  - Team squad count: always "Squad" / "Skuad".
  - Tournaments: always "Tournaments" / "Kejohanan".

