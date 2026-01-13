import cron from 'node-cron';
import pool from '../config/database.js';
import { calculateBaseline } from '../services/behavioralAnalyticsService.js';

/**
 * Baseline Calculation Scheduler
 * 
 * This scheduler runs daily at 3:00 AM to automatically calculate
 * behavior baselines for all active users.
 */

/**
 * Calculate baselines for all active users
 */
const calculateAllUserBaselines = async () => {
  const client = await pool.connect();

  try {
    console.log('[Baseline Calculation Scheduler] Starting baseline calculation for all active users...');

    // Get all active users
    const usersResult = await client.query(`
      SELECT id, email, first_name, last_name
      FROM users
      WHERE is_active = true
      ORDER BY id
    `);

    const users = usersResult.rows;
    console.log(`[Baseline Calculation Scheduler] Found ${users.length} active user(s)`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Calculate baselines for each user
    for (const user of users) {
      try {
        // Calculate all three baseline types
        const baselineTypes = ['location', 'time', 'access_pattern'];

        for (const baselineType of baselineTypes) {
          try {
            await calculateBaseline(user.id, baselineType);
            console.log(`[Baseline Calculation Scheduler] ✅ Calculated ${baselineType} baseline for user ${user.id} (${user.email})`);
          } catch (baselineError) {
            console.error(`[Baseline Calculation Scheduler] ❌ Error calculating ${baselineType} baseline for user ${user.id}:`, baselineError.message);
            errors.push({
              userId: user.id,
              email: user.email,
              baselineType,
              error: baselineError.message
            });
            errorCount++;
          }
        }

        successCount++;
      } catch (userError) {
        console.error(`[Baseline Calculation Scheduler] ❌ Error processing user ${user.id}:`, userError.message);
        errors.push({
          userId: user.id,
          email: user.email,
          error: userError.message
        });
        errorCount++;
      }
    }

    console.log(`[Baseline Calculation Scheduler] ✅ Completed: ${successCount} user(s) processed successfully, ${errorCount} error(s)`);
    
    if (errors.length > 0) {
      console.log('[Baseline Calculation Scheduler] Errors encountered:');
      errors.forEach(err => {
        console.log(`  - User ${err.userId} (${err.email}): ${err.error}`);
      });
    }

    return {
      success: true,
      totalUsers: users.length,
      successCount,
      errorCount,
      errors
    };
  } catch (error) {
    console.error('[Baseline Calculation Scheduler] ❌ Fatal error:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
};

/**
 * Initialize the baseline calculation scheduler
 * Runs daily at 3:00 AM
 */
export const initBaselineCalculationScheduler = () => {
  // Schedule the job to run daily at 3:00 AM
  // Cron pattern: '0 3 * * *' means "at minute 0 of hour 3, every day"
  const schedule = '0 3 * * *';

  cron.schedule(schedule, async () => {
    console.log('[Baseline Calculation Scheduler] Running scheduled baseline calculation...');
    await calculateAllUserBaselines();
  });

  console.log('[Baseline Calculation Scheduler] ✅ Scheduler initialized - will run daily at 3:00 AM');
  console.log('[Baseline Calculation Scheduler] Next run: at 3:00 AM tomorrow');

  // Run immediately on startup to catch any missed baselines (optional)
  // Uncomment the following lines if you want to run on startup:
  // console.log('[Baseline Calculation Scheduler] Running initial baseline calculation on startup...');
  // calculateAllUserBaselines().catch(err => {
  //   console.error('[Baseline Calculation Scheduler] Error in initial run:', err);
  // });
};

export default initBaselineCalculationScheduler;
