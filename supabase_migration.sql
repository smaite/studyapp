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

-- =============================================
-- PUBLIC SUBJECTS TABLE
-- =============================================

-- Table for publicly shared subjects
CREATE TABLE IF NOT EXISTS public_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id BIGINT NOT NULL,
  shared_by UUID REFERENCES auth.users(id),
  shared_by_name TEXT,
  subject_name TEXT NOT NULL,
  subject_language TEXT DEFAULT 'English',
  lesson_count INT DEFAULT 0,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  course_data JSONB NOT NULL,
  downloads INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public_subjects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read public subjects
CREATE POLICY "Anyone can read public subjects" ON public_subjects
  FOR SELECT USING (true);

-- Policy: Authenticated users can create public subjects
CREATE POLICY "Users can publish subjects" ON public_subjects
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- Policy: Users can update their own public subjects
CREATE POLICY "Users can update their subjects" ON public_subjects
  FOR UPDATE USING (auth.uid() = shared_by);

-- Policy: Users can delete their own public subjects
CREATE POLICY "Users can delete their subjects" ON public_subjects
  FOR DELETE USING (auth.uid() = shared_by);

-- Create indexes for faster lookups
CREATE INDEX idx_public_subjects_name ON public_subjects(subject_name);
CREATE INDEX idx_public_subjects_language ON public_subjects(subject_language);
CREATE INDEX idx_public_subjects_downloads ON public_subjects(downloads DESC);
CREATE INDEX idx_public_subjects_created ON public_subjects(created_at DESC);

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_downloads(subject_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public_subjects SET downloads = downloads + 1 WHERE id = subject_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
