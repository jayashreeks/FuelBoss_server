import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";
import 'dotenv/config';

// Check for required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials not provided. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use memory store in development if no database
  if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
    return session({
      secret: process.env.SESSION_SECRET || 'dev-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Allow HTTP in development
        maxAge: sessionTtl,
      },
      proxy: true,
    });
  }
  
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
      maxAge: sessionTtl,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  });
}

function updateUserSession(user: any, profile: any) {
  user.id = profile.id;
  user.email = profile.emails?.[0]?.value;
  user.firstName = profile.name?.givenName;
  user.lastName = profile.name?.familyName;
  user.profileImageUrl = profile.photos?.[0]?.value;
  user.provider = 'google';
}

async function upsertUser(profile: any) {
  try {
    console.log("Attempting to upsert user:", profile.id);
    
    // Check if database is available
    if (!process.env.DATABASE_URL) {
      console.log("No database configured, creating mock user");
      return {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        profileImageUrl: profile.photos?.[0]?.value,
        provider: 'google'
      };
    }
    
    // Create user data object
    const userData = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      profileImageUrl: profile.photos?.[0]?.value,
    };
    
    console.log("User data to insert:", userData);
    
    // Use the storage upsertUser function
    const user = await storage.upsertUser(userData);
    console.log("User upserted successfully:", user.id);
    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // If database fails, create a mock user for development
    if (process.env.NODE_ENV === 'development') {
      console.log("Database failed, creating mock user for development");
      return {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        profileImageUrl: profile.photos?.[0]?.value,
        provider: 'google'
      };
    }
    
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Test database connection
  try {
    console.log("Testing database connection...");
    await storage.getUser("test-connection");
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    // Don't throw here, just log the error
  }

  // Configure Google OAuth2 strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log("Google OAuth profile received:", {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.name
      });
      
      // Update or create user in database
      const user = await upsertUser(profile);
      
      // Create user object for session
      const sessionUser = {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        profileImageUrl: profile.photos?.[0]?.value,
        provider: 'google'
      };
      
      console.log("User session object created:", sessionUser.id);
      return done(null, sessionUser);
    } catch (error) {
      console.error("Google OAuth strategy error:", error);
      return done(error as Error);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      // Check if database is available
      if (!process.env.DATABASE_URL) {
        console.log("No database configured, using mock user deserialization");
        // Return a mock user for development
        const mockUser = {
          id: id,
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
          provider: 'google'
        };
        return done(null, mockUser);
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        console.log("User not found in database:", id);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      
      // If database fails in development, create a mock user
      if (process.env.NODE_ENV === 'development') {
        console.log("Database failed, creating mock user for development");
        const mockUser = {
          id: id,
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
          provider: 'google'
        };
        return done(null, mockUser);
      }
      
      done(error);
    }
  });

  // Auth routes
  app.get("/api/auth/google", passport.authenticate("google"));

  app.get("/api/auth/google/callback", 
    passport.authenticate("google", { 
      failureRedirect: `${process.env.CLIENT_ORIGIN}/login`,
      successReturnToOrRedirect: process.env.CLIENT_ORIGIN || "http://localhost:5173"
    })
  );

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Debug endpoint to check OAuth configuration
  app.get("/api/auth/debug", (req, res) => {
    res.json({
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasCallbackUrl: !!process.env.GOOGLE_CALLBACK_URL,
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
