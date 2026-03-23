import { useState, useRef, useEffect } from 'react'
import { 
  ArrowLeft, Send, Camera, PenLine, Grid3X3, Settings2, Mic, 
  ThumbsUp, ThumbsDown, RefreshCw, MessageSquarePlus, Loader2,
  Image as ImageIcon, X, CheckCircle2
} from 'lucide-react'
import MathKeyboard from '../components/MathKeyboard'
import SolvingSteps from '../components/SolvingSteps'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { sendMessage, analyzeImage } from '../services/aiService'

export default function MathSolver({ onBack }) {
  const [input, setInput] = useState('')
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [solveTime, setSolveTime] = useState(null)
  const [currentSolution, setCurrentSolution] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyboardInsert = (text) => {
    if (text === 'BACKSPACE') {
      setInput(prev => prev.slice(0, -1))
    } else if (text === 'CLEAR') {
      setInput('')
    } else {
      setInput(prev => prev + text)
    }
    inputRef.current?.focus()
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const solveProblem = async () => {
    if (!input.trim() && !imagePreview) return

    const startTime = Date.now()
    setIsLoading(true)
    
    const userMessage = {
      role: 'user',
      content: input,
      image: imagePreview
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setImagePreview(null)

    try {
      const systemPrompt = `You are an expert math tutor. When solving problems:
1. Break down the solution into clear, numbered steps
2. Show all mathematical work using LaTeX ($...$ for inline, $$...$$ for display)
3. Explain the reasoning behind each step
4. Provide helpful tips or shortcuts when applicable
5. At the end, clearly state the final answer

Format your response as JSON:
{
  "steps": [
    {"description": "Step description", "math": "LaTeX math", "explanation": "Why we do this"}
  ],
  "solution": "Final answer with LaTeX if needed",
  "tip": {"title": "Tip title", "content": "Helpful tip"},
  "fullExplanation": "Friendly conversational explanation of the entire solution",
  "followUpQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}`

      let response
      if (imagePreview) {
        response = await analyzeImage(
          imagePreview,
          'Math Problem',
          `Solve this math problem step by step. ${input || ''}\n\n${systemPrompt}`
        )
      } else {
        response = await sendMessage([
          { role: 'user', content: `Solve this math problem step by step: ${input}\n\n${systemPrompt}` }
        ], 'Math Solver')
      }

      const endTime = Date.now()
      setSolveTime(Math.round((endTime - startTime) / 1000))

      // Parse the response
      let parsed
      try {
        let jsonStr = response.content
        // Extract JSON from markdown code blocks if present
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          jsonStr = jsonMatch[1]
        }
        // Find JSON object
        const start = jsonStr.indexOf('{')
        const end = jsonStr.lastIndexOf('}')
        if (start !== -1 && end !== -1) {
          jsonStr = jsonStr.substring(start, end + 1)
        }
        parsed = JSON.parse(jsonStr)
      } catch (e) {
        // If parsing fails, create a simple response
        parsed = {
          steps: [{ description: 'Solution', math: '', explanation: response.content }],
          solution: 'See explanation above',
          fullExplanation: response.content,
          followUpQuestions: ['Can you explain more?', 'Give me a similar problem', 'What if the numbers were different?']
        }
      }

      setCurrentSolution(parsed)
      
      const aiMessage = {
        role: 'assistant',
        content: parsed.fullExplanation,
        solution: parsed
      }
      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Error solving:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error solving this problem. Please try again.',
        isError: true
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowUp = (question) => {
    setInput(question)
    setTimeout(() => solveProblem(), 100)
  }

  const handleSimilarProblem = () => {
    setInput('Give me a similar problem to practice')
    solveProblem()
  }

  const handleNewChat = () => {
    setMessages([])
    setCurrentSolution(null)
    setSolveTime(null)
    setInput('')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-white font-semibold">Math Solver</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PenLine className="h-8 w-8 text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Math Solver</h2>
            <p className="text-gray-400 max-w-sm mx-auto">
              Type a math problem, take a photo, or use the math keyboard to get step-by-step solutions
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            {msg.role === 'user' ? (
              <div className="bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]">
                {msg.image && (
                  <img src={msg.image} alt="Problem" className="rounded-lg mb-2 max-h-48 object-contain" />
                )}
                <MarkdownRenderer content={msg.content} />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Solve time indicator */}
                {solveTime && idx === messages.length - 1 && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Exercise solved in {solveTime}s</span>
                    <div className="flex gap-1 ml-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-16 h-2 bg-green-500/30 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solving steps */}
                {msg.solution?.steps && (
                  <SolvingSteps 
                    steps={msg.solution.steps}
                    solution={msg.solution.solution}
                    tip={msg.solution.tip}
                  />
                )}

                {/* Action buttons */}
                {msg.solution && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={handleSimilarProblem}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Give similar problem
                    </button>
                    <span className="text-gray-600">or</span>
                    <button 
                      onClick={handleNewChat}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-gray-300 transition-colors"
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                      Start a new chat
                    </button>
                  </div>
                )}

                {/* Explanation */}
                <div className="bg-gray-900/30 rounded-xl p-4">
                  <MarkdownRenderer content={msg.content} />
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
                {msg.solution?.followUpQuestions && (
                  <div className="space-y-2">
                    {msg.solution.followUpQuestions.map((q, i) => (
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
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Solving...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 bg-gray-900/50">
        {/* Image preview */}
        {imagePreview && (
          <div className="p-3 border-b border-gray-800">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input tools */}
        <div className="px-4 py-3">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 focus-within:border-primary-500 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && solveProblem()}
              placeholder="Ask, speak, or send a file"
              className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none"
            />
            
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Upload image"
                >
                  <Camera className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  className={`p-2 rounded-lg transition-colors ${
                    showKeyboard 
                      ? 'text-primary-400 bg-primary-500/20' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  title="Math keyboard"
                >
                  <PenLine className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Grid"
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings2 className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                  title="Speak"
                >
                  <span className="text-sm">Speak</span>
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={solveProblem}
                  disabled={(!input.trim() && !imagePreview) || isLoading}
                  className="p-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Math keyboard */}
        {showKeyboard && (
          <MathKeyboard 
            onInsert={handleKeyboardInsert}
            onClose={() => setShowKeyboard(false)}
          />
        )}
      </div>
    </div>
  )
}
