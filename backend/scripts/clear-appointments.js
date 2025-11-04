import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function clearAppointments() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Clearing all appointments from database...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Clear investigation bookings
    console.log('Clearing investigation bookings...');
    const investigationResult = await client.query('DELETE FROM investigation_bookings');
    console.log(`✅ Deleted ${investigationResult.rowCount} investigation bookings`);
    
    // Clear urologist appointments
    console.log('Clearing urologist appointments...');
    const appointmentResult = await client.query('DELETE FROM appointments');
    console.log(`✅ Deleted ${appointmentResult.rowCount} urologist appointments`);
    
    // Clear investigation results
    console.log('Clearing investigation results...');
    const resultsResult = await client.query('DELETE FROM investigation_results');
    console.log(`✅ Deleted ${resultsResult.rowCount} investigation results`);
    
    // Clear patient notes related to appointments
    console.log('Clearing appointment-related patient notes...');
    const notesResult = await client.query("DELETE FROM patient_notes WHERE note_type IN ('no_show', 'no_show_followup', 'appointment')");
    console.log(`✅ Deleted ${notesResult.rowCount} appointment-related notes`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n🎉 All appointments have been successfully cleared from the database!');
    
    // Verify the tables are empty
    console.log('\n📊 Verification:');
    const verifyInvestigation = await client.query('SELECT COUNT(*) FROM investigation_bookings');
    const verifyAppointments = await client.query('SELECT COUNT(*) FROM appointments');
    const verifyResults = await client.query('SELECT COUNT(*) FROM investigation_results');
    
    console.log(`Investigation bookings: ${verifyInvestigation.rows[0].count}`);
    console.log(`Urologist appointments: ${verifyAppointments.rows[0].count}`);
    console.log(`Investigation results: ${verifyResults.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error clearing appointments:', error);
    await client.query('ROLLBACK');
    console.log('🔄 Transaction rolled back due to error');
  } finally {
    client.release();
  }
}

// Run the script
clearAppointments().then(() => {
  console.log('\n✅ Script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});












