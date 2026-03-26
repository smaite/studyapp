// User Data Service - Syncs user subjects and progress with Supabase
import { supabase } from '../lib/supabase'

// =============================================
// USER SUBJECTS
// =============================================

export async function loadUserSubjects(userId) {
  if (!userId) return { data: null, error: 'No user ID' }
  
  const { data, error } = await supabase
    .from('user_subjects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error('Error loading subjects:', error)
    return { data: null, error }
  }
  
  // Convert to app format
  const courses = data.map(row => ({
    id: row.local_id,
    name: row.subject_name,
    language: row.language,
    examDate: row.exam_date,
    lessons: row.lessons || [],
    lessonProgress: row.lesson_progress || {},
    supabaseId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
  
  return { data: courses, error: null }
}

export async function saveUserSubject(userId, course) {
  if (!userId) return { error: 'No user ID' }
  
  const subjectData = {
    user_id: userId,
    local_id: course.id,
    subject_name: course.name,
    language: course.language || 'English',
    exam_date: course.examDate || null,
    lessons: course.lessons || [],
    lesson_progress: course.lessonProgress || {},
    updated_at: new Date().toISOString()
  }
  
  const { data, error } = await supabase
    .from('user_subjects')
    .upsert(subjectData, { 
      onConflict: 'user_id,local_id',
      ignoreDuplicates: false 
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error saving subject:', error)
    return { error }
  }
  
  return { data, error: null }
}

export async function deleteUserSubject(userId, localId) {
  if (!userId) return { error: 'No user ID' }
  
  const { error } = await supabase
    .from('user_subjects')
    .delete()
    .eq('user_id', userId)
    .eq('local_id', localId)
  
  if (error) {
    console.error('Error deleting subject:', error)
    return { error }
  }
  
  return { error: null }
}

export async function syncAllSubjects(userId, localCourses) {
  if (!userId || !localCourses?.length) return { error: null }
  
  // Batch upsert all courses
  const subjects = localCourses.map(course => ({
    user_id: userId,
    local_id: course.id,
    subject_name: course.name,
    language: course.language || 'English',
    exam_date: course.examDate || null,
    lessons: course.lessons || [],
    lesson_progress: course.lessonProgress || {},
    updated_at: new Date().toISOString()
  }))
  
  const { error } = await supabase
    .from('user_subjects')
    .upsert(subjects, { 
      onConflict: 'user_id,local_id',
      ignoreDuplicates: false 
    })
  
  if (error) {
    console.error('Error syncing subjects:', error)
    return { error }
  }
  
  return { error: null }
}

// =============================================
// USER PROGRESS (XP, streaks, etc)
// =============================================

export async function loadUserProgress(userId) {
  if (!userId) return { data: null, error: 'No user ID' }
  
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error loading progress:', error)
    return { data: null, error }
  }
  
  if (!data) {
    // Return default progress if none exists
    return { 
      data: {
        xp: 0,
        totalCorrect: 0,
        totalAnswered: 0,
        streak: 0,
        lastActiveDate: null,
        topicAccuracy: {},
        achievements: [],
        challengesWon: 0
      }, 
      error: null 
    }
  }
  
  // Convert to app format
  return {
    data: {
      xp: data.xp || 0,
      totalCorrect: data.total_correct || 0,
      totalAnswered: data.total_answered || 0,
      streak: data.streak || 0,
      lastActiveDate: data.last_active_date,
      topicAccuracy: data.topic_accuracy || {},
      achievements: data.achievements || [],
      challengesWon: data.challenges_won || 0
    },
    error: null
  }
}

export async function saveUserProgress(userId, progress) {
  if (!userId) return { error: 'No user ID' }
  
  const progressData = {
    user_id: userId,
    xp: progress.xp || 0,
    total_correct: progress.totalCorrect || 0,
    total_answered: progress.totalAnswered || 0,
    streak: progress.streak || 0,
    last_active_date: progress.lastActiveDate || null,
    topic_accuracy: progress.topicAccuracy || {},
    achievements: progress.achievements || [],
    challenges_won: progress.challengesWon || 0,
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('user_progress')
    .upsert(progressData, { 
      onConflict: 'user_id',
      ignoreDuplicates: false 
    })
  
  if (error) {
    console.error('Error saving progress:', error)
    return { error }
  }
  
  return { error: null }
}

// =============================================
// LESSON HISTORY
// =============================================

export async function loadLessonHistory(userId, courseId, lessonId) {
  if (!userId) return { data: null, error: 'No user ID' }
  
  const { data, error } = await supabase
    .from('user_lesson_history')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('lesson_id', lessonId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error loading lesson history:', error)
    return { data: null, error }
  }
  
  return { data, error: null }
}

export async function saveLessonHistory(userId, courseId, lessonId, historyData) {
  if (!userId) return { error: 'No user ID' }
  
  const { error } = await supabase
    .from('user_lesson_history')
    .upsert({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      messages: historyData.messages || [],
      current_step: historyData.currentStep || 0,
      lesson_content: historyData.lessonContent || [],
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id,course_id,lesson_id',
      ignoreDuplicates: false 
    })
  
  if (error) {
    console.error('Error saving lesson history:', error)
    return { error }
  }
  
  return { error: null }
}

// =============================================
// FULL SYNC - Load all user data on login
// =============================================

export async function loadAllUserData(userId) {
  if (!userId) return { subjects: [], progress: null, error: 'No user ID' }
  
  const [subjectsResult, progressResult] = await Promise.all([
    loadUserSubjects(userId),
    loadUserProgress(userId)
  ])
  
  return {
    subjects: subjectsResult.data || [],
    progress: progressResult.data,
    error: subjectsResult.error || progressResult.error
  }
}

export async function saveAllUserData(userId, courses, progress) {
  if (!userId) return { error: 'No user ID' }
  
  const results = await Promise.all([
    syncAllSubjects(userId, courses),
    saveUserProgress(userId, progress)
  ])
  
  const error = results.find(r => r.error)?.error
  return { error }
}
