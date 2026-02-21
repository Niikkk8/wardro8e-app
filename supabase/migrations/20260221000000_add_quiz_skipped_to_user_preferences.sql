-- Add quiz_skipped to user_preferences (for style quiz skip handling).
-- Run this in Supabase Dashboard → SQL Editor if you see "Could not find the 'quiz_skipped' column" error.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name = 'quiz_skipped'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN quiz_skipped BOOLEAN DEFAULT false;
    COMMENT ON COLUMN user_preferences.quiz_skipped IS 'True when user skipped the style quiz during onboarding.';
  END IF;
END $$;
