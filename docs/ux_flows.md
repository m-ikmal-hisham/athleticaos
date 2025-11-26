# UX Flow Diagrams - AthleticaOS Rugby

## 1. Login Flow

```mermaid
sequenceDiagram
    participant User
    participant PWA as Frontend (PWA)
    participant API as Backend API
    participant DB as Database

    User->>PWA: Enters Email & Password
    PWA->>API: POST /api/auth/login
    API->>DB: Query User by Email
    DB-->>API: Return User Hash
    API->>API: Verify Password (BCrypt)
    alt Valid Credentials
        API->>API: Generate JWT
        API-->>PWA: Return JWT + User Profile
        PWA->>PWA: Store JWT in LocalStorage
        PWA-->>User: Redirect to Dashboard
    else Invalid Credentials
        API-->>PWA: 401 Unauthorized
        PWA-->>User: Show Error Message
    end
```

## 2. Player Registration Flow

```mermaid
graph TD
    Start([User Starts Registration]) --> Form[Fill Personal Details Form]
    Form --> Upload[Upload Photo & ID]
    Upload --> Consent[Agree to PDPA & Terms]
    Consent --> Submit[Submit Registration]
    
    Submit --> API{API Validation}
    API -- Invalid --> Error[Show Validation Errors] --> Form
    API -- Valid --> Encrypt[Encrypt ID Number]
    Encrypt --> SaveDB[(Save to Database)]
    SaveDB --> Success[Show Success Message]
    Success --> End([Redirect to Profile])
```

## 3. Organisation Setup Flow (Admin)

```mermaid
graph LR
    Login[Admin Login] --> Dashboard
    Dashboard --> CreateOrg[Create Organisation]
    CreateOrg --> OrgDetails[Enter Name, Type, Logo]
    OrgDetails --> ParentOrg[Select Parent Org (if any)]
    ParentOrg --> Save[Save Organisation]
    Save --> Invite[Invite Admins/Coaches]
```

## 4. Tournament Management Flow

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Published: Publish Tournament
    Published --> OpenRegistration: Open for Teams
    OpenRegistration --> ClosedRegistration: Close Deadline
    ClosedRegistration --> DrawGenerated: Generate Pools/Fixtures
    DrawGenerated --> Live: Start Tournament
    Live --> Completed: All Matches Finished
    Completed --> [*]
```

## 5. Match Event Capture (Mobile)

```mermaid
graph TD
    SelectMatch[Select Live Match] --> MainScreen[Match Control Screen]
    
    subgraph "Event Actions"
        MainScreen --> Try[Tap 'TRY']
        MainScreen --> Conv[Tap 'CONVERSION']
        MainScreen --> Sub[Tap 'SUBSTITUTION']
        MainScreen --> Card[Tap 'CARD']
    end
    
    Try --> SelectPlayer[Select Player]
    SelectPlayer --> Confirm[Confirm Time & Score]
    Confirm --> UpdateAPI[Send Update to API]
    UpdateAPI --> UpdateUI[Update Scoreboard UI]
```

## 6. Viewing Standings & Stats

1. **User** navigates to "Tournaments" tab.
2. **User** selects a specific Tournament.
3. **System** displays Tabs: "Fixtures", "Standings", "Stats".
4. **User** clicks "Standings".
5. **System** fetches Pool Tables (Points, W/D/L, PD).
6. **User** clicks "Stats".
7. **System** fetches Top Try Scorers, Top Point Scorers.
