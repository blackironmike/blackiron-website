-- ============================================================
-- COACHING PLATFORM MIGRATION
-- Adds coach/owner roles, client management, notes,
-- macro change log, and notification system.
-- Run in Supabase SQL Editor after 20260220_subscriptions_and_coaching.sql
-- ============================================================

-- 1. Add role and display_name columns to profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'athlete' CHECK (role IN ('athlete', 'coach', 'owner'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'display_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN display_name TEXT;
    END IF;
END $$;

-- 2. Coach-Athlete junction table
CREATE TABLE IF NOT EXISTS coach_athletes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    notes TEXT,
    UNIQUE (coach_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_athletes_coach ON coach_athletes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_athletes_athlete ON coach_athletes(athlete_id);

-- 3. Coach notes (private, coach-only)
CREATE TABLE IF NOT EXISTS coach_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'checkin_review', 'macro_change', 'body_comp', 'phase_transition')),
    reference_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_notes_athlete ON coach_notes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach ON coach_notes(coach_id);

-- 4. Macro change log (visible to coach + athlete)
CREATE TABLE IF NOT EXISTS macro_change_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    phase INT NOT NULL,
    year INT NOT NULL,
    prev_calories INT,
    prev_protein INT,
    prev_carbs INT,
    prev_fat INT,
    new_calories INT NOT NULL,
    new_protein INT NOT NULL,
    new_carbs INT NOT NULL,
    new_fat INT NOT NULL,
    coach_note TEXT,
    seen_by_athlete BOOLEAN DEFAULT FALSE,
    seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_macro_log_athlete ON macro_change_log(athlete_id);

-- 5. Notifications (general purpose)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('macro_update', 'coach_note', 'phase_reminder', 'system')),
    title TEXT NOT NULL,
    message TEXT,
    reference_type TEXT,
    reference_id UUID,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- 6. Helper functions
CREATE OR REPLACE FUNCTION is_coach(check_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = check_user_id AND role IN ('coach', 'owner')
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_assigned_coach(check_coach_id UUID, check_athlete_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM coach_athletes
        WHERE coach_id = check_coach_id AND athlete_id = check_athlete_id
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = check_coach_id AND role = 'owner'
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 7. RLS for new tables

-- coach_athletes
ALTER TABLE coach_athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own assignments"
    ON coach_athletes FOR SELECT
    USING (auth.uid() = coach_id OR is_coach(auth.uid()));

CREATE POLICY "Coaches can insert assignments"
    ON coach_athletes FOR INSERT
    WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Coaches can delete own assignments"
    ON coach_athletes FOR DELETE
    USING (auth.uid() = coach_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

-- coach_notes
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view own notes"
    ON coach_notes FOR SELECT
    USING (auth.uid() = coach_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

CREATE POLICY "Coaches can insert notes"
    ON coach_notes FOR INSERT
    WITH CHECK (is_coach(auth.uid()));

CREATE POLICY "Coaches can update own notes"
    ON coach_notes FOR UPDATE
    USING (auth.uid() = coach_id);

-- macro_change_log
ALTER TABLE macro_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view own macro changes"
    ON macro_change_log FOR SELECT
    USING (auth.uid() = athlete_id OR is_assigned_coach(auth.uid(), athlete_id));

CREATE POLICY "Coaches can insert macro changes for assigned athletes"
    ON macro_change_log FOR INSERT
    WITH CHECK (is_assigned_coach(auth.uid(), athlete_id));

CREATE POLICY "Athletes can update seen status on own macro changes"
    ON macro_change_log FOR UPDATE
    USING (auth.uid() = athlete_id)
    WITH CHECK (auth.uid() = athlete_id);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Coaches can insert notifications for assigned athletes"
    ON notifications FOR INSERT
    WITH CHECK (is_assigned_coach(auth.uid(), user_id) OR auth.uid() = user_id);

CREATE POLICY "Users can update own notifications (mark read)"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 8. Coach access policies on EXISTING tables
-- Allow coaches to SELECT their assigned athletes' data

-- saved_macros: coach read + write
CREATE POLICY "Coaches can view assigned athlete macros"
    ON saved_macros FOR SELECT
    USING (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can upsert assigned athlete macros"
    ON saved_macros FOR INSERT
    WITH CHECK (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can update assigned athlete macros"
    ON saved_macros FOR UPDATE
    USING (is_assigned_coach(auth.uid(), user_id));

-- weight_log: coach read + write
CREATE POLICY "Coaches can view assigned athlete weight"
    ON weight_log FOR SELECT
    USING (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can insert assigned athlete weight"
    ON weight_log FOR INSERT
    WITH CHECK (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can update assigned athlete weight"
    ON weight_log FOR UPDATE
    USING (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can delete assigned athlete weight"
    ON weight_log FOR DELETE
    USING (is_assigned_coach(auth.uid(), user_id));

-- body_composition: coach read + write
CREATE POLICY "Coaches can view assigned athlete body comp"
    ON body_composition FOR SELECT
    USING (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can insert assigned athlete body comp"
    ON body_composition FOR INSERT
    WITH CHECK (is_assigned_coach(auth.uid(), user_id));

-- weekly_checkins: coach read + write
CREATE POLICY "Coaches can view assigned athlete checkins"
    ON weekly_checkins FOR SELECT
    USING (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can insert assigned athlete checkins"
    ON weekly_checkins FOR INSERT
    WITH CHECK (is_assigned_coach(auth.uid(), user_id));

-- checklist_progress: coach read + write
CREATE POLICY "Coaches can view assigned athlete checklist"
    ON checklist_progress FOR SELECT
    USING (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can upsert assigned athlete checklist"
    ON checklist_progress FOR INSERT
    WITH CHECK (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can update assigned athlete checklist"
    ON checklist_progress FOR UPDATE
    USING (is_assigned_coach(auth.uid(), user_id));

CREATE POLICY "Coaches can delete assigned athlete checklist"
    ON checklist_progress FOR DELETE
    USING (is_assigned_coach(auth.uid(), user_id));

-- profiles: coaches can read assigned athlete profiles
CREATE POLICY "Coaches can view assigned athlete profiles"
    ON profiles FOR SELECT
    USING (is_assigned_coach(auth.uid(), id) OR auth.uid() = id);

-- phase_history: coach read (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phase_history') THEN
        EXECUTE 'CREATE POLICY "Coaches can view assigned athlete phase history" ON phase_history FOR SELECT USING (is_assigned_coach(auth.uid(), user_id))';
    END IF;
END $$;

-- 9. Owner can view all profiles (for claim modal)
CREATE POLICY "Owners can view all profiles"
    ON profiles FOR SELECT
    USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'owner');

-- ============================================================
-- DONE. After running, set roles:
-- UPDATE profiles SET role = 'owner' WHERE email = 'mike@blackironathletics.com';
-- ============================================================
