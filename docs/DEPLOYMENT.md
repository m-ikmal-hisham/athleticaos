# Deployment & Environments

## 1. Local Development
### Backend
-   **Prerequisites**: JDK 17, Maven 3.8+, PostgreSQL.
-   **Command**: `mvn spring-boot:run`
-   **Config**: `application.properties` (or `application-dev.yml`).

### Frontend
-   **Prerequisites**: Node.js 18+, NPM/Yarn.
-   **Command**: `npm run dev`
-   **Config**: `.env` (Vite environment variables).

### Docker Setup
The project includes a `docker-compose.yml` for orchestrating the full stack locally.
-   **Command**: `docker-compose up -d`
-   **Services**: `backend`, `frontend`, `db` (Postgres).

## 2. Environment Variables
Typical `.env` configuration:
-   `VITE_API_URL`: URL of the backend API (e.g., `http://localhost:8080/api/v1`).
-   `SPRING_DATASOURCE_URL`: Database connection string.
-   `SPRING_DATASOURCE_USERNAME`: DB User.
-   `SPRING_DATASOURCE_PASSWORD`: DB Password.
-   `JWT_SECRET`: Secret key for token signing.

## 3. Production Deployment
-   **Model**: Containerized (Docker).
-   **Build**:
    -   Backend: `mvn clean package` -> Produces JAR -> Built into Docker Image.
    -   Frontend: `npm run build` -> Produces `dist/` -> Served via Nginx or embedded in Spring Boot (if combined, though separation is preferred).
-   **Infrastructure**: Suitable for deployment on AWS ECS, DigitalOcean App Platform, or similar container services.
