-- Migration: Complete Stripe Integration
-- Created: 2024-12-24
-- Description: All Stripe-related tables, indexes, and RLS policies in one file

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- STRIPE TABLES
-- ============================================================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')),
  plan_name TEXT NOT NULL CHECK (plan_name IN ('free', 'keeper', 'max')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT,
  amount_paid INTEGER NOT NULL,
  amount_due INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('paid', 'open', 'void', 'uncollectible', 'draft')),
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  billing_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Usage tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  requests_count INTEGER DEFAULT 0,
  sites_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, period_start, period_end)
);

-- ============================================================================
-- USER PROFILES UPDATES
-- ============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'keeper', 'max'));

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete'));

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- Payment method indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_customer_id ON public.payment_methods(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON public.payment_methods(is_default) WHERE is_default = true;

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_customer_period ON public.usage_tracking(customer_id, period_start, period_end);

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON public.user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON public.user_profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Request logs performance indexes
CREATE INDEX IF NOT EXISTS idx_request_logs_customer_timestamp ON public.request_logs(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_site_timestamp ON public.request_logs(site_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON public.request_logs(ip);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON public.request_logs(status);
CREATE INDEX IF NOT EXISTS idx_request_logs_type ON public.request_logs(type);
CREATE INDEX IF NOT EXISTS idx_request_logs_customer_status_timestamp ON public.request_logs(customer_id, status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON public.request_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_page_gin ON public.request_logs USING gin(page gin_trgm_ops);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Subscription policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Users can insert own subscription" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (customer_id = auth.uid());

-- Invoice policies
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

-- Payment method policies
CREATE POLICY "Users can view own payment methods" ON public.payment_methods FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Users can insert own payment methods" ON public.payment_methods FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users can update own payment methods" ON public.payment_methods FOR UPDATE TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Users can delete own payment methods" ON public.payment_methods FOR DELETE TO authenticated USING (customer_id = auth.uid());

-- Usage tracking policies
CREATE POLICY "Users can view own usage" ON public.usage_tracking FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Users can insert own usage" ON public.usage_tracking FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.subscriptions IS 'Stores Stripe subscription data for each customer';
COMMENT ON TABLE public.invoices IS 'Stores invoice history from Stripe';
COMMENT ON TABLE public.payment_methods IS 'Stores customer payment methods';
COMMENT ON TABLE public.usage_tracking IS 'Tracks usage metrics for metered billing';

COMMENT ON COLUMN public.user_profiles.subscription_tier IS 'Current subscription plan: free, keeper, or max';
COMMENT ON COLUMN public.user_profiles.subscription_status IS 'Status of subscription: active, canceled, past_due, trialing, incomplete';
COMMENT ON COLUMN public.user_profiles.stripe_customer_id IS 'Stripe customer ID for billing';
