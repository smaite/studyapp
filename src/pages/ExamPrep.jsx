import { useState, useRef } from 'react'
import { 
  Calendar, Clock, BookOpen, Target, Plus, Trash2, 
  Loader2, CheckCircle, FileText, Sparkles, Upload, 
  File, Image, X, FileUp, GraduationCap, Brain
} from 'lucide-react'
import { generateStudyPlan, generatePracticeQuestions, analyzeDocument, sendMessage } from '../services/aiService'
import MarkdownRenderer from '../components/MarkdownRenderer'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set up PDF.js worker using bundled version
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

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
  const [activeTab, setActiveTab] = useState('materials')
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
  const [extractedContent, setExtractedContent] = useState('')
  const fileInputRef = useRef(null)
  const planFileInputRef = useRef(null)
  const practiceFileInputRef = useRef(null)

  // Study Plan File Upload State
  const [planUploadedFiles, setPlanUploadedFiles] = useState([])
  const [planExtractedContent, setPlanExtractedContent] = useState('')

  // Practice File Upload State  
  const [practiceUploadedFiles, setPracticeUploadedFiles] = useState([])
  const [practiceExtractedContent, setPracticeExtractedContent] = useState('')

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
    if (!subject || !examDate) {
      alert('Please fill in subject and exam date')
      return
    }

    setIsGenerating(true)
    try {
      // Build prompt with uploaded content if available
      let prompt = `Create a detailed study plan for a student preparing for a ${subject} exam.

Details:
- Days until exam: ${Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))}
- Topics to cover: ${topics.filter(t => t.trim()).join(', ') || 'General topics for ' + subject}
- Current level: ${currentLevel}`

      if (planExtractedContent) {
        prompt += `

The student has provided the following study materials/previous exam questions for reference:
---
${planExtractedContent.substring(0, 8000)}
---

Please analyze these materials and create a study plan that:
1. Focuses on the topics and question types shown in the materials
2. Prioritizes areas that appear frequently in the provided content
3. Includes practice with similar question formats`
      }

      prompt += `

Please provide:
1. A day-by-day study schedule
2. Key concepts to focus on each day
3. Practice problem suggestions based on the materials provided
4. Review sessions
5. Tips for exam day

Format the response in a clear, organized way using markdown with headers, bold text, and lists.`

      const response = await sendMessage([{ role: 'user', content: prompt }], subject)
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
      let prompt = `Generate ${questionCount} practice questions for ${practiceSubject} on the topic of "${practiceTopic}" at ${difficulty} difficulty level.`

      if (practiceExtractedContent) {
        prompt += `

The student has provided the following study materials/previous exam questions as reference:
---
${practiceExtractedContent.substring(0, 8000)}
---

Please generate questions that are similar in style and difficulty to those in the provided materials.`
      }

      prompt += `

For each question:
1. State the question clearly
2. Provide multiple choice options (A, B, C, D) if applicable
3. Include the correct answer clearly marked
4. Provide a detailed explanation

Format using markdown with proper headers (###), **bold** for answers, and clear structure.`

      const response = await sendMessage([{ role: 'user', content: prompt }], practiceSubject)
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
    // Also update extracted content for materials tab
    const allContent = [...uploadedFiles, ...processedFiles]
      .filter(f => f.content && f.fileType !== 'image')
      .map(f => f.content)
      .join('\n\n---\n\n')
    setExtractedContent(allContent)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Generic file processor for plan and practice tabs
  const processFiles = async (files, setFiles, setContent, inputRef) => {
    const processedFiles = []
    let allTextContent = ''

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
          allTextContent += `\n\n--- ${file.name} ---\n\n` + fileInfo.content
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
        allTextContent += `\n\n--- ${file.name} ---\n\n` + text
      }

      processedFiles.push(fileInfo)
    }

    setFiles(prev => [...prev, ...processedFiles])
    setContent(prev => prev + allTextContent)
    
    if (inputRef?.current) {
      inputRef.current.value = ''
    }
  }

  const handlePlanFileSelect = async (e) => {
    await processFiles(Array.from(e.target.files), setPlanUploadedFiles, setPlanExtractedContent, planFileInputRef)
  }

  const handlePracticeFileSelect = async (e) => {
    await processFiles(Array.from(e.target.files), setPracticeUploadedFiles, setPracticeExtractedContent, practiceFileInputRef)
  }

  const removePlanFile = (index) => {
    setPlanUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      // Recalculate content
      const newContent = newFiles
        .filter(f => f.content && f.fileType !== 'image')
        .map(f => `--- ${f.name} ---\n\n${f.content}`)
        .join('\n\n')
      setPlanExtractedContent(newContent)
      return newFiles
    })
  }

  const removePracticeFile = (index) => {
    setPracticeUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      const newContent = newFiles
        .filter(f => f.content && f.fileType !== 'image')
        .map(f => `--- ${f.name} ---\n\n${f.content}`)
        .join('\n\n')
      setPracticeExtractedContent(newContent)
      return newFiles
    })
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

  // File upload component for reuse
  const FileUploadZone = ({ files, onFileSelect, onRemove, inputRef, accept = ".pdf,.png,.jpg,.jpeg,.gif,.txt,.md" }) => (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all group"
      >
        <input
          ref={inputRef}
          type="file"
          onChange={onFileSelect}
          accept={accept}
          multiple
          className="hidden"
        />
        <div className="bg-primary-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
          <Upload className="h-6 w-6 text-primary-600" />
        </div>
        <p className="text-gray-700 font-medium text-sm">
          Upload PDFs, Images, or Text files
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Previous exams, textbook chapters, notes
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl group"
            >
              {file.preview ? (
                <img 
                  src={file.preview} 
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded-lg"
                />
              ) : (
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  file.fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {file.fileType === 'pdf' ? (
                    <FileText className="h-5 w-5 text-red-600" />
                  ) : (
                    <File className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <GraduationCap className="h-4 w-4" />
            AI-Powered Exam Prep
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Exam Preparation</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your study materials, previous exams, or textbooks. AI will create personalized study plans and practice questions.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-gray-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'materials'
                ? 'bg-white text-primary-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="h-5 w-5" />
            Study Materials
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'plan'
                ? 'bg-white text-primary-600 shadow-md'
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

        {/* Study Materials Tab */}
        {activeTab === 'materials' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary-600" />
                Upload Study Materials
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={materialSubject}
                    onChange={(e) => setMaterialSubject(e.target.value)}
                    placeholder="e.g., Biology, History"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Drop Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.md"
                    multiple
                    className="hidden"
                  />
                  <div className="bg-primary-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-200 transition-colors">
                    <Upload className="h-8 w-8 text-primary-600" />
                  </div>
                  <p className="text-gray-700 font-medium mb-1">
                    Drop files here or click to upload
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF, Images (PNG, JPG), Text files
                  </p>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Uploaded Files ({uploadedFiles.length})
                    </p>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group"
                      >
                        {file.preview ? (
                          <img 
                            src={file.preview} 
                            alt={file.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            file.fileType === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {file.fileType === 'pdf' ? (
                              <FileText className="h-6 w-6 text-red-600" />
                            ) : (
                              <File className="h-6 w-6 text-blue-600" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                            {file.error && (
                              <span className="text-red-500 ml-2">{file.error}</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleAnalyzeMaterials}
                  disabled={isAnalyzing || uploadedFiles.length === 0}
                  className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing Materials...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Analyze & Create Study Notes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Analysis Result */}
            <div className="card bg-gradient-to-br from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                AI Study Notes
              </h2>

              {analysisResult ? (
                <div className="max-h-[500px] overflow-y-auto">
                  <MarkdownRenderer content={analysisResult} />
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <div className="bg-gray-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-10 w-10 text-gray-300" />
                  </div>
                  <p className="font-medium text-gray-600 mb-1">No materials analyzed yet</p>
                  <p className="text-sm">Upload PDFs, images, or text files to generate study notes</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Study Plan Tab */}
        {activeTab === 'plan' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary-600" />
                Create Your Study Plan
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Chemistry, Physics"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field pl-10"
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
                    className="input-field"
                  >
                    {levelOptions.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topics to Cover (Optional)
                  </label>
                  <div className="space-y-2">
                    {topics.map((topic, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => updateTopic(index, e.target.value)}
                          placeholder={`Topic ${index + 1}`}
                          className="input-field flex-1"
                        />
                        {topics.length > 1 && (
                          <button
                            onClick={() => removeTopic(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addTopic}
                      className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <Plus className="h-4 w-4" />
                      Add Topic
                    </button>
                  </div>
                </div>

                {/* File Upload for Study Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Previous Exams / Textbook (Optional)
                    </span>
                  </label>
                  <FileUploadZone
                    files={planUploadedFiles}
                    onFileSelect={handlePlanFileSelect}
                    onRemove={removePlanFile}
                    inputRef={planFileInputRef}
                  />
                  {planExtractedContent && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Content extracted - AI will use this for your plan
                    </p>
                  )}
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
            <div className="card bg-gradient-to-br from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Your Study Plan
              </h2>

              {studyPlan ? (
                <div className="max-h-[600px] overflow-y-auto">
                  <MarkdownRenderer content={studyPlan} />
                </div>
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
                <Brain className="h-5 w-5 text-primary-600" />
                Generate Practice Questions
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={practiceSubject}
                    onChange={(e) => setPracticeSubject(e.target.value)}
                    placeholder="e.g., Chemistry, Physics"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic *
                  </label>
                  <input
                    type="text"
                    value={practiceTopic}
                    onChange={(e) => setPracticeTopic(e.target.value)}
                    placeholder="e.g., Thermodynamics, Organic Chemistry"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="input-field"
                    >
                      {difficultyOptions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Questions
                    </label>
                    <input
                      type="number"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                      min={1}
                      max={20}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* File Upload for Practice Questions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Sample Questions / Textbook (Optional)
                    </span>
                  </label>
                  <FileUploadZone
                    files={practiceUploadedFiles}
                    onFileSelect={handlePracticeFileSelect}
                    onRemove={removePracticeFile}
                    inputRef={practiceFileInputRef}
                  />
                  {practiceExtractedContent && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Content extracted - AI will generate similar questions
                    </p>
                  )}
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
            <div className="card bg-gradient-to-br from-gray-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Practice Questions
              </h2>

              {practiceQuestions ? (
                <div className="max-h-[600px] overflow-y-auto">
                  <MarkdownRenderer content={practiceQuestions} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
