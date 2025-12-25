# 🚀 ReviewPilot - Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. **Generate New SESSION_SECRET** (CRITICAL!)
```bash
openssl rand -base64 32
```
Copy the output and use it as `SESSION_SECRET` in Vercel environment variables.

### 2. **Update Google OAuth Redirect URIs**

Go to: https://console.cloud.google.com/

1. Navigate to: **APIs & Services** → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add your Vercel domain to **Authorized redirect URIs**:
   ```
   https://your-project-name.vercel.app/api/auth/google/callback
   ```
4. Save changes

**Note:** You'll need your actual Vercel URL first. You can add this after deployment if needed.

### 3. **Environment Variables for Vercel**

Go to your Vercel Dashboard → **Project Settings** → **Environment Variables**

Add the following variables:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Your Neon PostgreSQL URL | ✅ Yes |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | ✅ Yes |
| `SESSION_SECRET` | Generate with `openssl rand -base64 32` | ✅ Yes |
| `NODE_ENV` | `production` | ✅ Yes |
| `PORT` | `5000` | Optional |

**IMPORTANT:**
- ❌ **DO NOT** use the current `SESSION_SECRET` from `.env`
- ❌ **DO NOT** add Replit-specific variables (REPL_ID, REPLIT_DOMAINS, etc.)
- ✅ **DO** generate a new secure SESSION_SECRET

### 4. **Deploy to Vercel**

Option 1: Using Vercel CLI
```bash
vercel
```

Option 2: Using Git
1. Push code to GitHub/GitLab/Bitbucket
2. Import project in Vercel dashboard
3. Deploy

## 📝 Post-Deployment Steps

### 1. **Run Database Migrations**
After deployment, you may need to push database schema changes:
```bash
npm run db:push
```

Or use Vercel CLI:
```bash
vercel env pull .env.production
npm run db:push
```

### 2. **Test Google OAuth**
1. Visit your deployed site
2. Try connecting Google Calendar
3. If redirect URI error: Add the exact Vercel URL to Google Console

### 3. **Verify All Features**
- ✅ Login works
- ✅ Dashboard loads
- ✅ Orders can be created/imported
- ✅ Google Calendar integration works
- ✅ Cron jobs are running (check logs)

## 🔧 Configuration Files

### vercel.json
Already created with proper build configuration.

### package.json scripts
- `build`: Compiles TypeScript and bundles server
- `start`: Production server start command
- Vercel automatically uses these

## 🐛 Common Issues & Fixes

### Issue 1: "Session invalid" errors
**Fix:** Generate a new SESSION_SECRET and update in Vercel

### Issue 2: Google OAuth redirect error
**Fix:** Add exact Vercel URL (with https://) to Google Console

### Issue 3: Database connection errors
**Fix:** Ensure DATABASE_URL includes `?sslmode=require`

### Issue 4: CORS errors
**Fix:** Check server origin configuration in `server/index.ts`

### Issue 5: Cron jobs not running
**Fix:** Vercel serverless functions may timeout. Consider:
- Moving cron jobs to external service (e.g., cron-job.org)
- Using Vercel Cron Jobs (if available in your plan)

## 📊 Monitoring

After deployment:
1. Check Vercel Logs for any errors
2. Monitor database connections in Neon dashboard
3. Test all user flows
4. Set up error tracking (optional)

## 🔒 Security Reminders

- ✅ New SESSION_SECRET generated
- ✅ No .env files committed to git
- ✅ Database uses SSL (sslmode=require)
- ✅ Google OAuth uses HTTPS
- ✅ Environment variables set in Vercel (not hardcoded)

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for client-side errors
3. Verify all environment variables are set
4. Ensure database migrations ran successfully

---

**Deployment Ready?** ✅

Your project includes:
- ✅ `vercel.json` configuration
- ✅ Production build scripts
- ✅ Environment variable examples
- ✅ PostgreSQL (Neon) ready
- ✅ Google OAuth configured

Just add the environment variables and deploy!
