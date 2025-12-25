import pool from '../config/database.js';
import format from 'pg-format';

// Database migration script
const migrateDatabase = async () => {
  console.log('🔄 Starting database migration...\n');

  try {
    const client = await pool.connect();
    
    // Check current database version
    const versionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    // Create schema_migrations table if it doesn't exist
    if (!versionCheck.rows[0].exists) {
      await client.query(`
        CREATE TABLE schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created schema_migrations table');
    }

    // Migration 1: Add new columns to users table
    const migration1 = '2024-01-01-add-user-columns';
    const migration1Exists = await client.query(
      'SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)',
      [migration1]
    );

    if (!migration1Exists.rows[0].exists) {
      console.log('📋 Applying migration: Add new columns to users table...');
      
      const newColumns = [
        { name: 'phone', type: 'VARCHAR(20) UNIQUE' },
        { name: 'organization', type: 'VARCHAR(255)' },
        { name: 'is_active', type: 'BOOLEAN DEFAULT false' },
        { name: 'is_verified', type: 'BOOLEAN DEFAULT false' },
        { name: 'email_verified_at', type: 'TIMESTAMP' },
        { name: 'phone_verified_at', type: 'TIMESTAMP' },
        { name: 'last_login_at', type: 'TIMESTAMP' },
        { name: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
        { name: 'locked_until', type: 'TIMESTAMP' }
      ];
      
      for (const column of newColumns) {
        try {
          // Validate column name to prevent SQL injection
          if (!/^\w+$/.test(column.name)) {
            throw new Error(`Invalid column name: ${column.name}`);
          }
          // Use pg-format to safely escape the column name identifier
          // Column type is hardcoded in the array (not user input), so it's safe
          const query = format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I ', 'users', column.name) + column.type;
          await client.query(query);
          console.log(`  ✅ Added column: ${column.name}`);
        } catch (err) {
          console.log(`  ⚠️  Column ${column.name}: ${err.message}`);
        }
      }
      
      // Update role constraint
      try {
        await client.query(`
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        `);
        await client.query(`
          ALTER TABLE users ADD CONSTRAINT users_role_check 
          CHECK (role IN ('superadmin', 'urologist', 'gp', 'urology_nurse', 'doctor'));
        `);
        console.log('  ✅ Updated role constraint');
      } catch (err) {
        console.log(`  ⚠️  Role constraint: ${err.message}`);
      }
      
      // Record migration
      await client.query(
        'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
        [migration1, 'Add phone, organization, and security columns to users table']
      );
      console.log('✅ Migration 1 completed');
    } else {
      console.log('✅ Migration 1 already applied');
    }

    // Migration 2: Create OTP verifications table
    const migration2 = '2024-01-01-create-otp-table';
    const migration2Exists = await client.query(
      'SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)',
      [migration2]
    );

    if (!migration2Exists.rows[0].exists) {
      console.log('📋 Applying migration: Create OTP verifications table...');
      
      const otpTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'otp_verifications'
        );
      `);
      
      if (!otpTableExists.rows[0].exists) {
        await client.query(`
          CREATE TABLE otp_verifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            otp_code VARCHAR(6) NOT NULL,
            type VARCHAR(20) NOT NULL CHECK (type IN ('registration', 'login', 'password_reset')),
            expires_at TIMESTAMP NOT NULL,
            attempts INTEGER DEFAULT 0,
            is_used BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('  ✅ Created otp_verifications table');
      } else {
        console.log('  ✅ OTP verifications table already exists');
      }
      
      // Record migration
      await client.query(
        'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
        [migration2, 'Create OTP verifications table for email verification']
      );
      console.log('✅ Migration 2 completed');
    } else {
      console.log('✅ Migration 2 already applied');
    }

    // Create indexes
    console.log('📋 Creating/updating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)',
      'CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications(email)',
      'CREATE INDEX IF NOT EXISTS idx_otp_verifications_user_id ON otp_verifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at)'
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        const indexName = indexQuery.match(/idx_\w+/)[0];
        console.log(`  ✅ Index ${indexName} created/verified`);
      } catch (err) {
        console.log(`  ⚠️  Index creation: ${err.message}`);
      }
    }

    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    
    const migrations = await client.query('SELECT * FROM schema_migrations ORDER BY applied_at');
    migrations.rows.forEach(migration => {
      console.log(`  ✅ ${migration.version}: ${migration.description}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run migration
migrateDatabase();

