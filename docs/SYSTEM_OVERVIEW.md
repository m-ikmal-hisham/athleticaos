# System Overview

## 1. System Purpose
AthleticaOS is a comprehensive rugby tournament management system designed to streamline the operations of sports organisations. It handles the entire lifecycle of competitive rugby, from organisation and club management to tournament scheduling, match execution, and public dissemination of statistics.

## 2. Target Users & Roles
The system is built around a hierarchy of roles:
- **Super Admin**: Platform-wide access. Can manage all organisations and global settings.
- **Organisation Admin**: Manages a specific organisation (e.g., State Rugby Union). Can create tournaments, seasons, and manage affiliated clubs.
- **Club Admin**: Manages specific clubs and their teams/players.
- **Public**: View-only access to tournament schedules, results, and leaderboards via the public portal.

## 3. High-Level Architecture
The system follows a **Modular Monolith** architecture:
- **Backend**: A robust Spring Boot application serving REST APIs. It handles business logic, data persistence, and security.
- **Frontend**: A modern React Single Page Application (SPA) providing a responsive user interface. It is strictly separated into:
    - **Admin Dashboard**: For authenticated management operations.
    - **Public Portal**: For public viewing of match data.
- **Database**: PostgreSQL relational database for structured data storage.

## 4. Technology Stack

### Backend
- **Language**: Java 17
- **Framework**: Spring Boot 3.2.0
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA (Hibernate)
- **Security**: Spring Security with JWT (JSON Web Tokens)
- **Migration**: Flyway
- **API Documentation**: SpringDoc (Swagger/OpenAPI)

### Frontend
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS, PostCSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Icons**: Phosphor Icons

### Infrastructure / Deployment
- **Containerization**: Docker & Docker Compose
- **Build Tools**: Maven (Backend), NPM/Vite (Frontend)
- **Environment**: Support for Development, Staging, and Production environments via configuration profiles.
