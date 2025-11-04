import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function testCalendarAPI() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing Calendar API...');
    
    // Test the getAllAppointments query directly
    const query = `
      SELECT 
        a.id,
        a.patient_id,
        p.first_name,
        p.last_name,
        p.upi,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.initial_psa as psa,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.notes,
        a.appointment_type as type,
        u.first_name as urologist_first_name,
        u.last_name as urologist_last_name,
        a.created_at,
        a.updated_at
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.urologist_id = u.id
      WHERE a.status != 'cancelled'
      
      UNION ALL
      
      SELECT 
        ib.id,
        ib.patient_id,
        p.first_name,
        p.last_name,
        p.upi,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.initial_psa as psa,
        ib.scheduled_date as appointment_date,
        ib.scheduled_time as appointment_time,
        ib.status,
        ib.notes,
        'investigation' as type,
        ib.investigation_name as urologist_first_name,
        '' as urologist_last_name,
        ib.created_at,
        ib.updated_at
      FROM investigation_bookings ib
      JOIN patients p ON ib.patient_id = p.id
      WHERE ib.status != 'cancelled'
      
      ORDER BY appointment_date, appointment_time
    `;
    
    const result = await client.query(query);
    
    console.log(`Found ${result.rows.length} appointments:`);
    
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.first_name} ${row.last_name}`);
      console.log(`   Type: ${row.type}`);
      console.log(`   Date: ${row.appointment_date}`);
      console.log(`   Time: ${row.appointment_time}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Doctor: ${row.urologist_first_name} ${row.urologist_last_name || ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing calendar API:', error);
  } finally {
    client.release();
  }
}

// Run the script
testCalendarAPI().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});












