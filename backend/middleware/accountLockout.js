import pool from '../config/database.js';
import { createAlert, sendAlertNotification, updateAlert } from '../services/alertService.js';
import { createSearchableHash } from '../services/encryptionService.js';

/**
 * Account Lockout Policy (Monitoring Only)
 * Tracks failed login attempts for monitoring purposes
 * Accounts are NOT locked - alerts are sent instead
 */

const MAX_FAILED_ATTEMPTS = 10;

/**
 * Check if account is locked (MONITORING ONLY - always allows login)
 * This function is kept for compatibility but no longer locks accounts
 */
export const checkAccountLockout = async (req, res, next) => {
  // Always allow login - monitoring only, no actual locking
  next();
};

/**
 * Increment failed login attempts (MONITORING ONLY - no actual locking)
 * When threshold is reached, an alert is sent instead of locking the account
 */
export const incrementFailedAttempts = async (email) => {
  try {
    const client = await pool.connect();
    
    try {
      // Increment failed attempts counter (no locking)
      // Use email_hash for encrypted emails, with fallback to direct email
      const emailHash = createSearchableHash(email);
      let result = await client.query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1
         WHERE email_hash = $1
         RETURNING failed_login_attempts, id`,
        [emailHash]
      );
      
      // Fallback to direct email search for backward compatibility
      if (result.rows.length === 0) {
        result = await client.query(
          `UPDATE users 
           SET failed_login_attempts = failed_login_attempts + 1
           WHERE email = $1
           RETURNING failed_login_attempts, id`,
          [email]
        );
      }
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const newAttemptCount = user.failed_login_attempts;
        
        // Ensure we have user.id - if not, log warning but continue with email only
        if (!user.id) {
          console.warn(`⚠️  [Lockout Alert] User ID is null for email: ${email}. Alert will be created with email only.`);
        }
        
        // If threshold reached, create or update alert (but don't lock account)
        // Only create new alert and send email once when threshold is first reached
        // For subsequent attempts, just update the existing alert's count
        if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
          console.log(`⚠️  [Lockout Alert] Threshold reached: ${email} - ${newAttemptCount} failed attempts (monitoring only, account not locked)`);
          
          try {
            // Use a transaction with advisory locks to prevent race conditions
            // This ensures only one alert is created/updated at a time for this user
            await client.query('BEGIN');
            
            try {
              // Use advisory lock based on email hash to serialize alert operations per user
              // This prevents concurrent transactions from creating duplicate alerts
              // pg_advisory_xact_lock automatically releases when transaction commits/rolls back
              // Use hashtext to convert email to a consistent integer for the lock key
              await client.query(`
                SELECT pg_advisory_xact_lock(hashtext($1))
              `, [`lockout_alert_${email}`]);
              
              // Check for ANY existing lockout_threshold alert for this user (including resolved ones)
              // Prioritize email matching since user_id might be null
              // Use LOWER() for case-insensitive email matching
              // Check by email first, then by user_id if provided
              const existingAlertResult = await client.query(`
                SELECT id, status, user_id, user_email FROM security_alerts
                WHERE alert_type = 'lockout_threshold'
                  AND (
                    LOWER(user_email) = LOWER($1)
                    OR (user_id = $2 AND user_id IS NOT NULL AND $2 IS NOT NULL)
                  )
                ORDER BY created_at DESC
                LIMIT 1
              `, [email, user.id]);
              
              if (existingAlertResult.rows.length > 0) {
                const existingAlert = existingAlertResult.rows[0];
                const existingAlertId = existingAlert.id;
                const isResolved = existingAlert.status === 'resolved';
                const shouldSendEmail = isResolved; // Only send email when reactivating resolved alert
                
                console.log(`🔍 [Lockout Alert] Found existing alert ID ${existingAlertId} for email ${email}: status=${existingAlert.status}, existing_user_id=${existingAlert.user_id}, current_user_id=${user.id}`);
                
                if (isResolved) {
                  console.log(`📧 [Lockout Alert] Reactivating resolved alert ID ${existingAlertId} with new count: ${newAttemptCount}`);
                } else {
                  console.log(`📧 [Lockout Alert] Updating existing alert ID ${existingAlertId} with new count: ${newAttemptCount}`);
                }
                
                // Update alert: reactivate if resolved, update count, ensure user_id/email are set
                const updateResult = await client.query(`
                  UPDATE security_alerts
                  SET message = $1,
                      details = $2,
                      status = CASE WHEN status = 'resolved' THEN 'new' ELSE status END,
                      user_id = COALESCE(user_id, $3),
                      user_email = COALESCE(user_email, $4)
                  WHERE id = $5
                  RETURNING *
                `, [
                  `Account lockout threshold reached: ${newAttemptCount} failed login attempts`,
                  JSON.stringify({
                    failedAttempts: newAttemptCount,
                    threshold: MAX_FAILED_ATTEMPTS
                  }),
                  user.id,
                  email,
                  existingAlertId
                ]);
                
                await client.query('COMMIT');
                console.log(`✅ [Lockout Alert] Alert ${isResolved ? 'reactivated' : 'updated'} successfully, count: ${newAttemptCount}`);
                
                // Send email only if reactivating a resolved alert (new threshold breach cycle)
                if (shouldSendEmail && updateResult.rows.length > 0) {
                  const updatedAlert = updateResult.rows[0];
                  if (updatedAlert.details && typeof updatedAlert.details === 'string') {
                    updatedAlert.details = JSON.parse(updatedAlert.details);
                  }
                  
                  console.log(`📧 [Lockout Alert] Sending email notification for reactivated alert ID: ${updatedAlert.id}`);
                  sendAlertNotification(updatedAlert)
                    .then(result => {
                      if (result.success) {
                        console.log(`✅ [Lockout Alert] Email sent successfully to ${result.successCount}/${result.recipientsCount} recipients`);
                        if (result.results && result.results.length > 0) {
                          result.results.forEach(r => {
                            if (r.success) {
                              console.log(`  ✅ Sent to: ${r.recipient} (Message ID: ${r.messageId || 'N/A'})`);
                            } else {
                              console.error(`  ❌ Failed to send to: ${r.recipient} - ${r.error || r.message}`);
                            }
                          });
                        }
                      } else {
                        console.error(`❌ [Lockout Alert] Failed to send email: ${result.message || result.error}`);
                        if (result.message === 'Email notifications disabled') {
                          console.error('💡 [Lockout Alert] To enable, add ALERT_EMAIL_ENABLED=true to your .env file');
                        } else if (result.message === 'No alert recipients found') {
                          console.error('💡 [Lockout Alert] Ensure you have superadmin users or security team members configured');
                        }
                      }
                    })
                    .catch(err => {
                      console.error('❌ [Lockout Alert] Exception sending alert:', err);
                      console.error('❌ [Lockout Alert] Error stack:', err.stack);
                    });
                }
                
                return; // Don't create duplicate alert
              }
              
              // Advisory lock ensures no other transaction can create alert for this user
              // No need for double-check since we have exclusive lock
              
              // No existing alert found - create new alert and send email (only once)
              console.log(`🔍 [Lockout Alert] No existing alert found for email ${email} (user_id=${user.id}), creating new alert`);
              
              const alertData = {
                alertType: 'lockout_threshold',
                severity: 'critical',
                userEmail: email,
                userId: user.id,
                message: `Account lockout threshold reached: ${newAttemptCount} failed login attempts`,
                details: {
                  failedAttempts: newAttemptCount,
                  threshold: MAX_FAILED_ATTEMPTS
                }
              };
              
              console.log(`📧 [Lockout Alert] Creating new alert for user: ${email} (threshold first reached)`);
              
              // Create alert directly in the transaction
              const createResult = await client.query(`
                INSERT INTO security_alerts (
                  alert_type, severity, user_id, user_email, ip_address, message, details, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
                RETURNING *
              `, [
                alertData.alertType,
                alertData.severity,
                alertData.userId,
                alertData.userEmail,
                null, // ip_address
                alertData.message,
                JSON.stringify(alertData.details)
              ]);
              
              const alert = createResult.rows[0];
              if (alert.details && typeof alert.details === 'string') {
                alert.details = JSON.parse(alert.details);
              }
              
              // Double-check: After creating, verify no other alert exists for this email
              // This is a safety net in case the advisory lock didn't prevent a race condition
              const duplicateCheck = await client.query(`
                SELECT id, status FROM security_alerts
                WHERE alert_type = 'lockout_threshold'
                  AND LOWER(user_email) = LOWER($1)
                  AND id != $2
                ORDER BY created_at DESC
                LIMIT 1
              `, [email, alert.id]);
              
              if (duplicateCheck.rows.length > 0) {
                // Found a duplicate - delete the one we just created and update the existing one
                const duplicateAlert = duplicateCheck.rows[0];
                console.warn(`⚠️  [Lockout Alert] Duplicate alert detected! Deleting new alert ID ${alert.id} and updating existing alert ID ${duplicateAlert.id}`);
                
                await client.query('DELETE FROM security_alerts WHERE id = $1', [alert.id]);
                
                // Update the existing alert instead
                const updateResult = await client.query(`
                  UPDATE security_alerts
                  SET message = $1,
                      details = $2,
                      status = CASE WHEN status = 'resolved' THEN 'new' ELSE status END,
                      user_id = COALESCE(user_id, $3),
                      user_email = COALESCE(user_email, $4)
                  WHERE id = $5
                  RETURNING *
                `, [
                  `Account lockout threshold reached: ${newAttemptCount} failed login attempts`,
                  JSON.stringify({
                    failedAttempts: newAttemptCount,
                    threshold: MAX_FAILED_ATTEMPTS
                  }),
                  user.id,
                  email,
                  duplicateAlert.id
                ]);
                
                const updatedAlert = updateResult.rows[0];
                if (updatedAlert.details && typeof updatedAlert.details === 'string') {
                  updatedAlert.details = JSON.parse(updatedAlert.details);
                }
                
                await client.query('COMMIT');
                console.log(`✅ [Lockout Alert] Updated existing alert ID ${duplicateAlert.id} instead of creating duplicate`);
                
                // Send email only if reactivating resolved alert
                const isResolved = duplicateAlert.status === 'resolved';
                if (isResolved) {
                  console.log(`📧 [Lockout Alert] Sending email notification for reactivated alert ID: ${updatedAlert.id}`);
                  sendAlertNotification(updatedAlert)
                    .then(result => {
                      if (result.success) {
                        console.log(`✅ [Lockout Alert] Email sent successfully to ${result.successCount}/${result.recipientsCount} recipients`);
                      } else {
                        console.error(`❌ [Lockout Alert] Failed to send email: ${result.message || result.error}`);
                      }
                    })
                    .catch(err => {
                      console.error('❌ [Lockout Alert] Exception sending alert:', err);
                    });
                }
                
                return; // Exit early, alert already handled
              }
              
              await client.query('COMMIT');
              console.log(`✅ [Lockout Alert] Alert created successfully, ID: ${alert.id}`);
              
              // Send notification ONLY ONCE when alert is first created (non-blocking)
              console.log(`📧 [Lockout Alert] Sending email notification for new alert ID: ${alert.id}`);
              sendAlertNotification(alert)
                .then(result => {
                  if (result.success) {
                    console.log(`✅ [Lockout Alert] Email sent successfully to ${result.successCount}/${result.recipientsCount} recipients`);
                    if (result.results && result.results.length > 0) {
                      result.results.forEach(r => {
                        if (r.success) {
                          console.log(`  ✅ Sent to: ${r.recipient} (Message ID: ${r.messageId || 'N/A'})`);
                        } else {
                          console.error(`  ❌ Failed to send to: ${r.recipient} - ${r.error || r.message}`);
                        }
                      });
                    }
                  } else {
                    console.error(`❌ [Lockout Alert] Failed to send email: ${result.message || result.error}`);
                    if (result.message === 'Email notifications disabled') {
                      console.error('💡 [Lockout Alert] To enable, add ALERT_EMAIL_ENABLED=true to your .env file');
                    } else if (result.message === 'No alert recipients found') {
                      console.error('💡 [Lockout Alert] Ensure you have superadmin users or security team members configured');
                    }
                  }
                })
                .catch(err => {
                  console.error('❌ [Lockout Alert] Exception sending alert:', err);
                  console.error('❌ [Lockout Alert] Error stack:', err.stack);
                });
            } catch (txError) {
              await client.query('ROLLBACK');
              throw txError;
            }
          } catch (alertError) {
            console.error('❌ [Lockout Alert] Failed to create/update alert:', alertError);
            console.error('❌ [Lockout Alert] Error stack:', alertError.stack);
          }
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to increment failed attempts:', error);
  }
};

/**
 * Reset failed login attempts on successful login
 */
export const resetFailedAttempts = async (userId) => {
  try {
    const client = await pool.connect();
    
    // Reset failed attempts (no locked_until to clear since we don't lock accounts)
    await client.query(
      `UPDATE users 
       SET failed_login_attempts = 0,
           last_login_at = NOW()
       WHERE id = $1`,
      [userId]
    );
    
    client.release();
  } catch (error) {
    console.error('Failed to reset failed attempts:', error);
  }
};
