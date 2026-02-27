-- =============================================
-- FuelPath Food Tracker — Database Migration
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. food_log — Every food entry logged by a user
CREATE TABLE IF NOT EXISTS food_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    food_name TEXT NOT NULL,
    brand TEXT,
    serving_size NUMERIC NOT NULL,
    serving_unit TEXT NOT NULL DEFAULT 'g',
    calories NUMERIC NOT NULL DEFAULT 0,
    protein NUMERIC NOT NULL DEFAULT 0,
    carbs NUMERIC NOT NULL DEFAULT 0,
    fat NUMERIC NOT NULL DEFAULT 0,
    source TEXT CHECK (source IN ('usda','openfoodfacts','manual')),
    source_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON food_log (user_id, logged_date DESC);

-- RLS for food_log
ALTER TABLE food_log ENABLE ROW LEVEL SECURITY;

-- Athletes can CRUD their own rows
CREATE POLICY "Users can insert own food_log" ON food_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own food_log" ON food_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own food_log" ON food_log
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food_log" ON food_log
    FOR DELETE USING (auth.uid() = user_id);

-- Coaches can view assigned athletes' food logs
CREATE POLICY "Coaches can view assigned athletes food_log" ON food_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = food_log.user_id
        )
    );


-- 2. macro_streaks — Denormalized streak tracking (one row per user)
CREATE TABLE IF NOT EXISTS macro_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_hit_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for macro_streaks
ALTER TABLE macro_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own macro_streaks" ON macro_streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own macro_streaks" ON macro_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own macro_streaks" ON macro_streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- Coaches can view assigned athletes' streaks
CREATE POLICY "Coaches can view assigned athletes macro_streaks" ON macro_streaks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = macro_streaks.user_id
        )
    );


-- 3. macro_tolerance — Per-athlete tolerance settings
CREATE TABLE IF NOT EXISTS macro_tolerance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phase INT,
    tolerance_pct NUMERIC NOT NULL DEFAULT 10,
    set_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, phase)
);

-- RLS for macro_tolerance
ALTER TABLE macro_tolerance ENABLE ROW LEVEL SECURITY;

-- Athletes can read their own tolerance settings
CREATE POLICY "Users can view own macro_tolerance" ON macro_tolerance
    FOR SELECT USING (auth.uid() = user_id);

-- Coaches can manage tolerance for assigned athletes
CREATE POLICY "Coaches can view assigned athletes macro_tolerance" ON macro_tolerance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = macro_tolerance.user_id
        )
    );

CREATE POLICY "Coaches can insert macro_tolerance for assigned athletes" ON macro_tolerance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = macro_tolerance.user_id
        )
    );

CREATE POLICY "Coaches can update macro_tolerance for assigned athletes" ON macro_tolerance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = macro_tolerance.user_id
        )
    );

CREATE POLICY "Coaches can delete macro_tolerance for assigned athletes" ON macro_tolerance
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = macro_tolerance.user_id
        )
    );
