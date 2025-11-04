// Test script for patient API integration
import { patientService } from '../services/patientService.js';

// Test data
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
  assignedUrologist: 'Dr. Johnson',
  emergencyContactName: 'Jane Smith',
  emergencyContactPhone: '+61 412 345 679',
  emergencyContactRelationship: 'Spouse',
  priority: 'Normal',
  notes: 'Regular follow-up required'
};

// Test functions
export const testPatientAPI = {
  // Test adding a patient
  testAddPatient: async () => {
    console.log('🧪 Testing Add Patient API...');
    try {
      const result = await patientService.addPatient(testPatientData);
      
      if (result.success) {
        console.log('✅ Add Patient Test: PASSED');
        console.log('Patient created:', result.data);
        return result.data;
      } else {
        console.log('❌ Add Patient Test: FAILED');
        console.log('Error:', result.error);
        console.log('Details:', result.details);
        return null;
      }
    } catch (error) {
      console.log('❌ Add Patient Test: ERROR');
      console.log('Error:', error.message);
      return null;
    }
  },

  // Test getting all patients
  testGetPatients: async () => {
    console.log('🧪 Testing Get Patients API...');
    try {
      const result = await patientService.getPatients();
      
      if (result.success) {
        console.log('✅ Get Patients Test: PASSED');
        console.log('Patients count:', result.data.length);
        return result.data;
      } else {
        console.log('❌ Get Patients Test: FAILED');
        console.log('Error:', result.error);
        return null;
      }
    } catch (error) {
      console.log('❌ Get Patients Test: ERROR');
      console.log('Error:', error.message);
      return null;
    }
  },

  // Test getting patient by ID
  testGetPatientById: async (patientId) => {
    console.log('🧪 Testing Get Patient by ID API...');
    try {
      const result = await patientService.getPatientById(patientId);
      
      if (result.success) {
        console.log('✅ Get Patient by ID Test: PASSED');
        console.log('Patient:', result.data);
        return result.data;
      } else {
        console.log('❌ Get Patient by ID Test: FAILED');
        console.log('Error:', result.error);
        return null;
      }
    } catch (error) {
      console.log('❌ Get Patient by ID Test: ERROR');
      console.log('Error:', error.message);
      return null;
    }
  },

  // Test updating a patient
  testUpdatePatient: async (patientId, updateData) => {
    console.log('🧪 Testing Update Patient API...');
    try {
      const result = await patientService.updatePatient(patientId, updateData);
      
      if (result.success) {
        console.log('✅ Update Patient Test: PASSED');
        console.log('Updated patient:', result.data);
        return result.data;
      } else {
        console.log('❌ Update Patient Test: FAILED');
        console.log('Error:', result.error);
        return null;
      }
    } catch (error) {
      console.log('❌ Update Patient Test: ERROR');
      console.log('Error:', error.message);
      return null;
    }
  },

  // Test API info
  testApiInfo: async () => {
    console.log('🧪 Testing API Info...');
    try {
      const result = await patientService.getApiInfo();
      
      if (result.success) {
        console.log('✅ API Info Test: PASSED');
        console.log('API Info:', result.data);
        return result.data;
      } else {
        console.log('❌ API Info Test: FAILED');
        console.log('Error:', result.error);
        return null;
      }
    } catch (error) {
      console.log('❌ API Info Test: ERROR');
      console.log('Error:', error.message);
      return null;
    }
  },

  // Run all tests
  runAllTests: async () => {
    console.log('🚀 Running All Patient API Tests...\n');
    
    // Test API info first
    await testPatientAPI.testApiInfo();
    console.log('');
    
    // Test adding a patient
    const newPatient = await testPatientAPI.testAddPatient();
    console.log('');
    
    if (newPatient) {
      // Test getting all patients
      await testPatientAPI.testGetPatients();
      console.log('');
      
      // Test getting patient by ID
      await testPatientAPI.testGetPatientById(newPatient.id);
      console.log('');
      
      // Test updating patient
      const updateData = {
        notes: 'Updated notes from test',
        priority: 'High'
      };
      await testPatientAPI.testUpdatePatient(newPatient.id, updateData);
      console.log('');
    }
    
    console.log('🏁 All tests completed!');
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testPatientAPI = testPatientAPI;
}

export default testPatientAPI;


