-- ===== ACHIEVEMENTS TABLE =====
-- Tracks unlocked achievements per user for the FuelPath gamification system

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, achievement_key)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);

-- RLS: Users can read their own achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
    ON achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
    ON achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Coaches can view their assigned athletes' achievements
CREATE POLICY "Coaches can view athlete achievements"
    ON achievements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coach_athletes ca
            WHERE ca.coach_id = auth.uid()
            AND ca.athlete_id = achievements.user_id
        )
    );
