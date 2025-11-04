import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function checkRecentAppointments() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking recent appointments...');
    
    // Check investigation bookings from the last hour
    console.log('\n📋 Recent Investigation Bookings:');
    const investigationResult = await client.query(
      `SELECT id, patient_id, investigation_name, scheduled_date, scheduled_time, status, created_at 
       FROM investigation_bookings 
       WHERE created_at >= NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC`
    );
    
    investigationResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Patient: ${row.patient_id}, Doctor: ${row.investigation_name}`);
      console.log(`    Scheduled Date: ${row.scheduled_date} (${typeof row.scheduled_date})`);
      console.log(`    Scheduled Time: ${row.scheduled_time}`);
      console.log(`    Status: ${row.status}`);
      console.log(`    Created: ${row.created_at}`);
      console.log('  ---');
    });
    
    // Check urologist appointments from the last hour
    console.log('\n👨‍⚕️ Recent Urologist Appointments:');
    const appointmentResult = await client.query(
      `SELECT id, patient_id, urologist_name, appointment_date, appointment_time, status, created_at 
       FROM appointments 
       WHERE created_at >= NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC`
    );
    
    appointmentResult.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Patient: ${row.patient_id}, Urologist: ${row.urologist_name}`);
      console.log(`    Appointment Date: ${row.appointment_date} (${typeof row.appointment_date})`);
      console.log(`    Appointment Time: ${row.appointment_time}`);
      console.log(`    Status: ${row.status}`);
      console.log(`    Created: ${row.created_at}`);
      console.log('  ---');
    });
    
    // Test the current date logic
    console.log('\n🕐 Current Date Logic Test:');
    const now = new Date();
    const todayUTC = now.toISOString().split('T')[0];
    const todayLocal = now.getFullYear() + '-' + 
                      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(now.getDate()).padStart(2, '0');
    
    console.log(`Current time: ${now.toISOString()}`);
    console.log(`Today (UTC): ${todayUTC}`);
    console.log(`Today (Local): ${todayLocal}`);
    
    // Test query with local date
    console.log(`\n🔍 Testing query for today (${todayLocal}):`);
    const todayQuery = await client.query(
      `SELECT id, patient_id, investigation_name, scheduled_date, scheduled_time, status 
       FROM investigation_bookings 
       WHERE scheduled_date = $1`,
      [todayLocal]
    );
    
    console.log(`Found ${todayQuery.rows.length} appointments for today (${todayLocal})`);
    todayQuery.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Date: ${row.scheduled_date}, Time: ${row.scheduled_time}, Status: ${row.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking appointments:', error);
  } finally {
    client.release();
  }
}

// Run the script
checkRecentAppointments().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});












