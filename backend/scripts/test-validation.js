import { validatePatientInput } from '../middleware/patientValidation.js';

// Test the validation middleware directly
function testValidation() {
  console.log('🧪 Testing Patient Validation...\n');

  // Test data with future date (like in the image)
  const testData = {
    firstName: 'Demo',
    lastName: 'patient',
    dateOfBirth: '2025-10-29', // Future date - should fail
    gender: 'Male',
    phone: '7569886566',
    email: 'anita00@legrdil.com',
    address: 'delhi',
    postcode: '6788',
    city: 'democity',
    state: 'SA',
    initialPSA: 4.5
  };

  console.log('Current date:', new Date().toISOString().split('T')[0]);
  console.log('Test date:', testData.dateOfBirth);
  console.log('Is future?', new Date(testData.dateOfBirth) > new Date());

  console.log('Testing with future date (2025-10-28):');
  console.log('Expected: Should fail validation');
  
  // Create a mock request object
  const mockReq = {
    body: testData
  };

  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log(`Status: ${code}`);
        console.log('Response:', JSON.stringify(data, null, 2));
        return mockRes;
      }
    })
  };

  const mockNext = () => {
    console.log('✅ Validation passed (unexpected)');
  };

  // Test the validation
  validatePatientInput[validatePatientInput.length - 1](mockReq, mockRes, mockNext);
}

testValidation();
