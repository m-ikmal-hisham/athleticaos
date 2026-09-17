# athleticaos
Athlete and sports hub

## Requirements
*   **Java 21** (Eclipse Temurin / OpenJDK 21)
*   **Node.js** (for frontend)
*   **Docker** (for database & Testcontainers integration tests)

## JDK Requirement & Running Backend Tests

The backend is built with Spring Boot 3.2 targeting **Java 21**. If the host machine defaults to a different JDK (for example Java 25), the build and test execution will fail immediately.

### Symptom of Using the Wrong JDK
If invoked with an incompatible JDK such as Java 25:
* **Enforcer Gate**: The `maven-enforcer-plugin` halts the build during the initial phase with:
  ```text
  [ERROR] Rule 0: org.apache.maven.enforcer.rules.version.RequireJavaVersion failed with message:
  [ERROR] Java 21 is required for AthleticaOS backend (Byte Buddy / Spring Boot 3.2 compatibility). Please set JAVA_HOME to JDK 21.
  ```
* **Underlying Runtime Incompatibility**: If the enforcer is bypassed on Java 25, the test suite fails during bytecode generation because Byte Buddy / Mockito does not support class-file versions newer than Java 21 (`Unsupported class file major version` / Byte Buddy `IllegalArgumentException`).

### Developer Test Commands

Always ensure `JAVA_HOME` points to JDK 21 when running Maven commands:

1. **Unit Tests (Default)**
   Excludes Docker-dependent integration tests; suitable for quick local runs and environments without a Docker daemon:
   ```bash
   JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./mvnw test
   ```

2. **Integration Tests (Opt-in)**
   Runs integration-tagged tests using Testcontainers (requires Docker daemon running):
   ```bash
   JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./mvnw test -Pintegration
   ```
