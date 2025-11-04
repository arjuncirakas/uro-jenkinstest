import { body, validationResult } from 'express-validator';

// Test the validation logic directly
function testValidation() {
  console.log('🧪 Testing Patient Validation Logic...\n');

  // Test data with future date
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
  console.log('');

  // Create validation rules
  const dateValidation = body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      console.log('Validating date:', value);
      const birthDate = new Date(value);
      const today = new Date();
      console.log('Birth date:', birthDate);
      console.log('Today:', today);
      console.log('Birth date > today?', birthDate > today);
      
      if (birthDate > today) {
        console.log('❌ Date is in the future - should fail');
        throw new Error('Date of birth cannot be in the future');
      }
      console.log('✅ Date is valid');
      return true;
    });

  // Test the validation
  const mockReq = {
    body: testData
  };

  const mockRes = {
    status: (code) => ({
      json: (data) => {
        console.log(`❌ Validation failed with status ${code}`);
        console.log('Response:', JSON.stringify(data, null, 2));
        return mockRes;
      }
    })
  };

  const mockNext = () => {
    console.log('✅ Validation passed');
  };

  // Run the validation
  dateValidation.run(mockReq).then(() => {
    const errors = validationResult(mockReq);
    if (!errors.isEmpty()) {
      mockRes.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    } else {
      mockNext();
    }
  }).catch(error => {
    console.log('❌ Validation error:', error.message);
  });
}

testValidation();


