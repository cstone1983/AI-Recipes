#!/bin/bash
set -e

echo "========================================"
echo " CulinaryBase - Update Script"
echo "========================================"

APP_DIR="/var/www/recipe-app"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: Directory $APP_DIR does not exist."
  exit 1
fi

cd $APP_DIR

# 1. Stash any local changes (protecting .env and prisma/app.db which are gitignored)
echo "[1/6] Stashing local changes..."
git stash

# 2. Pull latest changes
echo "[2/6] Pulling latest changes from main..."
git pull origin main

# 3. Reinstall dependencies
echo "[3/6] Reinstalling dependencies..."
npm install

# 4. Apply database migrations without dropping data
echo "[4/6] Applying database migrations..."
npx prisma generate
npx prisma db push --accept-data-loss=false

# 5. Rebuild frontend
echo "[5/6] Rebuilding frontend..."
npm run build

# 6. Restart PM2 service
echo "[6/6] Restarting PM2 service..."
pm2 restart recipe-app

echo "========================================"
echo " Update Complete!"
echo "========================================"
