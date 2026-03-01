#!/bin/bash

# CulinaryBase - Ubuntu Installation Script
# This script installs Node.js, SQLite3, and sets up CulinaryBase.

set -e

echo "------------------------------------------"
echo "   CulinaryBase - Ubuntu Installer        "
echo "------------------------------------------"

# 1. Check for Sudo
if [ "$EUID" -eq 0 ]; then
    echo "Please run this script as a regular user with sudo privileges, not as root."
    exit 1
fi

# 2. Update System
echo "[1/7] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 3. Install Dependencies
echo "[2/7] Installing core dependencies (curl, git, sqlite3)..."
sudo apt install -y curl git sqlite3 build-essential

# 4. Install Node.js (v20 LTS)
if ! command -v node &> /dev/null; then
    echo "[3/7] Installing Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "[3/7] Node.js is already installed ($(node -v))"
fi

# 5. Install PM2 Globally
if ! command -v pm2 &> /dev/null; then
    echo "[4/7] Installing PM2..."
    sudo npm install -g pm2
else
    echo "[4/7] PM2 is already installed"
fi

# 6. Setup Application
echo "[5/7] Installing application dependencies..."
npm install

# 7. Database Setup
echo "[6/7] Setting up database..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    # Set default allowed origin
    sed -i 's/ALLOWED_ORIGINS=.*/ALLOWED_ORIGINS=https:\/\/recipe.stoneyshome.com/' .env
fi

# Function to attempt database repair
attempt_repair() {
    echo "Attempting to repair corrupted database..."
    if command -v sqlite3 &> /dev/null; then
        # Use .dump and .read to recreate the database from whatever data is readable
        mv prisma/app.db prisma/app.db.corrupted
        if sqlite3 prisma/app.db.corrupted .dump | sqlite3 prisma/app.db; then
            echo "✅ Database repair attempt finished. Retrying setup..."
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

# Try to push the database, handle malformed image error
if ! npx prisma db push; then
    echo ""
    echo "⚠️  Database error detected (possibly a malformed disk image)."
    
    # Attempt repair first
    if attempt_repair; then
        if npx prisma db push; then
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
        read -p "Would you like to reset the database and continue? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Resetting database..."
            rm -f prisma/app.db
            rm -f prisma/app.db.corrupted
            npx prisma db push
        else
            echo "Installation aborted. Please fix the database error manually."
            exit 1
        fi
    fi
fi
npx prisma generate

# 8. Build Application
echo "[7/7] Building frontend..."
npm run build

echo "------------------------------------------"
echo "   Installation Complete!                 "
echo "------------------------------------------"
echo ""
echo "To start the application and enable auto-run at boot:"
echo "  1. Start the app: pm2 start server.ts --interpreter ./node_modules/.bin/tsx --name culinarybase"
echo "  2. Save the list: pm2 save"
echo "  3. Enable boot:   pm2 startup"
echo "     (Copy and paste the command it gives you into your terminal)"
echo ""
echo "Access the app at http://localhost:3000"
echo "------------------------------------------"
