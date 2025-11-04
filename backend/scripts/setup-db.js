import { testConnection, initializeDatabase } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const setupDatabase = async () => {
  console.log('🚀 Setting up database...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Initialize database tables
    console.log('\n2. Initializing database tables...');
    const initialized = await initializeDatabase();
    
    if (!initialized) {
      console.error('❌ Failed to initialize database tables.');
      process.exit(1);
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\nYou can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
};

setupDatabase();
