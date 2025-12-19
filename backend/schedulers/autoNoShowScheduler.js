import cron from 'node-cron';
import pool from '../config/database.js';

/**
 * Automatic No-Show Scheduler
 * 
 * This scheduler runs every hour to automatically mark appointments as "no_show"
 * if the appointment date is before today (i.e., after the day ends at 12 AM next day)
 * AND no patient data was updated.
 * 
 * Smart Logic:
 * - If patient showed up, SOMETHING will be updated (PSA, notes, test results, etc.)
 * - If NOTHING changed in patient's records after appointment → TRUE no-show
 * 
 * Appointments are marked as no-show if:
 * - The appointment date is before today (any appointment from yesterday or earlier)
 * - The status is still 'scheduled' or 'confirmed'
 * - NO changes to patient data after appointment time:
 *   • No PSA updates
 *   • No clinical notes added
 *   • No test results recorded
 *   • No investigation results added
 *   • No patient profile updates
 */

/**
 * Check if any patient data was modified after the appointment time
 * Returns true if patient showed up (data was changed), false if no activity
 */
const hasPatientActivity = async (client, patientId, appointmentDateTime) => {
  try {
    // Check 1: Patient table - any updates after appointment (PSA, vitals, profile changes)
    const patientUpdateQuery = `
      SELECT COUNT(*) as count
      FROM patients
      WHERE id = $1 
        AND updated_at > $2
    `;
    const patientResult = await client.query(patientUpdateQuery, [patientId, appointmentDateTime]);
    if (parseInt(patientResult.rows[0].count) > 0) {
      return true; // Patient record was updated
    }

    // Check 2: Patient notes - any notes added after appointment
    const notesQuery = `
      SELECT COUNT(*) as count
      FROM patient_notes
      WHERE patient_id = $1 
        AND created_at > $2
    `;
    const notesResult = await client.query(notesQuery, [patientId, appointmentDateTime]);
    if (parseInt(notesResult.rows[0].count) > 0) {
      return true; // Clinical notes were added
    }

    // Check 3: Investigation results - any results added after appointment
    const investigationResultsQuery = `
      SELECT COUNT(*) as count
      FROM investigation_results
      WHERE patient_id = $1 
        AND created_at > $2
    `;
    const investigationResult = await client.query(investigationResultsQuery, [patientId, appointmentDateTime]);
    if (parseInt(investigationResult.rows[0].count) > 0) {
      return true; // Test results were added
    }

    // Check 4: Check if any new appointments were created after this one (means patient was seen and rescheduled)
    const newAppointmentsQuery = `
      SELECT COUNT(*) as count
      FROM appointments
      WHERE patient_id = $1 
        AND created_at > $2
    `;
    const newAppointmentsResult = await client.query(newAppointmentsQuery, [patientId, appointmentDateTime]);
    if (parseInt(newAppointmentsResult.rows[0].count) > 0) {
      return true; // New appointment was scheduled (patient was seen)
    }

    // No activity found - patient likely didn't show up
    return false;

  } catch (error) {
    console.error(`[Auto No-Show] Error checking patient activity for patient ${patientId}:`, error);
    // On error, assume patient showed up (safer to not mark as no-show)
    return true;
  }
};

const markOldAppointmentsAsNoShow = async () => {
  const client = await pool.connect();

  try {
    console.log('[Auto No-Show Scheduler] Running scheduled check for old appointments...');

    // Get today's date in local timezone (YYYY-MM-DD format)
    // This ensures appointments from yesterday or earlier are marked as no-show
    const now = new Date();
    const today = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0'); // YYYY-MM-DD format in local timezone

    console.log(`[Auto No-Show Scheduler] Today's date: ${today} - marking appointments from previous days as no-show`);

    // Start transaction
    await client.query('BEGIN');

    // Find old urologist appointments (appointments from yesterday or earlier)
    // Don't update yet - need to check patient activity first
    const findAppointmentsQuery = `
      SELECT 
        id, 
        patient_id, 
        appointment_date, 
        appointment_time, 
        urologist_name,
        CONCAT(appointment_date, ' ', appointment_time)::timestamp as appointment_datetime
      FROM appointments 
      WHERE status IN ('scheduled', 'confirmed')
        AND appointment_date < $1
    `;

    const appointmentsList = await client.query(findAppointmentsQuery, [today]);

    // Find old investigation bookings (appointments from yesterday or earlier)
    const findInvestigationsQuery = `
      SELECT 
        id, 
        patient_id, 
        scheduled_date, 
        scheduled_time, 
        investigation_name,
        CONCAT(scheduled_date, ' ', scheduled_time)::timestamp as appointment_datetime
      FROM investigation_bookings 
      WHERE status IN ('scheduled', 'confirmed')
        AND scheduled_date < $1
    `;

    const investigationsList = await client.query(findInvestigationsQuery, [today]);

    // Check each appointment for patient activity
    const appointmentsToMarkNoShow = [];
    for (const apt of appointmentsList.rows) {
      const hasActivity = await hasPatientActivity(client, apt.patient_id, apt.appointment_datetime);
      if (!hasActivity) {
        appointmentsToMarkNoShow.push(apt);
        console.log(`  → Patient ${apt.patient_id} - No activity detected, marking as no-show`);
      } else {
        console.log(`  ✓ Patient ${apt.patient_id} - Activity detected, patient showed up`);
      }
    }

    const investigationsToMarkNoShow = [];
    for (const inv of investigationsList.rows) {
      const hasActivity = await hasPatientActivity(client, inv.patient_id, inv.appointment_datetime);
      if (!hasActivity) {
        investigationsToMarkNoShow.push(inv);
        console.log(`  → Patient ${inv.patient_id} - No activity detected, marking investigation as no-show`);
      } else {
        console.log(`  ✓ Patient ${inv.patient_id} - Activity detected, patient showed up for investigation`);
      }
    }

    // Now mark the confirmed no-shows
    for (const appointment of appointmentsToMarkNoShow) {
      // Use conditional update to prevent race conditions
      // Only update if status is NOT already 'no_show'
      const updateQuery = `
        UPDATE appointments 
        SET status = 'no_show', 
            updated_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes, '') || ' | Auto-marked as no-show after day ended (no patient activity detected)'
        WHERE id = $1 AND status != 'no_show'
      `;
      const updateResult = await client.query(updateQuery, [appointment.id]);

      // Only insert note if we actually updated the appointment
      // This prevents duplicate notes if the scheduler runs twice simultaneously
      if (updateResult.rowCount > 0) {
        // Add timeline entry
        const timelineQuery = `
          INSERT INTO patient_notes (patient_id, note_type, note_content, author_name, author_role, created_at)
          VALUES ($1, 'no_show', $2, 'System', 'Automated', CURRENT_TIMESTAMP)
        `;
        const timelineContent = `Appointment automatically marked as No Show after day ended - no patient activity detected (scheduled for ${appointment.appointment_date} at ${appointment.appointment_time} with ${appointment.urologist_name})`;
        await client.query(timelineQuery, [appointment.patient_id, timelineContent]);
      }
    }

    for (const investigation of investigationsToMarkNoShow) {
      // Use conditional update to prevent race conditions
      const updateQuery = `
        UPDATE investigation_bookings 
        SET status = 'no_show', 
            updated_at = CURRENT_TIMESTAMP,
            notes = COALESCE(notes, '') || ' | Auto-marked as no-show after day ended (no patient activity detected)'
        WHERE id = $1 AND status != 'no_show'
      `;
      const updateResult = await client.query(updateQuery, [investigation.id]);

      // Only insert note if we actually updated the investigation
      // This prevents duplicate notes if the scheduler runs twice simultaneously
      if (updateResult.rowCount > 0) {
        // Add timeline entry
        const timelineQuery = `
          INSERT INTO patient_notes (patient_id, note_type, note_content, author_name, author_role, created_at)
          VALUES ($1, 'no_show', $2, 'System', 'Automated', CURRENT_TIMESTAMP)
        `;
        const timelineContent = `Investigation automatically marked as No Show after day ended - no patient activity detected (scheduled for ${investigation.scheduled_date} at ${investigation.scheduled_time} with ${investigation.investigation_name})`;
        await client.query(timelineQuery, [investigation.patient_id, timelineContent]);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    const totalChecked = appointmentsList.rows.length + investigationsList.rows.length;
    const totalMarked = appointmentsToMarkNoShow.length + investigationsToMarkNoShow.length;
    const totalShowedUp = totalChecked - totalMarked;

    if (totalChecked > 0) {
      console.log(`[Auto No-Show Scheduler] ✅ Checked ${totalChecked} old appointments:`);
      console.log(`  - Patients who showed up (activity detected): ${totalShowedUp}`);
      console.log(`  - Marked as no-show (no activity): ${totalMarked}`);
      console.log(`    • Urologist appointments: ${appointmentsToMarkNoShow.length}`);
      console.log(`    • Investigation bookings: ${investigationsToMarkNoShow.length}`);
    } else {
      console.log('[Auto No-Show Scheduler] ✅ No old appointments found to check');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Auto No-Show Scheduler] ❌ Error marking old appointments as no-show:', error);
  } finally {
    client.release();
  }
};

/**
 * Initialize the auto no-show scheduler
 * Runs every hour at the top of the hour (e.g., 1:00, 2:00, 3:00, etc.)
 */
export const initAutoNoShowScheduler = () => {
  // Schedule the job to run every hour at minute 0
  // Cron pattern: '0 * * * *' means "at minute 0 of every hour"
  const schedule = '0 * * * *';

  cron.schedule(schedule, async () => {
    await markOldAppointmentsAsNoShow();
  });

  console.log('[Auto No-Show Scheduler] ✅ Scheduler initialized - will run every hour');
  console.log('[Auto No-Show Scheduler] Next run: at the top of the next hour');

  // Run immediately on startup to catch any missed appointments
  console.log('[Auto No-Show Scheduler] Running initial check on startup...');
  markOldAppointmentsAsNoShow();
};

export default initAutoNoShowScheduler;

