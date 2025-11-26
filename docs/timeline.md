# Project Timeline - AthleticaOS Rugby (Phase 1-2)

## Constraints
- **Resource**: 1 Developer.
- **Availability**: Weekends Only (Sat/Sun).
- **Hours per Weekend**: ~12-16 hours.

## Phase 1: Architecture & Documentation (Completed)
| Task | Duration | Status |
|---|---|---|
| Project Charter & SRS | 0.5 Weekends | **Done** |
| FRD & SysRD | 0.5 Weekends | **Done** |
| Data Dictionary & ERD | 0.5 Weekends | **Done** |
| UX Flows & Architecture | 0.5 Weekends | **Done** |

## Phase 2: Core Backend Development (Estimated)

### Month 1: Foundation
| Weekend | Focus Area | Key Deliverables |
|---|---|---|
| W1 | Project Setup | Spring Boot Init, Docker Compose, Flyway Setup. |
| W2 | User Auth | User Entity, JWT Auth, Role Management, Security Config. |
| W3 | Organisation | Org Hierarchy Entities, CRUD APIs, Logo Upload. |
| W4 | Player Profile | Person/Player Entities, Encryption Util, Profile APIs. |

### Month 2: Tournament Engine
| Weekend | Focus Area | Key Deliverables |
|---|---|---|
| W5 | Teams & Rosters | Team Management, Player Assignment logic. |
| W6 | Tournament Setup | Tournament/Pool Entities, Fixture Generation Logic. |
| W7 | Match Engine | Match Entities, Event Logging API (Basic). |
| W8 | Testing & Refinement | Unit Tests, Integration Tests, Bug Fixes. |

## Phase 3: Frontend Development (Estimated)

### Month 3: UI Foundation & Auth
| Weekend | Focus Area | Key Deliverables |
|---|---|---|
| W9 | Setup & Design | Vite Setup, Tailwind Config, UI Components (Buttons, Inputs). |
| W10 | Auth Flows | Login Page, Registration Page, Protected Routes. |
| W11 | Org Management | Org Dashboard, Team Management UI. |
| W12 | Player Management | Player Profile UI, List Views, Search. |

### Month 4: Tournament & Match UI
| Weekend | Focus Area | Key Deliverables |
|---|---|---|
| W13 | Tournament Views | Public Tournament Page, Standings Tables. |
| W14 | Match Center | Live Scoreboard, Event Feed. |
| W15 | Admin Portal | Tournament Configuration UI, Match Scheduling UI. |
| W16 | Mobile Optimization | PWA Manifest, Touch Optimization for Match Logging. |

## Dependencies
1. **ERD** must be stable before **Backend Entities**.
2. **Backend APIs** must be tested before **Frontend Integration**.
3. **Auth Module** blocks almost all other features.
