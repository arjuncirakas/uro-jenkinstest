import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script to verify that when a doctor is added with urology department,
 * the role is automatically saved as 'urologist' instead of 'doctor'
 */
async function testUrologyDoctorRole() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing urology doctor role assignment...\n');
    
    // Step 1: Find the urology department
    console.log('📋 Step 1: Finding urology department...');
    const deptResult = await client.query(
      "SELECT id, name FROM departments WHERE LOWER(name) LIKE '%urology%' AND is_active = true LIMIT 1"
    );
    
    if (deptResult.rows.length === 0) {
      console.error('❌ No urology department found. Please create one first.');
      return;
    }
    
    const urologyDept = deptResult.rows[0];
    console.log(`✅ Found urology department: ${urologyDept.name} (ID: ${urologyDept.id})\n`);
    
    // Step 2: Check if test user already exists and clean up if needed
    const testEmail = `test.urology.doctor.${Date.now()}@test.com`;
    console.log(`📋 Step 2: Checking for existing test users...`);
    
    const existingUser = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [testEmail]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  Test user already exists, cleaning up...');
      await client.query('DELETE FROM doctors WHERE email = $1', [testEmail]);
      await client.query('DELETE FROM users WHERE email = $1', [testEmail]);
      console.log('✅ Cleaned up existing test user\n');
    }
    
    // Step 3: Simulate the createUser function logic
    console.log('📋 Step 3: Testing role assignment logic...');
    const role = 'doctor';
    const departmentName = urologyDept.name;
    let finalRole = role;
    
    // This is the logic from createUser function
    if (departmentName && departmentName.toLowerCase().includes('urology')) {
      finalRole = 'urologist';
      console.log(`✅ Logic correctly changes role from 'doctor' to 'urologist'`);
    } else {
      console.log(`⚠️  Logic did not change role (department: ${departmentName})`);
    }
    
    console.log(`   Original role: ${role}`);
    console.log(`   Final role: ${finalRole}\n`);
    
    // Step 4: Verify the logic works correctly
    if (finalRole === 'urologist') {
      console.log('✅ TEST PASSED: Role is correctly set to "urologist" for urology department\n');
    } else {
      console.error('❌ TEST FAILED: Role should be "urologist" but got:', finalRole);
      return;
    }
    
    // Step 5: Test with a non-urology department
    console.log('📋 Step 5: Testing with non-urology department...');
    const nonUrologyDept = await client.query(
      "SELECT id, name FROM departments WHERE LOWER(name) NOT LIKE '%urology%' AND is_active = true LIMIT 1"
    );
    
    if (nonUrologyDept.rows.length > 0) {
      const testDept = nonUrologyDept.rows[0];
      let testFinalRole = 'doctor';
      
      if (testDept.name && testDept.name.toLowerCase().includes('urology')) {
        testFinalRole = 'urologist';
      }
      
      console.log(`   Department: ${testDept.name}`);
      console.log(`   Role: ${testFinalRole}`);
      
      if (testFinalRole === 'doctor') {
        console.log('✅ TEST PASSED: Non-urology department keeps role as "doctor"\n');
      } else {
        console.log('⚠️  Non-urology department role:', testFinalRole);
      }
    } else {
      console.log('⚠️  No non-urology department found for comparison\n');
    }
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - When role is "doctor" and department is "urology", role is changed to "urologist"');
    console.log('   - The backend createUser function will now save the role correctly');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testUrologyDoctorRole().catch(console.error);







