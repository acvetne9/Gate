-- Update your user profile with the correct Stripe customer ID
-- Replace 'your-email@example.com' with your actual email
UPDATE user_profiles
SET stripe_customer_id = 'cus_TleosoBpqgIcnQ'
WHERE email = 'your-email@example.com';

-- Check the result
SELECT id, email, name, stripe_customer_id
FROM user_profiles
WHERE stripe_customer_id = 'cus_TleosoBpqgIcnQ';
