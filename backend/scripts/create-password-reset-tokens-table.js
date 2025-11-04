import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

const createPasswordResetTokensTable = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating password_reset_tokens table...');
    
    // Create password_reset_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_password_reset FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_token 
      ON password_reset_tokens(token)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_user_id 
      ON password_reset_tokens(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_expires 
      ON password_reset_tokens(expires_at)
    `);

    console.log('✅ password_reset_tokens table created successfully!');
    console.log('✅ Indexes created successfully!');
    console.log('🎉 Password reset tokens setup completed successfully!');

  } catch (error) {
    console.error('❌ Error creating password_reset_tokens table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

createPasswordResetTokensTable();




