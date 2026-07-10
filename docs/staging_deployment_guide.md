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
- [x] B1. Create IAM user for deployments
- [x] B2. Create RDS PostgreSQL database
- [x] B3. Create EC2 instance for backend
- [x] B4. Create S3 bucket for frontend
- [x] B5. Create CloudFront distribution (with SPA error page routing)
- [x] B6. Verify security group rules
- [x] B7. Request ACM SSL certificates + GoDaddy DNS validation
- [x] B8. Point GoDaddy DNS records to AWS resources

### PHASE C: FIRST MANUAL DEPLOY (validate everything works)
- [x] C1. Build and deploy backend JAR to EC2
- [x] C1.5. Set up nginx + SSL on EC2 (HTTPS for backend API)
- [x] C2. Verify Flyway migrations run on RDS
- [x] C3. Build frontend with staging env vars
- [x] C4. Upload frontend to S3
- [x] C5. Smoke test: login, navigate, verify API calls

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
5. SSH into the EC2 instance and install Docker **on the server**:

   > [!NOTE]
   > This installs Docker on the **remote EC2 machine**, not your local Mac. Even if you already have Docker on your MacBook, the EC2 instance is a fresh server that needs its own Docker installation. The backend container will run on EC2 (used in Phase C and Phase D).

   🍎 **Run on your Mac Terminal:**
   ```bash
   # Set correct permissions for the .pem key (only needed once)
   chmod 400 ~/Downloads/athleticaos-staging-backend.pem

   # Connect to EC2
   ssh -i ~/Downloads/athleticaos-staging-backend.pem ec2-user@<ELASTIC-IP>
   ```

   🖥️ **Now you're on the EC2 server — install Docker:**
   ```bash
   sudo yum update -y
   sudo yum install -y docker git
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ec2-user

   # Log out and back in for group change to take effect
   exit
   ```

   🍎 **Back on your Mac — SSH in again (so the docker group takes effect):**
   ```bash
   ssh -i ~/Downloads/athleticaos-staging-backend.pem ec2-user@<ELASTIC-IP>
   ```

   🖥️ **Verify Docker is working (on EC2):**
   ```bash
   docker --version
   # Expected: Docker version 2x.x.x
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

### B6. Verify Security Group Rules

> [!NOTE]
> **What is a Security Group?** Think of it as a **firewall** for your AWS resource. Each rule says: *"Allow traffic on **this port**, from **this source**."* If no rule matches, the connection is blocked.
>
> AWS already created security groups when you launched your EC2 (B3) and RDS (B2). You don't need to create new ones — just **verify the existing rules are correct** and add any that are missing.

#### Step-by-step: Verify the EC2 Security Group

1. AWS Console → **EC2** → click your **`athleticaos-staging-backend`** instance
2. Scroll to the **Security** tab → click the linked **Security group**
3. Click the **Inbound rules** tab → check that these rules exist:

| Type | Port | Source | What it means |
|------|------|--------|---------------|
| **SSH** | 22 | **My IP** *(select from dropdown)* | Only **you** can SSH into the server |
| **HTTP** | 80 | `0.0.0.0/0` *(= Anywhere IPv4)* | Let's Encrypt renewal + HTTP→HTTPS redirect |
| **HTTPS** | 443 | `0.0.0.0/0` *(= Anywhere IPv4)* | HTTPS traffic to your API via nginx |
| **Custom TCP** | 8080 | `0.0.0.0/0` *(= Anywhere IPv4)* | Direct API access (can remove after nginx is confirmed working) |

4. **If any rule is missing**: Click **Edit inbound rules** → **Add rule** → fill in the values above → **Save rules**

> [!IMPORTANT]
> **What does "My IP" mean?**
> When you select **"My IP"** from the Source dropdown, AWS auto-fills your current public IP address (e.g., `175.136.xxx.xxx/32`). This means **only your MacBook's current internet connection** can SSH into the server. This is a security best practice — if SSH (port 22) were open to `0.0.0.0/0`, anyone in the world could attempt to log in.
>
> **If your IP changes** (e.g., you switch WiFi networks or your ISP assigns a new IP), you'll need to update this rule. To find your current public IP anytime, run:
> ```bash
> curl ifconfig.me
> ```

> **Why is port 8080 open to everyone (`0.0.0.0/0`)?**
> Because your backend API needs to be reachable by browsers visiting `staging.athleticaos.com`. Users, the frontend, and the health check all need to call `staging-api.athleticaos.com:8080`.

---

#### Step-by-step: Verify the RDS Security Group

1. AWS Console → **RDS** → click your **`athleticaos-staging-db`** instance
2. Scroll to **Connectivity & security** → click the linked **VPC security group**
3. Click the **Inbound rules** tab → check that this rule exists:

| Type | Port | Source | What it means |
|------|------|--------|---------------|
| **PostgreSQL** | 5432 | *your EC2 security group* *(select by SG ID or name)* | Only the EC2 instance can talk to the database |

4. **If missing or incorrect**: Click **Edit inbound rules** → **Add rule** → for Source, type your EC2 security group name and select it → **Save rules**

> [!WARNING]
> **Never** open port 5432 to `0.0.0.0/0`. That would expose your database to the entire internet. By using the EC2 security group as the source, only your backend server can connect — not even your MacBook directly.

---

#### How the two SGs work together (visual summary)

```
┌──────────────┐       ┌──────────────────────────┐       ┌─────────────────────┐
│  Your Mac    │──SSH──▶│  EC2 (backend-sg)         │──DB──▶│  RDS (rds-sg)       │
│  (Your IP)   │  :22   │  Port 22: Your IP only    │  :5432│  Port 5432: EC2 only│
└──────────────┘       │  Port 8080: Everyone       │       └─────────────────────┘
                        └──────────────────────────┘
                                  ▲ :8080
                           ┌──────┴──────┐
                           │  Internet   │
                           │  (browsers) │
                           └─────────────┘
```

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

> [!IMPORTANT]
> **Where do commands run?** Look for these labels:
> - 🍎 = Run on **your Mac Terminal** (local machine)
> - 🖥️ = Run on **the EC2 server** (remote, after SSH)
>
> **Access needed for Phase C:**
> - C1–C2: **SSH only** (your `.pem` key) — no AWS Console or IAM needed
> - C3: **Local Mac** — no AWS access needed
> - C4: **AWS CLI** with `athleticaos-deployer` profile (configured in B1)
> - C5: **Browser + local Mac** — no special access needed

---

### C1. Build and Deploy Backend to EC2

#### Step 1: SSH into EC2

🍎 **Run on your Mac Terminal:**
```bash
ssh -i ~/Downloads/athleticaos-staging-backend.pem ec2-user@staging-api.athleticaos.com
```

> [!TIP]
> If you get `Permission denied (publickey)`, run this first:
> ```bash
> chmod 400 ~/Downloads/athleticaos-staging-backend.pem
> ```
> Then try the SSH command again.

#### Step 2: Clone the repo and switch to staging branch

🖥️ **Run on EC2 (you should see `[ec2-user@... ~]$` prompt):**
```bash
git clone https://github.com/m-ikmal-hisham/athleticaos.git
cd athleticaos
git checkout staging
```

> [!TIP]
> If the repo is private, GitHub will ask for a password. Use a **Personal Access Token (PAT)** instead:
> 1. GitHub → Settings → Developer settings → Personal access tokens → Generate new token
> 2. Give it `repo` scope, set expiration
> 3. When prompted for password, paste the PAT

#### Step 3: Generate JWT secret

🖥️ **Still on EC2:**
```bash
openssl rand -base64 32
```
This outputs a random string like `aB3xK9mPq7wZ+Rl2nF8vYjDcHs5tGiEoN4uXkCyMf0=`

**Copy this value** — you'll paste it in the next step.

#### Step 4: Create the `.env.staging` file

🖥️ **Still on EC2:**
```bash
nano backend/.env.staging
```

Paste and fill in the following (replace `<...>` placeholders with your actual values):
```bash
SPRING_PROFILES_ACTIVE=staging
SERVER_PORT=8080
DB_HOST=<RDS-ENDPOINT>              # e.g. athleticaos-staging-db.abc123.ap-southeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=athleticaos_staging
DB_USER=athleticaos
DB_PASSWORD=<RDS-PASSWORD>           # the password you set when creating the RDS instance in B2
JWT_SECRET=<PASTE-FROM-STEP-3>       # the value from openssl rand -base64 32
JWT_EXPIRATION=86400000
FRONTEND_URL=https://staging.athleticaos.com
PUBLIC_URL=https://staging.athleticaos.com
```

**How to save in `nano`:**
1. Press **`Ctrl + O`** (letter O) → press **`Enter`** to confirm the filename
2. Press **`Ctrl + X`** to exit the editor

**Verify the file was saved correctly:**
```bash
cat backend/.env.staging
```
Make sure no `<...>` placeholders remain — every value should be filled in.

#### Step 5: Build the Docker image

🖥️ **Still on EC2:**
```bash
cd backend
docker build -t athleticaos-backend .
```
> This may take 3–5 minutes on the first build. You'll see Maven downloading dependencies.

#### Step 6: Run the container

🖥️ **Still on EC2 (still inside `backend/` directory):**
```bash
docker run -d \
  --name athleticaos-backend \
  --restart unless-stopped \
  --env-file .env.staging \
  -p 8080:8080 \
  -v athleticaos-uploads:/app/uploads \
  athleticaos-backend
```

**Verify the container is running:**
```bash
docker ps
```
You should see `athleticaos-backend` listed with status `Up X seconds`.

If the container isn't listed (it stopped), check the error:
```bash
docker logs athleticaos-backend
```

---

### C1.5. Set Up nginx + SSL on EC2 (HTTPS for Backend API)

> [!IMPORTANT]
> **Why is this needed?** The frontend is served over HTTPS (CloudFront), but the backend currently runs on plain HTTP:8080. Browsers block these "mixed content" requests — meaning login and all API calls from the browser will fail. Nginx acts as a reverse proxy that terminates SSL and forwards requests to Spring Boot.
>
> ```
> Browser ──HTTPS:443──▶ nginx (SSL) ──HTTP:8080──▶ Spring Boot
> ```

#### Step 1: SSH into EC2

🍎 **Run on your Mac Terminal:**
```bash
ssh -i ~/Downloads/athleticaos-staging-backend.pem ec2-user@staging-api.athleticaos.com
```

#### Step 2: Add port 443 to the Security Group

Before installing nginx, make sure HTTPS traffic can reach the server:

1. AWS Console → **EC2** → your instance → **Security** tab → click the **Security group**
2. **Edit inbound rules** → **Add rule**:
   - Type: **HTTPS**
   - Port: **443**
   - Source: **Anywhere-IPv4** (`0.0.0.0/0`)
3. **Save rules**

#### Step 3: Install nginx and certbot

🖥️ **Run on EC2:**
```bash
# Install nginx
sudo yum install -y nginx

# Start nginx and enable on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify nginx is running
sudo systemctl status nginx
# Should show: active (running)
```

Install certbot (Let's Encrypt client):
```bash
# Install pip3 if not already available
sudo yum install -y python3-pip augeas-libs

# Install certbot with nginx plugin via pip
sudo pip3 install certbot certbot-nginx
```

#### Step 4: Configure nginx as reverse proxy

🖥️ **Still on EC2:**
```bash
sudo nano /etc/nginx/conf.d/athleticaos-api.conf
```

Paste the following:
```nginx
server {
    listen 80;
    server_name staging-api.athleticaos.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save** (`Ctrl+O` → `Enter` → `Ctrl+X`), then test and reload:
```bash
# Test the config is valid
sudo nginx -t
# Expected: syntax is ok / test is successful

# Reload nginx
sudo systemctl reload nginx
```

**Quick test** — this should return the health check via nginx on port 80:
```bash
curl http://localhost/actuator/health
# Expected: {"status":"UP"}
```

#### Step 5: Obtain SSL certificate from Let's Encrypt

🖥️ **Still on EC2:**
```bash
sudo certbot --nginx -d staging-api.athleticaos.com --non-interactive --agree-tos -m your-email@example.com
```

> [!IMPORTANT]
> Replace `your-email@example.com` with your actual email — Let's Encrypt uses it for expiration notices.

Certbot will automatically:
- Obtain a free SSL certificate
- Modify the nginx config to add SSL (port 443)
- Set up HTTP → HTTPS redirect

**Verify HTTPS works (from EC2):**
```bash
curl https://staging-api.athleticaos.com/actuator/health
# Expected: {"status":"UP"}
```

#### Step 6: Set up auto-renewal

🖥️ **Still on EC2:**
```bash
# Test that renewal would work
sudo certbot renew --dry-run
# Expected: Congratulations, all simulated renewals succeeded

# Certbot installs a timer automatically — verify:
sudo systemctl list-timers | grep certbot
```

> [!NOTE]
> Let's Encrypt certificates expire every 90 days. The certbot timer handles automatic renewal — you don't need to do anything manually.

**You can now disconnect from EC2:**
```bash
exit
```

---

### C2. Verify Flyway Migrations on RDS

🖥️ **Still on EC2 (same SSH session from C1):**
```bash
# Check Flyway migration output in the logs
docker logs athleticaos-backend 2>&1 | grep -i flyway
# Expected: lines showing "Successfully applied X migration(s)"

# Check the backend health endpoint
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

> [!TIP]
> If health returns `{"status":"DOWN"}` or the curl fails, check the full logs:
> ```bash
> docker logs athleticaos-backend --tail 50
> ```
> Common issues: wrong `DB_HOST`, wrong `DB_PASSWORD`, or RDS security group not allowing EC2 access.

**Once health returns `UP`, you can disconnect from EC2:**
```bash
exit
```

---

### C3. Build Frontend with Staging Env Vars

🍎 **Run on your Mac Terminal (you should be back at your normal Mac prompt):**
```bash
cd ~/Developer/athleticaos/frontend

# Verify .env.staging has the correct API URL
cat .env.staging
# Expected output:
# VITE_API_URL=https://staging-api.athleticaos.com
# VITE_ENV=staging

# Install dependencies (if not already done)
npm install

# Build for staging
npm run build -- --mode staging
```

This creates a `dist/` folder containing the production-ready frontend files.

---

### C4. Upload Frontend to S3

🍎 **Run on your Mac Terminal (still in the `frontend/` directory):**
```bash
# Upload all files from dist/ to S3 (deletes any old files not in the new build)
aws s3 sync dist/ s3://athleticaos-staging-frontend --delete --profile athleticaos-staging

# Invalidate CloudFront cache so visitors see the new version immediately
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*" \
  --profile athleticaos-staging
```

> [!TIP]
> Replace `<DISTRIBUTION_ID>` with your CloudFront distribution ID from B5.
> You can find it in AWS Console → CloudFront → Distributions → look for the one with `staging.athleticaos.com`.

> [!TIP]
> If `aws` command is not found, install AWS CLI on your Mac:
> ```bash
> brew install awscli
> ```
> Then configure the deployer profile (from B1):
> ```bash
> aws configure --profile athleticaos-staging
> # Enter the Access Key ID and Secret Access Key from the IAM user (B1)
> # Region: ap-southeast-1 (or your region)
> # Output format: json
> ```

---

### C5. Smoke Test

> [!NOTE]
> After completing C1.5 (nginx + SSL), all backend URLs now use `https://` without a port number. Nginx handles SSL on port 443 and proxies to Spring Boot on port 8080 internally.

#### Backend tests (curl from Mac Terminal)

🍎 **Run on your Mac Terminal:**
```bash
# Backend health check (should return {"status":"UP"})
curl https://staging-api.athleticaos.com/actuator/health

# Auth test (try logging in)
curl -X POST https://staging-api.athleticaos.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@athleticaos.com", "password": "password123"}'

# Open Swagger UI in browser
open https://staging-api.athleticaos.com/swagger-ui/index.html
```

#### Frontend test

🍎 **Run on your Mac Terminal:**
```bash
# Open frontend in browser
open https://staging.athleticaos.com
```

> [!NOTE]
> The `open` command is Mac-specific — it opens the URL in your default browser.

**Manual checks in the browser:**
- [ ] Login/register flow works
- [ ] Tournament CRUD operations
- [ ] Match scoring + public live view
- [ ] Image uploads display correctly
- [ ] Browser console (Cmd+Option+J) shows no CORS or mixed content errors

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

> **Last updated**: 2026-03-13

### D1. GitHub Actions — Backend Workflow

Create `.github/workflows/deploy-backend-staging.yml`:

> [!IMPORTANT]
> **Why no separate JDK/Maven step?** Your Dockerfile is multi-stage — it includes JDK 21 and runs `mvnw package` inside the Docker build. GitHub Actions only needs Docker, which comes preinstalled on `ubuntu-latest`.

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
    timeout-minutes: 15

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        working-directory: backend
        run: docker build -t athleticaos-backend:${{ github.sha }} .

      - name: Save Docker image
        run: docker save athleticaos-backend:${{ github.sha }} | gzip > backend-image.tar.gz

      - name: Copy image to EC2
        uses: appleboy/scp-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          source: backend-image.tar.gz
          target: /home/ec2-user/

      - name: Deploy on EC2
        uses: appleboy/ssh-action@v1.2.5
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            # Load the new Docker image
            docker load < /home/ec2-user/backend-image.tar.gz

            # Stop and remove old container (|| true prevents error if not running)
            docker stop athleticaos-backend || true
            docker rm athleticaos-backend || true

            # Start new container with existing env file and uploads volume
            docker run -d \
              --name athleticaos-backend \
              --restart unless-stopped \
              --env-file /home/ec2-user/athleticaos/backend/.env.staging \
              -p 8080:8080 \
              -v athleticaos-uploads:/app/uploads \
              athleticaos-backend:${{ github.sha }}

            # Health check with retries (Spring Boot + Flyway can take 30-60s)
            echo "Waiting for backend to start..."
            for i in $(seq 1 9); do
              if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
                echo "Backend health check passed on attempt $i!"
                break
              fi
              if [ $i -eq 9 ]; then
                echo "Health check failed after 9 attempts (90s). Checking logs..."
                docker logs --tail 30 athleticaos-backend
                exit 1
              fi
              echo "Attempt $i/9 failed, retrying in 10s..."
              sleep 10
            done

            # Clean up
            rm /home/ec2-user/backend-image.tar.gz

            # Remove old Docker images (keep only the latest 2)
            docker image prune -f
            echo "Deployment complete!"
```

### D2. GitHub Actions — Frontend Workflow

Create `.github/workflows/deploy-frontend-staging.yml`:

> [!WARNING]
> The previous version of this guide used `jakejarvis/s3-sync-action` — that action has been **archived** (deprecated Jan 2025). The workflow below uses the official `aws-actions/configure-aws-credentials` + native AWS CLI instead.

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
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build for staging
        working-directory: frontend
        run: npm run build -- --mode staging

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Deploy to S3
        run: aws s3 sync frontend/dist/ s3://${{ secrets.STAGING_S3_BUCKET }} --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.STAGING_CF_DISTRIBUTION_ID }} \
            --paths "/*"
          echo "CloudFront invalidation created! Changes will be visible within 1-2 minutes."
```

### D3. GitHub Secrets to Configure

Go to [**GitHub Repo → Settings → Secrets → Actions**](https://github.com/m-ikmal-hisham/athleticaos/settings/secrets/actions) and add these **7 secrets**:

| Secret | Value | Where to find it |
|--------|-------|-------------------|
| `EC2_HOST` | EC2 Elastic IP (e.g., `13.229.x.x`) | AWS Console → EC2 → Instances → Elastic IP |
| `EC2_SSH_KEY` | Entire contents of your `.pem` key file | `cat ~/Downloads/athleticaos-staging-backend.pem \| pbcopy` → paste |
| `AWS_ACCESS_KEY_ID` | From IAM user `athleticaos-deployer` (B1) | AWS Console → IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | Paired with the access key ID above | Same as above |
| `AWS_REGION` | e.g., `ap-southeast-1` | Your AWS region |
| `STAGING_S3_BUCKET` | `athleticaos-staging-frontend` | AWS Console → S3 → Buckets |
| `STAGING_CF_DISTRIBUTION_ID` | e.g., `E1A2B3C4D5E6F7` | AWS Console → CloudFront → Distributions |

> [!CAUTION]
> **For `EC2_SSH_KEY`**: Include the **entire** file contents including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`. Use `pbcopy` as shown above to avoid missing characters.

### D4. Test CI/CD Pipeline

#### Step 1: Commit and push workflow files

🍎 **Run on your Mac Terminal:**
```bash
cd ~/Developer/athleticaos
git add .github/workflows/deploy-backend-staging.yml .github/workflows/deploy-frontend-staging.yml
git commit -m "ci: add GitHub Actions workflows for staging deployment"
git push origin staging
```

> [!NOTE]
> This push only adds `.github/` files — neither workflow will trigger since no `backend/` or `frontend/` files changed.

#### Step 2: Test frontend deployment

🍎 **Run on your Mac Terminal:**
```bash
echo "<!-- CI/CD test $(date +%Y%m%d%H%M%S) -->" >> frontend/index.html
git add frontend/index.html
git commit -m "test: trigger frontend CI/CD pipeline"
git push origin staging
```

Monitor at: https://github.com/m-ikmal-hisham/athleticaos/actions

#### Step 3: Test backend deployment

🍎 **Run on your Mac Terminal:**
```bash
echo "" >> backend/src/main/resources/application.yml
git add backend/src/main/resources/application.yml
git commit -m "test: trigger backend CI/CD pipeline"
git push origin staging
```

Monitor at: https://github.com/m-ikmal-hisham/athleticaos/actions — the "Deploy on EC2" step should show:
```
Backend health check passed!
Deployment complete!
```

#### Step 4: Verify both deployments

🍎 **Run on your Mac Terminal:**
```bash
# Frontend
open https://staging.athleticaos.com

# Backend health check
curl https://staging-api.athleticaos.com/actuator/health
# Expected: {"status":"UP"}
```

#### Step 5: Clean up test commits

```bash
# Remove the test lines from frontend/index.html and backend application.yml
git add -A && git commit -m "chore: clean up CI/CD test changes" && git push origin staging
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
