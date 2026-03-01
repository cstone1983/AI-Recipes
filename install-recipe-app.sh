#!/bin/bash
set -e

echo "========================================"
echo " CulinaryBase - Installation Script"
echo "========================================"

# Variables
REPO_URL="https://github.com/placeholder/recipe-app.git"
APP_DIR="/var/www/recipe-app"
PORT=3000

# 1. Update and install dependencies
echo "[1/7] Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y curl git nginx build-essential

# 2. Install Node.js (v20)
echo "[2/7] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2
echo "[3/7] Installing PM2..."
sudo npm install -g pm2

# 4. Clone Repository
echo "[4/7] Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "Directory $APP_DIR already exists. Skipping clone."
else
  sudo git clone $REPO_URL $APP_DIR
  sudo chown -R $USER:$USER $APP_DIR
fi

cd $APP_DIR

# 5. Setup Application
echo "[5/7] Setting up application..."
# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  echo "DATABASE_URL=\"file:./prisma/app.db\"" > .env
  echo "GEMINI_API_KEY=\"YOUR_API_KEY_HERE\"" >> .env
  echo "Created default .env file. Please update GEMINI_API_KEY."
fi

npm install
npx prisma generate
npx prisma db push
npm run build

# 6. Setup PM2 Service
echo "[6/7] Configuring PM2..."
pm2 start npm --name "recipe-app" -- run start
pm2 save
pm2 startup | tail -n 1 | bash

# 7. Configure Nginx
echo "[7/7] Configuring Nginx..."
sudo bash -c "cat > /etc/nginx/sites-available/recipe-app <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF"

sudo ln -sf /etc/nginx/sites-available/recipe-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo "========================================"
echo " Installation Complete!"
echo " App is running on port 80 via Nginx."
echo " Please edit $APP_DIR/.env to add your Gemini API Key."
echo "========================================"
