import express from "express";
import session from "express-session";
import type { RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { OAuth2Client } from "google-auth-library";
import { pool } from "./db";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);

  const store = new pgStore({
    pool,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET || "change-this-secret-in-production",
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

// Authentication middleware
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

// Auth setup with Google OAuth
export async function setupAuth(app: express.Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Google OAuth strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    console.warn("Google OAuth credentials not configured. Authentication disabled.");
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: "http://localhost:5000/api/auth/google/callback"
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      console.log('OAuth Strategy: Processing profile for', profile.emails?.[0]?.value);

      // Extract user info from Google profile
      const userData = {
        id: profile.id,
        email: profile.emails?.[0]?.value || "",
        firstName: profile.name?.givenName || profile.displayName || "",
        lastName: profile.name?.familyName || "",
        profileImageUrl: profile.photos?.[0]?.value || null,
      };

      console.log('OAuth Strategy: User data prepared:', userData.email);

      // Upsert user in database
      await storage.upsertUser(userData);
      console.log('OAuth Strategy: User upserted successfully');

      // Return user data for passport WITH tokens
      const userObj = {
        id: userData.id,
        tokens: { access_token: accessToken, refresh_token: refreshToken },
        claims: {
          sub: userData.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          profile_image_url: userData.profileImageUrl
        }
      };

      console.log('OAuth Strategy: Returning user object with tokens');
      done(null, userObj);
    } catch (error) {
      console.error("Error in Google OAuth strategy:", error);
      done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.claims.sub);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }

      // Return user in the format expected by the app
      const userObj = {
        id: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        }
      };

      done(null, userObj);
    } catch (error) {
      done(error);
    }
  });

// Routes
  app.get("/api/auth/google",
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?oauth=failed' }),
    async (req, res) => {
      try {
        const user = req.user as any;
        if (!user || !user.claims) {
          console.error('OAuth callback: No user data in request');
          console.log('Request user object:', req.user);
          return res.redirect('/?oauth=no-user-data');
        }

        console.log('OAuth callback: Success for user:', user.claims.email);
        // Login tokens do NOT include calendar permissions
        // User will connect calendar separately later
        res.redirect('/');
      } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('/?oauth=callback-error');
      }
    }
  );

  app.get("/api/auth/user", async (req, res) => {
    try {
      // Allow getting user data even if not authenticated for now
      if (!req.isAuthenticated() || !req.user) {
        // Return anonymous user for unauthenticated requests
        return res.json({
          id: "demo-user",
          email: "demo@example.com",
          firstName: "Demo",
          lastName: "User",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Calendar-specific OAuth routes
  app.get("/api/calendar/auth", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;

      console.log('Calendar auth request for user:', userId);
      console.log('GOOGLE_CLIENT_ID set:', !!process.env.GOOGLE_CLIENT_ID);
      console.log('GOOGLE_CLIENT_SECRET set:', !!process.env.GOOGLE_CLIENT_SECRET);

      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth credentials for calendar auth');
        return res.status(500).json({ message: 'Google OAuth credentials not configured' });
      }

      // Create OAuth2Client with same credentials
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:5000/api/calendar/auth/callback'
      );

      const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
      ];

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: userId // Pass user ID for callback
      });

      console.log('Generated calendar auth URL successfully for user:', userId);
      console.log('Auth URL length:', authUrl.length);

      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating calendar auth URL:', error);
      console.error('Error details:', (error as any)?.stack);
      console.error('Error message:', (error as any)?.message);
      res.status(500).json({ message: 'Failed to generate calendar auth URL' });
    }
  });

  app.get('/api/calendar/auth/callback', isAuthenticated, async (req, res) => {
    try {
      const { code, state: userId } = req.query;

      if (!code || !userId) {
        return res.redirect('/#/settings?calendar=error&reason=missing-params');
      }

      console.log('Processing calendar auth callback for user:', userId);

      // Create OAuth2Client with same credentials for token exchange
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:5000/api/calendar/auth/callback'
      );

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code as string);

      console.log('Calendar tokens obtained successfully');

      // Save calendar-specific tokens to user settings
      await storage.upsertUserSettings(userId as string, {
        googleAccessToken: tokens.access_token || '',
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        calendarEnabled: 1,
      });

      console.log('Calendar tokens stored successfully for user:', userId);
      res.redirect('/#/settings?calendar=success');
    } catch (error) {
      console.error('Error in calendar OAuth callback:', error);
      res.redirect('/#/settings?calendar=error&reason=token-exchange-failed');
    }
  });

  app.post("/api/logout", (req, res) => {
    (req as any).logout((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }

      // Destroy the session
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error('Session destroy error:', destroyErr);
        }

        console.log('Session destroyed successfully');
        res.status(200).json({ message: 'Logged out successfully' });
      });
    });
  });
}
