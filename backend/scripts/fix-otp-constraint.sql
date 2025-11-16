-- Fix OTP verifications table constraint to include 'login_verification'
-- Run this script to update the database constraint immediately

-- Drop the old constraint
ALTER TABLE otp_verifications 
DROP CONSTRAINT IF EXISTS otp_verifications_type_check;

-- Add the new constraint with 'login_verification'
ALTER TABLE otp_verifications 
ADD CONSTRAINT otp_verifications_type_check 
CHECK (type IN ('registration', 'login', 'login_verification', 'password_reset', 'password_setup'));

-- Verify the constraint was updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'otp_verifications'::regclass
AND conname = 'otp_verifications_type_check';






