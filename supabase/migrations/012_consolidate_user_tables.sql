-- Consolidate users table to user_profiles table
-- This migration handles the transition from the original 'users' table to 'user_profiles'

-- Step 1: Check if user_profiles exists, if not rename users to user_profiles
DO $$
BEGIN
    -- If user_profiles doesn't exist but users does, rename it
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
            -- Drop the trigger on users first
            DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

            -- Rename the table
            ALTER TABLE public.users RENAME TO user_profiles;

            -- Recreate the trigger with the new table name
            CREATE TRIGGER update_user_profiles_updated_at
              BEFORE UPDATE ON public.user_profiles
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();

            RAISE NOTICE 'Renamed users table to user_profiles';
        END IF;
    ELSE
        -- If both tables exist, we need to migrate data from users to user_profiles
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
            -- Copy any data from users that doesn't exist in user_profiles
            INSERT INTO public.user_profiles (id, email, role, full_name, created_at, updated_at)
            SELECT u.id, u.email, u.role, u.full_name, u.created_at, u.updated_at
            FROM public.users u
            WHERE NOT EXISTS (
                SELECT 1 FROM public.user_profiles up WHERE up.id = u.id
            );

            -- Drop the old users table
            DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
            DROP TABLE public.users CASCADE;

            RAISE NOTICE 'Migrated data from users to user_profiles and dropped users table';
        END IF;
    END IF;
END $$;

-- Step 2: Ensure full_name is nullable in user_profiles
ALTER TABLE public.user_profiles
  ALTER COLUMN full_name DROP NOT NULL;

-- Step 3: Ensure email uniqueness
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_profiles_email_key'
        AND conrelid = 'public.user_profiles'::regclass
    ) THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Step 4: Create index for faster role lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Step 5: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop old policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;

-- Recreate policies
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage profiles"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE public.user_profiles IS 'User profiles with role-based access control. Roles: admin (full dashboard access) or field_worker (client management only)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully! user_profiles table is now the single source of truth.';
END $$;
