import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const checkKPIData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking KPI data availability...\n');
    
    // Check total patients
    const totalPatients = await client.query('SELECT COUNT(*) as count FROM patients');
    console.log(`📊 Total patients in database: ${totalPatients.rows[0].count}`);
    
    // Check patients with referral dates
    const patientsWithReferral = await client.query(`
      SELECT COUNT(*) as count 
      FROM patients 
      WHERE referral_date IS NOT NULL
    `);
    console.log(`📊 Patients with referral dates: ${patientsWithReferral.rows[0].count}`);
    
    // Check patients with appointments
    const patientsWithAppointments = await client.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM patients p
      INNER JOIN appointments a ON a.patient_id = p.id
      WHERE a.status IN ('completed', 'confirmed', 'scheduled')
      AND (a.appointment_type = 'urologist' OR a.appointment_type = 'doctor')
    `);
    console.log(`📊 Patients with urologist appointments: ${patientsWithAppointments.rows[0].count}`);
    
    // Check patients with referral date AND appointments (for wait time calculation)
    const patientsForWaitTime = await client.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM patients p
      INNER JOIN appointments a ON a.patient_id = p.id
      WHERE p.referral_date IS NOT NULL
      AND a.status IN ('completed', 'confirmed', 'scheduled')
      AND (a.appointment_type = 'urologist' OR a.appointment_type = 'doctor')
    `);
    console.log(`📊 Patients eligible for wait time calculation: ${patientsForWaitTime.rows[0].count}`);
    
    // Check Active Surveillance patients
    const activeSurveillance = await client.query(`
      SELECT COUNT(*) as count
      FROM patients
      WHERE care_pathway = 'Active Surveillance'
      AND status = 'Active'
    `);
    console.log(`📊 Active Surveillance patients: ${activeSurveillance.rows[0].count}`);
    
    // Check Discharged patients
    const discharged = await client.query(`
      SELECT COUNT(*) as count
      FROM patients
      WHERE care_pathway = 'Discharge'
      AND status = 'Discharged'
    `);
    console.log(`📊 Discharged patients: ${discharged.rows[0].count}`);
    
    // Check date ranges
    const dateRange = await client.query(`
      SELECT 
        MIN(referral_date) as earliest_referral,
        MAX(referral_date) as latest_referral,
        MIN(care_pathway_updated_at) as earliest_pathway_update,
        MAX(care_pathway_updated_at) as latest_pathway_update
      FROM patients
      WHERE referral_date IS NOT NULL OR care_pathway_updated_at IS NOT NULL
    `);
    const dates = dateRange.rows[0];
    console.log(`\n📅 Date Ranges:`);
    console.log(`   Earliest referral: ${dates.earliest_referral || 'N/A'}`);
    console.log(`   Latest referral: ${dates.latest_referral || 'N/A'}`);
    console.log(`   Earliest pathway update: ${dates.earliest_pathway_update || 'N/A'}`);
    console.log(`   Latest pathway update: ${dates.latest_pathway_update || 'N/A'}`);
    
    // Sample some patients
    const samplePatients = await client.query(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        referral_date, 
        care_pathway, 
        status,
        care_pathway_updated_at
      FROM patients 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log(`\n📋 Sample patients (last 5):`);
    samplePatients.rows.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.first_name} ${p.last_name} - Pathway: ${p.care_pathway || 'None'}, Status: ${p.status}, Referral: ${p.referral_date || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

checkKPIData();

