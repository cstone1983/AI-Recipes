import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import multer from 'multer';
import extract from 'extract-zip';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import crypto from 'crypto';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const VERSION = "1.1.0";
const prisma = new PrismaClient();

// Update state
let isUpdating = false;
let updateLogs: string[] = [];
const updateEmitter = new EventEmitter();

// Trust proxy for Cloudflare/Tunnels
app.set('trust proxy', 1);

// Initialize Gemini API
let ai: GoogleGenAI | null = null;
let currentGeminiModel = "gemini-3-flash-preview";

async function initGemini() {
  try {
    const config = await prisma.globalConfig.findUnique({ where: { id: 'default' } });
    const apiKey = config?.geminiApiKey || process.env.GEMINI_API_KEY;
    const model = config?.geminiModel || "gemini-3-flash-preview";
    
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      ai = new GoogleGenAI({ apiKey });
      currentGeminiModel = model;
      const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '***';
      console.log(`Gemini initialized with model: ${model}. Key: ${maskedKey}`);
    } else {
      ai = null;
      console.warn("Gemini API Key not set or is a placeholder.");
    }
  } catch (e) {
    console.error("Failed to initialize Gemini:", e);
  }
}
initGemini();

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const upload = multer({ dest: 'temp_uploads/' });

// --- Global Middleware ---
const LOG_FILE = path.join(__dirname, 'server.log');
app.use((req, res, next) => {
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  console.log(logEntry.trim());
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

const allowedOrigins = [
  'https://recipe.stoneyshome.com',
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.APP_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
].filter(Boolean);

app.use(cors({
  origin: true, // Allow all origins explicitly
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token']
}));

// --- Authentication Middleware ---
const authenticate = async (req: any, res: any, next: any) => {
  console.log(`Authenticating request: ${req.url}`);
  try {
    const token = req.cookies.session_token || req.headers['x-session-token'] || req.query.token;
    if (!token) {
      console.log('No session token found in cookies or headers');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session) {
      console.log('Session not found for token');
      return res.status(401).json({ error: 'Session invalid' });
    }
    
    if (session.expiresAt < new Date()) {
      console.log('Session expired');
      return res.status(401).json({ error: 'Session expired' });
    }

    req.user = session.user;
    console.log(`Authenticated as: ${session.user.username}`);
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', traceback: error.stack });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

// --- API Router ---
const apiRouter = express.Router();

// Block most API requests during an update
apiRouter.use((req, res, next) => {
  if (isUpdating && req.path !== '/admin/update/stream' && req.path !== '/health') {
    return res.status(503).json({ error: 'System is updating. Please wait.' });
  }
  next();
});

apiRouter.get('/health', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ status: 'ok', userCount });
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

apiRouter.get('/ping', (req, res) => {
  res.send('pong');
});

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const isFirstUser = await prisma.user.count() === 0;
    const role = isFirstUser ? 'Admin' : 'User';

    const user = await prisma.user.create({
      data: { email, username, password: hashedPassword, role }
    });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt }
    });

    res.cookie('session_token', token, { 
      httpOnly: true, 
      expires: expiresAt,
      sameSite: 'none',
      secure: true
    });
    const config = await prisma.globalConfig.findUnique({ where: { id: 'default' } });
    const isAiConfigured = !!(config?.geminiApiKey || (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"));
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role }, isAiConfigured });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  console.log('Login attempt for:', req.body.loginId);
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login ID and password are required' });
    }
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: loginId },
          { username: loginId }
        ]
      } 
    });
    
    if (!user) {
      console.log('User not found:', loginId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for:', loginId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt }
    });

    res.cookie('session_token', token, { 
      httpOnly: true, 
      expires: expiresAt,
      sameSite: 'none',
      secure: true
    });
    console.log('Login successful for:', loginId);
    const config = await prisma.globalConfig.findUnique({ where: { id: 'default' } });
    const isAiConfigured = !!(config?.geminiApiKey || (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"));
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role }, isAiConfigured });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

apiRouter.post('/auth/logout', async (req, res) => {
  try {
    const token = req.cookies.session_token;
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    res.clearCookie('session_token');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout failed', traceback: error.stack });
  }
});

apiRouter.get('/auth/me', authenticate, async (req: any, res) => {
  const config = await prisma.globalConfig.findUnique({ where: { id: 'default' } });
  const isAiConfigured = !!(config?.geminiApiKey || (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"));
  res.json({ 
    user: { id: req.user.id, username: req.user.username, role: req.user.role },
    isAiConfigured
  });
});

apiRouter.put('/auth/password', authenticate, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid current password' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change password', message: error.message });
  }
});

apiRouter.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', traceback: error.stack });
  }
});

apiRouter.post('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, role: role || 'User' },
      select: { id: true, username: true, email: true, role: true, createdAt: true }
    });
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

apiRouter.put('/admin/users/:id/password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'New password is required' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user password', message: error.message });
  }
});

apiRouter.get('/admin/config', authenticate, requireAdmin, async (req, res) => {
  try {
    let config = await prisma.globalConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.globalConfig.create({ data: { id: 'default' } });
    }
    res.json({
      ...config,
      isConfigured: !!(config?.geminiApiKey || (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"))
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch config', traceback: error.stack });
  }
});

apiRouter.post('/admin/config', authenticate, requireAdmin, async (req, res) => {
  try {
    const { geminiApiKey, geminiModel, updateUrl } = req.body;
    const config = await prisma.globalConfig.upsert({
      where: { id: 'default' },
      update: { geminiApiKey, geminiModel, updateUrl },
      create: { id: 'default', geminiApiKey, geminiModel, updateUrl }
    });
    await initGemini(); // Re-initialize with new settings
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update config', traceback: error.stack });
  }
});

apiRouter.get('/admin/update/check', authenticate, requireAdmin, async (req, res) => {
  try {
    // 1. Fetch latest from git
    try {
      await execAsync('git fetch origin main');
    } catch (e) {
      console.warn('Git fetch failed, might be offline or no git repo:', e);
    }
    
    // 2. Check if local is behind remote
    let hasUpdate = false;
    let remoteHash = 'unknown';
    let commitMsg = 'No update info available';

    try {
      const { stdout: localHash } = await execAsync('git rev-parse HEAD');
      const { stdout: remoteHashRaw } = await execAsync('git rev-parse origin/main');
      remoteHash = remoteHashRaw.trim();
      hasUpdate = localHash.trim() !== remoteHash;
      
      const { stdout: commitMsgRaw } = await execAsync('git log -1 --pretty=%B origin/main');
      commitMsg = commitMsgRaw.trim();
    } catch (e) {
      console.warn('Git rev-parse failed:', e);
      // Fallback to version.json if git fails
      const config = await prisma.globalConfig.findUnique({ where: { id: 'default' } });
      const updateUrl = config?.updateUrl || "https://raw.githubusercontent.com/cstone1983/AI-Recipes/main/version.json";
      const response = await fetch(updateUrl);
      if (response.ok) {
        const data = await response.json();
        hasUpdate = data.version !== VERSION;
        remoteHash = data.version;
        commitMsg = data.releaseNotes || 'New version available';
      }
    }
    
    res.json({ 
      currentVersion: VERSION, 
      latestVersion: remoteHash.substring(0, 7), 
      hasUpdate,
      releaseNotes: commitMsg 
    });
  } catch (error: any) {
    console.error('Update check failed:', error);
    res.status(500).json({ error: 'Failed to check for updates', message: error.message });
  }
});

const execAsync = promisify(exec);

apiRouter.get('/admin/update/stream', authenticate, requireAdmin, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send existing logs immediately
  updateLogs.forEach(log => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  });

  const onLog = (log: string) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  };

  const onDone = (code: number) => {
    res.write(`data: ${JSON.stringify(`[DONE] Exit code: ${code}`)}\n\n`);
    res.end();
  };

  updateEmitter.on('log', onLog);
  updateEmitter.on('done', onDone);

  req.on('close', () => {
    updateEmitter.off('log', onLog);
    updateEmitter.off('done', onDone);
  });
});

apiRouter.post('/admin/update/apply', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('Update triggered via API. Version:', req.body.version);
    
    if (isUpdating) {
      return res.status(400).json({ error: 'An update is already in progress' });
    }

    isUpdating = true;
    updateLogs = ['Starting update process...'];
    updateEmitter.emit('log', 'Starting update process...');
    
    // Disconnect Prisma to release database locks
    await prisma.$disconnect();
    updateLogs.push('Database disconnected to prevent locks.');
    updateEmitter.emit('log', 'Database disconnected to prevent locks.');
    
    // Send response immediately because the server will restart
    res.json({ success: true, message: 'Update process started. The system will restart shortly.' });
    
    // Run the update script in the background using spawn to stream output
    const child = spawn('./update.sh', [], { shell: true });

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach((line: string) => {
        updateLogs.push(line);
        updateEmitter.emit('log', line);
      });
    });

    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach((line: string) => {
        updateLogs.push(`ERROR: ${line}`);
        updateEmitter.emit('log', `ERROR: ${line}`);
      });
    });

    child.on('close', (code) => {
      updateLogs.push(`Update script finished with code ${code}`);
      updateEmitter.emit('log', `Update script finished with code ${code}`);
      updateEmitter.emit('done', code ?? 0);
      if (code !== 0) {
        // If it failed, we might need to reset the updating state so they can try again
        isUpdating = false;
        prisma.$connect().catch(console.error); // Reconnect DB
      }
    });

  } catch (error: any) {
    isUpdating = false;
    res.status(500).json({ error: 'Failed to apply update', message: error.message });
  }
});

apiRouter.get('/admin/backup', authenticate, requireAdmin, async (req, res) => {
  try {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.zip`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/zip');

    archive.pipe(res);

    // Add database
    if (fs.existsSync('prisma/app.db')) {
      archive.file('prisma/app.db', { name: 'app.db' });
    }

    // Add uploads
    if (fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, 'uploads');
    }

    await archive.finalize();
  } catch (error: any) {
    console.error('Backup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create backup' });
    }
  }
});

apiRouter.post('/admin/restore', authenticate, requireAdmin, upload.single('backup'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    const zipPath = req.file.path;
    const extractPath = path.join(__dirname, 'temp_restore');

    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }
    fs.mkdirSync(extractPath, { recursive: true });

    await extract(zipPath, { dir: extractPath });

    // 1. Restore database
    const dbPath = path.join(extractPath, 'app.db');
    if (fs.existsSync(dbPath)) {
      // Close prisma connection first
      await prisma.$disconnect();
      fs.copyFileSync(dbPath, 'prisma/app.db');
    }

    // 2. Restore uploads
    const uploadsPath = path.join(extractPath, 'uploads');
    if (fs.existsSync(uploadsPath)) {
      if (fs.existsSync(UPLOADS_DIR)) {
        fs.rmSync(UPLOADS_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      
      // Copy files from uploadsPath to UPLOADS_DIR
      const files = fs.readdirSync(uploadsPath);
      for (const file of files) {
        fs.copyFileSync(path.join(uploadsPath, file), path.join(UPLOADS_DIR, file));
      }
    }

    // Cleanup
    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.unlinkSync(zipPath);

    res.json({ success: true, message: 'System restored successfully. Restarting server...' });

    // Restart the server
    setTimeout(() => {
      process.exit(0);
    }, 1000);

  } catch (error: any) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore system', message: error.message });
  }
});

// --- Recipe Routes ---
apiRouter.post('/recipes/parse', authenticate, async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: 'Gemini AI is not configured.', 
        message: 'Please provide a valid Gemini API Key in the Admin Panel settings.' 
      });
    }

    const { input, type, useWebSearch } = req.body;
    if (!input) return res.status(400).json({ error: 'Input is required' });

    console.log(`Parsing recipe using model: ${currentGeminiModel}, type: ${type}`);

    let contents: any;
    if (type === 'image' && input.startsWith('data:image')) {
      const base64Data = input.split(',')[1];
      const mimeType = input.split(';')[0].split(':')[1];
      contents = {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Extract recipe details from this image." }
        ]
      };
    } else {
      contents = `Extract recipe details from the following ${type}: ${input}`;
    }

    const prompt = `
      Return a strict JSON object matching this schema:
      {
        "title": "Recipe Name",
        "description": "Short description",
        "prepTime": 15, // in minutes
        "cookTime": 30, // in minutes
        "yield": "4 servings",
        "instructions": "Step 1... Step 2...", 
        "imageUrl": "https://example.com/image.jpg",
        "ingredients": [
          { "name": "Flour", "amount": 2, "unit": "cups", "notes": "sifted" }
        ]
      }
    `;

    const config: any = {
      systemInstruction: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          prepTime: { type: Type.INTEGER },
          cookTime: { type: Type.INTEGER },
          yield: { type: Type.STRING },
          instructions: { type: Type.STRING },
          imageUrl: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                notes: { type: Type.STRING }
              }
            }
          }
        },
        required: ['title', 'ingredients', 'instructions']
      }
    };

    if (useWebSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    console.log(`Calling Gemini with model: ${currentGeminiModel}`);
    const response = await ai.models.generateContent({
      model: currentGeminiModel,
      contents,
      config
    });

    console.log('Gemini response received');
    if (!response.text) {
      console.warn('Gemini returned empty text. Full response:', JSON.stringify(response, null, 2));
      return res.status(500).json({ error: 'Gemini returned an empty response. This might be due to safety filters or an invalid prompt.' });
    }

    try {
      const recipeData = JSON.parse(response.text.trim());
      res.json({ success: true, data: recipeData });
    } catch (parseError: any) {
      console.error('Failed to parse Gemini response as JSON:', response.text);
      res.status(500).json({ error: 'Failed to parse AI response', details: parseError.message });
    }

  } catch (error: any) {
    console.error('Gemini parse error:', error);
    res.status(500).json({ 
      error: 'Failed to parse recipe', 
      message: error.message,
      traceback: error.stack 
    });
  }
});

apiRouter.post('/recipes/search-similar', authenticate, async (req, res) => {
  try {
    if (!ai) return res.status(500).json({ error: 'AI not configured' });
    
    const { recipeId, prompt } = req.body;
    let context = "";
    
    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: { ingredients: true }
      });
      if (recipe) {
        context = `Based on this recipe: ${recipe.title}. Ingredients: ${recipe.ingredients.map(i => i.name).join(', ')}. `;
      }
    }
    
    const fullPrompt = `${context}Find 3 similar or variations of recipes. Be broad and creative. For each recipe, provide a title, description, and a list of key ingredients. Return as JSON array of objects with fields: title, description, ingredients (array of strings). ${prompt ? "Additional request: " + prompt : ""}`;
    
    const response = await ai.models.generateContent({
      model: currentGeminiModel,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "ingredients"]
          }
        }
      }
    });
    
    res.json({ success: true, data: JSON.parse(response.text || "[]") });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to search similar recipes', message: error.message });
  }
});

apiRouter.get('/recipes', authenticate, async (req: any, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { authorId: req.user.id },
      include: { ingredients: true }
    });
    res.json(recipes);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch recipes', traceback: error.stack });
  }
});

apiRouter.post('/recipes', authenticate, async (req: any, res) => {
  try {
    const { title, description, prepTime, cookTime, yield: recipeYield, instructions, imageUrl, visibility, category, ingredients } = req.body;
    const recipe = await prisma.recipe.create({
      data: {
        title,
        description,
        prepTime,
        cookTime,
        yield: recipeYield,
        instructions,
        imageUrl,
        visibility: visibility || 'Private',
        category,
        authorId: req.user.id,
        ingredients: {
          create: ingredients || []
        }
      }
    });
    res.json({ success: true, recipe });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save recipe', traceback: error.stack });
  }
});

apiRouter.post('/recipes/export/cookbook', authenticate, async (req: any, res) => {
  try {
    const { recipeIds, options } = req.body;
    const { layout = 'classic', design = 'standard', includeImages = true } = options || {};

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'No recipes selected' });
    }

    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds }, authorId: req.user.id },
      include: { ingredients: true }
    });

    const docChildren: any[] = [];
    
    recipes.forEach((recipe, index) => {
      // Title with design-specific styling
      docChildren.push(new Paragraph({ 
        text: recipe.title, 
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));

      if (recipe.description) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: recipe.description, italics: design === 'modern' })],
          spacing: { after: 200 }
        }));
      }
      
      const metaText = [];
      if (recipe.prepTime) metaText.push(`Prep: ${recipe.prepTime}m`);
      if (recipe.cookTime) metaText.push(`Cook: ${recipe.cookTime}m`);
      if (recipe.yield) metaText.push(`Yield: ${recipe.yield}`);
      if (recipe.category) metaText.push(`Category: ${recipe.category}`);
      
      if (metaText.length > 0) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: metaText.join(' | '), bold: true })],
          spacing: { after: 200 }
        }));
      }
      
      docChildren.push(new Paragraph({ 
        text: 'Ingredients', 
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }));

      recipe.ingredients.forEach(ing => {
        let ingText = `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim();
        if (ing.notes) ingText += ` (${ing.notes})`;
        docChildren.push(new Paragraph({ 
          text: `• ${ingText}`,
          bullet: { level: 0 }
        }));
      });
      
      docChildren.push(new Paragraph({ 
        text: 'Instructions', 
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }));
      
      // Handle multi-line instructions
      recipe.instructions.split('\n').forEach(line => {
        if (line.trim()) {
          docChildren.push(new Paragraph({ text: line.trim(), spacing: { after: 100 } }));
        }
      });
      
      if (index < recipes.length - 1) {
        docChildren.push(new Paragraph({ text: '', pageBreakBefore: true }));
      }
    });

    const doc = new Document({
      sections: [{ properties: {}, children: docChildren }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Disposition', 'attachment; filename=Cookbook.docx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export cookbook' });
  }
});

apiRouter.get('/user/export', authenticate, async (req: any, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { authorId: req.user.id },
      include: { ingredients: true }
    });
    res.setHeader('Content-Disposition', 'attachment; filename=MyRecipes.json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(recipes, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to export recipes' });
  }
});

// Mount API router
app.use('/api', apiRouter);

// API Catch-all
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

// --- Server Startup ---
async function startServer() {
  console.log('Starting server in', process.env.NODE_ENV || 'development', 'mode');

  // Create default admin if it doesn't exist
  try {
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@localhost',
          password: hashedPassword,
          role: 'Admin'
        }
      });
      console.log('Default admin account created (admin/admin)');
    }
  } catch (error) {
    console.error('Failed to create default admin:', error);
  }

  let vite: any;
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
        cors: true
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('Shutting down server...');
    if (vite) await vite.close();
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch(err => {
  console.error('Critical failure during server startup:', err);
  process.exit(1);
});
