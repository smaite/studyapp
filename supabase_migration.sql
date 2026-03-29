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

-- =============================================
-- USER SUBJECTS (Personal subjects/courses)
-- =============================================

CREATE TABLE IF NOT EXISTS user_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  local_id BIGINT NOT NULL, -- matches the localStorage course.id
  subject_name TEXT NOT NULL,
  language TEXT DEFAULT 'English',
  exam_date DATE,
  lessons JSONB DEFAULT '[]',
  lesson_progress JSONB DEFAULT '{}', -- { lessonId: { completed: bool, quizScore: num } }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, local_id)
);

-- Enable RLS
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;

-- Users can only access their own subjects
CREATE POLICY "Users can view own subjects" ON user_subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON user_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON user_subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON user_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX idx_user_subjects_updated ON user_subjects(updated_at DESC);

-- =============================================
-- USER PROGRESS (XP, streaks, achievements)
-- =============================================

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT,
  xp INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  total_answered INT DEFAULT 0,
  streak INT DEFAULT 0,
  last_active_date DATE,
  topic_accuracy JSONB DEFAULT '{}',
  achievements JSONB DEFAULT '[]',
  challenges_won INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read user progress for leaderboard (only public fields)
CREATE POLICY "Anyone can view leaderboard data" ON user_progress
  FOR SELECT USING (true);

-- Policy: Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own progress
CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for leaderboard queries
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_xp ON user_progress(xp DESC);
CREATE INDEX idx_user_progress_updated ON user_progress(updated_at DESC);

-- =============================================
-- LESSON CHAT HISTORY (Optional - for persistence)
-- =============================================

CREATE TABLE IF NOT EXISTS user_lesson_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id BIGINT NOT NULL,
  lesson_id BIGINT NOT NULL,
  messages JSONB DEFAULT '[]',
  current_step INT DEFAULT 0,
  lesson_content JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, lesson_id)
);

-- Enable RLS
ALTER TABLE user_lesson_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lesson history" ON user_lesson_history
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_user_lesson_history_user ON user_lesson_history(user_id);
CREATE INDEX idx_user_lesson_history_course ON user_lesson_history(user_id, course_id);
