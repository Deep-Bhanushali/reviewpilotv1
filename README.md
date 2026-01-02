# ReviewPilot Cron Job Service

A standalone cron job service for ReviewPilot that automatically updates order statuses based on delivery dates and sends notifications for overdue deadlines.

## Features

### 1. Automatic Delivery Status Update
- **Runs**: Daily at 9:00 AM (configurable timezone)
- **Action**: Automatically updates order status from "Ordered" to "Delivered" when the delivery date matches the current date
- **Creates**:
  - Activity log entry
  - Success notification for the user

### 2. Overdue Refund Form Detection
- **Runs**: Daily at 9:30 AM (configurable timezone)
- **Action**: Identifies orders where the refund form deadline has passed
- **Creates**:
  - Status change to "Overdue Passed for Refund Form"
  - Activity log entry
  - Critical notification for the user

## Prerequisites

- Node.js 18+ installed
- Access to the ReviewPilot PostgreSQL database
- Database connection string (DATABASE_URL)

## Installation

1. **Navigate to the cron job directory**:
   ```bash
   cd cronjobforreviewpilot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your database URL
   # You can copy DATABASE_URL from your main ReviewPilot project
   ```

4. **Build the project** (optional, for production):
   ```bash
   npm run build
   ```

## Usage

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Manual Run (for testing)
Run all cron jobs immediately without waiting for the schedule:
```bash
npm run test
```
or
```bash
node dist/index.js --manual
```

### Development with tsx (direct execution)
```bash
npx tsx src/index.ts
```

## Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` | Yes |
| `TZ` | Timezone for cron scheduling | `Asia/Kolkata` | No (default: Asia/Kolkata) |

## Cron Schedule

| Job | Schedule | Time (IST) | Description |
|-----|----------|------------|-------------|
| Delivery Check | `0 9 * * *` | 9:00 AM | Updates orders to "Delivered" status |
| Overdue Check | `30 9 * * *` | 9:30 AM | Marks overdue refund forms |

## Project Structure

```
cronjobforreviewpilot/
├── src/
│   ├── index.ts           # Main entry point
│   ├── cron-jobs.ts       # Cron job logic and scheduling
│   ├── db.ts              # Database connection
│   └── shared/
│       └── schema.ts      # Database schema definitions
├── dist/                  # Compiled JavaScript (generated)
├── .env                   # Environment variables (create this)
├── .env.example           # Example environment file
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## How It Works

### Delivery Status Update Flow

1. Cron triggers at 9:00 AM daily
2. Queries all orders with `currentStatus = "Ordered"`
3. Checks if `deliveryDate` matches today's date
4. For matching orders:
   - Updates `currentStatus` to "Delivered"
   - Creates activity log with "Status Changed"
   - Creates success notification for user
5. Logs summary of updates

### Overdue Detection Flow

1. Cron triggers at 9:30 AM daily
2. Queries all orders with `refundFormDate < today`
3. For matching orders:
   - Updates `currentStatus` to "Overdue Passed for Refund Form"
   - Creates activity log with "Status Changed"
   - Creates critical notification for user
4. Logs summary of updates

## Deployment Options

### Option 1: Run as a System Service (Recommended)

#### Using PM2 (Node.js Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start the service
pm2 start dist/index.js --name reviewpilot-cron

# Configure PM2 to start on system boot
pm2 startup
pm2 save

# View logs
pm2 logs reviewpilot-cron

# Monitor
pm2 monit
```

#### Using systemd (Linux)
Create `/etc/systemd/system/reviewpilot-cron.service`:
```ini
[Unit]
Description=ReviewPilot Cron Job Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/cronjobforreviewpilot
ExecStart=/usr/bin/node /path/to/cronjobforreviewpilot/dist/index.js
Restart=always
EnvironmentFile=/path/to/cronjobforreviewpilot/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable reviewpilot-cron
sudo systemctl start reviewpilot-cron
sudo systemctl status reviewpilot-cron
```

### Option 2: Cloud Cron Services

#### AWS EventBridge + Lambda
1. Deploy code to AWS Lambda
2. Create EventBridge rules for 9:00 AM and 9:30 AM
3. Set timezone as needed

#### Google Cloud Scheduler + Cloud Run
1. Deploy as Cloud Run service
2. Create Cloud Scheduler jobs with HTTP targets
3. Configure cron expressions

#### Azure Functions + Timer Trigger
1. Create Azure Function with Timer trigger
2. Set cron schedule in function.json
3. Deploy to Azure

### Option 3: Docker Container

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

Build and run:
```bash
docker build -t reviewpilot-cron .
docker run -d --name reviewpilot-cron --env-file .env reviewpilot-cron
```

## Monitoring and Logging

### Log Format
All logs include timestamps in ISO format:
```
[2025-01-02T09:00:00.000Z] Starting delivery status check...
[2025-01-02T09:00:01.234Z] Found 15 orders to check for delivery update
[2025-01-02T09:00:02.456Z] Updated order AMZ12345 (Wireless Mouse) to Delivered
[2025-01-02T09:00:03.789Z] Delivery status check completed. Updated 5 order(s).
```

### Viewing Logs

#### PM2
```bash
pm2 logs reviewpilot-cron
```

#### systemd
```bash
sudo journalctl -u reviewpilot-cron -f
```

#### Docker
```bash
docker logs -f reviewpilot-cron
```

## Troubleshooting

### Issue: Database connection failed
**Solution**: Verify `DATABASE_URL` is correct in `.env` file. Check network connectivity and database credentials.

### Issue: Orders not being updated
**Solution**:
1. Check if orders have `deliveryDate` set
2. Verify `currentStatus` is "Ordered"
3. Run manually to see detailed logs: `npm run test`
4. Check timezone configuration (`TZ` env var)

### Issue: Timezone mismatch
**Solution**: Set `TZ` environment variable to your desired timezone (e.g., `Asia/Kolkata`, `America/New_York`).

### Issue: "Cannot find module" error
**Solution**: Run `npm install` to install all dependencies.

## Security Considerations

1. **Environment Variables**: Never commit `.env` file. Use `.env.example` as template.
2. **Database Credentials**: Use least-privilege database user with only SELECT/UPDATE permissions.
3. **SSL Mode**: Always use `sslmode=require` in DATABASE_URL for secure connections.
4. **File Permissions**: Ensure `.env` has restricted permissions (chmod 600).

## Development

### Adding New Cron Jobs

1. Add new method in `src/cron-jobs.ts`:
   ```typescript
   private async myNewCronJob(): Promise<void> {
     // Your logic here
   }
   ```

2. Schedule it in the `start()` method:
   ```typescript
   const myTask = cron.schedule('0 */6 * * *', async () => {
     await this.myNewCronJob();
   }, { timezone: process.env.TZ || 'Asia/Kolkata' });

   this.tasks.push(myTask);
   ```

### Testing

Manually test your cron jobs:
```bash
node dist/index.js --manual
```

## Support

For issues or questions:
1. Check the logs for error messages
2. Review database connection and permissions
3. Verify environment variables are set correctly
4. Test with manual run option

## License

MIT

---

**Note**: This service is designed to work alongside the main ReviewPilot application. It connects to the same database and operates independently to perform scheduled background tasks.
