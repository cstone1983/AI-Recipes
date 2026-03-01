import express from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import multer from 'multer';
import extract from 'extract-zip';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const prisma = new PrismaClient();

// Initialize Gemini API
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.warn("Gemini API Key not set or invalid.");
}

app.use(express.json());

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const upload = multer({ dest: 'temp_uploads/' });

// Mock Auth Middlewares
const adminAuth = (req: any, res: any, next: any) => {
  const role = req.headers['x-user-role'] || 'Admin';
  if (role !== 'Admin') return res.status(403).json({ error: 'Forbidden: Admin access required' });
  next();
};

const userAuth = (req: any, res: any, next: any) => {
  const userId = req.headers['x-user-id'] || 'user-1';
  req.user = { id: userId };
  next();
};

// --- Admin Backup & Restore ---

app.get('/api/admin/backup', adminAuth, (req, res) => {
  try {
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('recipe-app-backup.zip');
    archive.pipe(res);

    const dbPath = path.join(__dirname, 'prisma', 'app.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'app.db' });
    }

    if (fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, 'uploads');
    }

    archive.finalize();
  } catch (error: any) {
    console.error('Backup Error:', error);
    res.status(500).json({ error: 'Backup failed', traceback: error.stack });
  }
});

app.post('/api/admin/restore', adminAuth, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No backup file provided' });

    const zipPath = req.file.path;
    const extractPath = path.join(__dirname, 'temp_extract');
    
    await extract(zipPath, { dir: extractPath });

    const extractedDb = path.join(extractPath, 'app.db');
    if (fs.existsSync(extractedDb)) {
      fs.copyFileSync(extractedDb, path.join(__dirname, 'prisma', 'app.db'));
    }

    const extractedUploads = path.join(extractPath, 'uploads');
    if (fs.existsSync(extractedUploads)) {
      fs.cpSync(extractedUploads, UPLOADS_DIR, { recursive: true });
    }

    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.unlinkSync(zipPath);

    exec('pm2 restart recipe-app', (error) => {
      if (error) console.error('Failed to restart PM2:', error);
    });

    res.json({ success: true, message: 'Restore completed successfully. System restarting.' });
  } catch (error: any) {
    console.error('Restore Error:', error);
    res.status(500).json({ error: 'Restore failed', traceback: error.stack });
  }
});

// --- User JSON Export & Import ---

app.get('/api/user/export', userAuth, async (req: any, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { authorId: req.user.id },
      include: { ingredients: true, tags: true }
    });
    
    const formattedRecipes = recipes.map(r => ({
      ...r,
      instructions: (() => {
        try { return JSON.parse(r.instructions); } 
        catch { return [r.instructions]; }
      })()
    }));

    res.setHeader('Content-Type', 'application/json');
    res.attachment('my-recipes.json');
    res.send(JSON.stringify(formattedRecipes, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: 'Export failed', traceback: error.stack });
  }
});

app.post('/api/user/import', userAuth, upload.single('file'), async (req: any, res) => {
  try {
    const { mode } = req.body; // 'merge' or 'overwrite'
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const recipes = JSON.parse(fileContent);
    fs.unlinkSync(req.file.path);

    let importedCount = 0;

    for (const recipe of recipes) {
      const existing = await prisma.recipe.findFirst({
        where: { title: recipe.title, authorId: req.user.id }
      });

      if (existing) {
        if (mode === 'overwrite') {
          await prisma.recipe.delete({ where: { id: existing.id } });
        } else {
          continue; // Merge (skip duplicates)
        }
      }

      await prisma.recipe.create({
        data: {
          title: recipe.title,
          description: recipe.description,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          yield: recipe.yield,
          instructions: Array.isArray(recipe.instructions) ? JSON.stringify(recipe.instructions) : recipe.instructions,
          visibility: recipe.visibility || 'Private',
          authorId: req.user.id,
          ingredients: {
            create: recipe.ingredients?.map((i: any) => ({
              name: i.name,
              amount: i.amount,
              unit: i.unit,
              notes: i.notes
            })) || []
          }
        }
      });
      importedCount++;
    }

    res.json({ success: true, message: `Imported ${importedCount} recipes.` });
  } catch (error: any) {
    console.error('Import Error:', error);
    res.status(500).json({ error: 'Import failed', traceback: error.stack });
  }
});

// Universal Importer Endpoint
app.post('/api/import', async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ error: 'Gemini API is not configured.' });
    }

    const { input, type } = req.body; // type can be 'url', 'text', 'image'
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    let prompt = 'Extract the recipe details from the following content and format it as JSON.';
    let contents: any = input;

    if (type === 'image') {
       // Assuming input is base64 image data
       contents = {
         parts: [
           { inlineData: { data: input, mimeType: 'image/jpeg' } },
           { text: prompt }
         ]
       };
    } else {
       contents = `${prompt}\n\nContent:\n${input}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Recipe title' },
            description: { type: Type.STRING, description: 'Short description' },
            prepTime: { type: Type.INTEGER, description: 'Preparation time in minutes' },
            cookTime: { type: Type.INTEGER, description: 'Cooking time in minutes' },
            yield: { type: Type.STRING, description: 'Yield or servings' },
            instructions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Step-by-step instructions' 
            },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  notes: { type: Type.STRING }
                },
                required: ['name']
              }
            }
          },
          required: ['title', 'instructions', 'ingredients']
        }
      }
    });

    const recipeData = JSON.parse(response.text || '{}');
    res.json({ success: true, data: recipeData });

  } catch (error: any) {
    console.error('Import Error:', error);
    // Fail-safe: return raw text if AI parse fails
    res.status(500).json({ 
      error: 'Failed to parse recipe', 
      traceback: error.stack,
      rawInput: req.body.input 
    });
  }
});

// Update Endpoint
app.post('/api/system/update', async (req, res) => {
  // In a real app, verify admin permissions here
  try {
    exec('bash update.sh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Update error: ${error.message}`);
        return res.status(500).json({ error: 'Update failed', details: error.message });
      }
      res.json({ success: true, message: 'Update initiated successfully', logs: stdout });
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Update endpoint error', traceback: error.stack });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
