-- Cronometer OAuth connections table
CREATE TABLE IF NOT EXISTS cronometer_connections (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cronometer_user_id TEXT,
    access_token TEXT NOT NULL,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMPTZ
);

-- RLS: users can only access their own row
ALTER TABLE cronometer_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cronometer connection"
    ON cronometer_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cronometer connection"
    ON cronometer_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cronometer connection"
    ON cronometer_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cronometer connection"
    ON cronometer_connections FOR DELETE
    USING (auth.uid() = user_id);

-- Add 'cronometer' as a valid source in food_log
-- Drop existing constraint and re-create with new value
ALTER TABLE food_log DROP CONSTRAINT IF EXISTS food_log_source_check;
ALTER TABLE food_log ADD CONSTRAINT food_log_source_check
    CHECK (source IN ('usda', 'openfoodfacts', 'manual', 'cronometer'));
