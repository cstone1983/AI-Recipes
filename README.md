# CulinaryBase (AI-Recipes)

A self-hosted Recipe Manager with AI-powered importing, cookbook generation, and system backups.

## 🚀 Quick Install (Ubuntu)

Run this single command to install everything (Node.js, Dependencies, Database). **Run as a regular user with sudo privileges** (do not run as root):

```bash
git clone https://github.com/cstone1983/AI-Recipes.git
cd AI-Recipes
chmod +x install.sh
./install.sh
```

## 🔄 Boot Persistence (Auto-run)

To ensure the app starts automatically when your server reboots, run these commands after installation:

```bash
pm2 start server.ts --interpreter ./node_modules/.bin/tsx --name culinarybase
pm2 save
pm2 startup
```
**Note:** `pm2 startup` will output a command starting with `sudo env PATH=...`. You **must copy and paste** that specific command into your terminal to finish the setup.

## ☁️ Cloudflare Tunnel Setup

If you want to access your app securely from the internet without opening ports:

1. **Install cloudflared:**
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```
2. **Authenticate:**
   ```bash
   cloudflared tunnel login
   ```
3. **Create Tunnel:**
   ```bash
   cloudflared tunnel create culinary-tunnel
   ```
4. **Route DNS:**
   ```bash
   cloudflared tunnel route dns culinary-tunnel recipes.yourdomain.com
   ```
5. **Run Tunnel:**
   ```bash
   cloudflared tunnel run --url http://localhost:3000 culinary-tunnel
   ```
   *(To run as a service, use `sudo cloudflared service install` followed by `sudo systemctl start cloudflared`)*

## ⚙️ Configuration

- **API Key:** Set `GEMINI_API_KEY` in `.env` or via the Admin Panel (Settings).
- **Port:** Defaults to `3000`.
- **Reverse Proxy:** Recommended to use Nginx or Cloudflare Tunnels.

## 🔄 Updating

```bash
./update.sh
```

## ✨ Features

- **Universal Importer:** Extract recipes from URLs, text, or images via Gemini AI.
- **Cookbook Export:** Generate formatted DOCX cookbooks with custom layouts.
- **AI Discovery:** Find creative variations of your recipes.
- **Admin Tools:** Full system backup/restore and user management.

