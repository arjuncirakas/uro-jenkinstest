import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function checkAppointments() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking appointment dates...');
    
    // Get current date in different formats
    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const todayLocal = now.getFullYear() + '-' + 
                      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(now.getDate()).padStart(2, '0');
    
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Today (UTC): ${todayUTC}`);
    console.log(`Today (Local): ${todayLocal}`);
    
    // Check investigation bookings
    console.log('\n📋 Investigation Bookings:');
    const investigationResult = await client.query(
      `SELECT id, patient_id, scheduled_date, scheduled_time, status, created_at 
       FROM investigation_bookings 
       WHERE scheduled_date >= '2025-10-28' 
       ORDER BY scheduled_date, scheduled_time`
    );
    
    investigationResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Date: ${row.scheduled_date}, Time: ${row.scheduled_time}, Status: ${row.status}`);
    });
    
    // Check urologist appointments
    console.log('\n👨‍⚕️ Urologist Appointments:');
    const appointmentResult = await client.query(
      `SELECT id, patient_id, appointment_date, appointment_time, status, created_at 
       FROM appointments 
       WHERE appointment_date >= '2025-10-28' 
       ORDER BY appointment_date, appointment_time`
    );
    
    appointmentResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Date: ${row.appointment_date}, Time: ${row.appointment_time}, Status: ${row.status}`);
    });
    
    // Test the query that should return today's appointments
    console.log(`\n🔍 Testing today's appointments query for date: ${todayLocal}`);
    const todayInvestigationResult = await client.query(
      `SELECT id, patient_id, scheduled_date, scheduled_time, status 
       FROM investigation_bookings 
       WHERE scheduled_date = $1`,
      [todayLocal]
    );
    
    console.log(`Found ${todayInvestigationResult.rows.length} investigation appointments for today`);
    todayInvestigationResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Date: ${row.scheduled_date}, Time: ${row.scheduled_time}, Status: ${row.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking appointments:', error);
  } finally {
    client.release();
  }
}

// Run the script
checkAppointments().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});












