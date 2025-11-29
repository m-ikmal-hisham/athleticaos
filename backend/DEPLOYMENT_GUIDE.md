# AthleticaOS Rugby - Staging Deployment Guide

## Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://staging-db-host:5432/athleticaos_rugby
SPRING_DATASOURCE_USERNAME=athleticaos_user
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}

# JPA/Hibernate
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_JPA_SHOW_SQL=false
SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect

# Flyway Migrations
SPRING_FLYWAY_ENABLED=true
SPRING_FLYWAY_BASELINE_ON_MIGRATE=true
SPRING_FLYWAY_LOCATIONS=classpath:db/migration

# JWT Configuration
JWT_SECRET=${JWT_SECRET_KEY}
JWT_EXPIRATION=86400000

# Server Configuration
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=staging

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://staging.athleticaos.com,https://admin-staging.athleticaos.com

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_ATHLETICAOS=DEBUG
```

### Staging-Specific Configuration

Create `src/main/resources/application-staging.yml`:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
  
  jpa:
    properties:
      hibernate:
        format_sql: false
        use_sql_comments: false
  
  flyway:
    enabled: true
    baseline-on-migrate: true
    validate-on-migrate: true

server:
  error:
    include-message: always
    include-stacktrace: never

logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
  file:
    name: /var/log/athleticaos/application.log
    max-size: 10MB
    max-history: 30
```

---

## Pre-Deployment Checklist

### 1. Code Verification
- ✅ All tests passing locally
- ✅ Build successful: `mvn clean package -DskipTests`
- ✅ No compilation errors
- ✅ Swagger documentation complete

### 2. Database Preparation
- ✅ Staging database created
- ✅ Database user created with appropriate permissions
- ✅ Network access configured
- ✅ Backup of production data (if applicable)

### 3. Migration Verification
```bash
# Check migration files
ls -la src/main/resources/db/migration/

# Expected files:
V1__initial_schema.sql
V2__seed_roles.sql
V3__seed_admin_user.sql
V4__add_organisation_state_status.sql
V5__add_teams_division_state_status.sql
V6__fix_match_events_schema.sql
V7__fix_matches_schema.sql
V8__add_venue_to_matches.sql
V9__add_deleted_to_tournaments.sql
V10__add_organisation_id_to_users.sql
V11__add_tournament_bracket_fields.sql
V12__create_tournament_stages_table.sql
V13__add_stage_to_matches.sql
```

### 4. Security Configuration
- ✅ JWT secret generated (strong, random)
- ✅ Database password secured
- ✅ CORS origins configured
- ✅ SSL/TLS certificates ready

---

## Deployment Steps

### Option 1: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN apk add --no-cache maven
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: athleticaos_rugby
      POSTGRES_USER: athleticaos_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U athleticaos_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/athleticaos_rugby
      SPRING_DATASOURCE_USERNAME: athleticaos_user
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SPRING_PROFILES_ACTIVE: staging
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Deploy

```bash
# Set environment variables
export DB_PASSWORD="your_secure_password"
export JWT_SECRET="your_jwt_secret_key"

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Verify health
curl http://localhost:8080/actuator/health
```

### Option 2: Traditional Deployment

#### 1. Build Application

```bash
# Build JAR
mvn clean package -DskipTests

# Verify JAR created
ls -lh target/backend-0.0.1-SNAPSHOT.jar
```

#### 2. Deploy to Server

```bash
# Copy JAR to server
scp target/backend-0.0.1-SNAPSHOT.jar user@staging-server:/opt/athleticaos/

# SSH to server
ssh user@staging-server

# Create systemd service
sudo nano /etc/systemd/system/athleticaos-backend.service
```

#### 3. Systemd Service Configuration

```ini
[Unit]
Description=AthleticaOS Rugby Backend
After=network.target postgresql.service

[Service]
Type=simple
User=athleticaos
WorkingDirectory=/opt/athleticaos
ExecStart=/usr/bin/java -jar /opt/athleticaos/backend-0.0.1-SNAPSHOT.jar
Restart=on-failure
RestartSec=10

Environment="SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/athleticaos_rugby"
Environment="SPRING_DATASOURCE_USERNAME=athleticaos_user"
Environment="SPRING_DATASOURCE_PASSWORD=your_password"
Environment="JWT_SECRET=your_jwt_secret"
Environment="SPRING_PROFILES_ACTIVE=staging"

[Install]
WantedBy=multi-user.target
```

#### 4. Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable athleticaos-backend

# Start service
sudo systemctl start athleticaos-backend

# Check status
sudo systemctl status athleticaos-backend

# View logs
sudo journalctl -u athleticaos-backend -f
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Check application health
curl http://staging-server:8080/actuator/health

# Expected response:
{
  "status": "UP"
}
```

### 2. Database Migrations

```bash
# Check Flyway schema history
psql -h staging-db-host -U athleticaos_user -d athleticaos_rugby \
  -c "SELECT * FROM flyway_schema_history ORDER BY installed_rank;"

# Expected: All 13 migrations applied successfully
```

### 3. Swagger UI

```bash
# Access Swagger UI
open http://staging-server:8080/swagger-ui/index.html

# Verify all endpoints visible:
- Auth Controller
- Tournament Controller (with bracket endpoints)
- Match Controller (with progression endpoints)
- Team Controller
- Organisation Controller
- Player Controller
```

### 4. Authentication Test

```bash
# Test sign-in
curl -X POST http://staging-server:8080/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@athleticaos.com",
    "password": "admin123"
  }'

# Expected: JWT token returned
```

### 5. Bracket Generation Test

```bash
# Test bracket generation (use token from auth)
curl -X POST http://staging-server:8080/api/v1/tournaments/{id}/bracket/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "KNOCKOUT",
    "includePlacementStages": true,
    "teamIds": ["uuid1", "uuid2", "uuid3", "uuid4"]
  }'

# Expected: Bracket structure returned
```

---

## Monitoring & Logging

### Application Logs

```bash
# View live logs (Docker)
docker-compose logs -f backend

# View live logs (Systemd)
sudo journalctl -u athleticaos-backend -f

# Search for errors
sudo journalctl -u athleticaos-backend | grep ERROR

# View specific time range
sudo journalctl -u athleticaos-backend --since "1 hour ago"
```

### Database Monitoring

```bash
# Check active connections
psql -h staging-db-host -U athleticaos_user -d athleticaos_rugby \
  -c "SELECT count(*) FROM pg_stat_activity WHERE datname='athleticaos_rugby';"

# Check table sizes
psql -h staging-db-host -U athleticaos_user -d athleticaos_rugby \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Performance Metrics

```bash
# Check JVM memory
curl http://staging-server:8080/actuator/metrics/jvm.memory.used

# Check HTTP requests
curl http://staging-server:8080/actuator/metrics/http.server.requests

# Check database connections
curl http://staging-server:8080/actuator/metrics/hikaricp.connections.active
```

---

## Rollback Plan

### If Deployment Fails

#### 1. Stop New Version

```bash
# Docker
docker-compose down

# Systemd
sudo systemctl stop athleticaos-backend
```

#### 2. Restore Previous Version

```bash
# Copy previous JAR
sudo cp /opt/athleticaos/backup/backend-previous.jar /opt/athleticaos/backend-0.0.1-SNAPSHOT.jar

# Restart service
sudo systemctl start athleticaos-backend
```

#### 3. Rollback Database (if needed)

```bash
# Restore from backup
pg_restore -h staging-db-host -U athleticaos_user -d athleticaos_rugby backup.dump

# Or use Flyway repair
mvn flyway:repair -Dflyway.url=jdbc:postgresql://staging-db-host:5432/athleticaos_rugby
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database is running
pg_isready -h staging-db-host -p 5432

# Check credentials
psql -h staging-db-host -U athleticaos_user -d athleticaos_rugby

# Check network connectivity
telnet staging-db-host 5432
```

#### 2. Migration Failed

```bash
# Check Flyway schema history
SELECT * FROM flyway_schema_history WHERE success = false;

# Repair Flyway
mvn flyway:repair

# Re-run migrations
mvn flyway:migrate
```

#### 3. Application Won't Start

```bash
# Check logs for errors
sudo journalctl -u athleticaos-backend -n 100

# Common issues:
- Port 8080 already in use
- Insufficient memory
- Missing environment variables
- Database not accessible
```

#### 4. Swagger UI Not Loading

```bash
# Check if application is running
curl http://localhost:8080/actuator/health

# Check Swagger endpoint
curl http://localhost:8080/v3/api-docs

# Clear browser cache
# Try incognito mode
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 8080/tcp
sudo ufw allow 5432/tcp
sudo ufw enable
```

### 2. Database Security

```bash
# Create read-only user for reporting
CREATE USER athleticaos_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE athleticaos_rugby TO athleticaos_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO athleticaos_readonly;
```

### 3. Application Security

```yaml
# Add to application-staging.yml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${KEYSTORE_PASSWORD}
    key-store-type: PKCS12
```

---

## Maintenance

### Regular Tasks

#### Daily
- Check application logs for errors
- Monitor database connections
- Verify backup completion

#### Weekly
- Review performance metrics
- Check disk space
- Update dependencies (security patches)

#### Monthly
- Database vacuum and analyze
- Log rotation
- Security audit

### Backup Strategy

```bash
# Daily database backup
0 2 * * * pg_dump -h staging-db-host -U athleticaos_user athleticaos_rugby > /backups/daily/athleticaos_$(date +\%Y\%m\%d).sql

# Weekly full backup
0 3 * * 0 tar -czf /backups/weekly/athleticaos_$(date +\%Y\%m\%d).tar.gz /opt/athleticaos /backups/daily

# Retention: 7 daily, 4 weekly
find /backups/daily -name "*.sql" -mtime +7 -delete
find /backups/weekly -name "*.tar.gz" -mtime +28 -delete
```

---

## Success Criteria

✅ Application starts without errors
✅ All database migrations applied
✅ Swagger UI accessible
✅ Authentication working
✅ Bracket generation successful
✅ Match progression functional
✅ Pool standings calculated correctly
✅ Loser routing working
✅ No errors in logs
✅ Performance acceptable (<500ms response time)

---

## Support Contacts

- **Development Team**: dev@athleticaos.com
- **DevOps**: devops@athleticaos.com
- **Database Admin**: dba@athleticaos.com
- **On-Call**: +60-XXX-XXXXXXX
