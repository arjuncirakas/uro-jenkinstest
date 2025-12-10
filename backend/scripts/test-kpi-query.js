import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const testKPIQuery = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing KPI queries...');
    
    // Test 1: Wait time query
    console.log('\n📊 Test 1: Wait Time Query');
    try {
      const waitTimeQuery = `
        SELECT 
          AVG((first_consult_date - p.referral_date)) as avg_wait_days,
          COUNT(*) as total_patients
        FROM patients p
        LEFT JOIN LATERAL (
          SELECT MIN(appointment_date) as first_consult_date
          FROM appointments
          WHERE patient_id = p.id
          AND status IN ('completed', 'confirmed', 'scheduled')
          AND (appointment_type = 'urologist' OR appointment_type = 'doctor')
        ) first_consult ON true
        WHERE 1=1
        AND first_consult.first_consult_date IS NOT NULL
        AND p.referral_date IS NOT NULL
      `;
      const result = await client.query(waitTimeQuery);
      console.log('✅ Wait time query successful');
      console.log('   Result:', result.rows[0]);
    } catch (error) {
      console.error('❌ Wait time query failed:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    // Test 2: Compliance query
    console.log('\n📊 Test 2: Compliance Query');
    try {
      const complianceQuery = `
        SELECT 
          COUNT(*) as total_active_surveillance,
          COUNT(CASE 
            WHEN last_psa_date IS NOT NULL 
            AND last_psa_date >= (CURRENT_DATE - INTERVAL '6 months')
            THEN 1 
          END) as compliant_patients
        FROM patients p
        LEFT JOIN LATERAL (
          SELECT MAX(test_date) as last_psa_date
          FROM investigation_results
          WHERE patient_id = p.id
          AND LOWER(test_type) = 'psa'
        ) last_psa ON true
        WHERE p.care_pathway = 'Active Surveillance'
        AND p.status = 'Active'
      `;
      const result = await client.query(complianceQuery);
      console.log('✅ Compliance query successful');
      console.log('   Result:', result.rows[0]);
    } catch (error) {
      console.error('❌ Compliance query failed:', error.message);
      console.error('   Stack:', error.stack);
    }
    
    // Test 3: Discharge query
    console.log('\n📊 Test 3: Discharge Query');
    try {
      const dischargeQuery = `
        SELECT 
          COUNT(*) as total_discharged,
          COUNT(CASE WHEN p.referred_by_gp_id IS NOT NULL THEN 1 END) as discharged_to_gp
        FROM patients p
        WHERE 1=1
        AND p.care_pathway = 'Discharge'
        AND p.status = 'Discharged'
      `;
      const result = await client.query(dischargeQuery);
      console.log('✅ Discharge query successful');
      console.log('   Result:', result.rows[0]);
    } catch (error) {
      console.error('❌ Discharge query failed:', error.message);
      console.error('   Stack:', error.stack);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

testKPIQuery();

