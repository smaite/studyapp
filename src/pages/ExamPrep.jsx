import { useState, useRef, useEffect } from 'react'
import { 
  Upload, FileText, X, Loader2, CheckCircle, 
  Brain, Sparkles, Send, Bot, User, BookOpen, Target,
  ChevronRight, ChevronLeft, RotateCcw, Trophy, GraduationCap,
  Play, Lock, Check, PenTool, MessageSquare, Plus,
  Layers, Clock, BarChart3, HelpCircle, Search, Share2,
  Home, Calendar, History, Settings, Copy, Users, Link2,
  ArrowRight, Zap, Star, Menu, ChevronDown, FolderPlus, FileUp
} from 'lucide-react'
import { sendMessage, analyzeImage } from '../services/aiService'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const STORAGE_KEY = 'studyai_courses'

// Subject icons/colors
const subjectStyles = {
  Math: { icon: '📐', color: 'from-blue-500 to-cyan-500' },
  Physics: { icon: '⚛️', color: 'from-purple-500 to-pink-500' },
  Chemistry: { icon: '🧪', color: 'from-green-500 to-emerald-500' },
  Biology: { icon: '🧬', color: 'from-red-500 to-orange-500' },
  'Computer Science': { icon: '💻', color: 'from-indigo-500 to-purple-500' },
  History: { icon: '📜', color: 'from-amber-500 to-yellow-500' },
  English: { icon: '📚', color: 'from-teal-500 to-cyan-500' },
  default: { icon: '📖', color: 'from-primary-500 to-indigo-500' }
}

// Check if mobile
const isMobile = () => window.innerWidth < 768

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
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const fileInputRef = useRef(null)
  const addMaterialRef = useRef(null)
  
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
  
  // Share modal
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

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

Material:
${allContent.substring(0, 15000)}

Create lessons that cover ALL topics in the material. For each lesson:
1. Give a clear, specific title
2. Write a 1-2 sentence description
3. List 4-6 key concepts/points to cover

Return ONLY valid JSON array:
[{"id":1,"title":"Topic Name","description":"What this covers","keyPoints":["Concept 1","Concept 2","Concept 3","Concept 4"]}]`

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

  const generateAssessment = async (course) => {
    setIsGenerating(true)
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowExplanation(false)
    
    try {
      const prompt = `Create 10 assessment questions to test the student's existing knowledge of this material. 
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
      setQuestions(parsed.slice(0, 10).map(q => ({
        ...q,
        options: q.options || ['A', 'B', 'C', 'D'],
        correct: typeof q.correct === 'number' ? q.correct : 0
      })))
    } catch (error) {
      console.error('Assessment error:', error)
      // Generate fallback questions
      setQuestions([{
        question: 'Ready to start your assessment?',
        options: ['Yes, let\'s begin!', 'Show me the course first', 'I need help', 'Skip assessment'],
        correct: 0,
        explanation: 'Great! Let\'s test your knowledge.',
        topic: 'General',
        difficulty: 'easy'
      }])
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
    setAnswers([...answers, { 
      selected: selectedAnswer, 
      correct: selectedAnswer === questions[currentQ].correct,
      topic: questions[currentQ].topic,
      difficulty: questions[currentQ].difficulty
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
      const results = calculateAssessmentResults()
      setAssessmentResults(results)
      
      // Update course with knowledge levels
      const updated = { ...activeCourse, needsAssessment: false }
      updated.lessons = updated.lessons.map(lesson => {
        const topicAnswers = answers.filter(a => 
          a.topic?.toLowerCase().includes(lesson.title.toLowerCase()) ||
          lesson.title.toLowerCase().includes(a.topic?.toLowerCase() || '')
        )
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

  const calculateAssessmentResults = () => {
    const total = questions.length
    const correct = answers.filter(a => a.correct).length
    const percentage = Math.round((correct / total) * 100)
    
    // Group by topic
    const byTopic = {}
    answers.forEach((a, i) => {
      const topic = questions[i]?.topic || 'General'
      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 }
      byTopic[topic].total++
      if (a.correct) byTopic[topic].correct++
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

Key concepts to cover: ${lesson.keyPoints.join(', ')}
Course material: ${activeCourse.content.substring(0, 5000)}

Create 4-5 teaching steps. Each step should:
1. Explain ONE concept clearly with examples
2. Use real-world analogies
3. Include a mini check-in question

Return JSON array:
[{
  "title": "Step title",
  "content": "Detailed explanation with emojis, examples. Use $...$ for math.",
  "checkQuestion": "A question to verify understanding",
  "checkAnswer": "The expected answer or concept"
}]

Be friendly, use emojis 🎯, and make it engaging!`

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
    <div className="h-screen bg-[#0a0a0f] text-white flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#0f0f15] border-b border-gray-800/50 px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-3">
          {view !== 'home' && (
            <button 
              onClick={() => setView(activeCourse && view !== 'course' ? 'course' : 'home')} 
              className="p-2 -ml-2 hover:bg-gray-800 rounded-lg active:scale-95 transition-transform"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-1.5 rounded-lg">
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
              className="p-2 hover:bg-gray-800 rounded-lg active:scale-95 transition-transform"
            >
              <FileUp className="h-5 w-5 text-gray-400" />
            </button>
          )}
          {view === 'home' && (
            <button 
              onClick={() => setShowNewCourse(true)}
              className="p-2 bg-primary-600 rounded-lg active:scale-95 transition-transform"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>
      
      {/* Desktop Sidebar */}
      <div className={`hidden md:flex ${sidebarOpen ? 'w-64' : 'w-16'} bg-[#0f0f15] border-r border-gray-800/50 flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-2 rounded-xl">
            <GraduationCap className="h-6 w-6" />
          </div>
          {sidebarOpen && <span className="font-bold text-lg">StudyAI</span>}
        </div>
        
        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          <button
            onClick={() => { setView('home'); setActiveCourse(null) }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              view === 'home' && !activeCourse ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          
          {sidebarOpen && courses.length > 0 && (
            <div className="pt-4">
              <p className="px-3 text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">Your Courses</p>
              {courses.slice(0, 5).map(course => {
                const style = getSubjectStyle(course.name)
                return (
                  <button
                    key={course.id}
                    onClick={() => { setActiveCourse(course); setView('course') }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      activeCourse?.id === course.id ? 'bg-gray-800/70 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
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
        <div className="p-3 border-t border-gray-800/50">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center font-bold">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.user_metadata?.full_name || 'Student'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center font-bold mx-auto">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex bg-[#0f0f15]/80 backdrop-blur-xl border-b border-gray-800/50 px-6 py-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-800 rounded-lg">
              <Menu className="h-5 w-5 text-gray-400" />
            </button>
            
            {view !== 'home' && activeCourse && (
              <>
                <button onClick={() => setView(view === 'course' ? 'home' : 'course')} className="p-2 hover:bg-gray-800 rounded-lg">
                  <ChevronLeft className="h-5 w-5 text-gray-400" />
                </button>
                <div>
                  <h1 className="font-semibold">{activeCourse.name}</h1>
                  <p className="text-sm text-gray-500">{activeCourse.lessons.length} lessons · {activeCourse.totalProgress}% complete</p>
                </div>
              </>
            )}
            
            {view === 'home' && (
              <h1 className="text-xl font-semibold">Exam Prep</h1>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {activeCourse && view === 'course' && (
              <>
                <button 
                  onClick={() => setShowAddMaterials(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors"
                >
                  <FileUp className="h-4 w-4" />
                  Add Materials
                </button>
                <button 
                  onClick={shareCourse}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              </>
            )}
            
            <button 
              onClick={() => setShowNewCourse(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl text-sm font-medium transition-colors"
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
                    className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
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
                        className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-sm transition-all whitespace-nowrap shrink-0 ${
                          selectedCategory === fullCat ? 'bg-gray-700 text-white' : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'
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
                    Upcoming <ChevronRight className="h-4 w-4 text-gray-500" />
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {courses.filter(c => c.examDate && daysUntil(c.examDate) > 0).sort((a, b) => new Date(a.examDate) - new Date(b.examDate)).slice(0, 3).map(course => {
                      const style = getSubjectStyle(course.name)
                      const days = daysUntil(course.examDate)
                      return (
                        <div
                          key={course.id}
                          onClick={() => { setActiveCourse(course); setView('course') }}
                          className="bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-gray-700 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <span className="bg-gray-800 px-3 py-1 rounded-full text-sm">{course.name.split(' ')[0]}</span>
                            <div className={`w-10 h-10 rounded-full border-2 border-gray-700 flex items-center justify-center bg-gradient-to-br ${style.color} opacity-20`} />
                          </div>
                          <h3 className="font-semibold text-lg mb-1 group-hover:text-primary-400 transition-colors">{course.name}</h3>
                          <p className="text-sm text-gray-500 mb-4 truncate">{course.lessons.length} lessons</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-red-400 flex items-center gap-1">
                              <span className="w-2 h-2 bg-red-500 rounded-full" />
                              {course.totalProgress}%
                            </span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <GraduationCap className="h-4 w-4" />
                              in {days} days
                            </span>
                            <span className="text-gray-500 flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {course.lessons.length}
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
                <h2 className="text-lg font-semibold mb-3 md:mb-4">Your Courses</h2>
                {filteredCourses.length === 0 ? (
                  <div className="text-center py-12 md:py-16 bg-gray-900/30 rounded-2xl border border-gray-800/50">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-7 w-7 md:h-8 md:w-8 text-gray-600" />
                    </div>
                    <h3 className="text-base md:text-lg font-medium mb-2">No courses yet</h3>
                    <p className="text-gray-500 mb-6 text-sm md:text-base px-4">Upload your study materials to get started</p>
                    <button 
                      onClick={() => setShowNewCourse(true)}
                      className="bg-primary-600 hover:bg-primary-500 active:scale-95 px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-medium inline-flex items-center gap-2 transition-transform"
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
                          className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 md:p-5 cursor-pointer hover:border-gray-700 active:scale-[0.98] transition-all group relative"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteCourse(course.id) }}
                            className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 hover:bg-red-500/20 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4 text-red-400" />
                          </button>
                          
                          <div className="flex items-start gap-3 md:block">
                            <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center text-xl md:text-2xl md:mb-4 shrink-0`}>
                              {style.icon}
                            </div>
                            
                            <div className="flex-1 min-w-0 md:block">
                              <h3 className="font-semibold mb-0.5 md:mb-1 group-hover:text-primary-400 transition-colors truncate">{course.name}</h3>
                              <p className="text-sm text-gray-500 mb-2 md:mb-4">{course.lessons.length} lessons</p>
                              
                              {course.needsAssessment ? (
                                <div className="flex items-center gap-2 text-amber-400 text-xs md:text-sm">
                                  <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                  Take assessment
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-800 rounded-full h-1.5 md:h-2">
                                    <div 
                                      className={`h-1.5 md:h-2 rounded-full bg-gradient-to-r ${style.color}`} 
                                      style={{ width: `${course.totalProgress}%` }} 
                                    />
                                  </div>
                                  <span className="text-xs md:text-sm text-gray-400">{course.totalProgress}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {course.sharedFrom && (
                            <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
                              <Share2 className="h-3 w-3" />
                              Shared by {course.sharedFrom}
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
          
          {/* ASSESSMENT */}
          {view === 'assessment' && activeCourse && (
            <div className="max-w-2xl mx-auto p-4 md:p-6">
              <div className="text-center mb-6 md:mb-8">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-7 w-7 md:h-8 md:w-8 text-primary-400" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold mb-2">Let's See What You Know!</h1>
                <p className="text-gray-400 text-sm md:text-base px-4">Answer these questions so I can personalize your learning.</p>
              </div>
              
              <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4 md:p-6">
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
              <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-2xl p-4 md:p-6 border border-gray-800 mb-6 md:mb-8">
                <div className="flex items-start gap-3 md:gap-4 mb-4">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${getSubjectStyle(activeCourse.name).color} flex items-center justify-center text-xl md:text-2xl shrink-0`}>
                    {getSubjectStyle(activeCourse.name).icon}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold truncate">{activeCourse.name}</h1>
                    <p className="text-sm md:text-base text-gray-400">{activeCourse.lessons.length} lessons · {activeCourse.lessons.filter(l => l.completed).length} completed</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs md:text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="font-medium">{activeCourse.totalProgress}%</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-2 md:h-3">
                      <div 
                        className={`h-2 md:h-3 rounded-full bg-gradient-to-r ${getSubjectStyle(activeCourse.name).color}`}
                        style={{ width: `${activeCourse.totalProgress}%` }}
                      />
                    </div>
                  </div>
                  
                  {activeCourse.examDate && (
                    <div className="text-center pl-4 md:px-6 border-l border-gray-800">
                      <p className="text-xl md:text-2xl font-bold text-amber-400">{daysUntil(activeCourse.examDate)}</p>
                      <p className="text-xs text-gray-500">days left</p>
                    </div>
                  )}
                </div>
                
                {/* Mobile: Add Materials Button */}
                <button 
                  onClick={() => setShowAddMaterials(true)}
                  className="md:hidden w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm active:scale-[0.98] transition-transform"
                >
                  <FileUp className="h-4 w-4" />
                  Add More Materials
                </button>
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
                    <p className="text-sm text-primary-300">
                      <Sparkles className="h-4 w-4 inline mr-2" />
                      {lessonContent[currentStep].checkQuestion}
                    </p>
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
        </main>
      </div>
      
      {/* New Course Modal */}
      {showNewCourse && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Create New Course</h2>
                <button onClick={() => setShowNewCourse(false)} className="p-2 hover:bg-gray-800 rounded-lg">
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
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Exam Date (Optional)</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Upload Study Materials *</label>
                <div
                  onClick={() => subjectName.trim() && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    subjectName.trim() ? 'border-gray-700 hover:border-primary-500 hover:bg-primary-500/5' : 'border-gray-800 opacity-50 cursor-not-allowed'
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
                      <p className="text-gray-400 mb-1">{subjectName.trim() ? 'Click to upload files' : 'Enter subject name first'}</p>
                      <p className="text-xs text-gray-600">PDF, Images, or Text files</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.txt,.md" onChange={handleFileUpload} className="hidden" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary-400" />
                  Share Course
                </h2>
                <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-400 mb-4">
                Share this link with friends. They'll need to create an account and take their own assessment before starting.
              </p>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-300 text-sm"
                />
                <button
                  onClick={copyShareLink}
                  className={`px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                    copySuccess ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-500 text-white'
                  }`}
                >
                  {copySuccess ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary-400" />
                  What happens when they open this link:
                </h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• They'll be asked to create an account</li>
                  <li>• They take their own assessment quiz</li>
                  <li>• The course is saved to their account</li>
                  <li>• Their progress is tracked separately</li>
                </ul>
              </div>
              
              <p className="text-xs text-gray-600 mt-4 text-center">
                Link expires in 7 days
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f15]/95 backdrop-blur-xl border-t border-gray-800/50 px-4 py-2 safe-area-bottom z-40">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => { setView('home'); setActiveCourse(null) }}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
              view === 'home' ? 'text-primary-400' : 'text-gray-500'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </button>
          
          <button
            onClick={() => setShowNewCourse(true)}
            className="flex flex-col items-center gap-1 py-2 px-4 -mt-4"
          >
            <div className="bg-primary-600 p-3 rounded-xl shadow-lg shadow-primary-500/30">
              <Plus className="h-5 w-5" />
            </div>
          </button>
          
          <button
            onClick={() => {}}
            className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl text-gray-500"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
