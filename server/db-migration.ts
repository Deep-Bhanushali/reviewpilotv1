import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function runStartupMigrations() {
  try {
    console.log('Running startup migrations...');
    
    // Add Google Calendar token columns if they don't exist
    await sql`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS google_access_token TEXT,
      ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP
    `;
    
    // Create reminder_category enum if it doesn't exist
    await sql`
      DO $$ BEGIN
        CREATE TYPE reminder_category AS ENUM (
          'General',
          'Delivery',
          'Review_Rating',
          'Refund_Form',
          'Mediator_Payment'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    // Add reminderCategory column to notifications table if it doesn't exist
    await sql`
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS reminder_category reminder_category DEFAULT 'General'
    `;
    
    console.log('Startup migrations completed successfully');
  } catch (error) {
    console.error('Error running startup migrations:', error);
    // Don't throw - let the app continue running
  }
}