-- Add DELETE policy for liquid_events

CREATE POLICY "Users can delete their own liquid events" ON liquid_events
    FOR DELETE USING (auth.uid() = user_id);
