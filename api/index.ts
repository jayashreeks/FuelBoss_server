// server/index.ts
import express from 'express';
import cors from 'cors';
import { registerRoutes } from '../routes.js';
import { setupAuth } from '../googleAuth.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();

  // Trust proxy for session cookies
  app.set('trust proxy', 1);

  // CORS configuration for client-server communication
  app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Setup Google OAuth
  setupAuth(app);

  // Register API routes
  await registerRoutes(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // In a production environment, serve the static frontend files
  if (process.env.NODE_ENV === 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
        
    // 🚨 This is the new, more reliable path
    const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist'); 
    app.use(express.static(clientDistPath));

    // All unhandled routes will be served by the client's index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Start the server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`CORS enabled for origin: ${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}`);
  });
}

// Start the server
startServer().catch(console.error);