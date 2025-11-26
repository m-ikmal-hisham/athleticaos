# System Requirements Document (SysRD) - AthleticaOS Rugby

## 1. Backend Architecture

### 1.1 Core Framework
- **Language**: Java 17 (LTS).
- **Framework**: Spring Boot 3.x.
- **Build Tool**: Maven.

### 1.2 Data Layer
- **Database**: PostgreSQL 15+.
- **ORM**: Spring Data JPA (Hibernate).
- **Migration**: Flyway for database schema version control.
- **Connection Pooling**: HikariCP.

### 1.3 API Layer
- **Style**: RESTful API.
- **Documentation**: OpenAPI 3.0 (Swagger UI).
- **Serialization**: Jackson (JSON).

### 1.4 Security Layer
- **Authentication**: Spring Security + JWT (Stateless).
- **Password Storage**: BCrypt hashing.
- **Encryption**: AES-256 for sensitive columns (IC/Passport) using a custom AttributeConverter.
- **CORS**: Configured to allow requests from the frontend domain only.

### 1.5 Logging
- **Framework**: SLF4J + Logback.
- **Strategy**:
    - `INFO`: General application flow.
    - `WARN`: Unexpected but handled issues.
    - `ERROR`: Exceptions and system failures.
    - `AUDIT`: Critical business actions (User creation, Match result modification).

## 2. Frontend Architecture

### 2.1 Core Framework
- **Language**: TypeScript.
- **Framework**: React 18+.
- **Build Tool**: Vite.

### 2.2 UI/UX
- **Styling**: Tailwind CSS.
- **Components**: Headless UI / Radix UI for accessibility.
- **Icons**: Lucide React / Heroicons.
- **Responsiveness**: Mobile-first design approach.

### 2.3 State Management
- **Global State**: React Context or Zustand (lightweight).
- **Server State**: TanStack Query (React Query) for caching and synchronization.

### 2.4 PWA Features
- **Manifest**: `manifest.json` for installability.
- **Service Worker**: Basic offline caching for static assets.

## 3. Deployment Architecture (Phase 1: Local)

### 3.1 Containerization
- **Docker**: `Dockerfile` for Backend and Frontend.
- **Orchestration**: `docker-compose.yml` to spin up Postgres, Backend, and Frontend together.

### 3.2 Environment Variables
- **Backend**: `application.properties` / `env` file for DB credentials, JWT secret, Encryption keys.
- **Frontend**: `.env` for API base URL.

## 4. Integration Points
- **Future**:
    - **Payment Gateway**: For tournament fees (e.g., ToyyibPay, Stripe).
    - **Notification Service**: Email (SendGrid/AWS SES) and SMS.
    - **External APIs**: Ministry of Education (MOE) data sync.
