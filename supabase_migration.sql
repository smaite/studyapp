-- Supabase SQL Migration for StudyAI App
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Table for shared courses
CREATE TABLE IF NOT EXISTS shared_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id TEXT UNIQUE NOT NULL,
  course_id BIGINT NOT NULL,
  shared_by UUID REFERENCES auth.users(id),
  shared_by_name TEXT,
  course_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE shared_courses ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read shared courses (to load via share link)
CREATE POLICY "Anyone can read shared courses" ON shared_courses
  FOR SELECT USING (expires_at > NOW());

-- Policy: Authenticated users can create shared courses
CREATE POLICY "Users can share their courses" ON shared_courses
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- Policy: Users can delete their own shared courses
CREATE POLICY "Users can delete their shared courses" ON shared_courses
  FOR DELETE USING (auth.uid() = shared_by);

-- Create index for faster lookups
CREATE INDEX idx_shared_courses_share_id ON shared_courses(share_id);
CREATE INDEX idx_shared_courses_expires_at ON shared_courses(expires_at);

-- Optional: Auto-cleanup expired shares (run as cron job or manually)
-- DELETE FROM shared_courses WHERE expires_at < NOW();
