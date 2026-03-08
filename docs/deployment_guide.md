# AthleticaOS Staging Deployment Guide

Complete guide: codebase preparation → AWS infrastructure → CI/CD automation.

> **Architecture**: Frontend on S3 + CloudFront · Backend on EC2 (Docker) · RDS PostgreSQL · Domain on GoDaddy
> **Last updated**: 2026-03-08

---

## Master Sequence Checklist

Follow this exact order:

### PHASE A: CODE PREPARATION (do first, before any AWS work)
- [x] A1. Fix hardcoded API URL in frontend `axios.ts`
- [x] A2. Update `application-staging.yml` (CORS, JWT, cookie)
- [x] A3. Update frontend `.env.staging` with staging URL placeholder
- [x] A4. Improve backend Dockerfile
- [x] A5. Commit and push all changes to `staging` branch

### PHASE B: AWS INFRASTRUCTURE (one-time setup)
- [ ] B1. Create IAM user for deployments
- [ ] B2. Create RDS PostgreSQL database
- [ ] B3. Create EC2 instance for backend
- [ ] B4. Create S3 bucket for frontend
- [ ] B5. Create CloudFront distribution (with SPA error page routing)
- [ ] B6. Configure security groups and networking
- [ ] B7. Request ACM SSL certificates + GoDaddy DNS validation
- [ ] B8. Point GoDaddy DNS records to AWS resources

### PHASE C: FIRST MANUAL DEPLOY (validate everything works)
- [ ] C1. Build and deploy backend JAR to EC2
- [ ] C2. Verify Flyway migrations run on RDS
- [ ] C3. Build frontend with staging env vars
- [ ] C4. Upload frontend to S3
- [ ] C5. Smoke test: login, navigate, verify API calls

### PHASE D: CI/CD AUTOMATION (after manual deploy is validated)
- [ ] D1. Create GitHub Actions workflow for backend (build → push Docker image → deploy to EC2)
- [ ] D2. Create GitHub Actions workflow for frontend (build → sync to S3 → invalidate CloudFront)
- [ ] D3. Store AWS credentials as GitHub Secrets
- [ ] D4. Test full CI/CD pipeline with a test commit

---

## Phase A: Completed Changes Summary

| Item | What was done |
|------|---------------|
| A1 | All 7 frontend files now use `import.meta.env.VITE_API_URL` — zero hardcoded `localhost:8080` |
| A2 | `application-staging.yml` has env-driven CORS (`FRONTEND_URL`, `PUBLIC_URL`), JWT config, `cookie.secure=true`, `SameSite=Lax` |
| A3 | `frontend/.env.staging` → `VITE_API_URL=https://staging-api.athleticaos.com` |
| A4 | Multi-stage Dockerfile: Alpine images, non-root user, health check, JVM container tuning, `.dockerignore` |
| A5 | Committed on `staging` branch, pushed to `origin/staging` |

---

## Phase B: AWS Infrastructure — Detailed Steps

### B1. Create IAM User for Deployments

1. AWS Console → **IAM** → **Users** → **Create User**
2. Username: `athleticaos-deployer`
3. Attach policies:
   - `AmazonS3FullAccess` (for frontend uploads)
   - `CloudFrontFullAccess` (for cache invalidation)
   - `AmazonEC2ContainerRegistryFullAccess` (if using ECR later)
4. Create access key → Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
5. Install AWS CLI locally:
   ```bash
   aws configure --profile athleticaos-staging
   ```

### B2. Create RDS PostgreSQL Database

1. AWS Console → **RDS** → **Create Database**
2. Settings:
   | Setting | Value |
   |---------|-------|
   | Engine | PostgreSQL 15 |
   | Template | Free Tier (or Dev/Test for staging) |
   | DB instance identifier | `athleticaos-staging-db` |
   | Master username | `athleticaos` |
   | Master password | *(generate strong password)* |
   | DB name | `athleticaos_staging` |
   | Instance class | `db.t3.micro` |
   | Storage | 20 GB GP3 |
   | Public access | **No** |
   | VPC | Same VPC as EC2 |

3. After creation, note the **Endpoint** — this becomes `DB_HOST` in `.env.staging`

### B3. Create EC2 Instance for Backend

1. AWS Console → **EC2** → **Launch Instance**
2. Settings:
   | Setting | Value |
   |---------|-------|
   | Name | `athleticaos-staging-backend` |
   | AMI | Amazon Linux 2023 |
   | Instance type | `t3.small` (2 vCPU, 2 GB) |
   | Key pair | Create or use existing |
   | VPC | Same VPC as RDS |

3. Allocate **Elastic IP** and associate with the instance
4. Note the Elastic IP → this becomes the `staging-api` A record in GoDaddy
5. SSH in and install Docker:
   ```bash
   sudo yum update -y
   sudo yum install -y docker git
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ec2-user
   # Log out and back in for group change to take effect
   ```

### B4. Create S3 Bucket for Frontend

1. AWS Console → **S3** → **Create Bucket**
2. Settings:
   | Setting | Value |
   |---------|-------|
   | Bucket name | `athleticaos-staging-frontend` |
   | Region | Same as EC2/RDS |
   | Block all public access | **Yes** (CloudFront will access via OAC) |

3. No need to enable static website hosting — CloudFront handles everything

### B5. Create CloudFront Distribution

1. AWS Console → **CloudFront** → **Create Distribution**
2. Settings:
   | Setting | Value |
   |---------|-------|
   | Origin domain | `athleticaos-staging-frontend.s3.amazonaws.com` |
   | Origin access | **Origin Access Control (OAC)** — create new |
   | Viewer protocol policy | **Redirect HTTP to HTTPS** |
   | Alternate domain name (CNAME) | `staging.athleticaos.com` |
   | SSL certificate | *(select ACM cert from B7 — do B7 first if needed)* |
   | Default root object | `index.html` |

3. **Critical — SPA routing**: Create custom error responses:
   | HTTP Error Code | Response Page Path | HTTP Response Code | Cache TTL |
   |-----------------|--------------------|--------------------|-----------|
   | 403 | `/index.html` | 200 | 0 |
   | 404 | `/index.html` | 200 | 0 |

   > Without this, direct navigation to `staging.athleticaos.com/dashboard` will return a 404.

4. Copy the S3 **bucket policy** that CloudFront shows you → Apply it to the S3 bucket

5. Note the **Distribution domain name** (e.g., `d1234abcdef.cloudfront.net`)

### B6. Configure Security Groups and Networking

**EC2 Backend SG** (`athleticaos-staging-backend-sg`):

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP only | SSH access |
| 8080 | TCP | 0.0.0.0/0 | Backend API |

**RDS PostgreSQL SG** (`athleticaos-staging-rds-sg`):

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 5432 | TCP | `athleticaos-staging-backend-sg` | DB access from EC2 only |

> [!WARNING]
> Never open RDS port 5432 to `0.0.0.0/0`. Restrict it to the EC2 security group.

### B7. Request ACM SSL Certificates + GoDaddy DNS Validation

> [!IMPORTANT]
> ACM certificates for CloudFront **must** be in `us-east-1` region regardless of where your other resources are.

1. AWS Console → **Certificate Manager** (switch to `us-east-1`) → **Request certificate**
2. Add domain names:
   - `staging.athleticaos.com`
   - `staging-api.athleticaos.com`
3. Choose **DNS validation**
4. AWS will show CNAME records needed for validation
5. **Add these in GoDaddy**:
   - Log in to [GoDaddy DNS Management](https://dcc.godaddy.com/manage-dns)
   - Select `athleticaos.com`
   - For each CNAME record that ACM provides:
     - Click **Add New Record** → Type: **CNAME**
     - Name: The `_<hash>` part only (GoDaddy auto-appends `.athleticaos.com`)
     - Value: The `_<hash>.acm-validations.aws.` target
     - TTL: 600

> [!WARNING]
> **GoDaddy gotcha**: If ACM says to add `_abc123.staging.athleticaos.com`, enter only `_abc123.staging` as the Name in GoDaddy — it auto-appends the domain.

6. Wait for ACM status to show **Issued** (usually 5–30 minutes)

### B8. Point GoDaddy DNS Records to AWS Resources

Add these records in GoDaddy DNS Management:

**Frontend → CloudFront:**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `staging` | `d1234abcdef.cloudfront.net` | 3600 |

**Backend → EC2:**
| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `staging-api` | `x.x.x.x` (EC2 Elastic IP) | 3600 |

Verify DNS propagation:
```bash
dig staging.athleticaos.com CNAME +short
# Expected: d1234abcdef.cloudfront.net

dig staging-api.athleticaos.com A +short
# Expected: x.x.x.x

# Or check global propagation:
# https://dnschecker.org
```

> [!TIP]
> GoDaddy DNS typically propagates within 5–30 minutes. Worst case is 48 hours.

---

## Phase C: First Manual Deploy — Detailed Steps

### C1. Build and Deploy Backend to EC2

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@staging-api.athleticaos.com

# Clone repo
git clone https://github.com/your-org/athleticaos.git
cd athleticaos
git checkout staging

# Update backend/.env.staging with real values:
#   DB_HOST       → RDS endpoint
#   DB_PASSWORD   → RDS password
#   JWT_SECRET    → generate with: openssl rand -base64 32
#   FRONTEND_URL  → https://staging.athleticaos.com
#   PUBLIC_URL    → https://staging.athleticaos.com
nano backend/.env.staging

# Build and run
cd backend
docker build -t athleticaos-backend .
docker run -d \
  --name athleticaos-backend \
  --restart unless-stopped \
  --env-file .env.staging \
  -p 8080:8080 \
  -v athleticaos-uploads:/app/uploads \
  athleticaos-backend
```

### C2. Verify Flyway Migrations on RDS

```bash
# Check container logs for migration output
docker logs athleticaos-backend 2>&1 | grep -i flyway

# Verify health
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

### C3. Build Frontend with Staging Env Vars

```bash
# On your LOCAL machine (not EC2)
cd frontend

# Verify .env.staging has the correct API URL
cat .env.staging
# VITE_API_URL=https://staging-api.athleticaos.com
# VITE_ENV=staging

# Build
npm run build -- --mode staging
```

### C4. Upload Frontend to S3

```bash
# Using AWS CLI configured in B1
aws s3 sync dist/ s3://athleticaos-staging-frontend --delete --profile athleticaos-staging

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*" \
  --profile athleticaos-staging
```

### C5. Smoke Test

```bash
# Backend health check
curl https://staging-api.athleticaos.com/actuator/health

# Auth test
curl -X POST https://staging-api.athleticaos.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@athleticaos.com", "password": "password123"}'

# Swagger UI
open https://staging-api.athleticaos.com/swagger-ui/index.html

# Frontend
open https://staging.athleticaos.com
```

**Manual checks:**
- [ ] Login/register flow works
- [ ] Tournament CRUD operations
- [ ] Match scoring + public live view
- [ ] Image uploads display correctly
- [ ] Browser console shows no CORS errors

---

## Environment Files Reference

### Backend: `.env.staging`

```bash
SPRING_PROFILES_ACTIVE=staging
SERVER_PORT=8080
DB_HOST=<RDS-ENDPOINT>           # e.g. athleticaos-staging-db.abc123.ap-southeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=athleticaos_staging
DB_USER=athleticaos
DB_PASSWORD=<RDS-PASSWORD>
JWT_SECRET=<GENERATED-SECRET>    # openssl rand -base64 32
JWT_EXPIRATION=86400000
FRONTEND_URL=https://staging.athleticaos.com
PUBLIC_URL=https://staging.athleticaos.com
```

### Frontend: `.env.staging`

```bash
VITE_API_URL=https://staging-api.athleticaos.com
VITE_ENV=staging
```

### Backend: `application-staging.yml` (key settings)

| Property | Value | Source |
|----------|-------|--------|
| `cors.allowed-origins` | `${FRONTEND_URL}`, `${PUBLIC_URL}` | Env var |
| `jwt.secret-key` | `${JWT_SECRET}` | Env var |
| `jwt.expiration` | `${JWT_EXPIRATION:86400000}` | Env var |
| `cookie.secure` | `true` | Hardcoded (HTTPS) |
| `cookie.same-site` | `Lax` | Hardcoded (cross-origin S3↔EC2) |

---

## Phase D: CI/CD Automation — Detailed Steps

> [!NOTE]
> Only set up CI/CD **after** Phase C (manual deploy) is validated and working. CI/CD automates what you already know works.

### D1. GitHub Actions — Backend Workflow

Create `.github/workflows/deploy-backend-staging.yml`:

```yaml
name: Deploy Backend to Staging

on:
  push:
    branches: [staging]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Build JAR
        working-directory: backend
        run: ./mvnw package -DskipTests -B

      - name: Build Docker image
        working-directory: backend
        run: docker build -t athleticaos-backend:${{ github.sha }} .

      - name: Save Docker image
        run: docker save athleticaos-backend:${{ github.sha }} | gzip > backend-image.tar.gz

      - name: Copy image to EC2
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          source: backend-image.tar.gz
          target: /home/ec2-user/

      - name: Deploy on EC2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            docker load < /home/ec2-user/backend-image.tar.gz
            docker stop athleticaos-backend || true
            docker rm athleticaos-backend || true
            docker run -d \
              --name athleticaos-backend \
              --restart unless-stopped \
              --env-file /home/ec2-user/athleticaos/backend/.env.staging \
              -p 8080:8080 \
              -v athleticaos-uploads:/app/uploads \
              athleticaos-backend:${{ github.sha }}
            rm /home/ec2-user/backend-image.tar.gz
```

### D2. GitHub Actions — Frontend Workflow

Create `.github/workflows/deploy-frontend-staging.yml`:

```yaml
name: Deploy Frontend to Staging

on:
  push:
    branches: [staging]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build
        working-directory: frontend
        run: npm run build -- --mode staging

      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@v0.5.1
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: ${{ secrets.STAGING_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
          SOURCE_DIR: frontend/dist

      - name: Invalidate CloudFront
        uses: chetan/invalidate-cloudfront-action@v2
        env:
          DISTRIBUTION: ${{ secrets.STAGING_CF_DISTRIBUTION_ID }}
          PATHS: '/*'
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### D3. GitHub Secrets to Configure

Go to **GitHub Repo → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `EC2_HOST` | EC2 Elastic IP (e.g., `x.x.x.x`) |
| `EC2_SSH_KEY` | Contents of your `.pem` key file |
| `AWS_ACCESS_KEY_ID` | From IAM user (B1) |
| `AWS_SECRET_ACCESS_KEY` | From IAM user (B1) |
| `AWS_REGION` | e.g., `ap-southeast-1` |
| `STAGING_S3_BUCKET` | `athleticaos-staging-frontend` |
| `STAGING_CF_DISTRIBUTION_ID` | CloudFront distribution ID |

### D4. Test CI/CD Pipeline

```bash
# Make a minor change and push
git checkout staging
echo "<!-- CI test -->" >> frontend/index.html
git add . && git commit -m "test: CI/CD pipeline"
git push origin staging

# Monitor in GitHub → Actions tab
```

---

## Rollback Plan

### Backend
```bash
docker stop athleticaos-backend && docker rm athleticaos-backend
docker run -d --name athleticaos-backend --env-file .env.staging -p 8080:8080 athleticaos-backend:previous
```

### Frontend
```bash
aws s3 sync ./dist-backup s3://athleticaos-staging-frontend --delete
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

### Database
```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier athleticaos-staging-restored \
  --db-snapshot-identifier <snapshot-id>
```

---

## Support Contacts

- **Development Team**: dev@athleticaos.com
- **DevOps**: devops@athleticaos.com
- **On-Call**: +60-XXX-XXXXXXX
