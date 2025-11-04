import pool from './config/database.js';

async function fixPatientAssignments() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Step 1: Checking all urologists in the system...\n');
    
    const urologistsResult = await client.query(`
      SELECT id, first_name, last_name, 
             first_name || ' ' || last_name as full_name
      FROM users
      WHERE role = 'urologist'
      ORDER BY id
    `);
    
    console.log('Found urologists:');
    urologistsResult.rows.forEach(u => {
      console.log(`  - ID: ${u.id}, Name: "${u.full_name}"`);
    });
    
    if (urologistsResult.rows.length === 0) {
      console.log('\n❌ No urologists found! Cannot assign patients.');
      return;
    }
    
    const demoDoctor = urologistsResult.rows[0];
    const doctorName = demoDoctor.full_name;
    console.log(`\n✅ Using urologist: "${doctorName}" (ID: ${demoDoctor.id})\n`);
    
    console.log('🔍 Step 2: Checking patients with appointments but no assignment...\n');
    
    const unassignedResult = await client.query(`
      SELECT DISTINCT 
        p.id,
        p.upi,
        p.first_name || ' ' || p.last_name as patient_name,
        p.assigned_urologist,
        p.care_pathway,
        p.status
      FROM patients p
      WHERE p.status = 'Active'
        AND (p.assigned_urologist IS NULL OR p.assigned_urologist = '')
        AND (
          EXISTS (
            SELECT 1 FROM investigation_bookings ib 
            WHERE ib.patient_id = p.id
          )
          OR EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id
          )
        )
      ORDER BY p.id
    `);
    
    console.log(`Found ${unassignedResult.rows.length} patient(s) with appointments but no assignment:`);
    unassignedResult.rows.forEach(p => {
      console.log(`  - ID: ${p.id}, UPI: ${p.upi}, Name: ${p.patient_name}`);
      console.log(`    Assigned to: "${p.assigned_urologist || 'NULL'}", Care pathway: "${p.care_pathway || 'NULL'}"`);
    });
    
    if (unassignedResult.rows.length > 0) {
      console.log(`\n🔧 Step 3: Assigning these patients to "${doctorName}"...\n`);
      
      const patientIds = unassignedResult.rows.map(p => p.id);
      
      const updateResult = await client.query(`
        UPDATE patients 
        SET assigned_urologist = $1
        WHERE id = ANY($2::int[])
        RETURNING id, upi, first_name || ' ' || last_name as name
      `, [doctorName, patientIds]);
      
      console.log(`✅ Assigned ${updateResult.rowCount} patient(s):`);
      updateResult.rows.forEach(p => {
        console.log(`  ✓ ${p.upi} - ${p.name}`);
      });
    } else {
      console.log('\n✅ All patients with appointments are already assigned!\n');
    }
    
    console.log('\n🔍 Step 4: Verifying assignments for patients with recent appointments...\n');
    
    const verifyResult = await client.query(`
      SELECT 
        p.id,
        p.upi,
        p.first_name || ' ' || p.last_name as patient_name,
        p.assigned_urologist,
        p.care_pathway,
        p.status,
        COUNT(DISTINCT ib.id) as investigation_count,
        COUNT(DISTINCT a.id) as appointment_count
      FROM patients p
      LEFT JOIN investigation_bookings ib ON p.id = ib.patient_id
      LEFT JOIN appointments a ON p.id = a.patient_id AND a.appointment_type = 'urologist'
      WHERE p.status = 'Active'
        AND (ib.id IS NOT NULL OR a.id IS NOT NULL)
      GROUP BY p.id, p.upi, p.first_name, p.last_name, p.assigned_urologist, p.care_pathway, p.status
      ORDER BY p.id DESC
      LIMIT 10
    `);
    
    console.log('Recent patients with appointments:');
    verifyResult.rows.forEach(p => {
      console.log(`  - ${p.upi}: ${p.patient_name}`);
      console.log(`    Assigned to: "${p.assigned_urologist || 'NULL'}"`);
      console.log(`    Care pathway: "${p.care_pathway || 'NULL'}"`);
      console.log(`    Investigations: ${p.investigation_count}, Appointments: ${p.appointment_count}`);
      console.log('');
    });
    
    console.log('🔍 Step 5: Testing "New Patients" query for Demo Doctor...\n');
    
    const newPatientsResult = await client.query(`
      SELECT 
        p.id,
        p.upi,
        p.first_name,
        p.last_name,
        p.assigned_urologist,
        p.care_pathway,
        p.status,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age
      FROM patients p
      WHERE p.status = 'Active' 
        AND p.assigned_urologist = $1
        AND NOT EXISTS (
          SELECT 1 FROM appointments a 
          WHERE a.patient_id = p.id 
            AND a.appointment_type ILIKE 'urologist' 
            AND a.status = 'completed'
        )
        AND (COALESCE(p.care_pathway,'') = '' OR COALESCE(p.care_pathway,'') IS NULL)
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [doctorName]);
    
    console.log(`Query Result: Found ${newPatientsResult.rows.length} new patient(s) for "${doctorName}":`);
    
    if (newPatientsResult.rows.length > 0) {
      newPatientsResult.rows.forEach(p => {
        console.log(`  ✅ ${p.upi}: ${p.first_name} ${p.last_name}`);
        console.log(`     Assigned: "${p.assigned_urologist}", Care pathway: "${p.care_pathway || 'NULL'}"`);
      });
      console.log('\n🎉 SUCCESS! Patients are now showing up in the query!');
    } else {
      console.log('  ⚠️  No patients found! Debugging...\n');
      
      // Debug: Check all active patients assigned to this doctor
      const debugResult = await client.query(`
        SELECT 
          p.id,
          p.upi,
          p.first_name || ' ' || p.last_name as name,
          p.assigned_urologist,
          p.care_pathway,
          p.status,
          EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
              AND a.appointment_type ILIKE 'urologist' 
              AND a.status = 'completed'
          ) as has_completed_appointment
        FROM patients p
        WHERE p.assigned_urologist = $1
        ORDER BY p.created_at DESC
        LIMIT 10
      `, [doctorName]);
      
      console.log('Debug: All patients assigned to this doctor:');
      debugResult.rows.forEach(p => {
        console.log(`  - ${p.upi}: ${p.name}`);
        console.log(`    Status: ${p.status}`);
        console.log(`    Care pathway: "${p.care_pathway || 'NULL'}"`);
        console.log(`    Has completed appointment: ${p.has_completed_appointment}`);
        
        const issues = [];
        if (p.status !== 'Active') issues.push('Status is not Active');
        if (p.care_pathway && p.care_pathway !== '') issues.push('Has care pathway set');
        if (p.has_completed_appointment) issues.push('Has completed appointment');
        
        if (issues.length > 0) {
          console.log(`    ⚠️  Issues: ${issues.join(', ')}`);
        } else {
          console.log(`    ✅ Should show in "New Patients"`);
        }
        console.log('');
      });
    }
    
    console.log('\n📊 Step 6: Summary\n');
    
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE assigned_urologist = $1) as assigned_count,
        COUNT(*) FILTER (WHERE assigned_urologist IS NULL OR assigned_urologist = '') as unassigned_count,
        COUNT(*) FILTER (WHERE status = 'Active') as active_count,
        COUNT(*) as total_count
      FROM patients
    `, [doctorName]);
    
    const summary = summaryResult.rows[0];
    console.log(`Patients assigned to "${doctorName}": ${summary.assigned_count}`);
    console.log(`Unassigned patients: ${summary.unassigned_count}`);
    console.log(`Active patients: ${summary.active_count}`);
    console.log(`Total patients: ${summary.total_count}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixPatientAssignments()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

