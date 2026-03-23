import { useState, useRef, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Send, Image, Loader2, Bot, User, Sparkles, 
  Upload, X, RefreshCw, BookOpen, ChevronDown,
  Calculator, PenLine, Camera, ThumbsUp, ThumbsDown,
  MessageSquarePlus, CheckCircle2, Grid3X3, Mic
} from 'lucide-react'
import { AppContext } from '../App'
import { sendMessage, analyzeImage } from '../services/aiService'
import MarkdownRenderer from '../components/MarkdownRenderer'
import MathKeyboard from '../components/MathKeyboard'
import SolvingSteps from '../components/SolvingSteps'

const subjectNames = {
  math: 'Mathematics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
  history: 'History',
  geography: 'Geography',
  english: 'English',
  languages: 'Languages',
  'computer-science': 'Computer Science',
  psychology: 'Psychology',
  economics: 'Economics',
  philosophy: 'Philosophy'
}

export default function Tutor() {
  const { subject } = useParams()
  const navigate = useNavigate()
  const { chatHistory, setChatHistory } = useContext(AppContext)
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)
  const [showMathKeyboard, setShowMathKeyboard] = useState(false)
  const [mathMode, setMathMode] = useState(false)
  const [solveTime, setSolveTime] = useState(null)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const currentSubject = subject ? subjectNames[subject] || subject : null
  const isMathSubject = subject === 'math' || mathMode

  useEffect(() => {
    if (subject && chatHistory[subject]) {
      setMessages(chatHistory[subject])
    } else {
      setMessages([])
    }
  }, [subject])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result)
        setImagePreview(URL.createObjectURL(file))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleKeyboardInsert = (text) => {
    if (text === 'BACKSPACE') {
      setInput(prev => prev.slice(0, -1))
    } else if (text === 'CLEAR') {
      setInput('')
    } else {
      setInput(prev => prev + text)
    }
    textareaRef.current?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((!input.trim() && !selectedImage) || isLoading) return

    const startTime = Date.now()
    const userMessage = {
      role: 'user',
      content: input.trim(),
      image: imagePreview
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setStreamingMessage('')
    setSolveTime(null)

    try {
      let response
      let parsedSolution = null
      
      // Check if this is a math problem that needs step-by-step solving
      const isMathProblem = isMathSubject || /[0-9+\-*/=^√∫∑]/.test(input) || selectedImage
      
      if (isMathProblem && (selectedImage || /solve|calculate|find|compute|evaluate|simplify/i.test(input) || /^[0-9x+\-*/=^√()]+$/.test(input.replace(/\s/g, '')))) {
        // Use math solver mode
        const mathPrompt = `You are an expert math tutor. Solve this problem step by step.

Format your response as JSON:
{
  "steps": [
    {"description": "Step description", "math": "LaTeX math expression", "explanation": "Why we do this"}
  ],
  "solution": "Final answer",
  "tip": {"title": "Pro tip", "content": "Helpful shortcut or insight"},
  "fullExplanation": "Friendly explanation of the solution",
  "followUpQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}

Problem: ${input}`

        if (selectedImage) {
          response = await analyzeImage(selectedImage, mathPrompt, 'Mathematics')
          removeImage()
        } else {
          response = await sendMessage([{ role: 'user', content: mathPrompt }], 'Mathematics')
        }

        // Try to parse as JSON for step-by-step display
        try {
          let jsonStr = response.content
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (jsonMatch) jsonStr = jsonMatch[1]
          const start = jsonStr.indexOf('{')
          const end = jsonStr.lastIndexOf('}')
          if (start !== -1 && end !== -1) {
            jsonStr = jsonStr.substring(start, end + 1)
            parsedSolution = JSON.parse(jsonStr)
          }
        } catch (e) {
          // Not JSON, use as plain text
        }

        const endTime = Date.now()
        setSolveTime(Math.round((endTime - startTime) / 1000))
      } else if (selectedImage) {
        response = await analyzeImage(selectedImage, input, currentSubject)
        removeImage()
      } else {
        const apiMessages = newMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
        
        response = await sendMessage(apiMessages, currentSubject, (text) => {
          setStreamingMessage(text)
        })
      }

      const assistantMessage = {
        role: 'assistant',
        content: parsedSolution?.fullExplanation || response.content,
        solution: parsedSolution,
        solveTime: solveTime
      }

      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)
      setStreamingMessage('')

      if (subject) {
        setChatHistory(prev => ({
          ...prev,
          [subject]: updatedMessages
        }))
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please make sure the AI proxy server is running.`
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
    }
  }

  const handleFollowUp = (question) => {
    setInput(question)
    setTimeout(() => {
      const form = document.querySelector('form')
      form?.dispatchEvent(new Event('submit', { bubbles: true }))
    }, 100)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const clearChat = () => {
    setMessages([])
    setSolveTime(null)
    if (subject) {
      setChatHistory(prev => ({
        ...prev,
        [subject]: []
      }))
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary-500/20 p-2 rounded-xl">
            <Bot className="h-5 w-5 text-primary-400" />
          </div>
          <div>
            <h1 className="font-semibold text-white">AI Tutor</h1>
            {currentSubject && (
              <p className="text-sm text-gray-400">Helping with {currentSubject}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Math Mode Toggle */}
          <button
            onClick={() => setMathMode(!mathMode)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              mathMode ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Math Solver
          </button>

          {/* Subject Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{currentSubject || 'Subject'}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showSubjectDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-xl shadow-lg border border-gray-700 py-2 z-50 max-h-80 overflow-y-auto">
                <button
                  onClick={() => {
                    navigate('/tutor')
                    setShowSubjectDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                >
                  General (Any Topic)
                </button>
                <div className="border-t border-gray-700 my-1" />
                {Object.entries(subjectNames).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => {
                      navigate(`/tutor/${key}`)
                      setShowSubjectDropdown(false)
                      if (key === 'math') setMathMode(true)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 ${
                      subject === key ? 'bg-primary-600/20 text-primary-400' : 'text-gray-300'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={clearChat}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingMessage && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-primary-500/20 p-4 rounded-2xl mb-4">
              {mathMode ? (
                <Calculator className="h-10 w-10 text-primary-400" />
              ) : (
                <Sparkles className="h-10 w-10 text-primary-400" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {mathMode ? 'Math Solver' : currentSubject ? `Let's learn ${currentSubject}!` : 'How can I help you today?'}
            </h2>
            <p className="text-gray-400 max-w-md mb-6">
              {mathMode 
                ? 'Type a math problem, upload a photo, or use the math keyboard for step-by-step solutions'
                : 'Ask me anything! I can help explain concepts, solve problems, or quiz you.'
              }
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {mathMode ? (
                ['Solve 2x + 5 = 15', 'Find the derivative of x²', 'Calculate √144', 'Simplify (x+2)(x-3)'].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))
              ) : (
                ['Explain this concept', 'Help me solve a problem', 'Quiz me on this topic', 'Give me practice questions'].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="bg-primary-500/20 p-2 rounded-xl h-fit shrink-0">
                <Bot className="h-5 w-5 text-primary-400" />
              </div>
            )}
            
            <div className={`max-w-[85%] ${message.role === 'user' ? '' : 'space-y-4'}`}>
              {message.role === 'user' ? (
                <div className="bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                  {message.image && (
                    <img src={message.image} alt="Uploaded" className="max-w-xs rounded-lg mb-2" />
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ) : (
                <>
                  {/* Solve time indicator */}
                  {message.solution && solveTime && index === messages.length - 1 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Solved in {solveTime}s</span>
                      <div className="flex gap-1 ml-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-12 h-1.5 bg-green-500/30 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Solving steps */}
                  {message.solution?.steps && (
                    <SolvingSteps 
                      steps={message.solution.steps}
                      solution={message.solution.solution}
                      tip={message.solution.tip}
                    />
                  )}

                  {/* Action buttons for math solutions */}
                  {message.solution && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => handleFollowUp('Give me a similar problem to practice')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Similar problem
                      </button>
                      <button 
                        onClick={clearChat}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
                      >
                        <MessageSquarePlus className="h-4 w-4" />
                        New chat
                      </button>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
                    <MarkdownRenderer content={message.content} />
                  </div>

                  {/* Feedback */}
                  <div className="flex items-center gap-2 text-gray-500">
                    <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Follow-up questions */}
                  {message.solution?.followUpQuestions && (
                    <div className="space-y-2">
                      {message.solution.followUpQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleFollowUp(q)}
                          className="block w-full text-left px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl text-gray-300 text-sm transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {message.role === 'user' && (
              <div className="bg-gray-700 p-2 rounded-xl h-fit shrink-0">
                <User className="h-5 w-5 text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="bg-primary-500/20 p-2 rounded-xl h-fit shrink-0">
              <Bot className="h-5 w-5 text-primary-400" />
            </div>
            <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
              <MarkdownRenderer content={streamingMessage} />
              <span className="inline-block w-2 h-4 bg-primary-500 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {isLoading && !streamingMessage && (
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900/50 shrink-0">
        {imagePreview && (
          <div className="p-3 border-b border-gray-800">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-gray-700" />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 focus-within:border-primary-500 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mathMode ? "Type a math problem..." : currentSubject ? `Ask about ${currentSubject}...` : "Ask me anything..."}
              className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none"
              rows={1}
            />
            
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Upload image"
                >
                  <Camera className="h-5 w-5" />
                </button>
                {(mathMode || isMathSubject) && (
                  <button
                    type="button"
                    onClick={() => setShowMathKeyboard(!showMathKeyboard)}
                    className={`p-2 rounded-lg transition-colors ${
                      showMathKeyboard 
                        ? 'text-primary-400 bg-primary-500/20' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    title="Math keyboard"
                  >
                    <PenLine className="h-5 w-5" />
                  </button>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>

        {/* Math keyboard */}
        {showMathKeyboard && (
          <MathKeyboard 
            onInsert={handleKeyboardInsert}
            onClose={() => setShowMathKeyboard(false)}
          />
        )}
      </div>
    </div>
  )
}
