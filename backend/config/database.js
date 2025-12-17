import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'urology_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established (increased from 2s)
};

// Create a new pool instance
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ [Database Pool] Unexpected error on idle client:', err.message);
  console.error('❌ [Database Pool] Error stack:', err.stack);
  // Don't exit - let the server continue and log the error
});

// Log pool status periodically (only in development)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    console.log(`📊 [Database Pool] Status - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
  }, 30000); // Every 30 seconds
}

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
};

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Check if users table exists and get its structure
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Table exists, check for new columns and add them if missing
      console.log('📋 Users table exists, checking for new columns...');
      
      // Add new columns if they don't exist
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
          await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};
          `);
          console.log(`✅ Added column: ${column.name}`);
        } catch (err) {
          console.log(`⚠️  Column ${column.name} might already exist: ${err.message}`);
        }
      }
      
      // Update role constraint if needed
      try {
        await client.query(`
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        `);
        await client.query(`
          ALTER TABLE users ADD CONSTRAINT users_role_check 
          CHECK (role IN ('superadmin', 'urologist', 'gp', 'urology_nurse', 'doctor', 'department_admin'));
        `);
        console.log('✅ Updated role constraint');
      } catch (err) {
        console.log(`⚠️  Role constraint update: ${err.message}`);
      }
      
    } else {
      // Table doesn't exist, create it with all columns
      console.log('📋 Creating users table with all columns...');
      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20) UNIQUE,
          organization VARCHAR(255),
          role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'urologist', 'gp', 'urology_nurse', 'doctor', 'department_admin')),
          is_active BOOLEAN DEFAULT false,
          is_verified BOOLEAN DEFAULT false,
          email_verified_at TIMESTAMP,
          phone_verified_at TIMESTAMP,
          last_login_at TIMESTAMP,
          failed_login_attempts INTEGER DEFAULT 0,
          locked_until TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table created successfully');
    }

    // Create refresh_tokens table
    const refreshTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'refresh_tokens'
      );
    `);
    
    if (!refreshTableExists.rows[0].exists) {
      console.log('📋 Creating refresh_tokens table...');
      await client.query(`
        CREATE TABLE refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(500) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_revoked BOOLEAN DEFAULT false
        )
      `);
      console.log('✅ Refresh tokens table created successfully');
    } else {
      console.log('✅ Refresh tokens table already exists');
    }

    // Create otp_verifications table
    const otpTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'otp_verifications'
      );
    `);
    
    if (!otpTableExists.rows[0].exists) {
      console.log('📋 Creating otp_verifications table...');
      await client.query(`
        CREATE TABLE otp_verifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          otp_code VARCHAR(6) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('registration', 'login', 'login_verification', 'password_reset', 'password_setup')),
          expires_at TIMESTAMP NOT NULL,
          attempts INTEGER DEFAULT 0,
          is_used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ OTP verifications table created successfully');
    } else {
      console.log('✅ OTP verifications table already exists');
      // Update the constraint to include 'login_verification' if it doesn't already
      try {
        // Drop the old constraint
        await client.query(`
          ALTER TABLE otp_verifications 
          DROP CONSTRAINT IF EXISTS otp_verifications_type_check;
        `);
        // Add the new constraint with 'login_verification'
        await client.query(`
          ALTER TABLE otp_verifications 
          ADD CONSTRAINT otp_verifications_type_check 
          CHECK (type IN ('registration', 'login', 'login_verification', 'password_reset', 'password_setup'));
        `);
        console.log('✅ Updated OTP verifications table constraint to include login_verification');
      } catch (err) {
        console.log(`⚠️  Could not update OTP constraint (might already be updated): ${err.message}`);
      }
    }

    // Create password_setup_tokens table
    const passwordSetupTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_setup_tokens'
      );
    `);
    
    if (!passwordSetupTableExists.rows[0].exists) {
      console.log('📋 Creating password_setup_tokens table...');
      await client.query(`
        CREATE TABLE password_setup_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          is_used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Password setup tokens table created successfully');
    } else {
      console.log('✅ Password setup tokens table already exists');
    }

    // Create password_reset_tokens table
    const passwordResetTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_tokens'
      );
    `);
    
    if (!passwordResetTableExists.rows[0].exists) {
      console.log('📋 Creating password_reset_tokens table...');
      await client.query(`
        CREATE TABLE password_reset_tokens (
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
      console.log('✅ Password reset tokens table created successfully');
    } else {
      console.log('✅ Password reset tokens table already exists');
    }

    // Create password_history table
    const passwordHistoryTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_history'
      );
    `);
    
    if (!passwordHistoryTableExists.rows[0].exists) {
      console.log('📋 Creating password_history table...');
      await client.query(`
        CREATE TABLE password_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_password_history FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Password history table created successfully');
      
      // Migrate existing user passwords to password history
      console.log('🔄 Migrating existing user passwords to history...');
      const result = await client.query(`
        INSERT INTO password_history (user_id, password_hash, created_at)
        SELECT id, password_hash, created_at
        FROM users
        WHERE password_hash IS NOT NULL
        ON CONFLICT DO NOTHING
      `);
      console.log(`✅ Migrated ${result.rowCount} existing passwords to history!`);
    } else {
      console.log('✅ Password history table already exists');
    }

    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications(email);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_verifications_user_id ON otp_verifications(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_user_id ON password_setup_tokens(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_token ON password_setup_tokens(token);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_expires_at ON password_setup_tokens(expires_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(user_id, created_at DESC);
    `);

    // Create patients table
    const patientsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patients'
      );
    `);
    
    if (!patientsTableExists.rows[0].exists) {
      console.log('📋 Creating patients table...');
      await client.query(`
        CREATE TABLE patients (
          id SERIAL PRIMARY KEY,
          upi VARCHAR(20) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          date_of_birth DATE NOT NULL,
          gender VARCHAR(10),
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(255),
          address TEXT,
          postcode VARCHAR(10),
          city VARCHAR(100),
          state VARCHAR(10),
          referring_department VARCHAR(255),
          referral_date DATE,
          initial_psa DECIMAL(5,2) NOT NULL,
          initial_psa_date DATE,
          medical_history TEXT,
          current_medications TEXT,
          allergies TEXT,
          assigned_urologist VARCHAR(255),
          emergency_contact_name VARCHAR(100),
          emergency_contact_phone VARCHAR(20),
          emergency_contact_relationship VARCHAR(50),
          priority VARCHAR(20) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
          notes TEXT,
          status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Discharged')),
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Patients table created successfully');
    } else {
      console.log('✅ Patients table already exists');
    }

    // Make gender column nullable (remove NOT NULL constraint and CHECK constraint)
    try {
      await client.query(`
        ALTER TABLE patients 
        ALTER COLUMN gender DROP NOT NULL,
        DROP CONSTRAINT IF EXISTS patients_gender_check
      `);
      console.log('✅ Made gender column nullable');
    } catch (e) {
      // If constraint doesn't exist or column is already nullable, that's fine
      console.log('⚠️  Making gender nullable:', e.message);
    }

    // Ensure care_pathway columns exist on patients
    try {
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_pathway VARCHAR(50)`);
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS care_pathway_updated_at TIMESTAMP`);
      console.log('✅ Ensured patients.care_pathway columns');
    } catch (e) {
      console.log('⚠️  Ensuring care_pathway columns:', e.message);
    }

    // Ensure triage_symptoms column exists on patients
    try {
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS triage_symptoms TEXT`);
      console.log('✅ Ensured patients.triage_symptoms column');
    } catch (e) {
      console.log('⚠️  Ensuring triage_symptoms column:', e.message);
    }

    // Ensure exam & prior tests columns exist on patients
    try {
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS dre_done BOOLEAN DEFAULT FALSE`);
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS dre_findings VARCHAR(255)`);
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS prior_biopsy VARCHAR(10) DEFAULT 'no'`);
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS prior_biopsy_date DATE`);
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS gleason_score VARCHAR(20)`);
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS comorbidities TEXT`);
      console.log('✅ Ensured patients exam & prior tests columns');
    } catch (e) {
      console.log('⚠️  Ensuring exam & prior tests columns:', e.message);
    }

    // Ensure social_history and family_history columns exist on patients
    try {
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS social_history TEXT`);
      await client.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_history TEXT`);
      console.log('✅ Ensured patients social_history and family_history columns');
    } catch (e) {
      console.log('⚠️  Ensuring social_history and family_history columns:', e.message);
    }

    // Create patient_notes table
    const notesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patient_notes'
      );
    `);

    if (!notesTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE patient_notes (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          note_content TEXT NOT NULL,
          note_type VARCHAR(50) DEFAULT 'clinical',
          author_id INTEGER REFERENCES users(id),
          author_name VARCHAR(100),
          author_role VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Patient notes table created successfully');
    } else {
      console.log('✅ Patient notes table already exists');
    }

    // Create indexes for patients table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_upi ON patients(upi);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    `);

    // Create indexes for patient_notes table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_notes_created_at ON patient_notes(created_at);
    `);

    // Create investigation_results table
    const investigationResultsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'investigation_results'
      );
    `);

    if (!investigationResultsTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE investigation_results (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          test_type VARCHAR(50) NOT NULL,
          test_name VARCHAR(200) NOT NULL,
          test_date DATE NOT NULL,
          result VARCHAR(100),
          reference_range VARCHAR(100),
          status VARCHAR(50) DEFAULT 'Normal',
          notes TEXT,
          file_path VARCHAR(500),
          file_name VARCHAR(200),
          author_id INTEGER REFERENCES users(id),
          author_name VARCHAR(100),
          author_role VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Investigation results table created successfully');
    } else {
      console.log('✅ Investigation results table already exists');
    }

    // Create indexes for investigation_results table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investigation_results_patient_id ON investigation_results(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investigation_results_test_type ON investigation_results(test_type);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investigation_results_test_date ON investigation_results(test_date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_assigned_urologist ON patients(assigned_urologist);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
    `);

    // Create appointments table
    const appointmentsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
      );
    `);

    if (!appointmentsTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE appointments (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          appointment_type VARCHAR(50) NOT NULL,
          appointment_date DATE NOT NULL,
          appointment_time TIME NOT NULL,
          urologist_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
          urologist_name VARCHAR(100),
          surgery_type VARCHAR(200),
          status VARCHAR(50) DEFAULT 'scheduled',
          notes TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Appointments table created successfully');
    } else {
      console.log('✅ Appointments table already exists');
      
      // Add surgery_type column if it doesn't exist
      try {
        await client.query(`
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS surgery_type VARCHAR(200);
        `);
        console.log('✅ Added surgery_type column to appointments table');
      } catch (err) {
        console.log(`⚠️  Surgery_type column might already exist: ${err.message}`);
      }
      
      // Add reminder_sent and reminder_sent_at columns if they don't exist
      try {
        await client.query(`
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ Added reminder_sent column to appointments table');
      } catch (err) {
        console.log(`⚠️  reminder_sent column might already exist: ${err.message}`);
      }
      
      try {
        await client.query(`
          ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;
        `);
        console.log('✅ Added reminder_sent_at column to appointments table');
      } catch (err) {
        console.log(`⚠️  reminder_sent_at column might already exist: ${err.message}`);
      }
      
      // Allow NULL for appointment_time to support automatic appointments without time slots
      try {
        await client.query(`
          ALTER TABLE appointments 
          ALTER COLUMN appointment_time DROP NOT NULL;
        `);
        console.log('✅ Modified appointment_time to allow NULL for automatic appointments');
      } catch (err) {
        console.log(`⚠️  appointment_time column might already allow NULL: ${err.message}`);
      }
      
      // Try to update foreign key constraint to reference doctors(id) instead of users(id)
      // This is safe to run multiple times - it will only update if the constraint exists
      try {
        // Check if constraint exists and points to users
        const constraintCheck = await client.query(`
          SELECT 
            tc.constraint_name,
            ccu.table_name AS foreign_table_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'appointments'
            AND kcu.column_name = 'urologist_id'
            AND ccu.table_name = 'users';
        `);
        
        if (constraintCheck.rows.length > 0) {
          const constraintName = constraintCheck.rows[0].constraint_name;
          console.log(`🔄 Updating appointments.urologist_id foreign key constraint to reference doctors(id)...`);
          
          // Drop old constraint
          await client.query(`
            ALTER TABLE appointments 
            DROP CONSTRAINT IF EXISTS ${constraintName};
          `);
          
          // Make column nullable if not already
          await client.query(`
            ALTER TABLE appointments 
            ALTER COLUMN urologist_id DROP NOT NULL;
          `);
          
          // Add new constraint pointing to doctors
          await client.query(`
            ALTER TABLE appointments 
            ADD CONSTRAINT appointments_urologist_id_fkey 
            FOREIGN KEY (urologist_id) 
            REFERENCES doctors(id) 
            ON DELETE SET NULL;
          `);
          
          console.log('✅ Updated appointments.urologist_id foreign key to reference doctors(id)');
        }
      } catch (err) {
        console.log(`⚠️  Could not update foreign key constraint (may already be correct): ${err.message}`);
      }
    }

    // Create investigation_bookings table
    const investigationBookingsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'investigation_bookings'
      );
    `);

    if (!investigationBookingsTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE investigation_bookings (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          investigation_type VARCHAR(100) NOT NULL,
          investigation_name VARCHAR(200) NOT NULL,
          scheduled_date DATE,
          scheduled_time TIME,
          status VARCHAR(50) DEFAULT 'scheduled',
          notes TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Investigation bookings table created successfully');
    } else {
      console.log('✅ Investigation bookings table already exists');
      // Migrate existing table to allow NULL values for scheduled_date and scheduled_time
      try {
        await client.query(`
          ALTER TABLE investigation_bookings 
          ALTER COLUMN scheduled_date DROP NOT NULL,
          ALTER COLUMN scheduled_time DROP NOT NULL
        `);
        console.log('✅ Investigation bookings table migrated to allow NULL scheduled dates');
      } catch (migrationError) {
        // Ignore error if columns are already nullable
        if (!migrationError.message.includes('does not exist') && !migrationError.message.includes('cannot drop')) {
          console.log('ℹ️  Investigation bookings table columns may already be nullable:', migrationError.message);
        }
      }
    }

    // Create indexes for appointments table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(appointment_type);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    `);

    // Create indexes for investigation_bookings table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investigation_bookings_patient_id ON investigation_bookings(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investigation_bookings_type ON investigation_bookings(investigation_type);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investigation_bookings_date ON investigation_bookings(scheduled_date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investigation_bookings_status ON investigation_bookings(status);
    `);

    // Create MDT meetings table
    const mdtMeetingsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mdt_meetings'
      );
    `);
    if (!mdtMeetingsTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE mdt_meetings (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          meeting_date DATE NOT NULL,
          meeting_time TIME NOT NULL,
          priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
          status VARCHAR(20) DEFAULT 'Scheduled',
          notes TEXT,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ MDT meetings table created successfully');
    }

    // Create MDT team members table
    const mdtMembersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mdt_team_members'
      );
    `);
    if (!mdtMembersTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE mdt_team_members (
          id SERIAL PRIMARY KEY,
          mdt_meeting_id INTEGER REFERENCES mdt_meetings(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id),
          external_name VARCHAR(200),
          role VARCHAR(100) NOT NULL,
          status VARCHAR(20) DEFAULT 'Invited',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ MDT team members table created successfully');
    }

    // Ensure user_id is nullable to allow external members
    try {
      await client.query(`
        ALTER TABLE mdt_team_members ALTER COLUMN user_id DROP NOT NULL;
      `);
    } catch (e) {
      // ignore if already nullable
    }

    // Ensure external_name column exists
    try {
      await client.query(`
        ALTER TABLE mdt_team_members ADD COLUMN IF NOT EXISTS external_name VARCHAR(200);
      `);
    } catch (e) {
      // ignore
    }

    // Indexes for MDT tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mdt_meetings_patient_id ON mdt_meetings(patient_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mdt_meetings_date ON mdt_meetings(meeting_date, meeting_time);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mdt_team_members_meeting_id ON mdt_team_members(mdt_meeting_id);
    `);

    // Create departments table
    const departmentsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'departments'
      );
    `);

    if (!departmentsTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE departments (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Departments table created successfully');
    } else {
      console.log('✅ Departments table already exists');
    }

    // Create doctors table
    const doctorsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'doctors'
      );
    `);

    if (!doctorsTableExists.rows[0].exists) {
      await client.query(`
        CREATE TABLE doctors (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(20),
          department_id INTEGER REFERENCES departments(id),
          specialization VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Doctors table created successfully');
    } else {
      console.log('✅ Doctors table already exists');
    }

    // Create indexes for departments table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
    `);

    // Create indexes for doctors table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(first_name, last_name);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_doctors_department_id ON doctors(department_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_doctors_is_active ON doctors(is_active);
    `);

    // Create discharge_summaries table
    const dischargeSummariesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'discharge_summaries'
      );
    `);

    if (!dischargeSummariesTableExists.rows[0].exists) {
      console.log('📋 Creating discharge_summaries table...');
      await client.query(`
        CREATE TABLE discharge_summaries (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          admission_date DATE NOT NULL,
          discharge_date DATE NOT NULL,
          discharge_time TIME,
          length_of_stay VARCHAR(50),
          consultant_id INTEGER REFERENCES users(id),
          ward VARCHAR(100),
          diagnosis JSONB,
          procedure JSONB,
          clinical_summary TEXT,
          investigations JSONB,
          medications JSONB,
          follow_up JSONB,
          gp_actions JSONB,
          discharged_by VARCHAR(255),
          documents JSONB,
          is_deleted BOOLEAN DEFAULT FALSE,
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Discharge summaries table created successfully');
    } else {
      console.log('✅ Discharge summaries table already exists');
    }

    // Create indexes for discharge_summaries table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_discharge_summaries_patient_id ON discharge_summaries(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_discharge_summaries_discharge_date ON discharge_summaries(discharge_date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_discharge_summaries_consultant_id ON discharge_summaries(consultant_id);
    `);

    // Create consent_forms table
    const consentFormsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'consent_forms'
      );
    `);

    if (!consentFormsTableExists.rows[0].exists) {
      console.log('📋 Creating consent_forms table...');
      await client.query(`
        CREATE TABLE consent_forms (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Consent forms table created successfully');
    } else {
      console.log('✅ Consent forms table already exists');
    }

    // Create patient_consent_forms table
    const patientConsentFormsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'patient_consent_forms'
      );
    `);

    if (!patientConsentFormsTableExists.rows[0].exists) {
      console.log('📋 Creating patient_consent_forms table...');
      await client.query(`
        CREATE TABLE patient_consent_forms (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          consent_form_id INTEGER NOT NULL REFERENCES consent_forms(id) ON DELETE CASCADE,
          file_path VARCHAR(500) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_size INTEGER,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(patient_id, consent_form_id)
        )
      `);
      console.log('✅ Patient consent forms table created successfully');
    } else {
      console.log('✅ Patient consent forms table already exists');
    }

    // Create indexes for consent forms tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_consent_forms_patient_id ON patient_consent_forms(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_consent_forms_consent_form_id ON patient_consent_forms(consent_form_id);
    `);

    console.log('✅ Database tables initialized successfully');
    
    // Initialize audit logs table
    const { initializeAuditLogsTable } = await import('../services/auditLogger.js');
    await initializeAuditLogsTable();
    
    // Create clinical_guidelines table
    const clinicalGuidelinesTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clinical_guidelines'
      );
    `);
    
    if (!clinicalGuidelinesTableExists.rows[0].exists) {
      console.log('📋 Creating clinical_guidelines table...');
      await client.query(`
        CREATE TABLE clinical_guidelines (
          id SERIAL PRIMARY KEY,
          guideline_name VARCHAR(255) NOT NULL,
          guideline_version VARCHAR(50),
          category VARCHAR(100),
          criteria JSONB,
          recommendations JSONB,
          evidence_level VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Clinical guidelines table created successfully');
    } else {
      console.log('✅ Clinical guidelines table already exists');
    }

    // Create guideline_compliance_checks table
    const complianceChecksTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'guideline_compliance_checks'
      );
    `);
    
    if (!complianceChecksTableExists.rows[0].exists) {
      console.log('📋 Creating guideline_compliance_checks table...');
      await client.query(`
        CREATE TABLE guideline_compliance_checks (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          guideline_id INTEGER REFERENCES clinical_guidelines(id) ON DELETE SET NULL,
          check_type VARCHAR(100),
          check_result VARCHAR(50),
          details JSONB,
          checked_by INTEGER REFERENCES users(id),
          checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Guideline compliance checks table created successfully');
    } else {
      console.log('✅ Guideline compliance checks table already exists');
    }

    // Create decision_support_recommendations table
    const decisionSupportTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'decision_support_recommendations'
      );
    `);
    
    if (!decisionSupportTableExists.rows[0].exists) {
      console.log('📋 Creating decision_support_recommendations table...');
      await client.query(`
        CREATE TABLE decision_support_recommendations (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          recommendation_type VARCHAR(100),
          recommendation_text TEXT,
          guideline_reference VARCHAR(255),
          evidence_level VARCHAR(50),
          priority VARCHAR(50),
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Decision support recommendations table created successfully');
    } else {
      console.log('✅ Decision support recommendations table already exists');
    }

    // Create pathway_validations table
    const pathwayValidationsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pathway_validations'
      );
    `);
    
    if (!pathwayValidationsTableExists.rows[0].exists) {
      console.log('📋 Creating pathway_validations table...');
      await client.query(`
        CREATE TABLE pathway_validations (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
          from_pathway VARCHAR(100),
          to_pathway VARCHAR(100),
          validation_result VARCHAR(50),
          missing_requirements JSONB,
          validated_by INTEGER REFERENCES users(id),
          validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Pathway validations table created successfully');
    } else {
      console.log('✅ Pathway validations table already exists');
    }

    // Create indexes for guideline tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clinical_guidelines_category ON clinical_guidelines(category);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_patient_id ON guideline_compliance_checks(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_checked_at ON guideline_compliance_checks(checked_at);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_decision_support_patient_id ON decision_support_recommendations(patient_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_decision_support_status ON decision_support_recommendations(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pathway_validations_patient_id ON pathway_validations(patient_id);
    `);
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    return false;
  }
};

export default pool;
