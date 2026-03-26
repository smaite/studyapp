import { useState, useRef, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Send, Image, Loader2, Bot, User, Sparkles, 
  Upload, X, RefreshCw, BookOpen, ChevronDown,
  Calculator, PenLine, Camera, ThumbsUp, ThumbsDown,
  MessageSquarePlus, CheckCircle2, Grid3X3, Mic, Copy, Check
} from 'lucide-react'
import { AppContext } from '../App'
import { sendMessage, analyzeImage } from '../services/aiService'
import MarkdownRenderer from '../components/MarkdownRenderer'
import MathKeyboard from '../components/MathKeyboard'
import SolvingSteps from '../components/SolvingSteps'

// Interactive Diagram Component for geometry/graphs
function InteractiveDiagram({ diagram }) {
  const [a, setA] = useState(Number(diagram?.a) || 6)
  const [b, setB] = useState(Number(diagram?.b) || 8)
  const [x, setX] = useState(Number(diagram?.x) || 4)
  const [y, setY] = useState(Number(diagram?.y) || -2)
  const [angle, setAngle] = useState(Number(diagram?.angle) || 75)

  if (!diagram || diagram.type === 'none') return null

  if (diagram.type === 'angle') {
    const radians = (angle * Math.PI) / 180
    const length = 100
    const endX = 50 + length * Math.cos(radians)
    const endY = 150 - length * Math.sin(radians)
    return (
      <div className="bg-surface-800/80 rounded-2xl p-4 border border-primary-500/20 space-y-3">
        <p className="text-sm text-gray-300 font-medium">{diagram.title || `Interactive ${angle}° Angle`}</p>
        <svg viewBox="0 0 250 180" className="w-full h-auto bg-surface-900/40 rounded-lg">
          {/* Base line */}
          <line x1="50" y1="150" x2="200" y2="150" stroke="#60a5fa" strokeWidth="2" />
          {/* Angle line */}
          <line x1="50" y1="150" x2={endX} y2={endY} stroke="#a855f7" strokeWidth="2" />
          {/* Arc for angle */}
          <path d={`M 80 150 A 30 30 0 0 0 ${50 + 30 * Math.cos(radians)} ${150 - 30 * Math.sin(radians)}`} fill="none" stroke="#22d3ee" strokeWidth="1.5" />
          {/* Angle label */}
          <text x="90" y="138" fill="#22d3ee" fontSize="12">{angle}°</text>
          {/* Point O */}
          <circle cx="50" cy="150" r="3" fill="#fff" />
          <text x="40" y="170" fill="#94a3b8" fontSize="11">O</text>
        </svg>
        <div className="text-xs">
          <label className="text-gray-300 flex items-center gap-2">
            Angle: {angle}°
            <input type="range" min="1" max="180" value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="flex-1" />
          </label>
        </div>
      </div>
    )
  }

  if (diagram.type === 'venn') {
    return (
      <div className="bg-surface-800/80 rounded-2xl p-4 border border-primary-500/20">
        <p className="text-sm text-gray-300 mb-3 font-medium">{diagram.title || 'Interactive Venn Diagram'}</p>
        <svg viewBox="0 0 320 180" className="w-full h-auto">
          <circle cx="120" cy="90" r="60" fill="rgba(168,85,247,0.25)" stroke="#a855f7" strokeWidth="2" />
          <circle cx="200" cy="90" r="60" fill="rgba(34,211,238,0.25)" stroke="#22d3ee" strokeWidth="2" />
          <text x="80" y="90" fill="#ddd" fontSize="12">{diagram.leftLabel || 'Set A'}</text>
          <text x="220" y="90" fill="#ddd" fontSize="12">{diagram.rightLabel || 'Set B'}</text>
          <text x="150" y="95" fill="#fff" fontSize="12">{diagram.centerLabel || 'Common'}</text>
        </svg>
      </div>
    )
  }

  if (diagram.type === 'triangle') {
    const c = Math.sqrt(a * a + b * b).toFixed(2)
    return (
      <div className="bg-surface-800/80 rounded-2xl p-4 border border-primary-500/20 space-y-3">
        <p className="text-sm text-gray-300 font-medium">{diagram.title || 'Interactive Right Triangle'}</p>
        <svg viewBox="0 0 300 180" className="w-full h-auto bg-surface-900/40 rounded-lg">
          <line x1="50" y1="140" x2="250" y2="140" stroke="#60a5fa" strokeWidth="2" />
          <line x1="50" y1="140" x2="50" y2="40" stroke="#60a5fa" strokeWidth="2" />
          <line x1="50" y1="40" x2="250" y2="140" stroke="#a855f7" strokeWidth="2" />
          <text x="145" y="155" fill="#93c5fd" fontSize="12">a = {a}</text>
          <text x="18" y="95" fill="#93c5fd" fontSize="12">b = {b}</text>
          <text x="135" y="82" fill="#c084fc" fontSize="12">c ≈ {c}</text>
        </svg>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <label className="text-gray-300">a: <input type="range" min="1" max="20" value={a} onChange={(e) => setA(Number(e.target.value))} className="w-full" /></label>
          <label className="text-gray-300">b: <input type="range" min="1" max="20" value={b} onChange={(e) => setB(Number(e.target.value))} className="w-full" /></label>
        </div>
      </div>
    )
  }

  if (diagram.type === 'cartesian') {
    const toSvgX = (v) => 180 + v * 6
    const toSvgY = (v) => 100 - v * 6
    return (
      <div className="bg-surface-800/80 rounded-2xl p-4 border border-primary-500/20 space-y-3">
        <p className="text-sm text-gray-300 font-medium">{diagram.title || 'Interactive Coordinate Graph'}</p>
        <svg viewBox="0 0 360 200" className="w-full h-auto bg-surface-900/40 rounded-lg">
          <line x1="20" y1="100" x2="340" y2="100" stroke="#64748b" strokeWidth="1.5" />
          <line x1="180" y1="15" x2="180" y2="185" stroke="#64748b" strokeWidth="1.5" />
          <line x1={toSvgX(x)} y1="100" x2={toSvgX(x)} y2={toSvgY(y)} stroke="#22d3ee" strokeDasharray="4 3" />
          <line x1="180" y1={toSvgY(y)} x2={toSvgX(x)} y2={toSvgY(y)} stroke="#22d3ee" strokeDasharray="4 3" />
          <circle cx={toSvgX(x)} cy={toSvgY(y)} r="5" fill="#a855f7" />
          <text x={toSvgX(x) + 8} y={toSvgY(y) - 8} fill="#e2e8f0" fontSize="12">({x}, {y})</text>
          <text x="332" y="94" fill="#94a3b8" fontSize="11">x</text>
          <text x="186" y="20" fill="#94a3b8" fontSize="11">y</text>
        </svg>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <label className="text-gray-300">x: <input type="range" min="-20" max="20" value={x} onChange={(e) => setX(Number(e.target.value))} className="w-full" /></label>
          <label className="text-gray-300">y: <input type="range" min="-20" max="20" value={y} onChange={(e) => setY(Number(e.target.value))} className="w-full" /></label>
        </div>
      </div>
    )
  }

  return null
}

// Infer diagram from user query or AI response
const inferDiagramFromQuery = (text = '', parsedSolution = null) => {
  // First check if AI returned a diagram in JSON
  if (parsedSolution?.diagram && parsedSolution.diagram.type && parsedSolution.diagram.type !== 'none') {
    return parsedSolution.diagram
  }
  
  const q = text.toLowerCase()
  
  // Angle detection
  if (q.includes('angle') || q.includes('degree') || q.includes('°')) {
    const angleMatch = text.match(/(\d+)\s*(?:°|degree)/i)
    return {
      type: 'angle',
      title: `Interactive Angle`,
      angle: angleMatch ? Number(angleMatch[1]) : 75
    }
  }
  
  if (q.includes('venn')) {
    const vsMatch = text.match(/venn(?:\s+diagram)?(?:\s+(?:for|of|between))?\s+(.+?)\s+(?:vs|and|&)\s+(.+)/i)
    return {
      type: 'venn',
      title: 'Interactive Venn Diagram',
      leftLabel: vsMatch?.[1]?.trim() || 'Set A',
      rightLabel: vsMatch?.[2]?.trim() || 'Set B',
      centerLabel: 'Common'
    }
  }
  
  if (q.includes('triangle') || q.includes('pythag') || q.includes('right angle')) {
    const aMatch = text.match(/\ba\s*=?\s*(\d+(?:\.\d+)?)/i)
    const bMatch = text.match(/\bb\s*=?\s*(\d+(?:\.\d+)?)/i)
    return {
      type: 'triangle',
      title: 'Interactive Right Triangle',
      a: aMatch ? Number(aMatch[1]) : 6,
      b: bMatch ? Number(bMatch[1]) : 8
    }
  }
  
  if (q.includes('graph') || q.includes('plot') || q.includes('coordinate')) {
    const xEq = text.match(/\bx\s*=\s*(-?\d+(?:\.\d+)?)/i)
    const yEq = text.match(/\by\s*=\s*(-?\d+(?:\.\d+)?)/i)
    const pair = text.match(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/)
    return {
      type: 'cartesian',
      title: 'Interactive Coordinate Graph',
      x: xEq ? Number(xEq[1]) : pair ? Number(pair[1]) : 4,
      y: yEq ? Number(yEq[1]) : pair ? Number(pair[2]) : -2
    }
  }
  
  return null
}

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
  const [copiedIndex, setCopiedIndex] = useState(null)
  
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

  // Handle clipboard paste for images
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onloadend = () => {
            setSelectedImage(reader.result)
            setImagePreview(URL.createObjectURL(file))
          }
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }

  // Copy message content
  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Generate contextual follow-up questions based on AI response
  const generateContextualQuestions = (content) => {
    const lower = content.toLowerCase()
    const questions = []
    
    // Check for math/calculation content
    if (/angle|degree|°/.test(lower)) {
      questions.push('Does this work for any angle?', 'Show me how to bisect an angle', 'What about obtuse angles?')
    } else if (/triangle|pythag/.test(lower)) {
      questions.push('What if it\'s not a right triangle?', 'Can you show me the proof?', 'Give me a similar problem')
    } else if (/equation|solve|calculate/.test(lower)) {
      questions.push('Can you explain step 2 more?', 'Give me a similar problem', 'What if the numbers are different?')
    } else if (/formula|theorem/.test(lower)) {
      questions.push('When do I use this formula?', 'Show me an example', 'What\'s the derivation?')
    } else if (/graph|plot|coordinate/.test(lower)) {
      questions.push('How do I find the slope?', 'What about negative values?', 'Show me another point')
    } else if (/step|process|method/.test(lower)) {
      questions.push('Can you simplify this?', 'Still not quite getting it', 'Show me another way')
    } else {
      // Default contextual questions
      questions.push('Can you explain more?', 'Give me an example', 'Quiz me on this')
    }
    
    return questions
  }

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
      
      if (isMathProblem && (selectedImage || /solve|calculate|find|compute|evaluate|simplify|draw|angle|triangle|graph|plot|step.?by.?step|how.?to|make|construct|degree|pythag/i.test(input) || /^[0-9x+\-*/=^√()]+$/.test(input.replace(/\s/g, '')))) {
        // Use math solver mode
        const mathPrompt = `You are an expert math tutor. Solve this problem step by step.

YOU MUST RETURN ONLY VALID JSON. NO MARKDOWN. NO TEXT BEFORE OR AFTER THE JSON.

Start your response with { and end with }

JSON format (follow EXACTLY):
{
  "steps": [
    {"description": "What we're doing", "math": "LaTeX expression like \\\\frac{a}{b}", "explanation": "Why this step"}
  ],
  "solution": "Final answer with units if applicable",
  "tip": {"title": "Pro tip", "content": "Helpful shortcut"},
  "fullExplanation": "2-3 sentence friendly summary of the solution",
  "followUpQuestions": ["Practice question 1?", "Related concept question?", "Harder variation?"],
  "diagram": {"type": "angle|triangle|cartesian|venn|none", "title": "Diagram title", "angle": 75, "a": 6, "b": 8, "x": 0, "y": 0}
}

Rules:
- Include 3-6 steps minimum
- Use LaTeX in "math" field (double-escape backslashes)
- For geometry: set diagram.type to "triangle", "cartesian", or "angle"
- For angle problems: use diagram.type "angle" with diagram.angle value
- Always include followUpQuestions array

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

      // Infer diagram from query or parsed solution
      const diagram = inferDiagramFromQuery(input, parsedSolution)

      const assistantMessage = {
        role: 'assistant',
        content: parsedSolution?.fullExplanation || response.content,
        solution: parsedSolution,
        diagram: diagram,
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
            
            <div className={`max-w-[90%] md:max-w-[85%] ${message.role === 'user' ? '' : 'space-y-3'}`}>
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

                  {/* Interactive Diagram */}
                  {message.diagram && (
                    <InteractiveDiagram diagram={message.diagram} />
                  )}

                  {/* Main content - cleaner card */}
                  <div className="bg-surface-800/60 rounded-2xl p-4 border border-white/5">
                    <MarkdownRenderer content={message.content} />
                  </div>

                  {/* Quick Tip box - styled like Astra AI */}
                  {message.solution?.tip && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 text-lg">💡</span>
                        <div>
                          <p className="font-medium text-amber-300 text-sm">{message.solution.tip.title || 'Quick Math'}</p>
                          <p className="text-gray-300 text-sm mt-1">{message.solution.tip.content}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback & Copy - minimal */}
                  <div className="flex items-center gap-2 text-gray-500">
                    <button 
                      onClick={() => copyToClipboard(message.content, index)}
                      className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1"
                      title="Copy response"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-500">Copied!</span>
                        </>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                      <ThumbsUp className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors">
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Contextual follow-up buttons - Astra AI style */}
                  {index === messages.length - 1 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(message.solution?.followUpQuestions || generateContextualQuestions(message.content)).slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleFollowUp(q)}
                          className="px-3 py-2 bg-surface-800 border border-gray-700 hover:border-gray-600 rounded-xl text-sm text-gray-300 hover:text-white transition-all cursor-pointer"
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

        <div className="p-3 md:p-4">
          <div className="bg-surface-800 rounded-2xl border border-gray-700/50 focus-within:border-primary-500/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Ask, speak, or send a file"
              className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none resize-none text-sm md:text-base"
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
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  title="Upload image (or Ctrl+V to paste)"
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
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                    title="Math keyboard"
                  >
                    <PenLine className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden md:block">Speak</span>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  title="Voice input"
                >
                  <Mic className="h-5 w-5" />
                </button>
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
