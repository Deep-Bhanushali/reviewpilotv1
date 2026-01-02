# Quick Start Guide - ReviewPilot Cron Job Service

## Setup Instructions (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your DATABASE_URL from the main ReviewPilot project:
   - Location: `c:\Users\MR. DAB\Downloads\reviewpilot (1)\reviewpilot\.replit`
   - Or check the main project's environment variables

3. Add the DATABASE_URL to your `.env` file:
   ```
   DATABASE_URL=your_database_url_here
   TZ=Asia/Kolkata
   ```

### Step 3: Build the Project
```bash
npm run build
```

### Step 4: Test the Setup

Run a manual test to verify everything works:
```bash
npm run test
```

This will:
- Connect to your database
- Run all cron jobs immediately
- Show you detailed logs
- Exit without starting the scheduler

### Step 5: Start the Service

For development (with auto-restart on file changes):
```bash
npm run dev
```

For production:
```bash
npm start
```

## Verification

Once started, you should see:
```
============================================================
REVIEWPILOT CRON JOB SERVICE
============================================================

Starting ReviewPilot Cron Job Service...
✓ Scheduled delivery status check: Daily at 9:00 AM
✓ Scheduled overdue refund form check: Daily at 9:30 AM

Cron Job Service started successfully. Timezone: Asia/Kolkata
Press Ctrl+C to stop the service.
```

## What Gets Automated

1. **9:00 AM Daily**: Orders with delivery date = today → Status changed to "Delivered"
2. **9:30 AM Daily**: Orders with past refund form dates → Marked as "Overdue"

Each action creates:
- ✅ Activity log entry
- ✅ Notification for the user

## Stopping the Service

Press `Ctrl+C` to stop gracefully.

## Next Steps

After testing, consider running this as a background service:
- **PM2** (recommended): `pm2 start dist/index.js --name reviewpilot-cron`
- **systemd** (Linux): See README.md for full setup
- **Windows Service**: Use node-windows or PM2

## Troubleshooting

**"DATABASE_URL must be set" error**:
- Make sure you created `.env` file
- Verify DATABASE_URL is correctly copied

**Database connection failed**:
- Check if DATABASE_URL is correct
- Verify your database allows external connections
- Check for SSL requirements

**No orders updated**:
- Verify orders exist in database
- Check if delivery dates are set correctly
- Run manual test to see detailed logs

## Support

For detailed information, see [README.md](README.md)
