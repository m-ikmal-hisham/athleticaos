# System Architecture - AthleticaOS

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    User[User (Browser/Mobile)] -->|HTTPS| PWA[PWA Frontend (React + Vite)]
    
    subgraph "Local Development Environment"
        PWA -->|REST API| API[Spring Boot Backend]
        
        API -->|JDBC| DB[(PostgreSQL Database)]
        API -->|Read/Write| FS[Local File System (Images/Docs)]
        
        subgraph "Security Layer"
            Auth[Spring Security]
            JWT[JWT Token Provider]
            Enc[Encryption Service (AES-256)]
        end
        
        API --> Auth
        Auth --> JWT
        API --> Enc
    end

    subgraph "External Services (Future)"
        Email[Email Service]
        Payment[Payment Gateway]
    end
    
    API -.-> Email
    API -.-> Payment
```

## 2. Component Description

### 2.1 Client Layer (PWA)
- **Technology**: React, TypeScript, Vite, Tailwind CSS.
- **Responsibility**: User Interface, State Management, API Consumption.
- **Features**: Responsive design, Offline capabilities (Service Worker), Form validation.

### 2.2 API Gateway / Backend Service
- **Technology**: Java 17, Spring Boot 3.
- **Responsibility**: Business Logic, Data Validation, Authentication, Authorization.
- **Key Modules**:
    - `UserController`: Auth & Profile management.
    - `OrgController`: Hierarchy management.
    - `TournamentController`: Scheduling & Results.
    - `SecurityConfig`: JWT filter chain & CORS.

### 2.3 Data Persistence Layer
- **Technology**: PostgreSQL 15.
- **Responsibility**: Relational data storage, ACID transactions.
- **Schema Management**: Flyway migrations.

### 2.4 Security Components
- **JWT**: Stateless session management.
- **AES-256**: Column-level encryption for sensitive PII (IC/Passport).
- **BCrypt**: Password hashing.

## 3. Data Flow Example: Match Result Entry

1. **User Action**: Team Manager submits match score via PWA.
2. **Frontend**: Validates input (non-negative scores), sends POST request with JWT.
3. **Security**: Backend validates JWT signature and checks `ROLE_TEAM_MANAGER` or `ROLE_OFFICIAL`.
4. **Controller**: Receives DTO, passes to `MatchService`.
5. **Service**:
    - Verifies match status is `LIVE` or `SCHEDULED`.
    - Updates score.
    - Creates `Audit_Log` entry.
6. **Database**: Commits transaction to `Match` and `Audit_Log` tables.
7. **Response**: Returns updated Match object to Frontend.
