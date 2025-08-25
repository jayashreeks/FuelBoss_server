// server/index.ts
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { registerRoutes } from '../routes';
import { setupAuth } from '../googleAuth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Setup Google OAuth
setupAuth(app);

// Register API routes
registerRoutes(app);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// IMPORTANT: Do not use app.listen() and export the app instead.
// The Vercel platform will handle the listening process.
export default app;