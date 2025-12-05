-- Fix RLS policies for liquid_events

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can read own liquid events" ON liquid_events;
DROP POLICY IF EXISTS "Users can insert their own liquid events" ON liquid_events;

-- Re-create SELECT policy
CREATE POLICY "Users can read own liquid events" ON liquid_events
    FOR SELECT USING (auth.uid() = user_id);

-- Create INSERT policy
CREATE POLICY "Users can insert their own liquid events" ON liquid_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);
