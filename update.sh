#!/bin/bash
set -e

echo "========================================"
echo " CulinaryBase - Update Script"
echo "========================================"

APP_DIR=$(pwd)

if [ ! -f "package.json" ]; then
  echo "Error: This script must be run from the root of the CulinaryBase directory."
  exit 1
fi

# 1. Stash any local changes (protecting .env and prisma/app.db which are gitignored)
echo "[1/6] Stashing local changes..."
git stash || true

# 2. Pull latest changes
echo "[2/6] Pulling latest changes from main..."
git fetch --all
git reset --hard origin/main

# 3. Reinstall dependencies
echo "[3/6] Reinstalling dependencies..."
npm install

# 4. Apply database migrations
echo "[4/6] Applying database migrations..."
npx prisma generate

# Stop the app temporarily to prevent database locks/corruption during schema push
if pm2 list | grep -q "culinarybase"; then
  pm2 stop culinarybase
elif pm2 list | grep -q "recipe-app"; then
  pm2 stop recipe-app
fi

# Function to attempt database repair
attempt_repair() {
    echo "Attempting to repair corrupted database..."
    if command -v sqlite3 &> /dev/null; then
        # Use .dump and .read to recreate the database from whatever data is readable
        mv prisma/app.db prisma/app.db.corrupted
        if sqlite3 prisma/app.db.corrupted .dump | sqlite3 prisma/app.db; then
            echo "✅ Database repair attempt finished. Retrying update..."
            return 0
        else
            echo "❌ Database repair failed."
            mv prisma/app.db.corrupted prisma/app.db
            return 1
        fi
    else
        echo "❌ sqlite3 not found, cannot attempt repair."
        return 1
    fi
}

# Try to push the database
if ! npx prisma db push --accept-data-loss=false; then
    echo ""
    echo "⚠️  Database error detected (possibly a malformed disk image)."
    
    # Attempt repair first
    if attempt_repair; then
        if npx prisma db push --accept-data-loss=false; then
            echo "✅ Database updated successfully after repair."
        else
            echo "❌ Database still failing after repair."
            REPAIR_FAILED=true
        fi
    else
        REPAIR_FAILED=true
    fi

    if [ "$REPAIR_FAILED" = true ]; then
        echo "This can happen if the database file was severely corrupted."
        echo "If you continue, the database will be reset and ALL DATA WILL BE LOST."
        read -p "Would you like to reset the database to fix the corruption? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Resetting database..."
            rm -f prisma/app.db
            rm -f prisma/app.db.corrupted
            npx prisma db push
        else
            echo "Update aborted. Please fix the database error manually to preserve your data."
            # Restart the app since we stopped it
            pm2 start culinarybase || pm2 start recipe-app || true
            exit 1
        fi
    fi
fi

# 5. Rebuild frontend
echo "[5/6] Rebuilding frontend..."
npm run build

# 6. Restart PM2 service
echo "[6/6] Restarting PM2 service..."
if pm2 list | grep -q "culinarybase"; then
  pm2 restart culinarybase
elif pm2 list | grep -q "recipe-app"; then
  pm2 restart recipe-app
else
  echo "Warning: PM2 process not found. Please start it manually."
fi

echo "========================================"
echo " Update Complete!"
echo "========================================"
