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
# Ensure we have a remote named origin
# if ! git remote | grep -q "origin"; then
#   echo "Warning: No 'origin' remote found. Attempting to add it..."
#   git remote add origin https://github.com/cstone1983/AI-Recipes.git || true
# fi

# git fetch --all
# git reset --hard origin/main
echo "Skipping git pull to preserve local fixes..."

# 3. Reinstall dependencies
echo "[3/6] Reinstalling dependencies..."
if [ -f "package-lock.json" ]; then
  npm ci || npm install
else
  npm install
fi

# 4. Apply database migrations
echo "[4/6] Applying database migrations..."

# Ensure user_data directory exists
mkdir -p user_data

# Force export DATABASE_URL to ensure it is available to Prisma
export DATABASE_URL="file:../user_data/app.db"

# Load environment variables from .env if present (as backup/override if needed)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

npx prisma generate

# Function to attempt database repair
attempt_repair() {
    echo "Attempting to repair corrupted database..."
    DB_FILE="user_data/app.db"
    
    if [ ! -f "$DB_FILE" ]; then
        echo "❌ Database file not found at $DB_FILE"
        return 1
    fi

    if command -v sqlite3 &> /dev/null; then
        # Use .dump and .read to recreate the database from whatever data is readable
        mv "$DB_FILE" "$DB_FILE.corrupted"
        if sqlite3 "$DB_FILE.corrupted" .dump | sqlite3 "$DB_FILE"; then
            echo "✅ Database repair attempt finished. Retrying update..."
            return 0
        else
            echo "❌ Database repair failed."
            mv "$DB_FILE.corrupted" "$DB_FILE"
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
        echo "Resetting database automatically to fix corruption..."
        # Backup corrupted DB just in case
        cp user_data/app.db user_data/app.db.bak.$(date +%s) || true
        rm -f user_data/app.db
        rm -f user_data/app.db.corrupted
        npx prisma db push
    fi
fi

# 5. Rebuild frontend
echo "[5/6] Rebuilding frontend..."
npm run build

# 6. Restarting service
echo "[6/6] Restarting service..."
echo "The server will restart automatically when the process exits."

echo "========================================"
echo " Update Complete!"
echo "========================================"
