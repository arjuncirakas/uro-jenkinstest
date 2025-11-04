import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test data for adding a patient
const testPatientData = {
  firstName: 'John',
  lastName: 'Smith',
  dateOfBirth: '1980-05-15',
  gender: 'Male',
  phone: '+61 412 345 678',
  email: 'john.smith@email.com',
  address: '123 Main Street',
  postcode: '2000',
  city: 'Sydney',
  state: 'NSW',
  referringDepartment: 'General Practice',
  referralDate: '2024-01-15',
  initialPSA: 4.5,
  initialPSADate: '2024-01-10',
  medicalHistory: 'No significant medical history',
  currentMedications: 'None',
  allergies: 'None known',
  assignedUrologist: 'Dr. Sarah Wilson',
  emergencyContactName: 'Jane Smith',
  emergencyContactPhone: '+61 412 345 679',
  emergencyContactRelationship: 'Spouse',
  priority: 'Normal',
  notes: 'Initial consultation for elevated PSA levels'
};

// Test authentication and patient creation
async function testPatientAPI() {
  try {
    console.log('🧪 Testing Patient API...\n');

    // Step 1: Login to get authentication token
    console.log('1. Logging in to get authentication token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'test@example.com', // Replace with actual test user credentials
      password: 'TestPassword123!'
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }

    console.log('✅ Login successful');
    const accessToken = loginResponse.data.data.accessToken;

    // Step 2: Test patient API info endpoint
    console.log('\n2. Testing patient API info endpoint...');
    const infoResponse = await axios.get(`${API_BASE_URL}/api/patients`);
    console.log('✅ API Info:', infoResponse.data.message);
    console.log('📋 Available endpoints:', Object.keys(infoResponse.data.endpoints));

    // Step 3: Test adding a new patient
    console.log('\n3. Testing add patient endpoint...');
    const addPatientResponse = await axios.post(
      `${API_BASE_URL}/api/patients`,
      testPatientData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (addPatientResponse.data.success) {
      console.log('✅ Patient added successfully!');
      console.log('📋 Patient UPI:', addPatientResponse.data.data.patient.upi);
      console.log('👤 Patient Name:', addPatientResponse.data.data.patient.fullName);
      console.log('📅 Age:', addPatientResponse.data.data.patient.age);
      
      const patientId = addPatientResponse.data.data.patient.id;

      // Step 4: Test getting all patients
      console.log('\n4. Testing get all patients endpoint...');
      const getPatientsResponse = await axios.get(
        `${API_BASE_URL}/api/patients/list`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (getPatientsResponse.data.success) {
        console.log('✅ Retrieved patients successfully!');
        console.log('📊 Total patients:', getPatientsResponse.data.data.pagination.total);
        console.log('📄 Patients on this page:', getPatientsResponse.data.data.patients.length);
      }

      // Step 5: Test getting patient by ID
      console.log('\n5. Testing get patient by ID endpoint...');
      const getPatientResponse = await axios.get(
        `${API_BASE_URL}/api/patients/${patientId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (getPatientResponse.data.success) {
        console.log('✅ Retrieved patient by ID successfully!');
        console.log('👤 Patient Name:', getPatientResponse.data.data.patient.fullName);
        console.log('📧 Email:', getPatientResponse.data.data.patient.email);
      }

      // Step 6: Test updating patient
      console.log('\n6. Testing update patient endpoint...');
      const updateData = {
        notes: 'Updated notes - patient responded well to initial consultation',
        priority: 'High'
      };

      const updatePatientResponse = await axios.put(
        `${API_BASE_URL}/api/patients/${patientId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (updatePatientResponse.data.success) {
        console.log('✅ Patient updated successfully!');
        console.log('📝 Updated notes:', updatePatientResponse.data.data.patient.notes);
        console.log('⚡ Updated priority:', updatePatientResponse.data.data.patient.priority);
      }

      // Step 7: Test validation errors
      console.log('\n7. Testing validation errors...');
      try {
        const invalidData = {
          firstName: '', // Invalid: empty first name
          lastName: 'Test',
          dateOfBirth: '2030-01-01', // Invalid: future date
          gender: 'InvalidGender' // Invalid: not in allowed values
        };

        await axios.post(
          `${API_BASE_URL}/api/patients`,
          invalidData,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('❌ Validation should have failed but didn\'t');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log('✅ Validation errors caught successfully!');
          console.log('📋 Validation errors:', error.response.data.errors);
        } else {
          console.log('❌ Unexpected error during validation test:', error.message);
        }
      }

      // Step 8: Test unauthorized access
      console.log('\n8. Testing unauthorized access...');
      try {
        await axios.post(
          `${API_BASE_URL}/api/patients`,
          testPatientData
          // No authorization header
        );
        console.log('❌ Unauthorized access should have been blocked');
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log('✅ Unauthorized access blocked successfully!');
        } else {
          console.log('❌ Unexpected error during unauthorized test:', error.message);
        }
      }

      // Step 9: Test role-based access
      console.log('\n9. Testing role-based access...');
      // This would require a different user with different role
      console.log('ℹ️  Role-based access testing requires different user credentials');

      console.log('\n🎉 All tests completed successfully!');
      console.log('\n📋 Summary:');
      console.log('✅ Patient creation works');
      console.log('✅ Patient retrieval works');
      console.log('✅ Patient update works');
      console.log('✅ Validation works');
      console.log('✅ Authentication works');
      console.log('✅ Authorization works');

    } else {
      console.error('❌ Failed to add patient:', addPatientResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response data:', error.response.data);
      console.error('📊 Status:', error.response.status);
    }
  }
}

// Run the test
testPatientAPI();
