# ============================================
# Stage 1: Build
# ============================================
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Cache Maven dependencies first (only re-download when pom.xml changes)
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build (skip tests — they run in CI)
COPY src src
ARG GIT_SHA=unknown
RUN ./mvnw package -DskipTests -B -Dgit.commit.id.full=${GIT_SHA} && \
    # Extract the layered jar for better Docker layer caching
    java -Djarmode=layertools -jar target/*.jar extract --destination /extracted

# ============================================
# Stage 2: Runtime
# ============================================
FROM eclipse-temurin:21-jre-alpine

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Create uploads directory with correct ownership
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

# Copy layered jar (most-changed layers last for cache efficiency)
COPY --from=builder --chown=appuser:appgroup /extracted/dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /extracted/spring-boot-loader/ ./
COPY --from=builder --chown=appuser:appgroup /extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=appuser:appgroup /extracted/application/ ./

# Switch to non-root user
USER appuser

EXPOSE 8080

# Health check via Spring Boot Actuator
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# JVM tuning for containers
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "org.springframework.boot.loader.launch.JarLauncher"]
