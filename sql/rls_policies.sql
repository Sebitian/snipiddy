-- COMPLETE RLS POLICY SETUP FOR MENU_SCANS TABLE
-- This file is designed to be run directly in the Supabase SQL editor
-- It will reset and recreate all necessary policies

-- First, disable and re-enable RLS to reset any issues
ALTER TABLE menu_scans DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_scans ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own menu scans" ON menu_scans;
DROP POLICY IF EXISTS "Users can insert their own menu scans" ON menu_scans;
DROP POLICY IF EXISTS "Users can update their own menu scans" ON menu_scans;
DROP POLICY IF EXISTS "Users can delete their own menu scans" ON menu_scans;
DROP POLICY IF EXISTS "Authenticated users can insert menu scans with null user_email" ON menu_scans;
DROP POLICY IF EXISTS "Allow inserts with null user_email" ON menu_scans;
DROP POLICY IF EXISTS "Public can view scans with null user_email" ON menu_scans;
DROP POLICY IF EXISTS "Service role has full access" ON menu_scans;
DROP POLICY IF EXISTS "Admin access" ON menu_scans;
DROP POLICY IF EXISTS "Allow anonymous inserts" ON menu_scans;

-- SERVICE ROLE BYPASS POLICY (Most important, should be applied first)
-- This ensures your server-side code using the service role key can bypass RLS
CREATE POLICY "service_role_bypass" ON menu_scans
    USING (TRUE)
    WITH CHECK (TRUE);

-- ANONYMOUS INSERT POLICY
-- Allow ALL inserts without authentication check
CREATE POLICY "allow_all_inserts" ON menu_scans
    FOR INSERT
    WITH CHECK (TRUE);

-- USER-SPECIFIC POLICIES
-- Allow users to view only their own scans
CREATE POLICY "user_select_own" ON menu_scans
    FOR SELECT
    USING (user_email = auth.jwt() ->> 'email');

-- Allow users to update only their own scans
CREATE POLICY "user_update_own" ON menu_scans
    FOR UPDATE
    USING (user_email = auth.jwt() ->> 'email');

-- Allow users to delete only their own scans
CREATE POLICY "user_delete_own" ON menu_scans
    FOR DELETE
    USING (user_email = auth.jwt() ->> 'email');

-- PUBLIC POLICIES
-- Allow anyone to view scans with null user_email
CREATE POLICY "public_view_anonymous" ON menu_scans
    FOR SELECT
    USING (user_email IS NULL);

-- VERIFICATION QUERY
-- After running this file, run this query to check if RLS is properly configured:
-- SELECT * FROM pg_policies WHERE tablename = 'menu_scans';

-- Example of how to modify the menu_scans table to use user_email instead of user_id
-- ALTER TABLE menu_scans DROP COLUMN user_id;
-- ALTER TABLE menu_scans ADD COLUMN user_email TEXT;

-- Add an index on user_email for better performance
-- CREATE INDEX idx_menu_scans_user_email ON menu_scans(user_email);

-- You may want to add a foreign key constraint to profiles if needed
-- ALTER TABLE menu_scans ADD CONSTRAINT fk_menu_scans_profiles 
--    FOREIGN KEY (user_email) REFERENCES profiles(email);

-- If you want to validate emails, add a check constraint
-- ALTER TABLE menu_scans ADD CONSTRAINT check_valid_email 
--    CHECK (user_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'); 