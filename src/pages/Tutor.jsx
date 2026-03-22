import { useState, useRef, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Send, Image, Loader2, Bot, User, Sparkles, 
  Upload, X, RefreshCw, BookOpen, ChevronDown
} from 'lucide-react'
import { AppContext } from '../App'
import { sendMessage, analyzeImage } from '../services/aiService'
import MarkdownRenderer from '../components/MarkdownRenderer'

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
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const currentSubject = subject ? subjectNames[subject] || subject : null

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((!input.trim() && !selectedImage) || isLoading) return

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

    try {
      let response
      
      if (selectedImage) {
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
        content: response.content
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
        content: `Sorry, I encountered an error: ${error.message}. Please make sure the AI proxy server is running on localhost:8080.`
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const clearChat = () => {
    setMessages([])
    if (subject) {
      setChatHistory(prev => ({
        ...prev,
        [subject]: []
      }))
    }
  }

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-2"><code>$2</code></pre>')
      .replace(/\n/g, '<br>')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 p-2 rounded-xl">
            <Bot className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">AI Tutor</h1>
            {currentSubject && (
              <p className="text-sm text-gray-500">Helping with {currentSubject}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Subject Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              {currentSubject || 'Select Subject'}
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showSubjectDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-2 z-50">
                <button
                  onClick={() => {
                    navigate('/tutor')
                    setShowSubjectDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  General (Any Topic)
                </button>
                <div className="border-t my-1" />
                {Object.entries(subjectNames).map(([key, name]) => (
                  <button
                    key={key}
                    onClick={() => {
                      navigate(`/tutor/${key}`)
                      setShowSubjectDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      subject === key ? 'bg-primary-50 text-primary-600' : ''
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
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
            <div className="bg-primary-100 p-4 rounded-2xl mb-4">
              <Sparkles className="h-10 w-10 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentSubject ? `Let's learn ${currentSubject}!` : 'How can I help you today?'}
            </h2>
            <p className="text-gray-500 max-w-md mb-6">
              Ask me anything! I can help explain concepts, solve problems, 
              or just chat about what you're learning.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'Explain this concept',
                'Help me solve a problem',
                'Quiz me on this topic',
                'Give me practice questions'
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="bg-primary-100 p-2 rounded-xl h-fit shrink-0">
                <Bot className="h-5 w-5 text-primary-600" />
              </div>
            )}
            
            <div className={message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
              {message.image && (
                <img 
                  src={message.image} 
                  alt="Uploaded" 
                  className="max-w-xs rounded-lg mb-2"
                />
              )}
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}
            </div>

            {message.role === 'user' && (
              <div className="bg-gray-200 p-2 rounded-xl h-fit shrink-0">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="bg-primary-100 p-2 rounded-xl h-fit shrink-0">
              <Bot className="h-5 w-5 text-primary-600" />
            </div>
            <div className="chat-bubble-ai">
              <MarkdownRenderer content={streamingMessage} />
              <span className="inline-block w-2 h-4 bg-primary-600 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {isLoading && !streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="bg-primary-100 p-2 rounded-xl h-fit">
              <Bot className="h-5 w-5 text-primary-600" />
            </div>
            <div className="chat-bubble-ai flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4 shrink-0">
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="h-20 rounded-lg border"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
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
            className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
            title="Upload image"
          >
            <Image className="h-5 w-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentSubject 
                ? `Ask about ${currentSubject}...` 
                : "Ask me anything..."
              }
              className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="btn-primary p-3 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
