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

## Contact form email
The public contact form persists all incoming submissions in the PostgreSQL database (`contact_messages` table). When email delivery is enabled, it sends a notification email to the configured recipient via Spring Mail.

In staging and production, email delivery remains disabled by default until SMTP credentials are provided. When ready to enable email delivery in production, set the following environment variables:

### Contact Form Variables
- `CONTACT_MAIL_ENABLED`: Set to `true` to enable outbound email notifications (defaults to `false`).
- `CONTACT_RECIPIENT`: Destination inbox for contact enquiries (e.g., `contact@athleticaos.com`).
- `CONTACT_FROM`: Sender address in the `From` header (defaults to `no-reply@athleticaos.com`).

### Spring Mail (SMTP) Variables
- `SPRING_MAIL_HOST`: SMTP server host (e.g., `smtp.sendgrid.net`, `email-smtp.us-east-1.amazonaws.com`).
- `SPRING_MAIL_PORT`: SMTP port (e.g., `587` for STARTTLS or `465` for SSL).
- `SPRING_MAIL_USERNAME`: SMTP authentication username.
- `SPRING_MAIL_PASSWORD`: SMTP authentication password or API key.
