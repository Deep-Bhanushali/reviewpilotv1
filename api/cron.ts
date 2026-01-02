import { cronJobService } from '../src/cron-jobs.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  const cronSecret = req.headers['x-vercel-cron'] || req.query.secret;

  if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('='.repeat(60));
    console.log('REVIEWPILOT CRON JOB - VERCEL EXECUTION');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    // Run both cron job tasks
    await cronJobService.runManually();

    console.log('='.repeat(60));
    console.log('CRON JOB COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

    return res.status(200).json({
      success: true,
      message: 'Cron job executed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error executing cron job:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to execute cron job',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
