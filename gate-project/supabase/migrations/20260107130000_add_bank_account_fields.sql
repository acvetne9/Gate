-- Add bank account fields to payment_methods table for ACH support
-- These fields store US bank account information from Stripe

-- First, ensure the payment_methods table exists
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account', 'us_bank_account', 'sepa_debit')),
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add bank account fields
ALTER TABLE public.payment_methods
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_last4 TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT, -- 'checking' or 'savings'
ADD COLUMN IF NOT EXISTS account_holder_type TEXT, -- 'individual' or 'company'
ADD COLUMN IF NOT EXISTS routing_number TEXT;

-- Add comment explaining the new fields
COMMENT ON COLUMN public.payment_methods.bank_name IS 'Bank name for ACH payments (e.g., Chase, Bank of America)';
COMMENT ON COLUMN public.payment_methods.bank_last4 IS 'Last 4 digits of bank account number';
COMMENT ON COLUMN public.payment_methods.account_type IS 'Type of bank account: checking or savings';
COMMENT ON COLUMN public.payment_methods.account_holder_type IS 'Account holder type: individual or company';
COMMENT ON COLUMN public.payment_methods.routing_number IS 'Bank routing number for ACH transfers';
