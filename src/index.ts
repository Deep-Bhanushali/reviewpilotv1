import { cronJobService } from './cron-jobs.js';

/**
 * ReviewPilot Cron Job Service
 * Main entry point for the cron job system
 */

// Check if this is a manual run
const isManualRun = process.argv.includes('--manual') || process.argv.includes('-m');

if (isManualRun) {
  console.log('='.repeat(60));
  console.log('REVIEWPILOT CRON JOB - MANUAL RUN');
  console.log('='.repeat(60));
  console.log('');

  // Run manually and exit
  cronJobService.runManually().then(() => {
    console.log('\nExiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('Error during manual run:', error);
    process.exit(1);
  });

} else {
  // Start the cron job service
  console.log('='.repeat(60));
  console.log('REVIEWPILOT CRON JOB SERVICE');
  console.log('='.repeat(60));
  console.log('');

  cronJobService.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    cronJobService.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cronJobService.stop();
    process.exit(0);
  });

  // Keep the process running
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    cronJobService.stop();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}
