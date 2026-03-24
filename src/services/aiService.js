// AI Service Configuration - Using Environment Variables
// Supports Vite (VITE_) for local dev and Netlify env vars for production
const API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8080'
const API_KEY = import.meta.env.VITE_AI_API_KEY || 'dummy'
const MODEL = import.meta.env.VITE_AI_MODEL || 'gemini-3-flash'
const DEBUG_AI = true

const logAi = (...args) => {
  if (DEBUG_AI) console.log('[AI Service]', ...args)
}

const normalizeAssistantIdentity = (text) => String(text || '')
  .replace(/\bantigravity ai\b/gi, 'Kira AI')
  .replace(/\bantigravity\b/gi, 'Kira AI')

const extractTextFromApiData = (data) => {
  if (!data) return null

  // Anthropic format
  if (Array.isArray(data.content)) {
    const textBlock = data.content.find(block => block?.type === 'text' && typeof block?.text === 'string')
    if (textBlock?.text) return textBlock.text
    if (typeof data.content[0]?.text === 'string') return data.content[0].text
  }

  // OpenAI-compatible formats
  if (typeof data.content === 'string') return data.content
  if (typeof data.output_text === 'string') return data.output_text
  if (typeof data.message?.content === 'string') return data.message.content
  if (Array.isArray(data.choices)) {
    const c0 = data.choices[0]
    if (typeof c0?.message?.content === 'string') return c0.message.content
    if (typeof c0?.text === 'string') return c0.text
  }

  return null
}

export const analyzeDocument = async (content, fileType, subject, question) => {
  const reqId = `doc-${Date.now()}`
  const systemPrompt = `You are an expert AI tutor helping a student study for their ${subject || 'exam'}. 
Your assistant name is Kira AI. If referring to yourself, always say Kira AI.
The student has uploaded study materials. Analyze the content and help them understand it.

Guidelines:
- Summarize key concepts
- Identify important topics for exam prep
- Highlight formulas, definitions, or key facts
- Suggest areas to focus on
- Create study notes from the content`

  const userContent = fileType === 'image' 
    ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: content.replace(/^data:image\/\w+;base64,/, '')
          }
        },
        {
          type: 'text',
          text: question || 'Please analyze this study material and create comprehensive study notes. Identify key concepts, important facts, and topics I should focus on for my exam.'
        }
      ]
    : question || `Please analyze this study material and create comprehensive study notes:\n\n${content}`

  const requestBody = {
    model: MODEL,
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: userContent
    }]
  }

  try {
    logAi(reqId, 'request', { endpoint: `${API_BASE_URL}/v1/messages`, model: MODEL, subject, fileType })
    const response = await fetch(`${API_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      logAi(reqId, 'http_error', { status: response.status })
      throw new Error(`API Error: ${response.status}`)
    }

    const raw = await response.text()
    logAi(reqId, 'raw_response_preview', raw.substring(0, 180))
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      logAi(reqId, 'json_parse_error', raw.substring(0, 220))
      throw new Error(`Proxy returned invalid JSON: ${raw.substring(0, 200)}`)
    }

    const text = extractTextFromApiData(data)
    if (typeof text === 'string' && text.trim()) return { content: normalizeAssistantIdentity(text) }
    logAi(reqId, 'unexpected_format', { keys: Object.keys(data || {}), contentType: typeof data?.content })
    throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 200)}`)
  } catch (error) {
    console.error('Document Analysis Error:', error)
    throw error
  }
}

export const sendMessage = async (messages, subject = null, onChunk = null) => {
  const reqId = `msg-${Date.now()}`
  const systemPrompt = subject 
    ? `You are an expert AI tutor specializing in ${subject}. Your role is to help students understand concepts deeply, not just give answers.
    Your assistant name is Kira AI. If referring to yourself, always say Kira AI.
    
Guidelines:
- Break down complex problems into smaller, manageable steps
- Ask guiding questions to help students think critically
- Provide clear explanations with examples
- Use analogies and real-world connections when helpful
- Encourage the student and celebrate their progress
- If the student is stuck, give hints before revealing solutions
- For math/science problems, show your work step by step
- Use markdown formatting for better readability (code blocks, lists, bold for key terms)`
    : `You are a friendly and knowledgeable AI tutor.
Your assistant name is Kira AI. If referring to yourself, always say Kira AI.
Help students learn effectively by:
- Breaking down complex topics into understandable parts
- Providing step-by-step explanations
- Using examples and analogies
- Encouraging critical thinking
- Being patient and supportive
Use markdown formatting for clarity.`

  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((msg) => msg && typeof msg === 'object')
        .map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: typeof msg.content === 'string' ? msg.content : ''
        }))
    : []

  // Build messages with system prompt as first user message if needed
  const apiMessages = [
    { role: 'user', content: systemPrompt },
    { role: 'assistant', content: 'I understand. I will help you learn effectively with clear explanations and step-by-step guidance. How can I help you today?' },
    ...safeMessages
  ]

  const requestBody = {
    model: MODEL,
    max_tokens: 4096,
    messages: apiMessages
  }

  try {
    logAi(reqId, 'request', { endpoint: `${API_BASE_URL}/v1/messages`, model: MODEL, subject, messageCount: safeMessages.length })
    const response = await fetch(`${API_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      logAi(reqId, 'http_error', { status: response.status, errorData: errorData.substring(0, 220) })
      throw new Error(`API Error: ${response.status} - ${errorData}`)
    }

    const raw = await response.text()
    logAi(reqId, 'raw_response_preview', raw.substring(0, 180))
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      logAi(reqId, 'json_parse_error', raw.substring(0, 220))
      throw new Error(`Proxy returned invalid JSON: ${raw.substring(0, 200)}`)
    }

    const text = extractTextFromApiData(data)
    if (typeof text === 'string' && text.trim()) {
      logAi(reqId, 'success', { textLength: text.length })
      const normalized = normalizeAssistantIdentity(text)
      if (onChunk) onChunk(normalized)
      return { content: normalized }
    }
    logAi(reqId, 'unexpected_format', { keys: Object.keys(data || {}), contentType: typeof data?.content })
    throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 200)}`)
  } catch (error) {
    console.error('AI Service Error:', error)
    throw error
  }
}

export const analyzeImage = async (imageBase64, question, subject = null) => {
  const reqId = `img-${Date.now()}`
  const systemContext = subject
    ? `You are an expert AI tutor specializing in ${subject}. Your assistant name is Kira AI. If referring to yourself, always say Kira AI. The student has shared an image (likely a problem or question). Analyze it carefully and help them understand and solve it step by step.`
    : `You are a helpful AI tutor. Your assistant name is Kira AI. If referring to yourself, always say Kira AI. The student has shared an image. Analyze it and provide helpful guidance.`

  const requestBody = {
    model: MODEL,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
          }
        },
        {
          type: 'text',
          text: `${systemContext}\n\n${question || 'Please analyze this image and help me understand/solve it.'}`
        }
      ]
    }]
  }

  try {
    logAi(reqId, 'request', { endpoint: `${API_BASE_URL}/v1/messages`, model: MODEL, subject, imageBytes: imageBase64?.length || 0 })
    const response = await fetch(`${API_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      logAi(reqId, 'http_error', { status: response.status })
      throw new Error(`API Error: ${response.status}`)
    }

    const raw = await response.text()
    logAi(reqId, 'raw_response_preview', raw.substring(0, 180))
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      logAi(reqId, 'json_parse_error', raw.substring(0, 220))
      throw new Error(`Proxy returned invalid JSON: ${raw.substring(0, 200)}`)
    }

    const text = extractTextFromApiData(data)
    if (typeof text === 'string' && text.trim()) {
      logAi(reqId, 'success', { textLength: text.length })
      return { content: normalizeAssistantIdentity(text) }
    }
    logAi(reqId, 'unexpected_format', { keys: Object.keys(data || {}), contentType: typeof data?.content })
    throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 200)}`)
  } catch (error) {
    console.error('Image Analysis Error:', error)
    throw error
  }
}

export const generateStudyPlan = async (subject, examDate, topics, currentLevel) => {
  const daysUntilExam = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))
  
  const prompt = `Create a detailed study plan for a student preparing for a ${subject} exam.

Details:
- Days until exam: ${daysUntilExam}
- Topics to cover: ${topics.join(', ')}
- Current level: ${currentLevel}

Please provide:
1. A day-by-day study schedule
2. Key concepts to focus on each day
3. Practice problem suggestions
4. Review sessions
5. Tips for exam day

Format the response in a clear, organized way using markdown.`

  return sendMessage([{ role: 'user', content: prompt }], subject)
}

export const generatePracticeQuestions = async (subject, topic, difficulty, count = 5) => {
  const prompt = `Generate ${count} practice questions for ${subject} on the topic of "${topic}" at ${difficulty} difficulty level.

For each question:
1. State the question clearly
2. Provide multiple choice options (A, B, C, D) if applicable
3. Include the correct answer
4. Provide a brief explanation

Format using markdown for clarity.`

  return sendMessage([{ role: 'user', content: prompt }], subject)
}
