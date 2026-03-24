import { useState, useRef, useEffect } from 'react'
import { 
  Upload, FileText, X, Loader2, CheckCircle, 
  Brain, Sparkles, Send, Bot, User, BookOpen, Target,
  ChevronRight, ChevronLeft, RotateCcw, Trophy, GraduationCap,
  Play, Lock, Check, PenTool, MessageSquare, Plus,
  Layers, Clock, BarChart3, HelpCircle, Search, Share2,
  Home, Calendar, History, Settings, Copy, Users, Link2,
  ArrowRight, Zap, Star, Menu, ChevronDown, FolderPlus, FileUp,
  Calculator, PenLine, Camera, ThumbsUp, ThumbsDown, RefreshCw
} from 'lucide-react'
import { sendMessage, analyzeImage } from '../services/aiService'
import MarkdownRenderer from '../components/MarkdownRenderer'
import MathKeyboard from '../components/MathKeyboard'
import SolvingSteps from '../components/SolvingSteps'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const STORAGE_KEY = 'studyai_courses'

// Subject icons/colors - updated with new color palette
const subjectStyles = {
  Math: { icon: '📐', color: 'from-primary-500 to-primary-400', accent: 'bg-primary-500/20 text-primary-400' },
  Physics: { icon: '⚛️', color: 'from-violet-500 to-purple-400', accent: 'bg-violet-500/20 text-violet-400' },
  Chemistry: { icon: '🧪', color: 'from-success-500 to-success-400', accent: 'bg-success-500/20 text-success-400' },
  Biology: { icon: '🧬', color: 'from-rose-500 to-orange-400', accent: 'bg-rose-500/20 text-rose-400' },
  'Computer Science': { icon: '💻', color: 'from-indigo-500 to-blue-400', accent: 'bg-indigo-500/20 text-indigo-400' },
  History: { icon: '📜', color: 'from-amber-500 to-yellow-400', accent: 'bg-amber-500/20 text-amber-400' },
  English: { icon: '📚', color: 'from-teal-500 to-cyan-400', accent: 'bg-teal-500/20 text-teal-400' },
  default: { icon: '📖', color: 'from-primary-500 to-success-400', accent: 'bg-primary-500/20 text-primary-400' }
}

// Check if mobile
const isMobile = () => window.innerWidth < 768

// Robust JSON parser - handles malformed AI responses
const safeParseJSON = (text, fallback = []) => {
  try {
    // Remove code block markers
    let json = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    
    // Find JSON array or object boundaries
    const arrayStart = json.indexOf('[')
    const arrayEnd = json.lastIndexOf(']')
    const objStart = json.indexOf('{')
    const objEnd = json.lastIndexOf('}')
    
    // Determine if it's an array or object
    if (arrayStart !== -1 && arrayEnd !== -1 && (arrayStart < objStart || objStart === -1)) {
      json = json.substring(arrayStart, arrayEnd + 1)
    } else if (objStart !== -1 && objEnd !== -1) {
      json = json.substring(objStart, objEnd + 1)
    }
    
    // Fix common JSON issues
    json = json
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Convert single quotes to double
      .replace(/\n/g, ' ') // Remove newlines inside strings
      .replace(/\t/g, ' ') // Remove tabs
      .replace(/\\n/g, '\\\\n') // Escape newlines in strings
    
    return JSON.parse(json)
  } catch (error) {
    console.error('JSON Parse Error:', error.message)
    console.log('Attempted to parse:', text?.substring(0, 500))
    return fallback
  }
}

export default function ExamPrep() {
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile())
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  
  // Views: home, course, assessment, lesson-step, quiz, results, chat
  const [view, setView] = useState('home')
  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  
  const [activeCourse, setActiveCourse] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
  const [currentStep, setCurrentStep] = useState(0) // For lesson steps
  
  // New course modal
  const [showNewCourse, setShowNewCourse] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [courseLanguage, setCourseLanguage] = useState('English')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const fileInputRef = useRef(null)
  const addMaterialRef = useRef(null)
  
  // Supported languages
  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'ne', name: 'Nepali', native: 'नेपाली' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
  ]
  
  // Add materials modal
  const [showAddMaterials, setShowAddMaterials] = useState(false)
  
  // Assessment & Quiz
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answers, setAnswers] = useState([])
  const [showExplanation, setShowExplanation] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [assessmentResults, setAssessmentResults] = useState(null)
  
  // Chat/Learn
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [lessonContent, setLessonContent] = useState([]) // Steps in lesson
  
  // AI Tutor Chat
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showMathKeyboard, setShowMathKeyboard] = useState(false)
  const [mathMode, setMathMode] = useState(false)
  const chatInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const chatFileInputRef = useRef(null)
  const [chatImage, setChatImage] = useState(null)
  
  // Replan modal
  const [showReplanModal, setShowReplanModal] = useState(false)
  const [replanLanguage, setReplanLanguage] = useState(activeCourse?.language || 'English')
  
  // Share modal
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  // Public subjects
  const [publicSubjects, setPublicSubjects] = useState([])
  const [loadingPublic, setLoadingPublic] = useState(false)
  const [publicSearchQuery, setPublicSearchQuery] = useState('')
  const [publicLanguageFilter, setPublicLanguageFilter] = useState('all')

  // Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true)
        setMobileNavOpen(false)
      } else {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses))
  }, [courses])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check for shared course in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedId = params.get('shared')
    if (sharedId) {
      loadSharedCourse(sharedId)
    }
  }, [])

  const loadSharedCourse = async (shareId) => {
    try {
      // Load from Supabase
      const { data, error } = await supabase
        .from('shared_courses')
        .select('*')
        .eq('share_id', shareId)
        .single()
      
      if (error || !data) {
        alert('Shared course not found or expired')
        return
      }
      
      // Check if user already has this course
      const existing = courses.find(c => c.originalId === data.course_id)
      if (existing) {
        setActiveCourse(existing)
        setView('course')
        return
      }
      
      // Create new course from shared data
      const courseData = data.course_data
      const newCourse = {
        ...courseData,
        id: Date.now(),
        originalId: data.course_id,
        sharedFrom: data.shared_by_name,
        lessons: courseData.lessons.map(l => ({ ...l, progress: 0, quizScore: null, completed: false })),
        totalProgress: 0,
        needsAssessment: true
      }
      
      setCourses(prev => [...prev, newCourse])
      setActiveCourse(newCourse)
      setView('assessment')
      
      // Clear URL param
      window.history.replaceState({}, '', window.location.pathname)
    } catch (err) {
      console.error('Error loading shared course:', err)
    }
  }

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      fullText += textContent.items.map(item => item.str).join(' ') + '\n\n'
    }
    return fullText.trim()
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !subjectName.trim()) {
      alert('Please enter a subject name first')
      return
    }

    setIsProcessing(true)
    setProcessingStatus('Reading your materials...')

    try {
      let allContent = ''
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProcessingStatus(`Processing ${file.name}... (${i + 1}/${files.length})`)
        
        if (file.type === 'application/pdf') {
          const text = await extractTextFromPDF(file)
          if (text.length < 200) {
            // Scanned PDF - use vision
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            for (let p = 1; p <= Math.min(pdf.numPages, 5); p++) {
              const page = await pdf.getPage(p)
              const viewport = page.getViewport({ scale: 2 })
              const canvas = document.createElement('canvas')
              canvas.width = viewport.width
              canvas.height = viewport.height
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
              const response = await analyzeImage(canvas.toDataURL('image/png'), 'Extract all text from this document page', subjectName)
              allContent += response.content + '\n\n'
            }
          } else {
            allContent += text + '\n\n'
          }
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          const base64 = await new Promise(r => { reader.onloadend = () => r(reader.result); reader.readAsDataURL(file) })
          const response = await analyzeImage(base64, 'Extract all text and content from this image', subjectName)
          allContent += response.content + '\n\n'
        } else {
          allContent += await file.text() + '\n\n'
        }
      }

      setProcessingStatus('Creating your personalized course...')
      
      const lessonsPrompt = `Analyze this study material and create a detailed course outline.
IMPORTANT: Generate ALL content in ${courseLanguage} language.

Material:
${allContent.substring(0, 15000)}

Create lessons that cover ALL topics in the material. For each lesson:
1. Give a clear, specific title (in ${courseLanguage})
2. Write a 1-2 sentence description (in ${courseLanguage})
3. List 4-6 key concepts/points to cover (in ${courseLanguage})

Return ONLY valid JSON array:
[{"id":1,"title":"Topic Name in ${courseLanguage}","description":"What this covers in ${courseLanguage}","keyPoints":["Concept 1","Concept 2","Concept 3","Concept 4"]}]`

      const lessonsResponse = await sendMessage([{ role: 'user', content: lessonsPrompt }], subjectName)
      
      let lessonsJson = lessonsResponse.content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      const startIdx = lessonsJson.indexOf('[')
      const endIdx = lessonsJson.lastIndexOf(']')
      if (startIdx !== -1 && endIdx !== -1) lessonsJson = lessonsJson.substring(startIdx, endIdx + 1)
      
      const lessons = JSON.parse(lessonsJson).map((l, idx) => ({
        ...l, 
        id: idx + 1, 
        progress: 0, 
        quizScore: null, 
        completed: false,
        knowledgeLevel: null // Will be set by assessment
      }))

      const newCourse = {
        id: Date.now(),
        name: subjectName,
        language: courseLanguage,
        examDate: examDate || null,
        content: allContent,
        lessons,
        totalProgress: 0,
        createdAt: new Date().toISOString(),
        needsAssessment: true
      }

      setCourses(prev => [...prev, newCourse])
      setSubjectName('')
      setExamDate('')
      setCourseLanguage('English')
      setShowNewCourse(false)
      setActiveCourse(newCourse)
      
      // Start with assessment
      setView('assessment')
      await generateAssessment(newCourse)
      
    } catch (error) {
      console.error('Error:', error)
      alert('Error processing files: ' + error.message)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Add materials to existing course
  const handleAddMaterials = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !activeCourse) return

    setIsProcessing(true)
    setProcessingStatus('Reading new materials...')
    setShowAddMaterials(false)

    try {
      let newContent = ''
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProcessingStatus(`Processing ${file.name}... (${i + 1}/${files.length})`)
        
        if (file.type === 'application/pdf') {
          const text = await extractTextFromPDF(file)
          if (text.length < 200) {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            for (let p = 1; p <= Math.min(pdf.numPages, 5); p++) {
              const page = await pdf.getPage(p)
              const viewport = page.getViewport({ scale: 2 })
              const canvas = document.createElement('canvas')
              canvas.width = viewport.width
              canvas.height = viewport.height
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
              const response = await analyzeImage(canvas.toDataURL('image/png'), 'Extract all text from this document page', activeCourse.name)
              newContent += response.content + '\n\n'
            }
          } else {
            newContent += text + '\n\n'
          }
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          const base64 = await new Promise(r => { reader.onloadend = () => r(reader.result); reader.readAsDataURL(file) })
          const response = await analyzeImage(base64, 'Extract all text and content from this image', activeCourse.name)
          newContent += response.content + '\n\n'
        } else {
          newContent += await file.text() + '\n\n'
        }
      }

      setProcessingStatus('Analyzing new content and updating lessons...')
      
      // Combine with existing content
      const combinedContent = activeCourse.content + '\n\n--- NEW MATERIALS ---\n\n' + newContent
      
      // Get existing lesson titles
      const existingLessons = activeCourse.lessons.map(l => l.title).join(', ')
      
      const updatePrompt = `I have an existing course with these lessons: ${existingLessons}

Here is NEW study material that was just added:
${newContent.substring(0, 12000)}

Analyze this new material and:
1. If it contains topics already covered by existing lessons, DO NOT create new lessons for them
2. If it contains NEW topics not covered, create new lessons for them
3. If it expands on existing topics significantly, suggest what to add

Return a JSON object:
{
  "newLessons": [{"id":${activeCourse.lessons.length + 1},"title":"New Topic","description":"...","keyPoints":["..."]}],
  "updatedLessons": [{"existingTitle":"Lesson to update","additionalKeyPoints":["New point 1"]}],
  "summary": "Brief summary of what was added"
}

Return ONLY valid JSON.`

      const response = await sendMessage([{ role: 'user', content: updatePrompt }], activeCourse.name)
      
      let json = response.content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      const start = json.indexOf('{'), end = json.lastIndexOf('}')
      if (start !== -1 && end !== -1) json = json.substring(start, end + 1)
      json = json.replace(/,(\s*[\]}])/g, '$1')
      
      const updates = JSON.parse(json)
      
      // Update the course
      const updatedCourse = { ...activeCourse, content: combinedContent }
      
      // Add new lessons
      if (updates.newLessons && updates.newLessons.length > 0) {
        const newLessonsFormatted = updates.newLessons.map((l, idx) => ({
          ...l,
          id: activeCourse.lessons.length + idx + 1,
          progress: 0,
          quizScore: null,
          completed: false,
          knowledgeLevel: 50
        }))
        updatedCourse.lessons = [...updatedCourse.lessons, ...newLessonsFormatted]
      }
      
      // Update existing lessons with new key points
      if (updates.updatedLessons && updates.updatedLessons.length > 0) {
        updates.updatedLessons.forEach(update => {
          const lessonIdx = updatedCourse.lessons.findIndex(
            l => l.title.toLowerCase().includes(update.existingTitle.toLowerCase()) ||
                 update.existingTitle.toLowerCase().includes(l.title.toLowerCase())
          )
          if (lessonIdx !== -1 && update.additionalKeyPoints) {
            const existingPoints = new Set(updatedCourse.lessons[lessonIdx].keyPoints.map(p => p.toLowerCase()))
            const newPoints = update.additionalKeyPoints.filter(p => !existingPoints.has(p.toLowerCase()))
            updatedCourse.lessons[lessonIdx].keyPoints = [
              ...updatedCourse.lessons[lessonIdx].keyPoints,
              ...newPoints
            ]
          }
        })
      }
      
      // Recalculate progress
      updatedCourse.totalProgress = Math.round(
        updatedCourse.lessons.reduce((s, l) => s + l.progress, 0) / updatedCourse.lessons.length
      )
      
      setCourses(prev => prev.map(c => c.id === activeCourse.id ? updatedCourse : c))
      setActiveCourse(updatedCourse)
      
      // Show summary
      alert(`✅ Materials added!\n\n${updates.summary || 'Course updated successfully.'}\n\n${updates.newLessons?.length || 0} new lessons added.`)
      
    } catch (error) {
      console.error('Error adding materials:', error)
      alert('Error processing new materials: ' + error.message)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
      if (addMaterialRef.current) addMaterialRef.current.value = ''
    }
  }

  const generateAssessment = async (course, retryCount = 0) => {
    setIsGenerating(true)
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowExplanation(false)
    
    try {
      const prompt = `Create 10 assessment questions to test the student's existing knowledge of this material.
IMPORTANT: Generate ALL content in ${course.language || 'English'} language.
Mix easy, medium, and hard questions covering different topics.

Material: ${course.content.substring(0, 8000)}
Topics: ${course.lessons.map(l => l.title).join(', ')}

Use LaTeX for math: $x^2$, $\\frac{a}{b}$

Return ONLY valid JSON array (no other text):
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"...","topic":"Lesson name it relates to","difficulty":"easy|medium|hard"}]`

      const response = await sendMessage([{ role: 'user', content: prompt }], course.name)
      
      let json = response.content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      const start = json.indexOf('['), end = json.lastIndexOf(']')
      if (start !== -1 && end !== -1) json = json.substring(start, end + 1)
      
      // Clean up JSON
      json = json.replace(/,(\s*[\]}])/g, '$1')
      
      const parsed = JSON.parse(json)
      if (!parsed || parsed.length === 0) throw new Error('No questions generated')
      
      setQuestions(parsed.slice(0, 10).map(q => ({
        ...q,
        options: q.options || ['A', 'B', 'C', 'D'],
        correct: typeof q.correct === 'number' ? q.correct : 0
      })))
    } catch (error) {
      console.error('Assessment error:', error)
      
      // Retry up to 2 times
      if (retryCount < 2) {
        console.log('Retrying assessment generation...')
        return generateAssessment(course, retryCount + 1)
      }
      
      // Generate simple fallback questions based on lessons
      const fallbackQuestions = course.lessons.slice(0, 5).map((lesson, idx) => ({
        question: `How familiar are you with "${lesson.title}"?`,
        options: [
          'I know this very well',
          'I have some knowledge',
          'I\'ve heard of it but don\'t understand',
          'This is completely new to me'
        ],
        correct: 0, // Any answer is acceptable for self-assessment
        explanation: `Got it! I'll adjust the ${lesson.title} lessons based on your level.`,
        topic: lesson.title,
        difficulty: 'easy',
        isSelfAssessment: true
      }))
      
      if (fallbackQuestions.length === 0) {
        fallbackQuestions.push({
          question: 'How would you rate your overall knowledge of this subject?',
          options: ['Expert - I know most of this', 'Intermediate - I know some', 'Beginner - I\'m just starting', 'Complete beginner - Teach me everything'],
          correct: 0,
          explanation: 'Perfect! I\'ll tailor the course to your level.',
          topic: 'General',
          difficulty: 'easy',
          isSelfAssessment: true
        })
      }
      
      setQuestions(fallbackQuestions)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAssessmentAnswer = (idx) => {
    if (showExplanation) return
    setSelectedAnswer(idx)
  }

  const submitAssessmentAnswer = () => {
    if (selectedAnswer === null) return
    
    const currentQuestion = questions[currentQ]
    const isSelfAssessment = currentQuestion.isSelfAssessment
    
    // For self-assessment questions, map answer to knowledge level
    let isCorrect = selectedAnswer === currentQuestion.correct
    let knowledgeFromAnswer = 50
    
    if (isSelfAssessment) {
      // 0 = "I know very well" (100%), 1 = "Some knowledge" (70%), 2 = "Heard of it" (40%), 3 = "New to me" (10%)
      knowledgeFromAnswer = [100, 70, 40, 10][selectedAnswer] || 50
      isCorrect = true // Self-assessment is always "correct"
    }
    
    setAnswers([...answers, { 
      selected: selectedAnswer, 
      correct: isCorrect,
      topic: currentQuestion.topic,
      difficulty: currentQuestion.difficulty,
      isSelfAssessment,
      knowledgeFromAnswer
    }])
    setShowExplanation(true)
  }

  const nextAssessmentQuestion = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    } else {
      // Assessment complete - calculate results
      const allAnswers = [...answers, { 
        selected: selectedAnswer, 
        correct: questions[currentQ].isSelfAssessment || selectedAnswer === questions[currentQ].correct,
        topic: questions[currentQ].topic,
        difficulty: questions[currentQ].difficulty,
        isSelfAssessment: questions[currentQ].isSelfAssessment,
        knowledgeFromAnswer: questions[currentQ].isSelfAssessment 
          ? [100, 70, 40, 10][selectedAnswer] || 50 
          : null
      }]
      
      const results = calculateAssessmentResults(allAnswers)
      setAssessmentResults(results)
      
      // Update course with knowledge levels
      const updated = { ...activeCourse, needsAssessment: false }
      updated.lessons = updated.lessons.map(lesson => {
        const topicAnswers = allAnswers.filter(a => 
          a.topic?.toLowerCase().includes(lesson.title.toLowerCase()) ||
          lesson.title.toLowerCase().includes(a.topic?.toLowerCase() || '')
        )
        
        // If self-assessment, use the knowledge level from answer
        const selfAssessAnswer = topicAnswers.find(a => a.isSelfAssessment)
        if (selfAssessAnswer && selfAssessAnswer.knowledgeFromAnswer !== null) {
          return { ...lesson, knowledgeLevel: selfAssessAnswer.knowledgeFromAnswer }
        }
        
        // Otherwise calculate from correct/incorrect
        const correct = topicAnswers.filter(a => a.correct).length
        const total = topicAnswers.length || 1
        return {
          ...lesson,
          knowledgeLevel: total > 0 ? Math.round((correct / total) * 100) : 50
        }
      })
      
      setCourses(prev => prev.map(c => c.id === activeCourse.id ? updated : c))
      setActiveCourse(updated)
      setView('results')
    }
  }

  const calculateAssessmentResults = (allAnswers = answers) => {
    const total = questions.length
    const hasSelfAssessment = allAnswers.some(a => a.isSelfAssessment)
    
    let percentage, correct
    if (hasSelfAssessment) {
      // Average knowledge from self-assessment
      const knowledgeLevels = allAnswers.filter(a => a.knowledgeFromAnswer !== null).map(a => a.knowledgeFromAnswer)
      percentage = knowledgeLevels.length > 0 
        ? Math.round(knowledgeLevels.reduce((s, k) => s + k, 0) / knowledgeLevels.length)
        : 50
      correct = Math.round((percentage / 100) * total)
    } else {
      correct = allAnswers.filter(a => a.correct).length
      percentage = Math.round((correct / total) * 100)
    }
    
    // Group by topic
    const byTopic = {}
    allAnswers.forEach((a, i) => {
      const topic = questions[i]?.topic || 'General'
      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0, knowledge: null }
      byTopic[topic].total++
      if (a.correct) byTopic[topic].correct++
      if (a.knowledgeFromAnswer !== null) byTopic[topic].knowledge = a.knowledgeFromAnswer
    })
    
    // Determine skill level
    let level = 'Beginner'
    let message = 'Great starting point! I\'ll teach you everything from the basics.'
    if (percentage >= 80) {
      level = 'Advanced'
      message = 'Impressive! You already know a lot. I\'ll focus on advanced concepts and practice.'
    } else if (percentage >= 50) {
      level = 'Intermediate'
      message = 'Good foundation! I\'ll help you strengthen your understanding.'
    }
    
    return { total, correct, percentage, byTopic, level, message }
  }

  const startLesson = async (lesson) => {
    setActiveLesson(lesson)
    setCurrentStep(0)
    setLessonContent([])
    setMessages([])
    setView('lesson-step')
    setIsLoading(true)
    
    try {
      // Generate lesson content with steps
      const prompt = `Create a structured lesson on "${lesson.title}" for a student at ${lesson.knowledgeLevel >= 70 ? 'advanced' : lesson.knowledgeLevel >= 40 ? 'intermediate' : 'beginner'} level.
IMPORTANT: Generate ALL content in ${activeCourse.language || 'English'} language.

Key concepts to cover: ${lesson.keyPoints.join(', ')}
Course material: ${activeCourse.content.substring(0, 5000)}

Create 4-5 teaching steps. Each step should:
1. Explain ONE concept clearly with examples (in ${activeCourse.language || 'English'})
2. Use real-world analogies
3. Include a mini check-in question

Return JSON array:
[{
  "title": "Step title in ${activeCourse.language}",
  "content": "Detailed explanation with examples. Use $...$ for math.",
  "checkQuestion": "A question to verify understanding",
  "checkAnswer": "The expected answer or concept"
}]

Be friendly and make it engaging!`

      const response = await sendMessage([{ role: 'user', content: prompt }], activeCourse.name)
      
      let json = response.content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      const start = json.indexOf('['), end = json.lastIndexOf(']')
      if (start !== -1 && end !== -1) json = json.substring(start, end + 1)
      json = json.replace(/,(\s*[\]}])/g, '$1')
      
      const steps = JSON.parse(json)
      setLessonContent(steps)
      
      // Show first step
      setMessages([{
        role: 'assistant',
        content: `# ${steps[0].title}\n\n${steps[0].content}`
      }])
    } catch (error) {
      console.error('Lesson error:', error)
      setMessages([{
        role: 'assistant',
        content: `Let's learn about **${lesson.title}**! 📚\n\n${lesson.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nAsk me anything about these topics!`
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleStepResponse = async () => {
    if (!input.trim() || isLoading) return
    
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)
    
    try {
      const currentStepData = lessonContent[currentStep]
      
      // Check if user understood
      const checkPrompt = `Student answered: "${userMsg}"
Expected concept: "${currentStepData?.checkAnswer || 'understanding'}"
Question was: "${currentStepData?.checkQuestion || 'Do you understand?'}"

Evaluate if the student understood (even partially).
If they need help, explain briefly.
If they understood, praise them and say "READY_NEXT" at the end.
Be encouraging and use emojis!`

      const response = await sendMessage([
        { role: 'user', content: `Lesson: ${activeLesson.title}` },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: checkPrompt }
      ], activeCourse.name)
      
      const aiResponse = response.content
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse.replace('READY_NEXT', '') }])
      
      // If student understood, move to next step after a delay
      if (aiResponse.includes('READY_NEXT') && currentStep < lessonContent.length - 1) {
        setTimeout(() => {
          setCurrentStep(currentStep + 1)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `# ${lessonContent[currentStep + 1].title}\n\n${lessonContent[currentStep + 1].content}`
          }])
        }, 1500)
      } else if (aiResponse.includes('READY_NEXT') && currentStep === lessonContent.length - 1) {
        // Lesson complete - quiz time
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `🎉 **Amazing work!** You've completed all the learning steps!\n\nNow let's test what you learned with a quick quiz. Ready?\n\n*Click "Take Quiz" below to continue!*`
          }])
        }, 1500)
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hmm, let me think about that... 🤔 Can you rephrase?' }])
    } finally {
      setIsLoading(false)
    }
  }

  const startQuiz = async (lesson) => {
    setActiveLesson(lesson)
    setView('quiz')
    setIsGenerating(true)
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowExplanation(false)
    
    try {
      const prompt = `Create 5 quiz questions about "${lesson.title}".
IMPORTANT: Generate ALL content in ${activeCourse.language || 'English'} language.

Key concepts: ${lesson.keyPoints.join(', ')}
Material: ${activeCourse.content.substring(0, 6000)}

Make questions test real understanding, not just memorization.
Use LaTeX for math: $x^2$, $\\frac{a}{b}$

Return ONLY valid JSON array:
[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]`

      const response = await sendMessage([{ role: 'user', content: prompt }], activeCourse.name)
      
      let json = response.content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      const start = json.indexOf('['), end = json.lastIndexOf(']')
      if (start !== -1 && end !== -1) json = json.substring(start, end + 1)
      json = json.replace(/,(\s*[\]}])/g, '$1')
      
      setQuestions(JSON.parse(json).slice(0, 5))
    } catch (error) {
      console.error('Quiz error:', error)
      setQuestions([{ question: 'Error generating questions. Try again?', options: ['Retry', 'Go back', 'Skip', 'Help'], correct: 0, explanation: '' }])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleQuizAnswer = (idx) => {
    if (showExplanation) return
    setSelectedAnswer(idx)
  }

  const submitQuizAnswer = () => {
    if (selectedAnswer === null) return
    setAnswers([...answers, { selected: selectedAnswer, correct: selectedAnswer === questions[currentQ].correct }])
    setShowExplanation(true)
  }

  const nextQuizQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    } else {
      // Quiz complete
      const score = answers.filter(a => a.correct).length
      
      // Update lesson progress
      const updated = { ...activeCourse }
      const idx = updated.lessons.findIndex(l => l.id === activeLesson.id)
      if (idx !== -1) {
        updated.lessons[idx].quizScore = score
        updated.lessons[idx].progress = Math.max(updated.lessons[idx].progress, Math.round((score / questions.length) * 100))
        if (score >= questions.length * 0.7) updated.lessons[idx].completed = true
        updated.totalProgress = Math.round(updated.lessons.reduce((s, l) => s + l.progress, 0) / updated.lessons.length)
        setCourses(prev => prev.map(c => c.id === activeCourse.id ? updated : c))
        setActiveCourse(updated)
      }
      
      setView('results')
    }
  }

  const shareCourse = async () => {
    if (!activeCourse || !user) return
    
    try {
      const shareId = `${activeCourse.id}-${Date.now()}`
      
      // Save to Supabase
      const { error } = await supabase
        .from('shared_courses')
        .insert({
          share_id: shareId,
          course_id: activeCourse.id,
          shared_by: user.id,
          shared_by_name: user.user_metadata?.full_name || user.email,
          course_data: {
            name: activeCourse.name,
            lessons: activeCourse.lessons.map(l => ({
              id: l.id,
              title: l.title,
              description: l.description,
              keyPoints: l.keyPoints
            })),
            content: activeCourse.content.substring(0, 50000)
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      
      if (error) throw error
      
      const link = `${window.location.origin}/exam-prep?shared=${shareId}`
      setShareLink(link)
      setShowShareModal(true)
    } catch (error) {
      console.error('Share error:', error)
      alert('Error creating share link. Please try again.')
    }
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      alert('Failed to copy. Please copy manually: ' + shareLink)
    }
  }

  const deleteCourse = (id) => {
    if (confirm('Delete this course? This cannot be undone.')) {
      setCourses(prev => prev.filter(c => c.id !== id))
      if (activeCourse?.id === id) { 
        setActiveCourse(null)
        setView('home') 
      }
    }
  }

  // Replan/Regenerate course with new language
  const replanCourse = async (newLanguage = null) => {
    if (!activeCourse) return
    
    const targetLanguage = newLanguage || activeCourse.language || 'English'
    
    if (!confirm(`Regenerate all lessons in ${targetLanguage}? This will reset your progress.`)) return
    
    setIsProcessing(true)
    setProcessingStatus(`Regenerating course in ${targetLanguage}...`)
    
    try {
      const lessonsPrompt = `You are a course creator. Analyze this study material and create a detailed course outline.

CRITICAL LANGUAGE REQUIREMENT: 
- Generate ALL content ONLY in ${targetLanguage} language
- Do NOT mix languages - use ONLY ${targetLanguage}
- Lesson titles, descriptions, and key points must ALL be in ${targetLanguage}
- If the source material is in a different language, translate it to ${targetLanguage}

Study Material:
${activeCourse.content.substring(0, 15000)}

Create lessons that cover ALL topics from the material. For each lesson:
1. Give a clear, specific title (ONLY in ${targetLanguage})
2. Write a 1-2 sentence description (ONLY in ${targetLanguage})  
3. List 4-6 key concepts/points to cover (ONLY in ${targetLanguage})

Return ONLY valid JSON array (no other text):
[{"id":1,"title":"विषय नाम","description":"यो के कभर गर्छ","keyPoints":["अवधारणा १","अवधारणा २","अवधारणा ३","अवधारणा ४"]}]

Remember: EVERYTHING must be in ${targetLanguage} ONLY. No English unless ${targetLanguage} is English.`

      const response = await sendMessage([{ role: 'user', content: lessonsPrompt }], activeCourse.name)
      
      let lessonsJson = response.content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
      const startIdx = lessonsJson.indexOf('[')
      const endIdx = lessonsJson.lastIndexOf(']')
      if (startIdx !== -1 && endIdx !== -1) lessonsJson = lessonsJson.substring(startIdx, endIdx + 1)
      lessonsJson = lessonsJson.replace(/,(\s*[\]}])/g, '$1')
      
      const lessons = JSON.parse(lessonsJson).map((l, idx) => ({
        ...l, 
        id: idx + 1, 
        progress: 0, 
        quizScore: null, 
        completed: false,
        knowledgeLevel: null
      }))

      const updatedCourse = {
        ...activeCourse,
        language: targetLanguage,
        lessons,
        totalProgress: 0,
        needsAssessment: true
      }

      setCourses(prev => prev.map(c => c.id === activeCourse.id ? updatedCourse : c))
      setActiveCourse(updatedCourse)
      setView('assessment')
      
      alert(`✅ Course regenerated in ${targetLanguage}! Please take the assessment.`)
    } catch (error) {
      console.error('Replan error:', error)
      alert('Error regenerating course: ' + error.message)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  // === PUBLIC SUBJECTS FUNCTIONS ===
  const loadPublicSubjects = async () => {
    setLoadingPublic(true)
    try {
      const { data, error } = await supabase
        .from('public_subjects')
        .select('*')
        .order('downloads', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setPublicSubjects(data || [])
    } catch (error) {
      console.error('Error loading public subjects:', error)
      // If table doesn't exist yet, show empty
      setPublicSubjects([])
    } finally {
      setLoadingPublic(false)
    }
  }

  const shareToPublic = async () => {
    if (!activeCourse || !user) return
    
    try {
      setIsProcessing(true)
      setProcessingStatus('Publishing to public library...')
      
      // Check if already published
      const { data: existing } = await supabase
        .from('public_subjects')
        .select('id')
        .eq('course_id', activeCourse.id)
        .eq('shared_by', user.id)
        .single()
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('public_subjects')
          .update({
            subject_name: activeCourse.name,
            subject_language: activeCourse.language || 'English',
            lesson_count: activeCourse.lessons.length,
            course_data: activeCourse,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        if (error) throw error
        alert('✅ Subject updated in public library!')
      } else {
        // Create new
        const { error } = await supabase
          .from('public_subjects')
          .insert({
            course_id: activeCourse.id,
            shared_by: user.id,
            shared_by_name: user.email?.split('@')[0] || 'Anonymous',
            subject_name: activeCourse.name,
            subject_language: activeCourse.language || 'English',
            lesson_count: activeCourse.lessons.length,
            course_data: activeCourse,
            downloads: 0
          })
        
        if (error) throw error
        alert('✅ Subject published to public library!')
      }
      
      setShowShareModal(false)
    } catch (error) {
      console.error('Error publishing:', error)
      alert('Error publishing: ' + error.message)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  const importPublicSubject = async (subject) => {
    try {
      // Increment download count
      await supabase.rpc('increment_downloads', { subject_id: subject.id })
      
      const courseData = subject.course_data
      const newCourse = {
        ...courseData,
        id: Date.now(),
        originalId: subject.id,
        sharedFrom: subject.shared_by_name,
        createdAt: new Date().toISOString(),
        totalProgress: 0,
        needsAssessment: true,
        lessons: courseData.lessons.map(l => ({
          ...l,
          progress: 0,
          quizScore: null,
          completed: false,
          knowledgeLevel: null
        }))
      }
      
      setCourses(prev => [...prev, newCourse])
      setActiveCourse(newCourse)
      setView('assessment')
      
      alert(`✅ "${subject.subject_name}" imported! Starting assessment...`)
    } catch (error) {
      console.error('Import error:', error)
      alert('Error importing subject: ' + error.message)
    }
  }

  // Load public subjects when viewing public page
  useEffect(() => {
    if (view === 'public') {
      loadPublicSubjects()
    }
  }, [view])

  // Filter public subjects
  const filteredPublicSubjects = publicSubjects.filter(s => {
    const matchesSearch = s.subject_name.toLowerCase().includes(publicSearchQuery.toLowerCase())
    const matchesLanguage = publicLanguageFilter === 'all' || s.subject_language === publicLanguageFilter
    return matchesSearch && matchesLanguage
  })

  // === AI TUTOR CHAT FUNCTIONS ===
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleChatImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setChatImage(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleChatKeyboardInsert = (text) => {
    if (text === 'BACKSPACE') {
      setChatInput(prev => prev.slice(0, -1))
    } else if (text === 'CLEAR') {
      setChatInput('')
    } else {
      setChatInput(prev => prev + text)
    }
    chatInputRef.current?.focus()
  }

  const sendChatMessage = async () => {
    if ((!chatInput.trim() && !chatImage) || chatLoading) return

    const userMessage = { role: 'user', content: chatInput, image: chatImage }
    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatImage(null)
    setChatLoading(true)

    try {
      let response
      let parsedSolution = null
      const isMathProblem = mathMode || /[0-9+\-*/=^√∫∑]/.test(chatInput) || chatImage

      if (isMathProblem && (chatImage || /solve|calculate|find|compute|evaluate|simplify/i.test(chatInput))) {
        const mathPrompt = `You are an expert math tutor. Solve this problem step by step.
IMPORTANT: Respond in ${activeCourse?.language || 'English'} language.

Format your response as JSON:
{
  "steps": [{"description": "Step description in ${activeCourse?.language || 'English'}", "math": "LaTeX math", "explanation": "Why"}],
  "solution": "Final answer",
  "tip": {"title": "Pro tip", "content": "Helpful insight in ${activeCourse?.language || 'English'}"},
  "fullExplanation": "Friendly explanation in ${activeCourse?.language || 'English'}",
  "followUpQuestions": ["Q1 in ${activeCourse?.language}?", "Q2 in ${activeCourse?.language}?", "Q3 in ${activeCourse?.language}?"]
}
Problem: ${chatInput}`

        if (chatImage) {
          response = await analyzeImage(chatImage, mathPrompt, 'Mathematics')
        } else {
          response = await sendMessage([{ role: 'user', content: mathPrompt }], 'Mathematics')
        }

        try {
          let jsonStr = response.content
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (jsonMatch) jsonStr = jsonMatch[1]
          const start = jsonStr.indexOf('{'), end = jsonStr.lastIndexOf('}')
          if (start !== -1 && end !== -1) {
            parsedSolution = JSON.parse(jsonStr.substring(start, end + 1))
          }
        } catch (e) { /* not JSON */ }
      } else if (chatImage) {
        const imgPrompt = activeCourse ? `${chatInput}\n\nRespond in ${activeCourse.language || 'English'} language.` : chatInput
        response = await analyzeImage(chatImage, imgPrompt, 'General')
      } else {
        const apiMsgs = chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        const userMsg = activeCourse 
          ? { role: 'user', content: `${chatInput}\n\nRespond in ${activeCourse.language || 'English'} language.` }
          : { role: 'user', content: chatInput }
        apiMsgs.push(userMsg)
        response = await sendMessage(apiMsgs, 'AI Tutor')
      }

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: parsedSolution?.fullExplanation || response.content,
        solution: parsedSolution
      }])
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}. Make sure AI proxy is running.`,
        isError: true
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleChatFollowUp = (q) => {
    setChatInput(q)
    setTimeout(sendChatMessage, 100)
  }

  const daysUntil = (date) => date ? Math.ceil((new Date(date) - new Date()) / 86400000) : null
  
  const getSubjectStyle = (name) => {
    for (const [key, style] of Object.entries(subjectStyles)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return style
    }
    return subjectStyles.default
  }

  const filteredCourses = courses.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Mobile bottom nav items
  const mobileNavItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'add', icon: Plus, label: 'Add' },
    { id: 'profile', icon: User, label: 'Profile' },
  ]

  return (
    <div className="h-screen bg-surface-900 text-white flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-surface-800/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-3">
          {view !== 'home' && (
            <button 
              onClick={() => setView(activeCourse && view !== 'course' ? 'course' : 'home')} 
              className="p-2 -ml-2 hover:bg-white/5 rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-1.5 rounded-xl shadow-lg shadow-primary-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-semibold text-base truncate max-w-[180px]">
              {view === 'home' ? 'StudyAI' : activeCourse?.name || 'StudyAI'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeCourse && view === 'course' && (
            <button 
              onClick={() => setShowAddMaterials(true)}
              className="p-2 hover:bg-white/5 rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              <FileUp className="h-5 w-5 text-gray-400" />
            </button>
          )}
          {view === 'home' && (
            <button 
              onClick={() => setShowNewCourse(true)}
              className="p-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl active:scale-95 transition-all shadow-lg shadow-primary-500/25 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>
      
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex ${sidebarOpen ? 'w-64' : 'w-16'} bg-surface-800 border-r border-white/5 flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-2 rounded-xl shadow-lg shadow-primary-500/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          {sidebarOpen && <span className="font-bold text-lg">StudyAI</span>}
        </div>
        
        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          <button
            onClick={() => { setView('home'); setActiveCourse(null) }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              view === 'home' && !activeCourse ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          
          <button
            onClick={() => setView('public')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              view === 'public' ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Users className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Public Library</span>}
          </button>
          
          <button
            onClick={() => setView('chat')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
              view === 'chat' ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Bot className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>AI Tutor</span>}
          </button>
          
          {sidebarOpen && courses.length > 0 && (
            <div className="pt-4">
              <p className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Your Courses</p>
              {courses.slice(0, 5).map(course => {
                const style = getSubjectStyle(course.name)
                return (
                  <button
                    key={course.id}
                    onClick={() => { setActiveCourse(course); setView('course') }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                      activeCourse?.id === course.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{style.icon}</span>
                    <span className="truncate text-sm">{course.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </nav>
        
        {/* User */}
        <div className="p-3 border-t border-white/5">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-primary-500/20">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'Student'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center font-bold text-sm mx-auto shadow-lg shadow-primary-500/20 cursor-pointer">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex bg-surface-800/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
              <Menu className="h-5 w-5 text-gray-400" />
            </button>
            
            {view !== 'home' && activeCourse && (
              <>
                <button onClick={() => setView(view === 'course' ? 'home' : 'course')} className="p-2 hover:bg-white/5 rounded-xl cursor-pointer">
                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </button>
                <div>
                  <h1 className="font-semibold">{activeCourse.name}</h1>
                  <p className="text-sm text-gray-500">{activeCourse.lessons.length} lessons · {activeCourse.totalProgress}% complete</p>
                </div>
              </>
            )}
            
            {view === 'home' && (
              <h1 className="text-xl font-semibold">Dashboard</h1>
            )}
            
            {view === 'chat' && (
              <h1 className="text-xl font-semibold">AI Tutor</h1>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {activeCourse && view === 'course' && (
              <>
                <button 
                  onClick={() => setShowAddMaterials(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <FileUp className="h-4 w-4" />
                  Add Materials
                </button>
                <button 
                  onClick={shareCourse}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-colors cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              </>
            )}
            
            <button 
              onClick={() => setShowNewCourse(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary-500/25 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Exam
            </button>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {/* HOME - Dashboard */}
          {view === 'home' && (
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
              {/* Search & Filter - Mobile optimized */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full bg-surface-800/80 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                
                {/* Horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                  {['Math', 'Physics', 'Chemistry', 'CS'].map((cat, i) => {
                    const fullCat = ['Math', 'Physics', 'Chemistry', 'Computer Science'][i]
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === fullCat ? 'all' : fullCat)}
                        className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-sm transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          selectedCategory === fullCat 
                            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30' 
                            : 'bg-surface-800/60 text-gray-400 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span>{subjectStyles[fullCat]?.icon}</span>
                        <span className="md:inline">{cat}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Upcoming Exams */}
              {courses.some(c => c.examDate) && (
                <section className="mb-6 md:mb-8">
                  <h2 className="text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-400" />
                    Upcoming Exams
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {courses.filter(c => c.examDate && daysUntil(c.examDate) > 0).sort((a, b) => new Date(a.examDate) - new Date(b.examDate)).slice(0, 3).map(course => {
                      const style = getSubjectStyle(course.name)
                      const days = daysUntil(course.examDate)
                      return (
                        <div
                          key={course.id}
                          onClick={() => { setActiveCourse(course); setView('course') }}
                          className="bg-surface-800/60 border border-white/5 rounded-2xl p-5 cursor-pointer hover:bg-surface-700/60 hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <span className="bg-white/5 px-3 py-1 rounded-full text-sm text-gray-300">{course.name.split(' ')[0]}</span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${style.color} text-xl`}>
                              {style.icon}
                            </div>
                          </div>
                          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary-400 transition-colors">{course.name}</h3>
                          <p className="text-sm text-gray-500 mb-4 truncate">{course.lessons.length} lessons</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className={`flex items-center gap-1.5 ${course.totalProgress < 50 ? 'text-amber-400' : 'text-success-400'}`}>
                              <div className="w-2 h-2 rounded-full bg-current" />
                              {course.totalProgress}%
                            </span>
                            <span className="text-gray-400 flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {days}d left
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
              
              {/* All Courses */}
              <section>
                <h2 className="text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary-400" />
                  Your Courses
                </h2>
                {filteredCourses.length === 0 ? (
                  <div className="text-center py-12 md:py-16 bg-gray-900/30 rounded-2xl border border-gray-800/50">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-7 w-7 md:h-8 md:w-8 text-gray-600" />
                    </div>
                    <h3 className="text-base md:text-lg font-medium mb-2">No courses yet</h3>
                    <p className="text-gray-500 mb-6 text-sm md:text-base px-4">Upload your study materials to get started</p>
                    <button 
                      onClick={() => setShowNewCourse(true)}
                      className="bg-primary-600 hover:bg-primary-500 active:scale-95 px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-medium inline-flex items-center gap-2 transition-all shadow-lg shadow-primary-500/25 cursor-pointer"
                    >
                      <Plus className="h-5 w-5" />
                      Create Your First Course
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {filteredCourses.map(course => {
                      const style = getSubjectStyle(course.name)
                      return (
                        <div
                          key={course.id}
                          onClick={() => { setActiveCourse(course); setView(course.needsAssessment ? 'assessment' : 'course') }}
                          className="bg-surface-800/60 border border-white/5 rounded-2xl p-4 md:p-5 cursor-pointer hover:bg-surface-700/60 hover:border-white/10 active:scale-[0.98] transition-all group relative"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteCourse(course.id) }}
                            className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 hover:bg-red-500/20 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                          
                          <div className="flex items-start gap-3 md:block">
                            <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center text-xl md:text-2xl md:mb-4 shrink-0 shadow-lg`}>
                              {style.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0 md:block">
                              <h3 className="font-semibold mb-0.5 md:mb-1 group-hover:text-primary-400 transition-colors truncate">{course.name}</h3>
                              <p className="text-sm text-gray-500 mb-2 md:mb-4">{course.lessons.length} lessons</p>
                              
                              {course.needsAssessment ? (
                                <div className="inline-flex items-center gap-2 text-amber-400 text-xs md:text-sm bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                                  <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                  Take assessment
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-surface-700 rounded-full h-1.5 md:h-2 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full bg-gradient-to-r ${style.color} transition-all duration-500`} 
                                      style={{ width: `${course.totalProgress}%` }} 
                                    />
                                  </div>
                                  <span className="text-xs md:text-sm text-gray-400 font-medium">{course.totalProgress}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {course.sharedFrom && (
                            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg w-fit">
                              <Share2 className="h-3 w-3" />
                              From {course.sharedFrom}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
          
          {/* PUBLIC LIBRARY */}
          {view === 'public' && (
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
              {/* Header */}
              <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Public Library</h1>
                <p className="text-gray-400">Discover subjects shared by the community. Import and start learning instantly!</p>
              </div>
              
              {/* Search & Filter */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    placeholder="Search public subjects..."
                    className="w-full bg-surface-800/80 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
                
                <select
                  value={publicLanguageFilter}
                  onChange={(e) => setPublicLanguageFilter(e.target.value)}
                  className="bg-surface-800/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                >
                  <option value="all">All Languages</option>
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.name}>{lang.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Loading State */}
              {loadingPublic ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
                </div>
              ) : filteredPublicSubjects.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-surface-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No Public Subjects Yet</h3>
                  <p className="text-sm text-gray-500 mb-6">Be the first to share your subject with the community!</p>
                  <button
                    onClick={() => setView('home')}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Create a Subject
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPublicSubjects.map(subject => {
                    const style = getSubjectStyle(subject.subject_name)
                    return (
                      <div
                        key={subject.id}
                        className="bg-surface-800/60 border border-white/5 rounded-2xl p-5 hover:bg-surface-700/60 hover:border-white/10 transition-all group"
                      >
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center text-xl shrink-0`}>
                            {style.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-lg truncate">{subject.subject_name}</h3>
                            <p className="text-sm text-gray-400">{subject.lesson_count} lessons</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-2 py-1 bg-primary-500/10 text-primary-400 text-xs rounded-lg">
                            {subject.subject_language || 'English'}
                          </span>
                          <span className="px-2 py-1 bg-white/5 text-gray-400 text-xs rounded-lg flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {subject.downloads || 0} imports
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-[10px] font-bold text-white">
                              {subject.shared_by_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            {subject.shared_by_name}
                          </span>
                          <span>{new Date(subject.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <button
                          onClick={() => importPublicSubject(subject)}
                          className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <BookOpen className="h-4 w-4" />
                          Import & Start
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* ASSESSMENT */}
          {view === 'assessment' && activeCourse && (
            <div className="max-w-2xl mx-auto p-4 md:p-6">
              <div className="text-center mb-6 md:mb-8">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-primary-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
                  <Brain className="h-7 w-7 md:h-8 md:w-8 text-primary-400" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold mb-2">Let's See What You Know!</h1>
                <p className="text-gray-400 text-sm md:text-base px-4">Answer these questions so I can personalize your learning.</p>
              </div>
              
              <div className="bg-surface-800/60 rounded-2xl border border-white/5 p-4 md:p-6">
                {isGenerating ? (
                  <div className="text-center py-10 md:py-12">
                    <Loader2 className="h-10 w-10 md:h-12 md:w-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Preparing your assessment...</p>
                  </div>
                ) : questions.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <span className="text-xs md:text-sm text-gray-500">Question {currentQ + 1} of {questions.length}</span>
                      <div className="flex gap-1">
                        {questions.map((_, i) => (
                          <div key={i} className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors ${
                            i < currentQ ? (answers[i]?.correct ? 'bg-green-500' : 'bg-red-500') : 
                            i === currentQ ? 'bg-primary-500' : 'bg-gray-700'
                          }`} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-4 md:mb-6">
                      <div className="text-base md:text-lg text-gray-100">
                        <MarkdownRenderer content={questions[currentQ]?.question} />
                      </div>
                    </div>
                    
                    <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                      {questions[currentQ]?.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAssessmentAnswer(i)}
                          disabled={showExplanation}
                          className={`w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all active:scale-[0.98] ${
                            showExplanation
                              ? i === questions[currentQ].correct ? 'border-green-500 bg-green-500/10' : i === selectedAnswer ? 'border-red-500 bg-red-500/10' : 'border-gray-800'
                              : selectedAnswer === i ? 'border-primary-500 bg-primary-500/10' : 'border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <MarkdownRenderer content={opt} />
                        </button>
                      ))}
                    </div>
                    
                    {showExplanation && (
                      <div className={`p-3 md:p-4 rounded-xl mb-4 md:mb-6 ${answers[currentQ]?.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                        <p className={`font-medium mb-2 text-sm md:text-base ${answers[currentQ]?.correct ? 'text-green-400' : 'text-amber-400'}`}>
                          {answers[currentQ]?.correct ? '✓ Correct!' : '✗ Not quite'}
                        </p>
                        <MarkdownRenderer content={questions[currentQ]?.explanation} />
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      {!showExplanation ? (
                        <button 
                          onClick={submitAssessmentAnswer} 
                          disabled={selectedAnswer === null}
                          className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 py-3 rounded-xl font-medium active:scale-[0.98] transition-transform"
                        >
                          Check Answer
                        </button>
                      ) : (
                        <button onClick={nextAssessmentQuestion} className="flex-1 bg-primary-600 hover:bg-primary-500 py-3 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                          {currentQ < questions.length - 1 ? 'Next' : 'Results'} <ChevronRight className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => generateAssessment(activeCourse)}
                    className="w-full bg-primary-600 hover:bg-primary-500 py-4 rounded-xl font-medium active:scale-[0.98] transition-transform"
                  >
                    Start Assessment
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* COURSE VIEW */}
          {view === 'course' && activeCourse && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              {/* Course Header */}
              <div className="bg-surface-800/60 rounded-2xl p-4 md:p-6 border border-white/5 mb-6 md:mb-8">
                <div className="flex items-start gap-3 md:gap-4 mb-4">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${getSubjectStyle(activeCourse.name).color} flex items-center justify-center text-xl md:text-2xl shrink-0 shadow-lg`}>
                    {getSubjectStyle(activeCourse.name).icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl md:text-2xl font-bold truncate">{activeCourse.name}</h1>
                    <p className="text-sm md:text-base text-gray-400">{activeCourse.lessons.length} lessons · {activeCourse.lessons.filter(l => l.completed).length} completed</p>
                    {activeCourse.language && (
                      <p className="text-xs text-gray-500 mt-1">Language: {activeCourse.language}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-6 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="font-medium">{activeCourse.totalProgress}%</span>
                    </div>
                    <div className="bg-surface-700 rounded-full h-2 md:h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${getSubjectStyle(activeCourse.name).color} transition-all duration-500`}
                        style={{ width: `${activeCourse.totalProgress}%` }}
                      />
                    </div>
                  </div>
                  
                  {activeCourse.examDate && (
                    <div className="text-center pl-4 md:px-6 border-l border-white/5">
                      <p className="text-xl md:text-2xl font-bold text-amber-400">{daysUntil(activeCourse.examDate)}</p>
                      <p className="text-xs text-gray-500">days left</p>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
                  <button 
                    onClick={() => setShowAddMaterials(true)}
                    className="flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs md:text-sm active:scale-[0.98] transition-all cursor-pointer border border-white/5"
                  >
                    <FileUp className="h-4 w-4" />
                    <span className="hidden md:inline">Add Materials</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowReplanModal(true)}
                    className="flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs md:text-sm active:scale-[0.98] transition-all cursor-pointer border border-white/5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden md:inline">Replan</span>
                  </button>
                  
                  <button 
                    onClick={shareCourse}
                    className="flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs md:text-sm active:scale-[0.98] transition-all cursor-pointer border border-white/5 md:col-auto"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden md:inline">Share</span>
                  </button>
                </div>
              </div>
              
              {/* Lessons */}
              <h2 className="text-lg font-semibold mb-3 md:mb-4">Lessons</h2>
              <div className="space-y-3">
                {activeCourse.lessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-5 hover:border-gray-700 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        lesson.completed ? 'bg-green-500/20 text-green-400' : 
                        lesson.progress > 0 ? 'bg-primary-500/20 text-primary-400' : 
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {lesson.completed ? <Check className="h-5 w-5 md:h-6 md:w-6" /> : 
                         lesson.progress > 0 ? <span className="font-bold text-xs md:text-sm">{lesson.progress}%</span> :
                         <span className="font-bold text-base md:text-lg">{idx + 1}</span>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium mb-0.5 md:mb-1 text-sm md:text-base">{lesson.title}</h3>
                        <p className="text-xs md:text-sm text-gray-500 mb-2 md:mb-3 line-clamp-2">{lesson.description}</p>
                        
                        {/* Key points - hidden on mobile to save space */}
                        <div className="hidden md:flex flex-wrap gap-2 mb-4">
                          {lesson.keyPoints.slice(0, 3).map((p, i) => (
                            <span key={i} className="bg-gray-800/50 px-2 py-1 rounded text-xs text-gray-400">{p}</span>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => startLesson(lesson)}
                            className="bg-primary-600 hover:bg-primary-500 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 active:scale-95 transition-transform"
                          >
                            <Play className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            {lesson.progress > 0 ? 'Continue' : 'Learn'}
                          </button>
                          <button 
                            onClick={() => startQuiz(lesson)}
                            className="bg-gray-800 hover:bg-gray-700 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium flex items-center gap-1.5 md:gap-2 active:scale-95 transition-transform"
                          >
                            <Brain className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Quiz
                          </button>
                        </div>
                        
                        {lesson.quizScore !== null && (
                          <p className="text-xs text-gray-500 mt-2 md:mt-3">Last quiz: {lesson.quizScore}/5</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* LESSON STEP VIEW */}
          {view === 'lesson-step' && activeLesson && (
            <div className="flex flex-col h-full max-w-3xl mx-auto">
              {/* Lesson Header */}
              <div className="p-3 md:p-4 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-sm md:text-base truncate">{activeLesson.title}</h2>
                    <p className="text-xs md:text-sm text-gray-500">
                      Step {currentStep + 1} of {lessonContent.length || '?'} · Learning Mode
                    </p>
                  </div>
                  <button 
                    onClick={() => startQuiz(activeLesson)}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Take Quiz
                  </button>
                </div>
                
                {lessonContent.length > 0 && (
                  <div className="flex gap-1 mt-3">
                    {lessonContent.map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 h-1.5 rounded-full transition-colors ${
                          i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-primary-500' : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="bg-primary-500/20 p-2 rounded-xl h-fit shrink-0">
                        <Bot className="h-5 w-5 text-primary-400" />
                      </div>
                    )}
                    <div className={`max-w-[85%] ${
                      msg.role === 'user' ? 'bg-primary-600 rounded-2xl rounded-br-md' : 'bg-gray-800/80 rounded-2xl rounded-bl-md'
                    } px-5 py-4`}>
                      {msg.role === 'user' ? (
                        <p className="text-gray-100">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="bg-gray-700 p-2 rounded-xl h-fit shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="bg-primary-500/20 p-2 rounded-xl h-fit">
                      <Bot className="h-5 w-5 text-primary-400" />
                    </div>
                    <div className="bg-gray-800 rounded-2xl px-5 py-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input */}
              <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                {lessonContent[currentStep]?.checkQuestion && !messages.some(m => m.role === 'user') && (
                  <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3 mb-3">
                    <div className="text-sm text-primary-300 flex items-start gap-2">
                      <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <MarkdownRenderer content={lessonContent[currentStep].checkQuestion} />
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStepResponse()}
                    placeholder="Type your answer or ask a question..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500"
                  />
                  <button 
                    onClick={handleStepResponse}
                    disabled={!input.trim() || isLoading}
                    className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 p-3 rounded-xl"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* QUIZ */}
          {view === 'quiz' && (
            <div className="max-w-2xl mx-auto p-6">
              <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
                {isGenerating ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 text-primary-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Generating quiz questions...</p>
                  </div>
                ) : questions.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-sm text-gray-500">Question {currentQ + 1} of {questions.length}</span>
                      <div className="flex gap-1">
                        {questions.map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-full ${
                            i < currentQ ? (answers[i]?.correct ? 'bg-green-500' : 'bg-red-500') : 
                            i === currentQ ? 'bg-primary-500' : 'bg-gray-700'
                          }`} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-6 text-lg">
                      <MarkdownRenderer content={questions[currentQ]?.question} />
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {questions[currentQ]?.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleQuizAnswer(i)}
                          disabled={showExplanation}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            showExplanation
                              ? i === questions[currentQ].correct ? 'border-green-500 bg-green-500/10' : i === selectedAnswer ? 'border-red-500 bg-red-500/10' : 'border-gray-800'
                              : selectedAnswer === i ? 'border-primary-500 bg-primary-500/10' : 'border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <MarkdownRenderer content={opt} />
                        </button>
                      ))}
                    </div>
                    
                    {showExplanation && (
                      <div className={`p-4 rounded-xl mb-6 ${answers[currentQ]?.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                        <p className={`font-medium mb-2 ${answers[currentQ]?.correct ? 'text-green-400' : 'text-amber-400'}`}>
                          {answers[currentQ]?.correct ? '✓ Correct!' : '✗ Not quite'}
                        </p>
                        <MarkdownRenderer content={questions[currentQ]?.explanation} />
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      {!showExplanation ? (
                        <button onClick={submitQuizAnswer} disabled={selectedAnswer === null} className="flex-1 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 py-3 rounded-xl font-medium">
                          Check Answer
                        </button>
                      ) : (
                        <button onClick={nextQuizQuestion} className="flex-1 bg-primary-600 hover:bg-primary-500 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                          {currentQ < questions.length - 1 ? 'Next Question' : 'See Results'} <ChevronRight className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
          
          {/* RESULTS */}
          {view === 'results' && (
            <div className="max-w-2xl mx-auto p-6">
              <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-8 text-center">
                {assessmentResults ? (
                  // Assessment Results
                  <>
                    <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
                      assessmentResults.percentage >= 70 ? 'bg-green-500/20' : assessmentResults.percentage >= 40 ? 'bg-amber-500/20' : 'bg-primary-500/20'
                    }`}>
                      <span className={`text-4xl font-bold ${
                        assessmentResults.percentage >= 70 ? 'text-green-400' : assessmentResults.percentage >= 40 ? 'text-amber-400' : 'text-primary-400'
                      }`}>
                        {assessmentResults.percentage}%
                      </span>
                    </div>
                    
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${
                      assessmentResults.level === 'Advanced' ? 'bg-green-500/20 text-green-400' :
                      assessmentResults.level === 'Intermediate' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-primary-500/20 text-primary-400'
                    }`}>
                      <Star className="h-4 w-4" />
                      {assessmentResults.level} Level
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-2">Assessment Complete!</h2>
                    <p className="text-gray-400 mb-6">{assessmentResults.message}</p>
                    
                    <div className="text-left bg-gray-800/50 rounded-xl p-4 mb-6">
                      <h3 className="font-medium mb-3">Your Performance by Topic:</h3>
                      <div className="space-y-2">
                        {Object.entries(assessmentResults.byTopic).map(([topic, data]) => (
                          <div key={topic} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-300">{topic}</span>
                                <span className={data.correct === data.total ? 'text-green-400' : 'text-gray-400'}>
                                  {data.correct}/{data.total}
                                </span>
                              </div>
                              <div className="bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${data.correct === data.total ? 'bg-green-500' : 'bg-primary-500'}`}
                                  style={{ width: `${(data.correct / data.total) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => { setAssessmentResults(null); setView('course') }}
                      className="w-full bg-primary-600 hover:bg-primary-500 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      Start Learning <ArrowRight className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  // Quiz Results
                  <>
                    <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                      answers.filter(a => a.correct).length >= 4 ? 'bg-green-500/20' : 
                      answers.filter(a => a.correct).length >= 2 ? 'bg-amber-500/20' : 'bg-red-500/20'
                    }`}>
                      <Trophy className={`h-10 w-10 ${
                        answers.filter(a => a.correct).length >= 4 ? 'text-green-400' : 
                        answers.filter(a => a.correct).length >= 2 ? 'text-amber-400' : 'text-red-400'
                      }`} />
                    </div>
                    
                    <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
                    <p className="text-4xl font-bold text-primary-400 mb-6">
                      {answers.filter(a => a.correct).length}/{questions.length}
                    </p>
                    
                    <div className="text-left mb-6">
                      <h3 className="font-medium mb-3">Your Answers:</h3>
                      <div className="space-y-2">
                        {questions.map((q, i) => (
                          <div key={i} className={`p-3 rounded-lg ${answers[i]?.correct ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <div className="flex items-start gap-2">
                              {answers[i]?.correct ? (
                                <Check className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                              ) : (
                                <X className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                              )}
                              <div className="text-sm">
                                <MarkdownRenderer content={q.question} />
                                {!answers[i]?.correct && (
                                  <p className="text-green-400 mt-1">Correct: {q.options[q.correct]}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {answers.filter(a => !a.correct).length > 0 && (
                      <div className="bg-gray-800 rounded-xl p-4 mb-6 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="h-5 w-5 text-primary-400" />
                          <span className="font-medium">Need help understanding?</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">I can explain the questions you got wrong.</p>
                        <button
                          onClick={() => {
                            setMessages([{
                              role: 'assistant',
                              content: `I noticed you had some trouble with a few questions. Let me help! 🎯\n\nWhich one would you like me to explain?\n\n${questions.filter((_, i) => !answers[i]?.correct).map((q, i) => `${i + 1}. ${q.question}`).join('\n\n')}`
                            }])
                            setView('lesson-step')
                          }}
                          className="bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          Get AI Help
                        </button>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <button onClick={() => setView('course')} className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-medium">
                        Back to Course
                      </button>
                      <button onClick={() => startQuiz(activeLesson)} className="flex-1 bg-primary-600 hover:bg-primary-500 py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                        <RotateCcw className="h-4 w-4" /> Retry Quiz
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* AI Tutor Chat View */}
          {view === 'chat' && (
            <div className="h-full flex flex-col bg-surface-900">
              {/* Chat Header */}
              <div className="bg-surface-800/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-500/15 p-2 rounded-xl border border-primary-500/20">
                    <Bot className="h-5 w-5 text-primary-400" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-white">AI Tutor</h1>
                    <p className="text-xs text-gray-500">Ask me anything</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMathMode(!mathMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl transition-all cursor-pointer ${
                      mathMode ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <Calculator className="h-4 w-4" />
                    <span className="hidden sm:inline">Math</span>
                  </button>
                  <button
                    onClick={() => { setChatMessages([]); setMathMode(false) }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    title="Clear chat"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="bg-primary-500/15 p-4 rounded-2xl mb-4 border border-primary-500/20">
                      {mathMode ? <Calculator className="h-10 w-10 text-primary-400" /> : <Sparkles className="h-10 w-10 text-primary-400" />}
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {mathMode ? 'Math Solver' : 'AI Tutor'}
                    </h2>
                    <p className="text-gray-400 max-w-md mb-6">
                      {mathMode 
                        ? 'Type a problem or upload a photo for step-by-step solutions'
                        : 'Ask me anything! I can explain concepts, solve problems, or help you study.'
                      }
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {(mathMode 
                        ? ['Solve 2x + 5 = 15', 'Find derivative of x²', 'Calculate √144']
                        : ['Explain quantum physics', 'Help me with essay writing', 'Quiz me on history']
                      ).map((s, i) => (
                        <button key={i} onClick={() => setChatInput(s)}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="bg-primary-500/15 p-2 rounded-xl h-fit shrink-0 border border-primary-500/20">
                        <Bot className="h-5 w-5 text-primary-400" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'space-y-3'}`}>
                      {msg.role === 'user' ? (
                        <div className="bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-primary-500/20">
                          {msg.image && <img src={msg.image} alt="Upload" className="max-h-40 rounded-lg mb-2" />}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ) : (
                        <>
                          {msg.solution?.steps && (
                            <SolvingSteps steps={msg.solution.steps} solution={msg.solution.solution} tip={msg.solution.tip} />
                          )}
                          
                          {msg.solution && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <button onClick={() => handleChatFollowUp('Give me a similar problem')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-sm text-gray-300 transition-colors cursor-pointer">
                                <RefreshCw className="h-3 w-3" /> Similar
                              </button>
                            </div>
                          )}
                          
                          <div className="bg-surface-800/80 rounded-2xl p-4 border border-white/5">
                            <MarkdownRenderer content={msg.content} />
                          </div>
                          
                          <div className="flex items-center gap-2 text-gray-500">
                            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"><ThumbsUp className="h-4 w-4" /></button>
                            <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"><ThumbsDown className="h-4 w-4" /></button>
                          </div>
                          
                          {msg.solution?.followUpQuestions && (
                            <div className="space-y-2">
                              {msg.solution.followUpQuestions.slice(0, 3).map((q, i) => (
                                <button key={i} onClick={() => handleChatFollowUp(q)}
                                  className="block w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl text-gray-300 text-sm transition-all cursor-pointer">
                                  {q}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {msg.role === 'user' && (
                      <div className="bg-gray-700 p-2 rounded-xl h-fit shrink-0">
                        <User className="h-5 w-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="bg-primary-500/20 p-2 rounded-xl h-fit">
                      <Bot className="h-5 w-5 text-primary-400" />
                    </div>
                    <div className="bg-gray-800/50 rounded-2xl px-4 py-3 border border-gray-700 flex items-center gap-2 text-gray-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{mathMode ? 'Solving...' : 'Thinking...'}</span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-800 bg-gray-900/50 shrink-0">
                {chatImage && (
                  <div className="p-3 border-b border-gray-800">
                    <div className="relative inline-block">
                      <img src={chatImage} alt="Preview" className="h-16 rounded-lg" />
                      <button onClick={() => setChatImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 focus-within:border-primary-500 transition-colors">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder={mathMode ? "Type a math problem..." : "Ask me anything..."}
                      className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none"
                    />
                    
                    <div className="flex items-center justify-between px-3 pb-3">
                      <div className="flex items-center gap-1">
                        <input type="file" ref={chatFileInputRef} onChange={handleChatImageUpload} accept="image/*" className="hidden" />
                        <button onClick={() => chatFileInputRef.current?.click()}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                          <Camera className="h-5 w-5" />
                        </button>
                        {mathMode && (
                          <button onClick={() => setShowMathKeyboard(!showMathKeyboard)}
                            className={`p-2 rounded-lg ${showMathKeyboard ? 'text-primary-400 bg-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                            <PenLine className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                      <button onClick={sendChatMessage} disabled={(!chatInput.trim() && !chatImage) || chatLoading}
                        className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg">
                        {chatLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {showMathKeyboard && mathMode && (
                  <MathKeyboard 
                    value={chatInput}
                    onInsert={handleChatKeyboardInsert} 
                    onClose={() => setShowMathKeyboard(false)} 
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* New Course Modal */}
      {showNewCourse && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-800 rounded-2xl border border-white/5 w-full max-w-lg">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create New Course</h2>
                <button onClick={() => { setShowNewCourse(false); setCourseLanguage('English') }} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject Name *</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g., Physics, Calculus, Chemistry"
                  className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Language *</label>
                <select
                  value={courseLanguage}
                  onChange={(e) => setCourseLanguage(e.target.value)}
                  className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.name}>
                      {lang.native} ({lang.name})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">All lessons, quizzes, and AI responses will be in {courseLanguage}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam Date (Optional)</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Upload Study Materials *</label>
                <div
                  onClick={() => subjectName.trim() && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    subjectName.trim() ? 'border-primary-500/30 hover:border-primary-500 hover:bg-primary-500/5' : 'border-white/10 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
                      <p className="text-primary-400">{processingStatus}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-300 mb-1">{subjectName.trim() ? 'Click to upload files' : 'Enter subject name first'}</p>
                      <p className="text-xs text-gray-500">PDF, Images, or Text files</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.txt,.md" onChange={handleFileUpload} className="hidden" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Replan Modal */}
      {showReplanModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-800 rounded-2xl border border-white/5 w-full max-w-md">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-primary-400" />
                  Replan Course
                </h2>
                <button onClick={() => setShowReplanModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-400 text-sm">
                Regenerate all lessons to ensure they're in a single language. This will reset your progress.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Language</label>
                <select
                  value={replanLanguage}
                  onChange={(e) => setReplanLanguage(e.target.value)}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.name}>
                      {lang.native} ({lang.name})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-xs text-amber-300">
                  ⚠️ All lessons will be regenerated in <strong>{replanLanguage}</strong> with pure content (no language mixing). Progress will be reset.
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReplanModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    replanCourse(replanLanguage)
                    setShowReplanModal(false)
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  {isProcessing ? 'Processing...' : 'Regenerate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-800 rounded-2xl border border-white/5 w-full max-w-md">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary-400" />
                  Share Course
                </h2>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Private Link Share */}
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-gray-400" />
                  Private Link (7 days)
                </h3>
                <p className="text-gray-500 text-sm mb-3">
                  Share with specific friends via a link.
                </p>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-gray-300 text-sm"
                  />
                  <button
                    onClick={copyShareLink}
                    className={`px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors cursor-pointer ${
                      copySuccess ? 'bg-success-600 text-white' : 'bg-primary-600 hover:bg-primary-500 text-white'
                    }`}
                  >
                    {copySuccess ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500">OR</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              
              {/* Public Library Share */}
              <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-4">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary-400" />
                  Share to Public Library
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Publish this subject for everyone to discover and learn from. Help the community!
                </p>
                
                <button
                  onClick={shareToPublic}
                  disabled={isProcessing}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Publish to Public Library
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-xs text-gray-600 text-center">
                Private links expire in 7 days. Public shares remain until you remove them.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Materials Modal */}
      {showAddMaterials && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-gray-900 rounded-t-3xl md:rounded-2xl border-t md:border border-gray-800 w-full md:max-w-lg max-h-[90vh] overflow-hidden">
            {/* Drag handle for mobile */}
            <div className="md:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-700 rounded-full" />
            </div>
            
            <div className="p-4 md:p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-primary-400" />
                  Add Materials
                </h2>
                <button onClick={() => setShowAddMaterials(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-4 md:p-6">
              <p className="text-gray-400 text-sm mb-4">
                Add more study materials to <span className="text-white font-medium">{activeCourse?.name}</span>. 
                New topics will be added as lessons, and existing topics will be expanded.
              </p>
              
              <div
                onClick={() => addMaterialRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-all ${
                  isProcessing ? 'border-primary-500 bg-primary-500/5' : 'border-gray-700 hover:border-primary-500 hover:bg-primary-500/5 active:scale-[0.98]'
                }`}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
                    <p className="text-primary-400 text-sm">{processingStatus}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-300 mb-1">Tap to upload files</p>
                    <p className="text-xs text-gray-600">PDF, Images, or Text files</p>
                  </>
                )}
              </div>
              <input 
                ref={addMaterialRef} 
                type="file" 
                multiple 
                accept=".pdf,.png,.jpg,.jpeg,.txt,.md" 
                onChange={handleAddMaterials} 
                className="hidden" 
              />
              
              <div className="mt-4 p-3 bg-gray-800/50 rounded-xl">
                <p className="text-xs text-gray-400">
                  <Sparkles className="h-3.5 w-3.5 inline mr-1 text-primary-400" />
                  AI will analyze your materials and automatically update your course structure.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-800/95 backdrop-blur-xl border-t border-white/5 px-1 py-2 safe-area-bottom z-40">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => { setView('home'); setActiveCourse(null) }}
            className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all cursor-pointer ${
              view === 'home' ? 'text-primary-400 bg-primary-500/10' : 'text-gray-500 active:bg-white/5'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          
          <button
            onClick={() => setView('public')}
            className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all cursor-pointer ${
              view === 'public' ? 'text-primary-400 bg-primary-500/10' : 'text-gray-500 active:bg-white/5'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium">Explore</span>
          </button>
          
          <button
            onClick={() => setShowNewCourse(true)}
            className="flex flex-col items-center gap-0.5 py-1.5 px-2 -mt-5 cursor-pointer"
          >
            <div className="bg-primary-600 hover:bg-primary-500 p-3 rounded-2xl shadow-lg shadow-primary-500/30 active:scale-95 transition-all">
              <Plus className="h-5 w-5" />
            </div>
          </button>
          
          <button
            onClick={() => setView('chat')}
            className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all cursor-pointer ${
              view === 'chat' ? 'text-primary-400 bg-primary-500/10' : 'text-gray-500 active:bg-white/5'
            }`}
          >
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-medium">Tutor</span>
          </button>
          
          <button
            onClick={() => activeCourse ? setView('course') : null}
            className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all cursor-pointer ${
              view === 'course' ? 'text-primary-400 bg-primary-500/10' : 'text-gray-500 active:bg-white/5'
            } ${!activeCourse ? 'opacity-40' : ''}`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] font-medium">Course</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
