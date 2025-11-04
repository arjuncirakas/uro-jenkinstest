import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000';

async function testFileServing() {
  try {
    console.log('Testing file serving endpoint...');
    
    // First, let's try to get a list of files in the uploads directory
    const fs = await import('fs');
    const path = await import('path');
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'investigations');
    console.log('Checking uploads directory:', uploadsDir);
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log('Files in uploads directory:', files);
      
      if (files.length > 0) {
        const testFile = files[0];
        const filePath = `uploads/investigations/${testFile}`;
        console.log('Testing with file:', filePath);
        
        // Test the file serving endpoint
        const response = await fetch(`${BASE_URL}/api/files/${filePath}`);
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          console.log('✅ File serving endpoint is working!');
        } else {
          console.log('❌ File serving failed:', response.status, response.statusText);
          const errorText = await response.text();
          console.log('Error response:', errorText);
        }
      } else {
        console.log('No files found in uploads directory');
      }
    } else {
      console.log('Uploads directory does not exist');
    }
    
  } catch (error) {
    console.error('Error testing file serving:', error);
  }
}

testFileServing();


