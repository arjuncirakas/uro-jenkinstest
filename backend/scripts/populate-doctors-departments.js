import pool from '../config/database.js';

const departments = [
  { name: 'Urology', description: 'Urological care and treatment' },
  { name: 'Oncology', description: 'Cancer treatment and care' },
  { name: 'Radiology', description: 'Medical imaging and diagnostics' },
  { name: 'Pathology', description: 'Laboratory medicine and diagnostics' },
  { name: 'Anesthesiology', description: 'Anesthesia and pain management' },
  { name: 'Nursing', description: 'Nursing care and support' },
  { name: 'Social Work', description: 'Patient support and counseling' },
  { name: 'Physiotherapy', description: 'Physical therapy and rehabilitation' },
  { name: 'Nutrition', description: 'Nutritional counseling and support' }
];

const doctors = [
  { first_name: 'Sarah', last_name: 'Wilson', email: 'sarah.wilson@hospital.com', specialization: 'Urologist', department: 'Urology' },
  { first_name: 'Michael', last_name: 'Chen', email: 'michael.chen@hospital.com', specialization: 'Oncologist', department: 'Oncology' },
  { first_name: 'Jennifer', last_name: 'Lee', email: 'jennifer.lee@hospital.com', specialization: 'Radiologist', department: 'Radiology' },
  { first_name: 'David', last_name: 'Wilson', email: 'david.wilson@hospital.com', specialization: 'Pathologist', department: 'Pathology' },
  { first_name: 'Emily', last_name: 'Brown', email: 'emily.brown@hospital.com', specialization: 'Medical Oncologist', department: 'Oncology' },
  { first_name: 'James', last_name: 'Taylor', email: 'james.taylor@hospital.com', specialization: 'Radiation Oncologist', department: 'Oncology' },
  { first_name: 'Lisa', last_name: 'Anderson', email: 'lisa.anderson@hospital.com', specialization: 'Nurse Practitioner', department: 'Nursing' },
  { first_name: 'Robert', last_name: 'Garcia', email: 'robert.garcia@hospital.com', specialization: 'Clinical Psychologist', department: 'Social Work' },
  { first_name: 'Maria', last_name: 'Rodriguez', email: 'maria.rodriguez@hospital.com', specialization: 'Social Worker', department: 'Social Work' },
  { first_name: 'Thomas', last_name: 'Lee', email: 'thomas.lee@hospital.com', specialization: 'Anesthesiologist', department: 'Anesthesiology' },
  { first_name: 'Amanda', last_name: 'White', email: 'amanda.white@hospital.com', specialization: 'Physiotherapist', department: 'Physiotherapy' },
  { first_name: 'Kevin', last_name: 'Park', email: 'kevin.park@hospital.com', specialization: 'Nutritionist', department: 'Nutrition' }
];

const populateData = async () => {
  try {
    const client = await pool.connect();
    
    console.log('🚀 Starting to populate departments and doctors...');
    
    // Insert departments
    console.log('📋 Inserting departments...');
    for (const dept of departments) {
      try {
        await client.query(`
          INSERT INTO departments (name, description) 
          VALUES ($1, $2) 
          ON CONFLICT (name) DO NOTHING
        `, [dept.name, dept.description]);
        console.log(`✅ Department: ${dept.name}`);
      } catch (error) {
        console.log(`⚠️  Department ${dept.name} might already exist: ${error.message}`);
      }
    }
    
    // Get department IDs
    const deptResult = await client.query('SELECT id, name FROM departments');
    const deptMap = {};
    deptResult.rows.forEach(dept => {
      deptMap[dept.name] = dept.id;
    });
    
    // Insert doctors
    console.log('👨‍⚕️ Inserting doctors...');
    for (const doctor of doctors) {
      try {
        const departmentId = deptMap[doctor.department];
        await client.query(`
          INSERT INTO doctors (first_name, last_name, email, department_id, specialization) 
          VALUES ($1, $2, $3, $4, $5) 
          ON CONFLICT (email) DO NOTHING
        `, [doctor.first_name, doctor.last_name, doctor.email, departmentId, doctor.specialization]);
        console.log(`✅ Doctor: ${doctor.first_name} ${doctor.last_name} (${doctor.specialization})`);
      } catch (error) {
        console.log(`⚠️  Doctor ${doctor.first_name} ${doctor.last_name} might already exist: ${error.message}`);
      }
    }
    
    console.log('✅ Data population completed successfully!');
    
    // Show summary
    const deptCount = await client.query('SELECT COUNT(*) FROM departments WHERE is_active = true');
    const doctorCount = await client.query('SELECT COUNT(*) FROM doctors WHERE is_active = true');
    
    console.log(`📊 Summary:`);
    console.log(`   - Departments: ${deptCount.rows[0].count}`);
    console.log(`   - Doctors: ${doctorCount.rows[0].count}`);
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating data:', error);
    process.exit(1);
  }
};

populateData();
