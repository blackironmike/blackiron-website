-- Subscriptions table: tracks Stripe subscription state per user
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    customer_email TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('blueprint', 'coaching_call', 'full_coaching')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_email ON subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_subs_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe_sub ON subscriptions(stripe_subscription_id);

-- Coaching calls table: tracks one-time coaching call purchases
CREATE TABLE IF NOT EXISTS coaching_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_email TEXT,
    stripe_payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'purchased' CHECK (status IN ('purchased', 'scheduled', 'completed')),
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_user ON coaching_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_email ON coaching_calls(customer_email);

-- Add stripe_customer_id to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
    END IF;
END $$;

-- RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
    ON subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- RLS policies for coaching_calls
ALTER TABLE coaching_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coaching calls"
    ON coaching_calls FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all coaching calls"
    ON coaching_calls FOR ALL
    USING (auth.role() = 'service_role');
