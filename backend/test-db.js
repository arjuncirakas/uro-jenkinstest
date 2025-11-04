import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urology_db',
  password: 'password',
  port: 5432,
});

async function testQuery() {
  const client = await pool.connect();
  try {
    console.log('Testing database connection...');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'investigation_results'
      );
    `);
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    // Check all investigation results
    const allResults = await client.query('SELECT * FROM investigation_results');
    console.log('All investigation results:', allResults.rows);
    console.log('Total count:', allResults.rows.length);
    
    // Check for patient 2 specifically
    const patientResults = await client.query('SELECT * FROM investigation_results WHERE patient_id = 2');
    console.log('Patient 2 results:', patientResults.rows);
    console.log('Patient 2 count:', patientResults.rows.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

testQuery();
