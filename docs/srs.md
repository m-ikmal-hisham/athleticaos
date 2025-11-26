# System Requirements Specification (SRS) - AthleticaOS Rugby

## 1. Introduction
This document outlines the functional and non-functional requirements for the AthleticaOS Rugby module, a comprehensive management system for the Malaysia Rugby ecosystem.

## 2. Functional Requirements (v1)

### 2.1 User Management & Access Control
- **FR-001**: System shall support Role-Based Access Control (RBAC).
- **FR-002**: Supported roles: Super Admin, Union Admin, Club Admin, Team Manager, Coach, Player, Public.
- **FR-003**: Secure login and password management (hashing).

### 2.2 Player Lifecycle
- **FR-004**: Track player profile (demographics, physical stats).
- **FR-005**: Manage season-based registration and age-group categorization.
- **FR-006**: Maintain player history across teams and seasons.

### 2.3 Organisation Management
- **FR-007**: Support hierarchical structure: National -> State -> District -> Club/School.
- **FR-008**: Manage organisation details, branding (logo, colors), and contacts.

### 2.4 Tournament & Match Management
- **FR-009**: Create and configure tournaments (pools, knockout stages).
- **FR-010**: Schedule matches with venue and time.
- **FR-011**: Record match results and detailed match events (tries, conversions, cards).

### 2.5 Calendar & Events
- **FR-012**: Global and organisation-specific calendar views.
- **FR-013**: Event creation (training, meetings, matches).

### 2.6 Customization
- **FR-014**: Support organisation-specific theming (primary/secondary colors, logos).

## 3. Non-Functional Requirements

### 3.1 Security & Compliance
- **NFR-001**: **PDPA Compliance**: All personal data (IC/Passport, Contact) must be handled according to Malaysian PDPA regulations.
- **NFR-002**: **Encryption**: Sensitive fields (IC/Passport) must be encrypted at rest.
- **NFR-003**: **Authentication**: Use JWT for stateless authentication.

### 3.2 Performance & Scalability
- **NFR-004**: System must support 1,000–30,000 active player records initially.
- **NFR-005**: API response time should be under 200ms for standard read operations.
- **NFR-006**: Architecture must support horizontal scaling for future multi-sport expansion.

### 3.3 Availability & Reliability
- **NFR-007**: Target 99.9% uptime during tournament seasons.
- **NFR-008**: robust error handling and audit logging for all critical actions.

### 3.4 Documentation
- **NFR-009**: Code must be self-documenting where possible, supplemented by API docs (Swagger/OpenAPI).
- **NFR-010**: Comprehensive setup and deployment guides required.

## 4. Compliance Requirements
- **CR-001**: Malaysia Personal Data Protection Act (PDPA) 2010.
- **CR-002**: Future integration readiness for Ministry of Education (MOE) systems (MSSM).
