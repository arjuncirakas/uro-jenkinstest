import cron from 'node-cron';
import pool from '../config/database.js';

/**
 * Automatic Appointment Scheduler
 * 
 * This scheduler runs daily to automatically book appointments for patients
 * who have been on Active Monitoring, Medication, or Discharge pathways for 1 year.
 * 
 * Rules:
 * - Only books for patients who have been on pathway for 1 year
 * - Skips patients with 3 consecutive no-shows
 * - Books 4 appointments (3, 6, 9, 12 months from now)
 * - Uses automatic appointment type (doesn't block slots)
 */

/**
 * Check if patient has 3 consecutive no-shows without profile changes
 */
const hasThreeConsecutiveNoShows = async (client, patientId) => {
  try {
    const appointmentsQuery = `
      SELECT id, appointment_date, appointment_time, status, created_at
      FROM appointments
      WHERE patient_id = $1
      AND status = 'no_show'
      ORDER BY appointment_date DESC, appointment_time DESC
      LIMIT 3
    `;
    
    const appointmentsResult = await client.query(appointmentsQuery, [patientId]);
    
    if (appointmentsResult.rows.length < 3) {
      return false;
    }
    
    const noShowDates = appointmentsResult.rows.map(apt => apt.appointment_date).sort();
    const firstNoShow = noShowDates[0];
    const lastNoShow = noShowDates[noShowDates.length - 1];
    
    const betweenAppointmentsQuery = `
      SELECT COUNT(*) as count
      FROM appointments
      WHERE patient_id = $1
      AND appointment_date BETWEEN $2 AND $3
      AND status IN ('scheduled', 'confirmed', 'completed')
    `;
    
    const betweenResult = await client.query(betweenAppointmentsQuery, [
      patientId,
      firstNoShow,
      lastNoShow
    ]);
    
    if (parseInt(betweenResult.rows[0].count) > 0) {
      return false;
    }
    
    const firstNoShowDateTime = new Date(`${appointmentsResult.rows[0].appointment_date} ${appointmentsResult.rows[0].appointment_time}`);
    
    const profileUpdateQuery = `
      SELECT updated_at
      FROM patients
      WHERE id = $1
      AND updated_at > $2
    `;
    
    const profileResult = await client.query(profileUpdateQuery, [patientId, firstNoShowDateTime]);
    
    if (profileResult.rows.length > 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[hasThreeConsecutiveNoShows] Error:', error);
    return false;
  }
};

/**
 * Book automatic appointment
 */
const bookAutomaticAppointment = async (client, {
  patientId,
  urologistDoctorId,
  urologistName,
  appointmentDate,
  appointmentTime,
  pathway,
  monthsAhead,
  userId
}) => {
  try {
    const appointment = await client.query(
      `INSERT INTO appointments (
        patient_id, appointment_type, appointment_date, appointment_time, 
        urologist_id, urologist_name, notes, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        patientId,
        'automatic',
        appointmentDate,
        appointmentTime,
        urologistDoctorId,
        urologistName,
        `Auto-booked automatic appointment for ${pathway} follow-up (${monthsAhead} months). This appointment does not block time slots and can be managed by doctor/nurse.`,
        userId || null, // System booking
        'scheduled'
      ]
    );
    
    return appointment.rows[0];
  } catch (error) {
    console.error('[bookAutomaticAppointment] Error:', error);
    return null;
  }
};

/**
 * Process automatic appointment bookings for eligible patients
 */
const processAutomaticAppointments = async () => {
  const client = await pool.connect();
  
  try {
    console.log('[Auto Appointment Scheduler] Running daily check for automatic appointments...');
    
    // Calculate date 1 year ago
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    
    // Find patients on Active Monitoring, Medication, or Discharge pathways for 1+ year
    // AND who don't have automatic appointments already booked for the next year
    const eligiblePatientsQuery = `
      SELECT 
        p.id,
        p.upi,
        p.first_name,
        p.last_name,
        p.care_pathway,
        p.assigned_urologist,
        p.care_pathway_updated_at,
        COUNT(CASE WHEN a.appointment_type = 'automatic' 
                   AND a.appointment_date > CURRENT_DATE 
                   AND a.status IN ('scheduled', 'confirmed') 
              THEN 1 END) as existing_automatic_appointments
      FROM patients p
      LEFT JOIN appointments a ON a.patient_id = p.id
      WHERE p.care_pathway IN ('Active Monitoring', 'Medication', 'Discharge')
      AND p.status IN ('Active', 'Discharged')
      AND p.care_pathway_updated_at <= $1
      GROUP BY p.id, p.upi, p.first_name, p.last_name, p.care_pathway, 
               p.assigned_urologist, p.care_pathway_updated_at
      HAVING COUNT(CASE WHEN a.appointment_type = 'automatic' 
                        AND a.appointment_date > CURRENT_DATE 
                        AND a.status IN ('scheduled', 'confirmed') 
                   THEN 1 END) = 0
    `;
    
    const patientsResult = await client.query(eligiblePatientsQuery, [oneYearAgoStr]);
    console.log(`[Auto Appointment Scheduler] Found ${patientsResult.rows.length} eligible patients`);
    
    let bookedCount = 0;
    let skippedCount = 0;
    
    for (const patient of patientsResult.rows) {
      try {
        // Check for 3 consecutive no-shows
        const hasConsecutiveNoShows = await hasThreeConsecutiveNoShows(client, patient.id);
        
        if (hasConsecutiveNoShows) {
          console.log(`[Auto Appointment Scheduler] ⚠️ Skipping patient ${patient.upi} - 3 consecutive no-shows`);
          skippedCount++;
          continue;
        }
        
        // Get assigned urologist
        let urologistDoctorId = null;
        let urologistName = null;
        
        if (patient.assigned_urologist) {
          const urologistQuery = await client.query(
            `SELECT u.id, u.first_name, u.last_name, u.email
             FROM users u
             WHERE CONCAT(u.first_name, ' ', u.last_name) = $1
             AND u.role = 'urologist'
             LIMIT 1`,
            [patient.assigned_urologist]
          );
          
          if (urologistQuery.rows.length > 0) {
            const urologist = urologistQuery.rows[0];
            urologistName = `${urologist.first_name} ${urologist.last_name}`;
            
            const doctorCheck = await client.query(
              'SELECT id FROM doctors WHERE email = $1 AND is_active = true',
              [urologist.email]
            );
            
            if (doctorCheck.rows.length > 0) {
              urologistDoctorId = doctorCheck.rows[0].id;
            }
          }
        }
        
        // If no assigned urologist, skip (can't book without urologist)
        if (!urologistDoctorId || !urologistName) {
          console.log(`[Auto Appointment Scheduler] ⚠️ Skipping patient ${patient.upi} - no assigned urologist`);
          skippedCount++;
          continue;
        }
        
        // Book appointments for next year: 3, 6, 9, 12 months
        const appointmentIntervals = [3, 6, 9, 12];
        const preferredTimes = ['09:00', '11:00', '14:00', '16:00'];
        let appointmentsBooked = 0;
        
        for (let i = 0; i < appointmentIntervals.length; i++) {
          const monthsAhead = appointmentIntervals[i];
          const appointmentDate = new Date();
          appointmentDate.setMonth(appointmentDate.getMonth() + monthsAhead);
          const dateStr = appointmentDate.toISOString().split('T')[0];
          const appointmentTime = preferredTimes[i % preferredTimes.length];
          
          const booked = await bookAutomaticAppointment(client, {
            patientId: patient.id,
            urologistDoctorId,
            urologistName,
            appointmentDate: dateStr,
            appointmentTime,
            pathway: patient.care_pathway,
            monthsAhead,
            userId: null // System booking
          });
          
          if (booked) {
            appointmentsBooked++;
          }
        }
        
        if (appointmentsBooked > 0) {
          bookedCount++;
          console.log(`[Auto Appointment Scheduler] ✅ Booked ${appointmentsBooked} appointments for patient ${patient.upi}`);
        }
        
      } catch (error) {
        console.error(`[Auto Appointment Scheduler] Error processing patient ${patient.upi}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`[Auto Appointment Scheduler] ✅ Completed:`);
    console.log(`  - Patients processed: ${bookedCount}`);
    console.log(`  - Patients skipped: ${skippedCount}`);
    
  } catch (error) {
    console.error('[Auto Appointment Scheduler] ❌ Error:', error);
  } finally {
    client.release();
  }
};

/**
 * Initialize the auto appointment scheduler
 */
export const initAutoAppointmentScheduler = () => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    await processAutomaticAppointments();
  });
  
  console.log('[Auto Appointment Scheduler] ✅ Scheduler initialized - will run daily at 2:00 AM');
  console.log('[Auto Appointment Scheduler] Running initial check on startup...');
  
  // Run initial check on startup
  processAutomaticAppointments();
};

export default initAutoAppointmentScheduler;

