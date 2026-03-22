import { useState, useRef } from 'react'
import { 
  Calendar, Clock, BookOpen, Target, Plus, Trash2, 
  Loader2, CheckCircle, FileText, Sparkles, Upload, 
  File, Image, X, FileUp
} from 'lucide-react'
import { generateStudyPlan, generatePracticeQuestions, analyzeDocument } from '../services/aiService'
import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const levelOptions = [
  'Beginner',
  'Intermediate', 
  'Advanced',
  'Exam Ready'
]

const difficultyOptions = [
  'Easy',
  'Medium',
  'Hard',
  'Challenge'
]

export default function ExamPrep() {
  const [activeTab, setActiveTab] = useState('plan')
  const [subject, setSubject] = useState('')
  const [examDate, setExamDate] = useState('')
  const [topics, setTopics] = useState([''])
  const [currentLevel, setCurrentLevel] = useState('Intermediate')
  const [studyPlan, setStudyPlan] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Practice Questions State
  const [practiceSubject, setPracticeSubject] = useState('')
  const [practiceTopic, setPracticeTopic] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [practiceQuestions, setPracticeQuestions] = useState('')

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [materialSubject, setMaterialSubject] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const fileInputRef = useRef(null)

  const addTopic = () => {
    setTopics([...topics, ''])
  }

  const removeTopic = (index) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index))
    }
  }

  const updateTopic = (index, value) => {
    const newTopics = [...topics]
    newTopics[index] = value
    setTopics(newTopics)
  }

  const handleGeneratePlan = async () => {
    if (!subject || !examDate || topics.filter(t => t.trim()).length === 0) {
      alert('Please fill in all fields')
      return
    }

    setIsGenerating(true)
    try {
      const response = await generateStudyPlan(
        subject,
        examDate,
        topics.filter(t => t.trim()),
        currentLevel
      )
      setStudyPlan(response.content)
    } catch (error) {
      setStudyPlan(`Error generating plan: ${error.message}. Make sure the AI proxy is running.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateQuestions = async () => {
    if (!practiceSubject || !practiceTopic) {
      alert('Please fill in subject and topic')
      return
    }

    setIsGenerating(true)
    try {
      const response = await generatePracticeQuestions(
        practiceSubject,
        practiceTopic,
        difficulty,
        questionCount
      )
      setPracticeQuestions(response.content)
    } catch (error) {
      setPracticeQuestions(`Error generating questions: ${error.message}. Make sure the AI proxy is running.`)
    } finally {
      setIsGenerating(false)
    }
  }

  // File Upload Functions
  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n\n'
    }
    
    return fullText
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    const processedFiles = []

    for (const file of files) {
      const fileInfo = {
        name: file.name,
        type: file.type,
        size: file.size,
        content: null,
        preview: null
      }

      if (file.type === 'application/pdf') {
        try {
          fileInfo.content = await extractTextFromPDF(file)
          fileInfo.fileType = 'pdf'
        } catch (error) {
          console.error('Error extracting PDF:', error)
          fileInfo.error = 'Failed to extract PDF content'
        }
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        const base64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
        fileInfo.content = base64
        fileInfo.preview = base64
        fileInfo.fileType = 'image'
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text()
        fileInfo.content = text
        fileInfo.fileType = 'text'
      }

      processedFiles.push(fileInfo)
    }

    setUploadedFiles(prev => [...prev, ...processedFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleAnalyzeMaterials = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one file')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult('')

    try {
      const results = []
      
      for (const file of uploadedFiles) {
        if (file.error) continue
        
        const response = await analyzeDocument(
          file.content,
          file.fileType,
          materialSubject
        )
        results.push(`## ${file.name}\n\n${response.content}`)
      }

      setAnalysisResult(results.join('\n\n---\n\n'))
    } catch (error) {
      setAnalysisResult(`Error analyzing materials: ${error.message}. Make sure the AI proxy is running.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatContent = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-2"><code>$2</code></pre>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Preparation</h1>
          <p className="text-gray-600">
            Create personalized study plans and practice with AI-generated questions
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'materials'
                ? 'bg-white text-primary-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="h-5 w-5" />
            Study Materials
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'plan'
                ? 'bg-white text-primary-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="h-5 w-5" />
            Study Plan
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'practice'
                ? 'bg-white text-primary-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="h-5 w-5" />
            Practice Questions
          </button>
        </div>

        {/* Study Plan Tab */}
        {activeTab === 'plan' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-600" />
                Create Your Study Plan
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Mathematics, Physics"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Level
                  </label>
                  <select
                    value={currentLevel}
                    onChange={(e) => setCurrentLevel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {levelOptions.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topics to Cover
                  </label>
                  <div className="space-y-2">
                    {topics.map((topic, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => updateTopic(index, e.target.value)}
                          placeholder={`Topic ${index + 1}`}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {topics.length > 1 && (
                          <button
                            onClick={() => removeTopic(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addTopic}
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Topic
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGeneratePlan}
                  disabled={isGenerating}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Study Plan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result */}
            <div className="card bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Your Study Plan
              </h2>

              {studyPlan ? (
                <div 
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: formatContent(studyPlan) }}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Fill in the details and generate your personalized study plan</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Practice Questions Tab */}
        {activeTab === 'practice' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600" />
                Generate Practice Questions
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={practiceSubject}
                    onChange={(e) => setPracticeSubject(e.target.value)}
                    placeholder="e.g., Mathematics, Chemistry"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={practiceTopic}
                    onChange={(e) => setPracticeTopic(e.target.value)}
                    placeholder="e.g., Quadratic Equations, Organic Chemistry"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {difficultyOptions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                    min={1}
                    max={20}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Questions
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result */}
            <div className="card bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Practice Questions
              </h2>

              {practiceQuestions ? (
                <div 
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: formatContent(practiceQuestions) }}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Select a subject and topic to generate practice questions</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
