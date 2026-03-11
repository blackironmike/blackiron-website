-- Coach-Athlete Messaging Table
-- Enables two-way messaging between coaches and athletes tied to check-ins

CREATE TABLE IF NOT EXISTS coach_athlete_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES auth.users(id),
    athlete_id UUID NOT NULL REFERENCES auth.users(id),
    checkin_id UUID REFERENCES weekly_checkins(id),
    message TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('coach', 'athlete')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by athlete
CREATE INDEX idx_coach_athlete_messages_athlete ON coach_athlete_messages(athlete_id, created_at DESC);

-- Index for coach viewing their messages
CREATE INDEX idx_coach_athlete_messages_coach ON coach_athlete_messages(coach_id, created_at DESC);

-- RLS Policies
ALTER TABLE coach_athlete_messages ENABLE ROW LEVEL SECURITY;

-- Athletes can read messages where they are the athlete
CREATE POLICY "Athletes can read own messages"
    ON coach_athlete_messages FOR SELECT
    USING (auth.uid() = athlete_id);

-- Athletes can insert messages as athlete role
CREATE POLICY "Athletes can send replies"
    ON coach_athlete_messages FOR INSERT
    WITH CHECK (
        auth.uid() = athlete_id
        AND sender_role = 'athlete'
    );

-- Coaches can read messages for their assigned athletes
CREATE POLICY "Coaches can read athlete messages"
    ON coach_athlete_messages FOR SELECT
    USING (
        auth.uid() = coach_id
        OR EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = coach_athlete_messages.athlete_id
        )
    );

-- Coaches can insert messages as coach role
CREATE POLICY "Coaches can send messages"
    ON coach_athlete_messages FOR INSERT
    WITH CHECK (
        sender_role = 'coach'
        AND EXISTS (
            SELECT 1 FROM coach_athletes
            WHERE coach_athletes.coach_id = auth.uid()
            AND coach_athletes.athlete_id = coach_athlete_messages.athlete_id
        )
    );
