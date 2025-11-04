import pool from '../config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

const createPasswordHistoryTable = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creating password_history table...');
    
    // Create password_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_password_history FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_history_user_id 
      ON password_history(user_id)
    `);

    // Create index for sorting by created_at
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_history_created_at 
      ON password_history(user_id, created_at DESC)
    `);

    console.log('✅ password_history table created successfully!');
    console.log('✅ Indexes created successfully!');

    // Now migrate existing user passwords to password history
    console.log('🔄 Migrating existing user passwords to history...');
    
    const result = await client.query(`
      INSERT INTO password_history (user_id, password_hash, created_at)
      SELECT id, password_hash, created_at
      FROM users
      WHERE password_hash IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    console.log(`✅ Migrated ${result.rowCount} existing passwords to history!`);
    console.log('🎉 Password history setup completed successfully!');

  } catch (error) {
    console.error('❌ Error creating password_history table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

createPasswordHistoryTable();




