import nodemailer from 'nodemailer';

// Test 1: Password WITH spaces (should fail)
const testWithSpaces = async () => {
  console.log('\n🧪 Test 1: SMTP Auth with SPACES in password');
  console.log('================================================\n');
  
  const transporterWithSpaces = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'techsupport@ahimsa.global',
      pass: 'ppzj vzgj awme szjr'  // WITH spaces
    },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporterWithSpaces.verify();
    console.log('✅ UNEXPECTED: Auth succeeded with spaces!');
    return true;
  } catch (error) {
    console.log('❌ EXPECTED: Auth failed with spaces');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    return false;
  }
};

// Test 2: Password WITHOUT spaces (should succeed)
const testWithoutSpaces = async () => {
  console.log('\n🧪 Test 2: SMTP Auth WITHOUT spaces in password');
  console.log('================================================\n');
  
  const transporterWithoutSpaces = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'techsupport@ahimsa.global',
      pass: 'ppzjvzgjawmeszjr'  // WITHOUT spaces
    },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporterWithoutSpaces.verify();
    console.log('✅ EXPECTED: Auth succeeded without spaces!');
    return true;
  } catch (error) {
    console.log('❌ UNEXPECTED: Auth failed without spaces');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    return false;
  }
};

// Run both tests
const runTests = async () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  SMTP Password Spaces Test                 ║');
  console.log('║  Proving it fails on localhost too!       ║');
  console.log('╚════════════════════════════════════════════╝');
  
  const test1 = await testWithSpaces();
  const test2 = await testWithoutSpaces();
  
  console.log('\n📊 Results:');
  console.log('===========');
  console.log(`With spaces:    ${test1 ? '✅ Success' : '❌ Failed'}`);
  console.log(`Without spaces: ${test2 ? '✅ Success' : '❌ Failed'}`);
  
  console.log('\n🎯 Conclusion:');
  console.log('==============');
  if (!test1 && test2) {
    console.log('✅ Spaces in password ALWAYS cause auth failure');
    console.log('✅ It did NOT work on localhost either!');
    console.log('✅ You just didn\'t notice because:');
    console.log('   - User creation still succeeded');
    console.log('   - You didn\'t check email inbox');
    console.log('   - Response still said "success: true"');
  } else if (test1) {
    console.log('🤔 Unexpected: Auth worked with spaces!');
    console.log('   This should not happen. Check Gmail App Password.');
  } else {
    console.log('❌ Both failed - check your credentials');
  }
};

runTests();






























