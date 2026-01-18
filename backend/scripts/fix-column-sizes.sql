-- Quick fix script to increase email and phone column sizes for encrypted data
-- Run this script directly on your database to fix the "value too long" error

-- Increase email column size to accommodate encrypted data
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(500);

-- Increase phone column size to accommodate encrypted data  
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(500);

-- Verify the changes
SELECT 
    column_name, 
    character_maximum_length,
    data_type
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('email', 'phone');
