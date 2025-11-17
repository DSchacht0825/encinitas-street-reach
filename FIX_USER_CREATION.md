# Fix for User Creation Issue

## Problem
Adding new users in the dashboard is not working because there's a mismatch between the database schema and the application code:

1. The initial migration (`001_initial_schema.sql`) created a table called `public.users`
2. A later migration (`004_user_profiles.sql`) attempted to create `public.user_profiles`
3. The old `users` table was never dropped or migrated
4. The application code references `user_profiles`, but the database might still have the old `users` table

## Solution
Apply the migration `012_consolidate_user_tables.sql` to consolidate the tables and fix the schema.

## Steps to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project: `gruajicebvttlsjhfhda`
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query**
5. Copy the contents of `/supabase/migrations/012_consolidate_user_tables.sql`
6. Paste it into the SQL editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see success messages in the output

### Option 2: Using Supabase CLI (if installed)

```bash
cd /Users/danielschacht/encinitas-street-reach/encinitas-street-reach
supabase db push
```

## What This Migration Does

1. **Consolidates Tables**:
   - If `user_profiles` doesn't exist but `users` does, it renames `users` to `user_profiles`
   - If both tables exist, it migrates data from `users` to `user_profiles` and drops `users`

2. **Fixes Schema Issues**:
   - Makes `full_name` nullable (previously required)
   - Ensures email uniqueness constraint
   - Recreates all RLS policies correctly

3. **Updates Triggers**:
   - Ensures the `update_updated_at_column` trigger works with `user_profiles`

## Verification

After applying the migration:

1. Go to the dashboard at http://localhost:3000/dashboard/users
2. Click "Add User"
3. Fill in the form:
   - Email: test@example.com
   - Password: test123 (minimum 6 characters)
   - Role: Field Worker or Admin
   - Full Name: (optional)
4. Click "Create User"
5. The user should be created successfully

## Troubleshooting

### If you still get errors after applying the migration:

1. **Check the Supabase logs**:
   - Go to Supabase Dashboard → Logs
   - Look for any error messages

2. **Verify the table exists**:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('users', 'user_profiles');
   ```
   - Should only show `user_profiles`

3. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
   ```
   - Should show 3 policies

4. **Verify service role key**:
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
   - Restart the dev server after any environment variable changes

## Additional Notes

- The migration is idempotent (safe to run multiple times)
- It preserves all existing user data
- After this fix, all user creation should work through the dashboard
