#!/bin/bash

# AthleticaOS Staging Force-Sync & Verification Script
# Builds both frontend and backend locally, pushes to git, and deploys directly to EC2/S3.

set -e

# Configuration
PEM_KEY="$HOME/Downloads/athleticaos-staging-backend.pem"
EC2_HOST="staging-api.athleticaos.com"
EC2_USER="ec2-user"
S3_BUCKET="athleticaos-staging-frontend"
CF_DISTRIBUTION_ID="E2RZUY7LEUN900"
AWS_PROFILE="athleticaos-staging"

echo "🚀 Starting Staging Force-Sync..."

# 1. Verify branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "staging" ]; then
  echo "❌ Error: You must be on the 'staging' branch to sync. Current: $CURRENT_BRANCH"
  exit 1
fi

# 2. Git Push
echo "📦 Pushing changes to origin/staging..."
git push origin staging

# 3. Build Backend
echo "🏗️  Building Backend JAR locally..."
cd backend
./mvnw clean package -DskipTests
cd ..

# 4. Build Frontend
echo "🏗️  Building Frontend for Staging..."
cd frontend
npm install
npm run build -- --mode staging
cd ..

# 5. Upload Backend to EC2
echo "📤 Uploading Backend JAR to EC2..."
scp -i "$PEM_KEY" backend/target/backend-0.0.1-SNAPSHOT.jar "$EC2_USER@$EC2_HOST:~/"

# 6. Restart Backend on EC2
echo "🔄 Rebuilding and Restarting Backend Container on EC2..."
ssh -i "$PEM_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
  # Update code on host
  cd ~/athleticaos
  echo "Fetching latest changes from origin..."
  git fetch origin
  git reset --hard origin/staging

  # Rebuild the image from the latest code
  cd backend
  GIT_SHA=$(git rev-parse --short HEAD)
  echo "Rebuilding Docker image on host (SHA: $GIT_SHA)..."
  docker build -t athleticaos-backend --build-arg GIT_SHA=$GIT_SHA .

  # Stop and remove the existing container (minimize downtime & avoid watchdog races)
  echo "Stopping existing container..."
  docker stop athleticaos-backend || true
  docker rm athleticaos-backend || true

  echo "Starting new container..."
  docker run -d \
    --name athleticaos-backend \
    --restart unless-stopped \
    --env-file .env.staging \
    -p 8080:8080 \
    -v athleticaos-uploads:/app/uploads \
    athleticaos-backend

  echo "Waiting for health check..."
  for i in {1..10}; do
    if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
      echo "✅ Backend is UP and Healthy!"
      break
    fi
    echo "Attempt $i/10: Backend starting..."
    sleep 5
  done
EOF

# 7. Upload Frontend to S3
echo "📤 Uploading Frontend to S3..."
aws s3 sync frontend/dist/ "s3://$S3_BUCKET" --delete --profile "$AWS_PROFILE"

# 8. Invalidate CloudFront
echo "🧹 Invalidating CloudFront Cache..."
aws cloudfront create-invalidation --distribution-id "$CF_DISTRIBUTION_ID" --paths "/*" --profile "$AWS_PROFILE"

echo "✨ Staging Sync Complete!"
echo "-----------------------------------"
echo "Backend Info:   https://$EC2_HOST/api/v1/system/info"
echo "Frontend:       https://staging.athleticaos.com"
echo "Check Version:  In browser footer or console."
echo "-----------------------------------"
