# Signup & Login Debugging Guide

## Quick Checklist for Supabase Setup

### 1. Check Email Confirmation Settings

Go to: **Supabase Dashboard** → **Authentication** → **Settings** → **Email**

- [ ] **Enable email confirmations**: Should be **ON** (users must confirm email before signing in)
- [ ] **Confirm email** template is set up correctly
- [ ] **Site URL** is set correctly (e.g., `http://localhost:5173` for development)
- [ ] **Redirect URLs** includes:
  - `http://localhost:5173/auth/confirm`
  - `http://localhost:5173/**` (wildcard for all routes)

### 2. Check Row Level Security (RLS) Policies

The signup might fail if RLS policies are too restrictive. Check these tables:

#### user_profiles table
Go to: **Table Editor** → **user_profiles** → **RLS** tab

You need these policies:

**INSERT Policy** (for signup):
```sql
-- Name: "Users can create their own profile"
-- Policy for: INSERT
-- Using expression:
auth.uid() = id

-- Check expression (leave empty or same as using)
```

**SELECT Policy** (for loading profile):
```sql
-- Name: "Users can read their own profile"
-- Policy for: SELECT
-- Using expression:
auth.uid() = id
```

**UPDATE Policy** (for profile updates):
```sql
-- Name: "Users can update their own profile"
-- Policy for: UPDATE
-- Using expression:
auth.uid() = id
```

#### sites table
Go to: **Table Editor** → **sites** → **RLS** tab

You need these policies:

**INSERT Policy**:
```sql
-- Name: "Users can create their own sites"
-- Policy for: INSERT
-- Using expression:
auth.uid() = customer_id
```

**SELECT Policy**:
```sql
-- Name: "Users can read their own sites"
-- Policy for: SELECT
-- Using expression:
auth.uid() = customer_id
```

**UPDATE Policy**:
```sql
-- Name: "Users can update their own sites"
-- Policy for: UPDATE
-- Using expression:
auth.uid() = customer_id
```

### 3. Check Table Structure

#### user_profiles table should have:
- `id` (uuid, primary key, references auth.users.id)
- `email` (text)
- `name` (text, nullable)
- `role` (text, default: 'customer')
- `created_at` (timestamp with time zone, default: now())

#### sites table should have:
- `id` (uuid, primary key, default: gen_random_uuid())
- `customer_id` (uuid, references auth.users.id)
- `site_id` (text, unique)
- `api_key` (text)
- `name` (text)
- `domain` (text)
- `status` (text, default: 'active')
- `config` (jsonb, default: {})
- `stats` (jsonb, default: {})
- `created_at` (timestamp with time zone, default: now())

### 4. Test Signup Flow

1. **Open browser console** (F12) to see debug logs
2. **Sign up** with a new email
3. **Check console** for these messages:
   ```
   Starting signup process...
   User created: [user-id]
   Profile created successfully
   Demo site created successfully (for customers)
   Signup completed successfully
   ```

4. **Check your email inbox** for confirmation email
5. **Click the confirmation link** in the email
6. **You should be redirected** to `/auth/confirm` with a success message
7. **After 3 seconds**, auto-redirect to `/login`
8. **Sign in** with your email and password
9. **Check console** for redirect:
   ```
   Redirecting admin to /admin
   OR
   Redirecting customer to /dashboard
   ```

## Common Issues & Solutions

### Issue 1: "Failed to create user profile"

**Cause**: RLS policies on user_profiles table are blocking the insert

**Solution**:
1. Go to Supabase → **Table Editor** → **user_profiles**
2. Click **RLS** tab
3. Make sure you have an INSERT policy that allows `auth.uid() = id`
4. Or temporarily **disable RLS** on user_profiles for testing:
   ```sql
   ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
   ```
5. Don't forget to re-enable it later!

### Issue 2: "Email not confirmed" error when signing in

**Cause**: Email confirmation is required but user hasn't confirmed yet

**Solution**:
1. Check email inbox for confirmation email
2. Click the confirmation link
3. Wait for redirect to `/auth/confirm`
4. Then try signing in again

**OR** disable email confirmation temporarily:
1. Go to Supabase → **Authentication** → **Settings**
2. Turn **OFF** "Enable email confirmations"
3. Sign up again (previous unconfirmed accounts won't work)

### Issue 3: Site creation fails but profile is created

**Cause**: RLS policies on sites table or missing columns

**Solution**:
1. Check browser console for the exact error message
2. Verify sites table structure matches the requirements above
3. Check RLS policies on sites table
4. The app will still work - you can create sites manually later

### Issue 4: Can't sign in after confirming email

**Cause**: User profile might not exist or role is missing

**Solution**:
1. Go to Supabase → **Table Editor** → **user_profiles**
2. Find your user by email
3. Check if the row exists and has a `role` field set
4. If missing, add it manually:
   ```sql
   INSERT INTO user_profiles (id, email, name, role)
   VALUES (
     '[your-auth-user-id]',
     'your@email.com',
     'Your Name',
     'customer'
   );
   ```

### Issue 5: Redirects to blank page after login

**Cause**: Role is not being fetched correctly

**Solution**:
1. Check browser console for errors
2. Verify user_profiles SELECT policy allows reading own profile
3. Try signing out and signing in again
4. Check that the role field exists in the database

## Admin Access

To become an admin, your email must be in the `ADMIN_EMAILS` array in `src/lib/supabase.ts`:

```typescript
const ADMIN_EMAILS = [
  'acvetne@gmail.com',  // Your email is already here
  'admin@demo.com'
]
```

After adding your email:
1. Create a NEW account (existing accounts keep their role)
2. Your role will be set to 'admin' automatically

## Manual Database Queries

If you need to manually fix things in Supabase SQL Editor:

### Check if user profile exists:
```sql
SELECT * FROM user_profiles WHERE email = 'your@email.com';
```

### Manually create user profile:
```sql
INSERT INTO user_profiles (id, email, name, role)
VALUES (
  '[copy-id-from-auth.users-table]',
  'your@email.com',
  'Your Name',
  'customer'
);
```

### Change user role to admin:
```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

### List all sites:
```sql
SELECT * FROM sites ORDER BY created_at DESC;
```

### Create a demo site manually:
```sql
INSERT INTO sites (customer_id, site_id, api_key, name, domain, status, config, stats)
VALUES (
  '[your-user-id]',
  'site_' || substr(md5(random()::text), 1, 9),
  'pk_live_' || substr(md5(random()::text), 1, 16),
  'My Site',
  'example.com',
  'active',
  '{"gateType": "none", "meteredLimit": 3, "premiumPages": [], "blockedBots": ["GPTBot", "ClaudeBot", "CCBot"], "subscribeUrl": "", "loginUrl": "", "showGateToHumans": false}'::jsonb,
  '{"totalRequests": 0, "blockedRequests": 0, "allowedRequests": 0}'::jsonb
);
```

## Still Having Issues?

1. **Check the browser console** - all errors are logged there now
2. **Check Supabase logs** - Dashboard → Logs → Shows all database errors
3. **Check the Network tab** - See exactly what's failing in the API calls
4. **Temporarily disable RLS** on tables to isolate the issue
5. **Try with a different email** - Sometimes cached auth state causes issues
