# Functional Requirements Document (FRD) - AthleticaOS Rugby

## 1. User Management Flows

### 1.1 Registration & Login
- **Public Registration**: Users can sign up with Email/Password or Social Login (Google).
- **Profile Completion**: New users must complete a basic profile (Name, DOB, Phone) before accessing other features.
- **Role Assignment**:
    - Default role: `Public`.
    - Admin assigns `Club Admin` or `Union Admin`.
    - Club Admin invites `Team Manager` and `Coach`.

### 1.2 Organisation Hierarchy Setup
- **Structure**:
    1. **National Body** (MRU) - Root level.
    2. **State Union** (e.g., Selangor Rugby) - Child of National.
    3. **District/Zone** - Child of State.
    4. **Club/School** - Leaf nodes, where teams and players reside.
- **Flow**:
    - Super Admin creates National & State bodies.
    - State Admins create Districts.
    - Club Admins register their Club/School under a District/State.

## 2. Player Lifecycle Management

### 2.1 Player Registration
- **Data Capture**: Full Name, IC/Passport (Encrypted), DOB, Gender, Nationality, Contact Info, Emergency Contact.
- **Physical Stats**: Height (cm), Weight (kg), Dominant Hand/Leg.
- **Document Upload**: Photo ID, Medical Clearance (optional).

### 2.2 Age-Group Evolution
- **Automatic Calculation**: System calculates "Rugby Age" based on DOB and Season Year (e.g., U12, U15, U18, Senior).
- **Season Rollover**: Admin triggers season rollover; players' age groups update automatically.

## 3. Tournament & Match Management

### 3.1 Tournament Creation
- **Setup**: Name, Level (National/State/School), Organiser, Dates, Venue.
- **Team Entry**: Organiser invites teams or opens registration.
- **Structure**: Define Pools (A, B, C, D) and Knockout Brackets (Cup, Plate, Bowl, Shield).

### 3.2 Match Creation
- **Scheduling**: Select Tournament -> Select Home Team -> Select Away Team -> Set Date/Time -> Set Venue/Field.
- **Officials**: Assign Referee, Assistant Referees, Match Commissioner.

### 3.3 Match Event Logging (Mobile First)
- **Interface**: Simple touch interface for pitch-side entry.
- **Event Types**:
    - **Score**: Try (5pts), Conversion (2pts), Penalty Goal (3pts), Drop Goal (3pts).
    - **Discipline**: Yellow Card (Sin Bin), Red Card (Send Off).
    - **Substitution**: Player On / Player Off (Time recorded).
- **Validation**: Cannot log events for non-rostered players.

## 4. Dashboard Requirements

### 4.1 Super Admin Dashboard
- System health status.
- Total users, players, organisations.
- Recent audit logs.

### 4.2 Union/Club Admin Dashboard
- Pending registrations/approvals.
- Upcoming matches/tournaments.
- Player statistics summary.

### 4.3 Public/Fan Dashboard
- Latest scores and results.
- League standings.
- Upcoming fixtures.

## 5. Data Validation & Error Handling

### 5.1 Validation Rules
- **IC/Passport**: Check format (Malaysian IC: YYMMDD-PB-####).
- **Email**: Standard regex validation.
- **Dates**: End Date >= Start Date.
- **Scores**: Cannot be negative.

### 5.2 Error Handling
- **UI**: User-friendly error messages (toast notifications) for form validation failures.
- **Backend**: Standard HTTP error codes (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Error).
